import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fixturePdf} from './pdf-test-fixture';
import {analyseDocument} from '../data/multi-sector/research/intelligence/pdf-analysis';
import {readPdf,PDF_PARSER} from '../data/multi-sector/research/intelligence/pdf-parser';
import {emptyIntelligenceState,registerDiscovered,assertState,decideCandidate,candidateProblems} from '../data/multi-sector/research/intelligence/workflow';
import {verifyAll,verifyCandidate,makeProof,flowCrossChecks} from '../data/multi-sector/research/intelligence/verification';
import {approveVerifiedBatch} from '../data/multi-sector/research/intelligence/verification-batch';
import {fingerprint} from '../data/multi-sector/research/intelligence/extraction';
import type {Candidate} from '../data/multi-sector/research/intelligence/contracts';
import {getAavValidationReview} from '../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-validation-review';
import {verificationFixture} from './verification-test-fixture';
const mutate=(candidate:Candidate,change:(c:Candidate)=>void)=>{const c=structuredClone(candidate);change(c);const {id,fingerprint:fp,...base}=c;const h=fingerprint(base);return {...base,id:h,fingerprint:h};};
async function main(){
 const {state,proof,at}=await verificationFixture();const proofs=new Map([[proof.fileHash,proof]]),before=JSON.stringify(state);
 const reports=verifyAll(state,proofs);assert.equal(reports.length,10);assert.ok(reports.every(r=>r.classification==='green'));assert.deepEqual(verifyAll(state,proofs),reports);assert.equal(JSON.stringify(state),before);
 assert.ok(verifyAll(state,new Map()).every(r=>r.classification==='unverifiable'));
 const first=state.candidates[0];const classify=(c:Candidate)=>verifyCandidate({...state,candidates:[c]},c,proofs);
 for(const [name,change] of [
  ['1000x scale',(c:Candidate)=>{c.pdf!.scale=1;}],
  ['same arithmetic but incorrect source scale',(c:Candidate)=>{c.pdf!.scale=1;c.datum.value=c.datum.value!/1000;}],
  ['wrong period',(c:Candidate)=>{c.datum.period={start:'2026-01-01',end:'2026-06-30'};c.pdf!.periodType='year-to-date';}],
  ['Advantage vs Entropy',(c:Candidate)=>{c.datum.scope='advantage-energy:entropy:pre-wembley';}],
  ['wrong scope company prefix',(c:Candidate)=>{c.datum.scope='abrasilver:consolidated:pre-wembley';}],
  ['wrong event context',(c:Candidate)=>{c.datum.scope='advantage-energy:consolidated:event-basis-unreconciled';}],
  ['wrong currency',(c:Candidate)=>{c.currency='USD';c.datum.unit='USD';}],
  ['wrong page',(c:Candidate)=>{c.pdf!.page=999;}],
  ['wrong version',(c:Candidate)=>{c.documentId='not-the-analysis';}],
  ['wrong file hash',(c:Candidate)=>{c.pdf!.fileHash='a'.repeat(64);}],
  ['negative sign missing',(c:Candidate)=>{c.datum.value=-c.datum.value!;}],
 ] as const)assert.equal(classify(mutate(first,change)).classification,'red',name);
 const unknown=classify(mutate(first,c=>{c.metric='grossDebt';c.pdf!.definition='Total debt';}));assert.notEqual(unknown.classification,'green');
 const basic=mutate(first,c=>{c.metric='basicWeightedShares';c.datum.unit='shares';c.currency=null;c.pdf!.definition='Diluted weighted average shares (000)';});assert.notEqual(classify(basic).classification,'green');
 const missing=mutate(first,c=>{c.quote='No original source passage';});assert.notEqual(classify(missing).classification,'green');
 const badProof=structuredClone(proof);badProof.layout.pages[0].rows=[];assert.ok(verifyAll(state,new Map([[proof.fileHash,badProof]])).every(r=>r.classification==='unverifiable'));
 const contrary=mutate(first,c=>{c.datum.value=c.datum.value!+1000;});const conflictState={...state,candidates:[...state.candidates,contrary]};assert.equal(verifyCandidate(conflictState,first,proofs).classification,'red');
 const duplicate=mutate(first,c=>{c.label+=' duplicate';});assert.equal(verifyCandidate({...state,candidates:[...state.candidates,duplicate]},first,proofs).classification,'red');
 assert.equal(classify(mutate(first,c=>{c.pdf!.page=0;})).classification,'unverifiable');
 assert.equal(classify(mutate(first,c=>{c.pdf!.header='Wrong saved table header';})).classification,'red');
 assert.equal(classify(mutate(first,c=>{c.datum.unit='%';})).classification,'red');
 assert.notEqual(classify(mutate(first,c=>{c.datum.kind='guidance';})).classification,'green');
 // A real new PDF-version identity and audit chain, not a mutated old record.
 const changedBytes=fixturePdf(true),changedHash=createHash('sha256').update(changedBytes).digest('hex');
 const {id:sourceId,version:sourceVersion,discoveredAt:sourceAt,status:sourceStatus,contentHash:sourceContent,...core}=state.documents[0];
 const discovered=registerDiscovered(state,{...core,monitoring:{...core.monitoring!,bodyHash:changedHash,previousVersion:sourceId}},at);
 const restated=await analyseDocument(discovered.state,discovered.documentId,at,async url=>url.endsWith('robots.txt')?{status:200,text:'User-agent: *\nDisallow:'}:{status:200,text:'',bytes:changedBytes,contentType:'application/pdf'});assertState(restated);
 const revisedProof=makeProof(changedHash,PDF_PARSER,await readPdf(changedBytes));
 const restatedReport=verifyCandidate(restated,first,new Map([...proofs,[changedHash,revisedProof]]));assert.equal(restatedReport.classification,'orange');assert.ok(restatedReport.checks.some(c=>c.id.startsWith('conflict:')&&c.status==='missing'));
 assert.equal(reports[0].historical,true);assert.equal(reports[0].modelEligible,false);assert.equal(reports[0].valuationReleased,false);
 const docs=new Map(state.documents.map(d=>[d.id,d]));const items=reports.slice(0,2).map(r=>{const c=state.candidates.find(c=>c.id===r.candidateId)!;assert.deepEqual(candidateProblems(state,c,'2026-10-22'),[]);return {candidateId:c.id,fingerprint:c.fingerprint,documentHash:docs.get(c.documentId)!.contentHash,verificationHash:r.hash};});
 const input={items,reason:'Fictieve bronnen gecontroleerd voor groepsregressie.',confirmed:true,attested:true};
 const approved=approveVerifiedBatch(state,input,at,proofs);assertState(approved);assert.equal(approved.decisions.length,2);assert.equal(approved.audit.length,state.audit.length+2);assert.deepEqual(approved.audit.slice(0,state.audit.length),state.audit);assert.deepEqual(approved.candidates,state.candidates);assert.deepEqual(approved.documents,state.documents);
 for(const bad of [{...input,confirmed:false},{...input,attested:false},{...input,items:[items[0],{...items[1],verificationHash:'stale'}]},{...input,items:[items[0],items[0]]},{...input,items:[items[0],{...items[1],documentHash:'changed'}]}])assert.throws(()=>approveVerifiedBatch(state,bad,at,proofs));
 assert.throws(()=>approveVerifiedBatch(approved,input,at,proofs));assert.equal(JSON.stringify(state),before,'partial failures never modify input');
 const one=decideCandidate(state,{candidateId:items[0].candidateId,fingerprint:items[0].fingerprint,documentHash:items[0].documentHash,action:'approve',reason:'Earlier explicit synthetic human approval',attested:true},at);
 const onlySecond=approveVerifiedBatch(one,{...input,items:[items[1]]},at,proofs);assert.deepEqual(onlySecond.decisions[0],one.decisions[0]);assert.deepEqual(onlySecond.audit.slice(0,one.audit.length),one.audit);
 const repeat=await analyseDocument(onlySecond,state.documents[0].id,at,async()=>{throw Error('no download');});assert.deepEqual(repeat,onlySecond);assert.equal(getAavValidationReview().passed,6);
 // No arithmetic on debt, stocks, ratios, averages or weighted shares.
 const flows=flowCrossChecks(state);assert.equal(flows.length,0,'no fabricated Q1 facts');
 const debt={...state,candidates:state.candidates.map(c=>({...c,metric:'netDebt'}))};assert.deepEqual(flowCrossChecks(debt),[]);
 const q2=state.candidates.find(c=>c.metric==='revenue'&&c.datum.period.start==='2026-04-01')!,h1=state.candidates.find(c=>c.metric==='revenue'&&c.datum.period.start==='2026-01-01')!;
 const q1=mutate(q2,c=>{c.datum.period={start:'2026-01-01',end:'2026-03-31'};c.datum.value=h1.datum.value!-q2.datum.value!;});
 assert.equal(flowCrossChecks({...state,candidates:[q1,q2,h1]})[0].status,'pass');
 assert.equal(flowCrossChecks({...state,candidates:[mutate(q1,c=>{c.datum.value=c.datum.value!+100000;}),q2,h1]})[0].status,'conflict');
 console.log('PASS: deterministic independent source-column checks, proof corruption, scale/sign/currency/period/scope/version conflicts, explicit missing evidence, historical separation, additive-only arithmetic, all-or-nothing batch preflight, immutable prior approvals/audits and AAV 6/17. Synthetic PDF and network only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
