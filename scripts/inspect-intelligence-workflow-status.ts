import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {verificationFixture} from './verification-test-fixture';
import {integrationFixture} from './intelligence-integration-fixture';
import {fingerprint} from '../data/multi-sector/research/intelligence/extraction';
import {workflowStatuses,reconciliationFor,groupCandidates} from '../data/multi-sector/research/intelligence/workflow-status';
import {modelReadinessView} from '../data/multi-sector/research/intelligence/model-readiness-view';
import {verifyAll,type Verification} from '../data/multi-sector/research/intelligence/verification';
import {candidateProblems,decideCandidate,assertState} from '../data/multi-sector/research/intelligence/workflow';
import {approveVerifiedBatch} from '../data/multi-sector/research/intelligence/verification-batch';
import {filterVerified,emptyFilters} from '../app/research/intelligence/VerificationPanel';
import {GET,POST} from '../app/api/research/intelligence/route';
import {readIntelligence,mutateIntelligence} from '../data/multi-sector/research/intelligence/storage';
async function main(){
 const f=await verificationFixture(),proofs=new Map([[f.proof.fileHash,f.proof]]),reports=verifyAll(f.state,proofs),problems=f.state.candidates.map(c=>({id:c.id,problems:candidateProblems(f.state,c,'2026-10-22')}));
 const statuses=workflowStatuses(f.state,reports,problems);assert.ok(statuses.every(s=>s.source==='green'&&s.reconciliation.status==='checks-passed'&&s.human==='pending'&&!s.modelValidated&&!s.valuationReleased));
 for(const metric of ['adjustedFundsFlow','netCapex','netDebt']){const c={...f.state.candidates[0],metric};assert.equal(reconciliationFor(c,reports[0],[]).status,'manual-required','Non-GAAP never auto-clears on a green-looking report');assert.ok(reconciliationFor(c,reports[0],[]).requiredEvidence.length>=2);}
 const first=f.state.candidates[0];assert.equal(reconciliationFor(first,reports[0],['Missing publication']).status,'blocked');assert.equal(reconciliationFor(first,undefined,[]).status,'not-assessed');
 for(const classification of ['orange','red','unverifiable'] as const)assert.notEqual(reconciliationFor(first,{...reports[0],classification},[]).status,'checks-passed');
 // Synthetic presentation corpus: no forged proof is submitted to approval/storage.
 let large=integrationFixture().state;large={...large,candidates:large.candidates.map((c,i)=>{const metric=i>=88?'netDebt':i>=82?'netCapex':i>=76?'adjustedFundsFlow':c.metric;const {id,fingerprint:fp,...base}=c;const v={...base,metric,issues:i<40?['Fictieve ontbrekende publicatiedatum']:[]};const h=fingerprint(v);return {...v,id:h,fingerprint:h};})};assertState(large);
 const approved=large.candidates[50],doc=large.documents.find(d=>d.id===approved.documentId)!;
 large=decideCandidate(large,{candidateId:approved.id,fingerprint:approved.fingerprint,documentHash:doc.contentHash,action:'approve',reason:'Explicit fictional earlier approval for immutable status regression.',attested:true},f.at);
 const largeBefore=JSON.stringify(large),mockReports=large.candidates.map((c,i)=>({...reports[0],candidateId:c.id,classification:i<76?'green':'orange'})) as Verification[];
 const largeStatuses=workflowStatuses(large,mockReports,large.candidates.map(c=>({id:c.id,problems:c.issues})));assert.equal(largeStatuses.length,94);assert.equal(largeStatuses.filter(s=>s.importWarnings.length).length,40);assert.equal(largeStatuses.filter(s=>s.source==='unverifiable').length,0);assert.equal(largeStatuses.filter(s=>s.human==='approve').length,1);assert.equal(largeStatuses.filter(s=>s.reconciliation.status==='manual-required').length,18);assert.equal(JSON.stringify(large),largeBefore);
 for(const by of ['none','company','source','analysis','period','metric','verification','reconciliation','relevance'] as const){const groups=groupCandidates(large.candidates,largeStatuses,by);assert.equal(groups.flatMap(g=>g.candidates).length,94);assert.equal(new Set(groups.flatMap(g=>g.candidates.map(c=>c.id))).size,94);}
 assert.equal(filterVerified(large,mockReports,{...emptyFilters,reconciliation:'manual-required'},largeStatuses).length,18);assert.equal(filterVerified(large,mockReports,{...emptyFilters,human:'approve'},largeStatuses).length,1);
 const source=largeStatuses[0].originalDocumentId;assert.ok(filterVerified(large,mockReports,{...emptyFilters,sourceDocument:source},largeStatuses).every(c=>largeStatuses.find(s=>s.candidateId===c.id)!.originalDocumentId===source));
 const readiness=modelReadinessView(large,largeStatuses);assert.equal(readiness[0].passed,6);assert.equal(readiness[0].total,17);assert.equal(readiness[1].status,'blocked');assert.ok(readiness.every(c=>!c.valuationReleased&&c.fields.every(f=>!f.research.modelValidated)));assert.equal(JSON.stringify(large),largeBefore);
 assert.ok(readiness[0].fields.filter(f=>f.basis.startsWith('Actuele')).every(f=>f.research.candidateIds.length===0));
 const items=reports.slice(0,2).map(r=>{const c=f.state.candidates.find(c=>c.id===r.candidateId)!,d=f.state.documents.find(d=>d.id===c.documentId)!;return {candidateId:c.id,fingerprint:c.fingerprint,documentHash:d.contentHash,verificationHash:r.hash};});
 const batch={items,confirmed:true,attested:true,reason:'Explicit synthetic all-or-nothing review.'};const before=JSON.stringify(f.state);
 assert.throws(()=>approveVerifiedBatch(f.state,{...batch,items:[items[0],{...items[1],fingerprint:'stale'}]},f.at,proofs));assert.equal(JSON.stringify(f.state),before);
 const after=approveVerifiedBatch(f.state,batch,f.at,proofs);assert.equal(after.decisions.length,2);assert.deepEqual(after.candidates,f.state.candidates);assert.deepEqual(after.documents,f.state.documents);assert.deepEqual(after.audit.slice(0,f.state.audit.length),f.state.audit);assert.throws(()=>approveVerifiedBatch(after,batch,f.at,proofs));
 const missingProof=verifyAll(after,new Map());const historical=workflowStatuses(after,missingProof,after.candidates.map(c=>({id:c.id,problems:candidateProblems(after,c,'2026-10-22')})));assert.equal(historical.filter(s=>s.human==='approve').length,2);assert.ok(historical.every(s=>s.reconciliation.status==='blocked'));assert.deepEqual(after.decisions,approveVerifiedBatch(f.state,batch,f.at,proofs).decisions);
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'phoenix-workflow-api-')),saved=process.env.PHOENIX_INTELLIGENCE_DATA_DIR;process.env.PHOENIX_INTELLIGENCE_DATA_DIR=dir;
 try{await mutateIntelligence(0,()=>f.state);await fs.writeFile(path.join(dir,'verification-proof-'+f.proof.fileHash+'.json'),JSON.stringify(f.proof));
  const api=await(await GET()).json();assert.equal(api.workflow.length,10);assert.equal(api.modelReadiness[0].passed,6);assert.equal(api.modelReadiness[1].status,'blocked');assert.equal(api.valuationReleased,false);assert.deepEqual(await readIntelligence(),f.state);
  const post=await POST(new Request('http://localhost:3000/api/research/intelligence',{method:'POST',headers:{Host:'localhost:3000',Origin:'http://localhost:3000','Content-Type':'application/json'},body:JSON.stringify({action:'approve-verified-batch',expectedRevision:f.state.revision,batch:{...batch,items:[items[0],{...items[1],verificationHash:'stale'}]}})}));assert.equal(post.status,409);assert.deepEqual(await readIntelligence(),f.state);
 }finally{if(saved===undefined)delete process.env.PHOENIX_INTELLIGENCE_DATA_DIR;else process.env.PHOENIX_INTELLIGENCE_DATA_DIR=saved;await fs.rm(dir,{recursive:true,force:true});}
 console.log('PASS: five independent stages; 94 identities / 76 green / 18 manual / 40 import warnings / 1 prior decision; all groupings and filters; fail-closed metadata/definitions; exact atomic batch, immutable history and GET; AAV 6/17 and AbraSilver blocked. Synthetic fixtures only.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
