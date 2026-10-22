/** Explicit opt-in, read-only official-file check. Never downloads or writes user data.
 * node scripts/run-regressions.cjs --child scripts/validate-annual-recovery.ts
 * Set PHOENIX_PUBLIC_PDF_FIXTURES to a folder containing the four original PDFs.
 * PHOENIX_READONLY_STATE may point to an API JSON export for read-only identity checks.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPdf,PDF_PARSER} from '../data/multi-sector/research/intelligence/pdf-parser';
import {extractPdfTables} from '../data/multi-sector/research/intelligence/pdf-tables';
import {makeProof,validProof,verifyAll,type Proof} from '../data/multi-sector/research/intelligence/verification';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {cacheProof,readProofs} from '../data/multi-sector/research/intelligence/verification-storage';
import {emptyIntelligenceState,registerDiscovered,registerPdfAnalysis,decideCandidate,assertState} from '../data/multi-sector/research/intelligence/workflow';
import type {IntelligenceState} from '../data/multi-sector/research/intelligence/contracts';
async function main(){
 const dir=process.env.PHOENIX_PUBLIC_PDF_FIXTURES;if(!dir)throw Error('Geef PHOENIX_PUBLIC_PDF_FIXTURES op. Geen herstelclaim zonder originele PDF.');
 const proofs=new Map<string,Proof>(),files=new Map<string,Buffer>(),results=[];
 for(const [name,pages,expectedHash,values] of [
  ['Annual-Report-2025-FINAL.pdf',126,'1b8de63c7dc981e5322d552abd4938a7a8aa8764f3f04decde4b4698007789bc',10],
  ['2025-Consolidated-Financial-Statements.pdf',59,'43d4867165948a7d27fd184b00497fae544cff454cd38ff594241b42418da117',8],
  ['2026-First-Quarter-Report.pdf',67,null,32],
  ['Q2-2026-Report(1).pdf',71,null,54],
 ] as const){
  const b:Buffer=await fs.readFile(path.join(dir,name));const hash:string=createHash('sha256').update(b).digest('hex');const start=Date.now(),layout=await readPdf(b),extracted=extractPdfTables(layout),proof=makeProof(hash,PDF_PARSER,layout);
  if(expectedHash)assert.equal(hash,expectedHash);assert.equal(layout.pages.length,pages);assert.equal(extracted.values.length,values);assert.ok(validProof(proof));proofs.set(hash,proof);files.set(name,b);
  results.push({name,bytes:b.length,hash,pages:layout.pages.length,proposals:extracted.values.length,layoutBytes:Buffer.byteLength(JSON.stringify(layout)),elapsedMs:Date.now()-start});
 }
 // Public document values, newly registered in an isolated QA fixture. No user
 // snapshot or real approval enters this writable integration test.
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'phoenix-real-pdf-fixture-')),saved=process.env.PHOENIX_INTELLIGENCE_DATA_DIR;
 process.env.PHOENIX_INTELLIGENCE_DATA_DIR=tmp;let recoveryIntegration:unknown;
 try{
  const at='2026-10-22T10:00:00Z';let fixture=emptyIntelligenceState();
  const register=(name:string,type:'annual'|'quarterly')=>{
   const bytes=files.get(name)!,fileHash=createHash('sha256').update(bytes).digest('hex');
   const url='https://www.advantageog.com/wp-content/uploads/'+name.replace('(1)','');
   const found=registerDiscovered(fixture,{companyId:'advantage-energy',title:'Isolated public PDF fixture '+name,type,event:'financial-report',issuer:'Advantage Energy Ltd.',url,sourceClass:'primary',publishedAt:'2026-08-01',period:{start:'',end:''},currency:null,text:'',locator:'Isolated QA fixture; no real user approval',supersedes:null,method:'automatic-discovery',monitoring:{channelId:'aav-financials',bodyHash:fileHash,hashBasis:'pdf-bytes',processing:'manual-required',warnings:[],previousVersion:null}},at);
   fixture=found.state;return {id:found.documentId,fileHash,proof:proofs.get(fileHash)!};
  };
  for(const name of ['Q2-2026-Report(1).pdf','2026-First-Quarter-Report.pdf','2025-Consolidated-Financial-Statements.pdf']){
   const source=register(name,name.startsWith('2025')?'annual':'quarterly');
   fixture=registerPdfAnalysis(fixture,source.id,{...extractPdfTables(source.proof.layout),fileHash:source.fileHash,parser:PDF_PARSER,pages:source.proof.layout.pages.length,publishedAt:'2026-08-01',errorCode:null},at);
   await cacheProof(source.proof);
  }
  assert.equal(fixture.candidates.length,94);
  const eight=fixture.candidates.slice(-8),c=eight[0],doc=fixture.documents.find(d=>d.id===c.documentId)!;
  fixture=decideCandidate(fixture,{candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:'approve',reason:'Fictieve QA-beslissing voor behoudtest; geen echte gebruikersgoedkeuring.',attested:true},at);
  const annual=register('Annual-Report-2025-FINAL.pdf','annual');
  fixture=registerPdfAnalysis(fixture,annual.id,{fileHash:annual.fileHash,parser:PDF_PARSER,pages:0,values:[],warnings:['Isolated reproduction of historical failure'],reportDate:null,publishedAt:null,errorCode:'PDF_UNREADABLE_OR_LIMIT'},at);
  const before=fixture,failedId=before.documents.at(-1)!.id;
  const after=await analyseDocument(before,annual.id,at,async url=>url.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',contentType:'application/pdf',bytes:files.get(new URL(url).pathname.split('/').at(-1)!)!});
  assertState(after);assert.equal(after.documents.at(-1)!.pdf!.pages,126);assert.match(after.documents.at(-1)!.pdf!.warnings[0],/12 bestaande/);
  assert.deepEqual(after.candidates,before.candidates);assert.deepEqual(after.decisions,before.decisions);assert.deepEqual(after.documents.slice(0,before.documents.length),before.documents);assert.deepEqual(after.audit.slice(0,before.audit.length),before.audit);
  const evidence=await readProofs(after),verified=verifyAll(after,evidence.proofs);assert.equal(verified.filter(v=>eight.some(c=>c.id===v.candidateId)&&v.classification==='green').length,8);
  const again=await analyseDocument(after,failedId,at,async()=>{throw Error('No network on repeat');});assert.strictEqual(again,after);
  recoveryIntegration={candidatesBefore:94,candidatesAfter:after.candidates.length,newCandidates:0,syntheticApprovalPreserved:after.decisions.length,existingEightGreen:8,historyPreserved:true,repeatUnchanged:true,valuationReleased:false};
  if(process.env.PHOENIX_EXPORT_QA_RECOVERY)await fs.writeFile(process.env.PHOENIX_EXPORT_QA_RECOVERY,JSON.stringify({state:after,proofs:[...evidence.proofs.values()],originalId:annual.id,failedId,recoveredId:after.documents.at(-1)!.id,statementsId:doc.id}),{flag:'wx'});
 }finally{if(saved===undefined)delete process.env.PHOENIX_INTELLIGENCE_DATA_DIR;else process.env.PHOENIX_INTELLIGENCE_DATA_DIR=saved;await fs.rm(tmp,{recursive:true,force:true});}
 let stateCheck:unknown='Geen API-export opgegeven; historische gebruikersbeslissingen niet geïnspecteerd.';
 if(process.env.PHOENIX_READONLY_STATE){
  const f=process.env.PHOENIX_READONLY_STATE,before=await fs.readFile(f),api=JSON.parse(before.toString()),state=(api.state??api) as IntelligenceState;assertState(state);
  const original=state.documents.find(d=>d.id.startsWith('2e29f2ff530d'))!,failed=state.documents.find(d=>d.id.startsWith('e551c766dbbb'))!;assert.ok(original&&failed);assert.equal(failed.pdf!.sourceDocumentId,original.id);assert.ok(proofs.has(failed.pdf!.fileHash!));
  const eight=state.candidates.filter(c=>c.pdf?.fileHash==='43d4867165948a7d27fd184b00497fae544cff454cd38ff594241b42418da117');assert.equal(eight.length,8);assert.ok(eight.every(c=>c.documentId==='83a51f59a29306a34f35225494a87479583b4d14e4e2e02743a6f805c45d90d2'));
  const verified=verifyAll(state,proofs);const eightReports=verified.filter(v=>eight.some(c=>c.id===v.candidateId));assert.equal(eightReports.length,8);assert.ok(eightReports.every(v=>v.checks.some(c=>c.id==='source-layout'&&c.status==='pass')));
  assert.deepEqual(await fs.readFile(f),before);
  stateCheck={readOnly:true,candidates:state.candidates.length,decisionsInSuppliedSnapshot:state.decisions.length,originalId:original.id,failedId:failed.id,eightReports,existingEight:eight.map(c=>({id:c.id,documentId:c.documentId,metric:c.metric,period:c.datum.period,page:c.pdf!.page,value:c.datum.value})),verification:verified.reduce((a,v)=>({...a,[v.classification]:(a[v.classification]??0)+1}),{} as Record<string,number>)};
 }
 console.log(JSON.stringify({status:'PASS',results,recoveryIntegration,stateCheck,noUserWrites:true},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
