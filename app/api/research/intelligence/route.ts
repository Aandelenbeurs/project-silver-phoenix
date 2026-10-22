import {workflowStatuses} from '../../../../data/multi-sector/research/intelligence/workflow-status';
import {modelReadinessView} from '../../../../data/multi-sector/research/intelligence/model-readiness-view';
import {verifyAll} from '../../../../data/multi-sector/research/intelligence/verification';
import {readProofs,collectProof} from '../../../../data/multi-sector/research/intelligence/verification-storage';
import {approveVerifiedBatch} from '../../../../data/multi-sector/research/intelligence/verification-batch';
import {NextResponse} from 'next/server';
import {readJsonObject,ApiInputError} from '../../../../lib/api-input';
import {assessRequest} from '../../../../lib/request-security';
import {readIntelligence,mutateIntelligence} from '../../../../data/multi-sector/research/intelligence/storage';
import {importDocument,addManualCandidate,decideCandidate,approvedResearchInputs,analysisImpact,priorObservation,candidateComparison,candidateProblems,documentReviewStatus,IntelligenceError,type ImportDocument} from '../../../../data/multi-sector/research/intelligence/workflow';
import {analysisOutcome,type AnalysisOutcome} from '../../../../data/multi-sector/research/intelligence/document-view';
import {analyseDocument} from '../../../../data/multi-sector/research/intelligence/pdf-analysis';
import {monitorSource} from '../../../../data/multi-sector/research/intelligence/monitoring';
import {SOURCE_CHANNELS} from '../../../../data/multi-sector/research/intelligence/sources';
import type {ManualValue} from '../../../../data/multi-sector/research/intelligence/extraction';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function errorResponse(error:unknown){return NextResponse.json({success:false,error:error instanceof IntelligenceError||error instanceof ApiInputError?error.message:'Aanvraag kon niet veilig worden verwerkt; niets goedgekeurd.'},{status:error instanceof IntelligenceError||error instanceof ApiInputError?error.status:400,headers});}
export async function GET(){
 try{const state=await readIntelligence();const today=new Date().toISOString().slice(0,10);const evidence=await readProofs(state);const verification=verifyAll(state,evidence.proofs);const comparisons=state.candidates.map(c=>({id:c.id,old:priorObservation(state,c),comparison:candidateComparison(state,c),problems:candidateProblems(state,c,today)}));const workflow=workflowStatuses(state,verification,comparisons);return NextResponse.json({success:true,state,verification,workflow,modelReadiness:modelReadinessView(state,workflow),verificationWarnings:evidence.warnings,
  documentStatuses:state.documents.map(d=>({id:d.id,status:documentReviewStatus(state,d)})),
  researchInputs:approvedResearchInputs(state,today),impact:['abrasilver','advantage-energy'].map(id=>analysisImpact(state,id as 'abrasilver'|'advantage-energy',today)),
  comparisons,channels:SOURCE_CHANNELS,
  valuationReleased:false,aavVerification:'6/17 (bestaande engine ongewijzigd)'},{headers});}catch(e){return errorResponse(e);}
}
let windowStart=0,requests=0;
export async function POST(request:Request){
 const denied=assessRequest(request,{user:process.env.PHOENIX_AUTH_USER,password:process.env.PHOENIX_AUTH_PASSWORD});if(denied)return NextResponse.json({success:false,error:denied.message},{status:denied.status,headers});
 try{
  const now=Date.now();if(now-windowStart>60000){windowStart=now;requests=0;}if(++requests>40)throw new IntelligenceError('Te veel onderzoekswijzigingen; wacht één minuut.',429);
  const body=await readJsonObject(request);const at=new Date().toISOString();
  if(!['import','manual','decision','check-source','analyse-document','verify-source','approve-verified-batch'].includes(String(body.action)))throw new IntelligenceError('Onbekende onderzoeksactie.');
  let analysis:AnalysisOutcome|undefined;let proofResult:Awaited<ReturnType<typeof collectProof>>|undefined;
  const state=await mutateIntelligence(body.expectedRevision as number,async current=>{
   if(body.action==='verify-source'){proofResult=await collectProof(current,String(body.documentId));return current;}
   if(body.action==='approve-verified-batch'){const evidence=await readProofs(current);return approveVerifiedBatch(current,body.batch as Parameters<typeof approveVerifiedBatch>[1],at,evidence.proofs);}
   if(body.action==='import')return importDocument(current,body.document as ImportDocument,at).state;
   if(body.action==='analyse-document'){const after=await analyseDocument(current,String(body.documentId),at);const requested=current.documents.find(d=>d.id===String(body.documentId));const root=requested?.pdf?.sourceDocumentId??requested?.id;const recovered=after.documents.findLast(d=>d.pdf&&d.pdf.sourceDocumentId===root&&d.pdf.status==='processed'&&d.pdf.warnings.some(w=>w.startsWith('[PDF_RECOVERY]')));analysis=analysisOutcome(current,after,recovered?.id??String(body.documentId));return after;}
   if(body.action==='manual')return addManualCandidate(current,String(body.documentId),body.value as ManualValue,at);
   if(body.action==='decision')return decideCandidate(current,body.decision as Parameters<typeof decideCandidate>[1],at);
   const id=String(body.channelId);if(!SOURCE_CHANNELS.some(c=>c.id===id))throw new IntelligenceError('Onbekend bronkanaal.');
   const last=current.checks.filter(c=>c.channelId===id).at(-1);if(last&&now-Date.parse(last.at)<60000)throw new IntelligenceError('Dit bronkanaal is minder dan één minuut geleden gecontroleerd.',429);
   return monitorSource(current,id,at);
  });
  return NextResponse.json({success:true,revision:state.revision,valuationReleased:false,...(analysis?{analysis}: {}),...(proofResult?{proof:proofResult}: {})},{headers});
 }catch(e){return errorResponse(e);}
}
