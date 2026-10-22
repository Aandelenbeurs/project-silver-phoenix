/** Explicit read-only source check. No storage mutations, downloads or approvals. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readPdf,PDF_PARSER} from '../data/multi-sector/research/intelligence/pdf-parser';
import {makeProof,verifyAll,type Proof} from '../data/multi-sector/research/intelligence/verification';
import {workflowStatuses} from '../data/multi-sector/research/intelligence/workflow-status';
import {modelReadinessView} from '../data/multi-sector/research/intelligence/model-readiness-view';
import {candidateProblems,assertState} from '../data/multi-sector/research/intelligence/workflow';
async function main(){
 const exportFile=process.env.PHOENIX_WORKFLOW_SOURCE_EXPORT,dir=process.env.PHOENIX_WORKFLOW_PDFS;if(!exportFile||!dir)throw Error('Geef PHOENIX_WORKFLOW_SOURCE_EXPORT en PHOENIX_WORKFLOW_PDFS op.');
 const before=await fs.readFile(exportFile),state=JSON.parse(before.toString()).state;assertState(state);const proofs=new Map<string,Proof>();
 for(const [name,expected,pages] of [
  ['Q2-2026-Report.pdf','7dbe65b6e61e51118ad9393c31a56a846a4bb172b7bd6049b3f1f09cc62b02a7',71],
  ['2026-First-Quarter-Report.pdf','2892ca6d558273e9090d7163cb787cdf37f4f4cbd47165e89add173f0bf46768',67],
  ['2025-Consolidated-Financial-Statements.pdf','43d4867165948a7d27fd184b00497fae544cff454cd38ff594241b42418da117',59],
 ] as const){const b:Buffer=await fs.readFile(path.join(dir,name));const hash:string=createHash('sha256').update(b).digest('hex');assert.equal(hash,expected);const layout=await readPdf(b);assert.equal(layout.pages.length,pages);proofs.set(hash,makeProof(hash,PDF_PARSER,layout));}
 const reports=verifyAll(state,proofs),workflow=workflowStatuses(state,reports,state.candidates.map((c:any)=>({id:c.id,problems:candidateProblems(state,c,'2026-10-22')})));
 const orange=reports.filter(r=>r.classification==='orange');assert.equal(orange.length,18);assert.equal(state.candidates.length,94);assert.equal(reports.filter(r=>r.classification==='green').length,76);assert.ok(orange.every(r=>workflow.find(s=>s.candidateId===r.candidateId)?.reconciliation.status==='manual-required'));
 assert.deepEqual(await fs.readFile(exportFile),before);
 console.log(JSON.stringify({readOnly:true,snapshotRevision:state.revision,snapshotDecisions:state.decisions.length,candidates:state.candidates.length,source:{green:76,orange:18,red:0,unverifiable:0},
  importWarnings:workflow.filter(s=>s.importWarnings.length).length,greenWithImportWarnings:workflow.filter(s=>s.source==='green'&&s.importWarnings.length).length,approvalBlockers:workflow.filter(s=>s.approvalBlockers.length).length,
  readiness:modelReadinessView(state,workflow).map(c=>({companyId:c.companyId,passed:c.passed,total:c.total,status:c.status,valuationReleased:c.valuationReleased})),
  orange:orange.map(r=>{const c=state.candidates.find((c:any)=>c.id===r.candidateId)!,w=workflow.find(s=>s.candidateId===c.id)!;return {id:c.id,metric:c.metric,value:c.datum.value,period:c.datum.period,unit:c.datum.unit,currency:c.currency,scope:c.datum.scope,originalDocumentId:w.originalDocumentId,analysisId:c.documentId,fileHash:c.pdf.fileHash,page:c.pdf.page,classification:r.classification,missing:r.checks.filter(x=>x.status==='missing'),reconciliation:w.reconciliation};})},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
