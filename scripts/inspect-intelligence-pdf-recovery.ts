import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {GET,POST} from '../app/api/research/intelligence/route';
import {readIntelligence} from '../data/multi-sector/research/intelligence/storage';
import {annualLayout,layoutPdf} from './pdf-recovery-fixture';
import {integrationFixture,fixtureAt as at} from './intelligence-integration-fixture';
import {readPdf,PDF_PARSER,PDF_LIMITS,PdfParseError} from '../data/multi-sector/research/intelligence/pdf-parser';
import {extractPdfTables} from '../data/multi-sector/research/intelligence/pdf-tables';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {assertState,registerDiscovered,registerPdfAnalysis,decideCandidate} from '../data/multi-sector/research/intelligence/workflow';
import {makeProof,validProof,verifyAll,inspectCell} from '../data/multi-sector/research/intelligence/verification';
import {readProofs,cacheProof} from '../data/multi-sector/research/intelligence/verification-storage';
import {documentView,analysisOutcome} from '../data/multi-sector/research/intelligence/document-view';
import type {Transport} from '../data/multi-sector/research/intelligence/transport';
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
async function main(){
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'phoenix-recovery-fixture-')),prior=process.env.PHOENIX_INTELLIGENCE_DATA_DIR;process.env.PHOENIX_INTELLIGENCE_DATA_DIR=dir;
 try{
  const bytes=layoutPdf(annualLayout()),parsed=await readPdf(bytes);assert.equal(parsed.pages.length,126);assert.equal(extractPdfTables(parsed).values.length,8);
  assert.equal((await readPdf(layoutPdf(annualLayout(128)))).pages.length,128);
  await assert.rejects(readPdf(layoutPdf(annualLayout(129))),e=>e instanceof PdfParseError&&e.code==='PDF_PAGE_LIMIT'&&e.pages===129&&e.limit===128);
  await assert.rejects(readPdf(Buffer.alloc(PDF_LIMITS.maxBytes+1)),/PDF_SIZE/);
  await assert.rejects(readPdf(Buffer.from('invalid')),/PDF_FORMAT/);
  await assert.rejects(readPdf(bytes.subarray(0,bytes.length-30)),/PDF_EOF/);
  await assert.rejects(readPdf(Buffer.from('%PDF-1.4\ncorrupt\n%%EOF')),/PDF_UNREADABLE/);
  await assert.rejects(readPdf(bytes,1),/PDF_TIMEOUT/);
  const large=annualLayout(1);large.pages[0].rows=[{y:700,cells:[{x:50,text:'a'.repeat(4001)}]}];await assert.rejects(readPdf(layoutPdf(large)),/PDF_ITEM_SIZE_LIMIT/);
  const base=integrationFixture();let state={...base.state,revision:base.state.revision-1,documents:base.state.documents.slice(0,-1),candidates:base.state.candidates.slice(0,86),audit:base.state.audit.slice(0,-1)};
  // Fresh synthetic standalone registration: no production snapshot is loaded.
  const standalone=layoutPdf({...parsed,pages:parsed.pages.filter(p=>p.rows.length).map((p,i)=>({...p,number:i+1}))});
  const standaloneLayout=await readPdf(standalone);
  const source={companyId:'advantage-energy' as const,title:'Fictitious 2025 standalone financial statements',type:'annual' as const,event:'financial-report' as const,issuer:'Advantage Energy Ltd.',url:'https://www.advantageog.com/wp-content/uploads/2025-Consolidated-Financial-Statements.pdf',sourceClass:'primary' as const,publishedAt:'2026-03-01',period:{start:'',end:''},currency:null,text:'',locator:'Synthetic fixture only',supersedes:null,method:'automatic-discovery' as const,monitoring:{channelId:'aav-financials',bodyHash:hash(standalone),hashBasis:'pdf-bytes' as const,processing:'manual-required' as const,warnings:[],previousVersion:null}};
  let r=registerDiscovered(state,source,at);state=r.state;
  state=registerPdfAnalysis(state,r.documentId,{...extractPdfTables(standaloneLayout),fileHash:hash(standalone),parser:PDF_PARSER,pages:3,publishedAt:'2026-03-01',errorCode:null},at);
  const eight=state.candidates.slice(-8),ownAnalysis=state.documents.at(-1)!;
  assert.equal(state.candidates.length,94);
  const c=eight[0];state=decideCandidate(state,{candidateId:c.id,fingerprint:c.fingerprint,documentHash:ownAnalysis.contentHash,action:'approve',reason:'Explicit fictitious historical approval.',attested:true},at);
  r=registerDiscovered(state,{...source,title:'Fictitious 126-page annual report',url:'https://www.advantageog.com/wp-content/uploads/Annual-Report-2025-FINAL.pdf',monitoring:{...source.monitoring,bodyHash:hash(bytes)}},at);state=r.state;const originalId=r.documentId;
  state=registerPdfAnalysis(state,originalId,{fileHash:hash(bytes),parser:PDF_PARSER,pages:0,values:[],warnings:['Historical generic failure'],reportDate:null,publishedAt:null,errorCode:'PDF_UNREADABLE_OR_LIMIT'},at);
  assertState(state);const failedId=state.documents.at(-1)!.id,immutable=JSON.stringify(state);
  const calls:string[]=[];const transport:Transport=async url=>{calls.push(url);return url.endsWith('/robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',contentType:'application/pdf',bytes:url.endsWith('Annual-Report-2025-FINAL.pdf')?bytes:standalone};};
  const after=await analyseDocument(state,originalId,at,transport);assertState(after);
  assert.equal(JSON.stringify(state),immutable);assert.deepEqual(after.candidates,state.candidates);assert.deepEqual(after.decisions,state.decisions);assert.deepEqual(after.audit.slice(0,state.audit.length),state.audit);assert.deepEqual(after.documents.slice(0,state.documents.length),state.documents);
  assert.equal(after.candidates.length,94);assert.equal(after.decisions.length,1);assert.equal(after.documents.length,state.documents.length+1);
  const recovered=after.documents.at(-1)!;assert.equal(recovered.pdf?.pages,126);assert.equal(recovered.pdf?.sourceDocumentId,originalId);assert.match(recovered.pdf!.warnings[0],/8 bestaande/);assert.equal(documentView(after,failedId)!.effective.id,failedId);assert.equal(documentView(after,originalId)!.effective.id,recovered.id);
  assert.match(analysisOutcome(state,after,originalId).message,/0 nieuwe/);
  const evidence=await readProofs(after);assert.ok(validProof(evidence.proofs.get(hash(bytes))!));assert.equal(verifyAll(after,evidence.proofs).filter(v=>eight.some(c=>c.id===v.candidateId)&&v.classification==='green').length,8);
  const second=await analyseDocument(after,failedId,at,async()=>{throw Error('Repeated processing must not download or duplicate');});assert.strictEqual(second,after);
  assert.ok(calls.some(u=>u.endsWith('2025-Consolidated-Financial-Statements.pdf')));
  // Annual evidence alone may NOT replace the standalone candidate's own hash.
  assert.ok(verifyAll(after,new Map([[hash(bytes),makeProof(hash(bytes),PDF_PARSER,parsed)]])).filter(v=>eight.some(c=>c.id===v.candidateId)).every(v=>v.classification==='unverifiable'));
  const proof=evidence.proofs.get(hash(standalone))!;
  const revenue=eight.find(c=>c.metric==='revenue')!;
  const caption=structuredClone(proof.layout);caption.pages[1].rows[1].cells[0].text='(Expressed in thousands of Canadian dollars, except per share amounts)';
  const captionRevenue={...revenue,pdf:{...revenue.pdf!,header:revenue.pdf!.header.replace('All amounts expressed in thousands of Canadian dollars.','(Expressed in thousands of Canadian dollars, except per share amounts)')}};assert.ok(inspectCell(captionRevenue,makeProof(hash(standalone),PDF_PARSER,caption),revenue.pdf!.page).cell);
  for(const text of ['Revenue per share','Netback ($/boe)','Realized prices per boe']){const perUnit=structuredClone(caption);perUnit.pages[1].rows[0].cells.push({x:250,text});const perUnitCandidate={...captionRevenue,pdf:{...captionRevenue.pdf!,header:captionRevenue.pdf!.header.replace('Consolidated Statements','Consolidated Statements '+text)}};assert.match(inspectCell(perUnitCandidate,makeProof(hash(standalone),PDF_PARSER,perUnit),revenue.pdf!.page).error??'',/Bedrag per eenheid/);}

  for(const change of [(x:typeof c)=>{x.datum.period={start:'2024-12-31',end:'2024-12-31'};},(x:typeof c)=>{x.pdf!.rawNumber='999';},(x:typeof c)=>{x.datum.value=x.datum.value!/1000;},(x:typeof c)=>{x.pdf!.header='Wrong column';}]){const wrong=structuredClone(c);change(wrong);assert.ok(!inspectCell(wrong,proof,wrong.pdf!.page).cell);}
  const tampered=structuredClone(proof);tampered.layout.pages[0].rows=[];assert.equal(validProof(tampered),false);
  const badHash=await analyseDocument(state,originalId,at,async url=>url.endsWith('/robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',contentType:'application/pdf',bytes:Buffer.concat([bytes,Buffer.from('\n%changed')])});assert.equal(badHash.documents.at(-1)!.pdf!.errorCode,'PDF_HASH_MISMATCH');assert.deepEqual(badHash.candidates,state.candidates);
  // Real API calls in isolated storage, including exact failed-version requests.
  await fs.writeFile(path.join(dir,'intelligence-v1.json'),JSON.stringify(after),{flag:'wx'});
  const request=new Request('http://localhost:3000/api/research/intelligence',{method:'POST',headers:{'Content-Type':'application/json',Host:'localhost:3000',Origin:'http://localhost:3000'},body:JSON.stringify({action:'analyse-document',documentId:failedId,expectedRevision:after.revision})});
  const response=await POST(request),out=await response.json();assert.equal(response.status,200);assert.equal(out.analysis.analysisDocumentId,recovered.id);assert.match(out.analysis.message,/0 nieuwe/);assert.equal(out.valuationReleased,false);
  const api=await (await GET()).json();assert.equal(api.state.candidates.length,94);assert.equal(api.state.decisions.length,1);assert.match(api.aavVerification,/6\/17/);assert.equal(api.valuationReleased,false);assert.deepEqual(await readIntelligence(),after);
  // Unknown existing proof must never be overwritten.
  const unrelated='f'.repeat(64),unsafe=path.join(dir,'verification-proof-'+unrelated+'.json');await fs.writeFile(unsafe,'unknown local content');await assert.rejects(cacheProof(makeProof(unrelated,PDF_PARSER,parsed)));assert.equal(await fs.readFile(unsafe,'utf8'),'unknown local content');
  console.log('PASS: 126/128 pages; reject 129 with exact diagnostics; unchanged byte/item/time/EOF limits; 94 identities; 8 own-hash exact cells; annual hash mismatch; wrong columns/period/1000x; historical approval/audit; repeated recovery zero duplicates; append-only proof cache. Synthetic isolated fixtures only.');
 }finally{if(prior===undefined)delete process.env.PHOENIX_INTELLIGENCE_DATA_DIR;else process.env.PHOENIX_INTELLIGENCE_DATA_DIR=prior;await fs.rm(dir,{recursive:true,force:true});}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
