import {createHash} from 'node:crypto';
import {SOURCE_CHANNELS} from './sources';
import {robotsAllows} from './connectors';
import {allowedResource,pinnedGet,FetchError,type Transport} from './transport';
import {PDF_PARSER,readPdf,PdfParseError} from './pdf-parser';
import {extractPdfTables,type PdfText} from './pdf-tables';
import {IntelligenceError,registerPdfAnalysis} from './workflow';
import {cacheProof,collectProof} from './verification-storage';
import {makeProof,inspectCell} from './verification';
import {FINANCIAL_DOCUMENTS} from '../financial-dossiers';
import type {IntelligenceState} from './contracts';
const active=new Set<string>();
export async function analyseDocument(original:IntelligenceState,documentId:string,at:string,transport:Transport=url=>pinnedGet(url,true),parser:(b:Buffer)=>Promise<PdfText>=readPdf){
 const source=original.documents.find(d=>d.id===documentId);
 if(!source||source.companyId!=='advantage-energy'||source.sourceClass!=='primary'||!source.monitoring&&!source.pdf)throw new IntelligenceError('Kies een via bronmonitoring geregistreerd officieel Advantage-PDF-document.');
 const channel=SOURCE_CHANNELS.find(c=>c.id===(source.monitoring?.channelId??original.documents.find(d=>d.id===source.pdf?.sourceDocumentId)?.monitoring?.channelId));
 const url=allowedResource(source.url,true);
 if(!channel||channel.companyId!==source.companyId||new URL(channel.url).hostname!==url.hostname||!url.pathname.endsWith('.pdf'))throw new IntelligenceError('Deze bron is niet toegestaan voor PDF-verwerking.');
 if(source.pdf?.status==='processed'||original.documents.some(d=>d.pdf?.status==='processed'&&d.pdf.parser===PDF_PARSER&&(d.pdf.sourceDocumentId===(source.pdf?.sourceDocumentId??source.id)||source.monitoring?.bodyHash&&d.pdf.fileHash===source.monitoring.bodyHash)))return original;
 if(active.has(documentId))throw new IntelligenceError('Documentverwerking is al bezig.',409);
 active.add(documentId);let fileHash:string|null=null;
 try{
  const robots=await transport(new URL('/robots.txt',url).href);if(robots.status!==200||!robotsAllows(robots.text,url.pathname))throw new FetchError('ROBOTS');
  const response=await transport(url.href);if(response.status!==200)throw new FetchError('HTTP_'+response.status);
  const b=response.bytes;
  if(!/^application\/pdf(?:;|$)/i.test(response.contentType??'')||!b)throw new FetchError('PDF_MIME');
  if(b.length>4*1024*1024)throw new FetchError('PDF_SIZE');if(b.subarray(0,5).toString()!=='%PDF-')throw new FetchError('PDF_FORMAT');
  fileHash=createHash('sha256').update(b).digest('hex');
  if(original.documents.some(d=>d.companyId===source.companyId&&d.pdf?.fileHash===fileHash&&d.pdf.parser===PDF_PARSER&&d.pdf.status==='processed'))return original;
  // Recovery is deliberately evidence-only. The eight existing observations belong
  // to the separate consolidated statements, not to this annual-report analysis.
  const rootId=source.pdf?.sourceDocumentId??source.id;
  const recovery=url.pathname.endsWith('/Annual-Report-2025-FINAL.pdf')&&original.documents.some(d=>d.pdf?.sourceDocumentId===rootId&&d.pdf.status!=='processed');
  const priorHashes=[...new Set(original.documents.filter(d=>d.pdf?.sourceDocumentId===rootId&&d.pdf.fileHash).map(d=>d.pdf!.fileHash))];
  if(recovery&&(priorHashes.length!==1||priorHashes[0]!==fileHash))throw new IntelligenceError('PDF_HASH_MISMATCH');
  const parsed=await parser(b);const result=extractPdfTables(parsed);
  const readable=parsed.pages.some(p=>p.rows.some(r=>r.cells.some(c=>/[A-Za-z]{3}/.test(c.text))));
  if(!readable)throw Error('PDF_NO_TEXT');
  if(recovery){
   const proof=makeProof(fileHash,PDF_PARSER,parsed);await cacheProof(proof);
   const matches=original.candidates.filter(c=>c.companyId===source.companyId&&c.pdf&&c.datum.kind==='reported'&&result.values.filter(v=>v.metric===c.metric&&v.definition===c.pdf!.definition&&v.period.start===c.datum.period.start&&v.period.end===c.datum.period.end&&v.periodType===c.pdf!.periodType&&v.unit===c.datum.unit&&v.currency===c.currency&&v.scale===c.pdf!.scale&&v.rawNumber===c.pdf!.rawNumber&&v.value===c.datum.value&&c.datum.scope===v.scope&&Boolean(inspectCell({...c,quote:v.quote,pdf:{...c.pdf!,header:v.header,page:v.page}},proof,v.page).cell)).length===1);
   // Only obtain proof for each candidate's OWN registered document/hash. No
   // candidate IDs, source links, values, decisions or fingerprints are rewritten.
   const notes=[`[PDF_RECOVERY] Jaarverslag hersteld: ${parsed.pages.length} pagina’s; 0 nieuwe kandidaten. ${matches.length} bestaande kandidaten hebben een overeenkomstige broncel. Hun oorspronkelijke bronkoppeling blijft behouden.`,...result.warnings];
   for(const id of [...new Set(matches.map(c=>c.documentId))]){
    try{await collectProof(original,id,transport);notes.push(`Eigen PDF-bronbewijs gecontroleerd voor analyse ${id}. De bestaande verifier bepaalt de status; geen menselijke goedkeuring.`);}
    catch(e){notes.push(`Eigen bronbewijs voor ${id} niet beschikbaar: ${e instanceof Error?e.message:'onbekende fout'}. Kandidaat blijft afhankelijk van zijn oorspronkelijke bronbewijs.`);}
   }
   return registerPdfAnalysis(original,source.id,{fileHash,parser:PDF_PARSER,pages:parsed.pages.length,values:[],warnings:notes,reportDate:result.reportDate,publishedAt:source.publishedAt,errorCode:null},at);
  }
  const priorHash=source.monitoring?.bodyHash;
  const changedVersion=original.documents.some(d=>d.url===source.url&&d.pdf?.status==='processed'&&d.pdf.fileHash!==fileHash);
  const published=changedVersion||priorHash&&priorHash!==fileHash?null:FINANCIAL_DOCUMENTS.find(d=>d.uri===source.url)?.publishedAt||source.publishedAt;
  return registerPdfAnalysis(original,source.id,{...result,fileHash,parser:PDF_PARSER,pages:parsed.pages.length,publishedAt:published,errorCode:null},at);
 }catch(error){
  const code=error instanceof FetchError?error.code:error instanceof Error&&/^PDF_[A-Z_]+$/.test(error.message)?error.message:'PDF_UNREADABLE_OR_LIMIT';
  return registerPdfAnalysis(original,source.id,{fileHash,parser:PDF_PARSER,pages:0,values:[],warnings:[error instanceof PdfParseError&&error.pages?`PDF bevat ${error.pages} pagina’s; veilige paginagrens ${error.limit}. Er zijn geen pagina’s verwerkt.`:'Document niet automatisch leesbaar of veilig verwerkt. Bronbewijs en financiële blokkades blijven behouden.'],reportDate:null,publishedAt:null,errorCode:code},at);
 }finally{active.delete(documentId);}
}
