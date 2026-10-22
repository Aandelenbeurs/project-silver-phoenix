import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {intelligenceDirectory} from './storage';
import {IntelligenceError} from './workflow';
import {documentView} from './document-view';
import {allowedResource,pinnedGet,type Transport} from './transport';
import {robotsAllows} from './connectors';
import {readPdf,PDF_PARSER} from './pdf-parser';
import {makeProof,validProof,type Proof} from './verification';
import type {IntelligenceState} from './contracts';
const name=(hash:string)=>{if(!/^[a-f0-9]{64}$/.test(hash))throw new IntelligenceError('Ongeldige bewijshash.');return 'verification-proof-'+hash+'.json';};
/** No cache initialization or downloads on GET; corrupt cache never becomes evidence. */
export async function readProofs(state:IntelligenceState){
 const dir=await intelligenceDirectory(),proofs=new Map<string,Proof>(),warnings:string[]=[];
 for(const hash of [...new Set(state.documents.map(d=>d.pdf?.fileHash).filter((h):h is string=>Boolean(h)))]){
  const f=path.join(dir,name(hash));try{const st=await fs.lstat(f);if(!st.isFile()||st.isSymbolicLink()||st.size>3*1024*1024)throw Error('unsafe');const p=JSON.parse(await fs.readFile(f,'utf8')) as Proof;if(!validProof(p)||p.fileHash!==hash||p.parser!==PDF_PARSER)throw Error('invalid');proofs.set(hash,p);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')warnings.push('Bewijscache '+hash.slice(0,12)+' is ongeldig of niet leesbaar; niet gebruikt voor verificatie.');}
 }
 return {proofs,warnings};
}
/** Called under the existing Intelligence revision lock. Appends a new cache only.
 * Existing source records, candidates, approvals and audit entries are never edited.
 */
export async function collectProof(state:IntelligenceState,id:string,transport:Transport=url=>pinnedGet(url,true)){
 const view=documentView(state,id),doc=view?.effective;
 if(!doc?.pdf||doc.pdf.status!=='processed'||!doc.pdf.fileHash||doc.companyId!=='advantage-energy')throw new IntelligenceError('Kies een reeds verwerkte officiële Advantage-PDF-analyse.');
 const cached=await readProofs(state);if(cached.proofs.has(doc.pdf.fileHash))return {cached:true,fileHash:doc.pdf.fileHash,documentId:doc.id};
 const url=allowedResource(doc.url,true);if(!/\.pdf$/i.test(url.pathname))throw new IntelligenceError('Alleen geregistreerde PDF-bronnen zijn toegestaan.');
 try{
  const robots=await transport(new URL('/robots.txt',url).href);if(robots.status!==200||!robotsAllows(robots.text,url.pathname))throw Error('De bron staat automatische bewijsdownload niet toe.');
  const response=await transport(url.href);if(response.status!==200||!response.bytes||!/^application\/pdf(?:;|$)/i.test(response.contentType??''))throw Error('De bron leverde geen bruikbare PDF.');
  const bytes=response.bytes;if(bytes.length>4*1024*1024)throw Error('De PDF overschrijdt de veilige limiet.');
  const hash=createHash('sha256').update(bytes).digest('hex');if(hash!==doc.pdf.fileHash)throw Error('De officiële PDF is gewijzigd: hash wijkt af van de bestaande analyse. Geen bewijs gekoppeld; analyseer de nieuwe bronversie afzonderlijk.');
  await cacheProof(makeProof(hash,PDF_PARSER,await readPdf(bytes)));
  return {cached:false,fileHash:hash,documentId:doc.id};
 }catch(e){throw new IntelligenceError(e instanceof IntelligenceError?e.message:e instanceof Error&&e.message.startsWith('De ')?e.message:'PDF-bewijs kon niet veilig worden gecontroleerd. Er is niets goedgekeurd; controleer netwerk, bron en parser.',422);}
}

/** Append-only proof cache. Never replace unknown files, links or corrupt evidence. */
export async function cacheProof(proof:Proof){
 if(!validProof(proof)||proof.parser!==PDF_PARSER)throw new IntelligenceError('Ongeldige PDF-bronlayout.');
 const body=JSON.stringify(proof);if(Buffer.byteLength(body)>3*1024*1024)throw new IntelligenceError('Bronlayout overschrijdt de cachelimiet.');
 const dir=await intelligenceDirectory();await fs.mkdir(dir,{recursive:true,mode:0o700});const dest=path.join(dir,name(proof.fileHash));
 try{const st=await fs.lstat(dest);if(!st.isFile()||st.isSymbolicLink()||st.size>3*1024*1024)throw new IntelligenceError('Bestaande bewijscache is onveilig; niet overschreven.');const old=JSON.parse(await fs.readFile(dest,'utf8')) as Proof;if(validProof(old)&&old.fileHash===proof.fileHash&&old.parser===proof.parser)return;throw new IntelligenceError('Bestaande bewijscache is ongeldig; niet overschreven.');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const tmp=path.join(dir,'verification-pending-'+randomUUID()+'.tmp');
 try{await fs.writeFile(tmp,body,{flag:'wx',mode:0o600});await fs.copyFile(tmp,dest,fs.constants.COPYFILE_EXCL);}finally{await fs.unlink(tmp).catch(()=>{});}
}
