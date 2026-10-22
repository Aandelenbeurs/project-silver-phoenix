import {NextResponse} from 'next/server';
import {readJsonObject,ApiInputError} from '../../../../lib/api-input';
import {assessRequest} from '../../../../lib/request-security';
import {readIntelligence,mutateIntelligence} from '../../../../data/multi-sector/research/intelligence/storage';
import {importDocument,addManualCandidate,decideCandidate,approvedResearchInputs,analysisImpact,priorObservation,candidateProblems,documentReviewStatus,IntelligenceError,type ImportDocument} from '../../../../data/multi-sector/research/intelligence/workflow';
import {monitorSource} from '../../../../data/multi-sector/research/intelligence/monitoring';
import {SOURCE_CHANNELS} from '../../../../data/multi-sector/research/intelligence/sources';
import type {ManualValue} from '../../../../data/multi-sector/research/intelligence/extraction';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function errorResponse(error:unknown){return NextResponse.json({success:false,error:error instanceof IntelligenceError||error instanceof ApiInputError?error.message:'Aanvraag kon niet veilig worden verwerkt; niets goedgekeurd.'},{status:error instanceof IntelligenceError||error instanceof ApiInputError?error.status:400,headers});}
export async function GET(){
 try{const state=await readIntelligence();const today=new Date().toISOString().slice(0,10);return NextResponse.json({success:true,state,
  documentStatuses:state.documents.map(d=>({id:d.id,status:documentReviewStatus(state,d)})),
  researchInputs:approvedResearchInputs(state,today),impact:['abrasilver','advantage-energy'].map(id=>analysisImpact(state,id as 'abrasilver'|'advantage-energy',today)),
  comparisons:state.candidates.map(c=>({id:c.id,old:priorObservation(state,c),problems:candidateProblems(state,c,today)})),channels:SOURCE_CHANNELS,
  valuationReleased:false,aavVerification:'6/17 (bestaande engine ongewijzigd)'},{headers});}catch(e){return errorResponse(e);}
}
let windowStart=0,requests=0;
export async function POST(request:Request){
 const denied=assessRequest(request,{user:process.env.PHOENIX_AUTH_USER,password:process.env.PHOENIX_AUTH_PASSWORD});if(denied)return NextResponse.json({success:false,error:denied.message},{status:denied.status,headers});
 try{
  const now=Date.now();if(now-windowStart>60000){windowStart=now;requests=0;}if(++requests>40)throw new IntelligenceError('Te veel onderzoekswijzigingen; wacht één minuut.',429);
  const body=await readJsonObject(request);const at=new Date().toISOString();
  if(!['import','manual','decision','check-source'].includes(String(body.action)))throw new IntelligenceError('Onbekende onderzoeksactie.');
  const state=await mutateIntelligence(body.expectedRevision as number,async current=>{
   if(body.action==='import')return importDocument(current,body.document as ImportDocument,at).state;
   if(body.action==='manual')return addManualCandidate(current,String(body.documentId),body.value as ManualValue,at);
   if(body.action==='decision')return decideCandidate(current,body.decision as Parameters<typeof decideCandidate>[1],at);
   const id=String(body.channelId);if(!SOURCE_CHANNELS.some(c=>c.id===id))throw new IntelligenceError('Onbekend bronkanaal.');
   const last=current.checks.filter(c=>c.channelId===id).at(-1);if(last&&now-Date.parse(last.at)<60000)throw new IntelligenceError('Dit bronkanaal is minder dan één minuut geleden gecontroleerd.',429);
   return monitorSource(current,id,at);
  });
  return NextResponse.json({success:true,revision:state.revision,valuationReleased:false},{headers});
 }catch(e){return errorResponse(e);}
}
