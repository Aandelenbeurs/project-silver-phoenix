import {reconciliationFor} from './workflow-status';
import {verifyAll,VERIFIER_VERSION,type Proof} from './verification';
import {candidateProblems,decideCandidate,IntelligenceError} from './workflow';
import type {IntelligenceState} from './contracts';
export interface BatchItem {candidateId:string;fingerprint:string;documentHash:string;verificationHash:string}
/** Strict all-or-nothing preflight, then ordinary per-candidate decisions/audit entries.
 * The caller holds the storage revision lock. No partial batch is written on error.
 */
export function approveVerifiedBatch(state:IntelligenceState,input:{items:BatchItem[];reason:string;confirmed:boolean;attested:boolean},at:string,proofs:Map<string,Proof>){
 if(!input||!Array.isArray(input.items)||input.items.length<1||input.items.length>100||new Set(input.items.map(i=>i.candidateId)).size!==input.items.length)throw new IntelligenceError('Selecteer 1–100 unieke kandidaten voor de groep.');
 if(input.confirmed!==true||input.attested!==true||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>800)throw new IntelligenceError('Expliciete groepsbevestiging, broncontrole en een toelichting van 8–800 tekens zijn vereist.');
 const reports=new Map(verifyAll(state,proofs).map(r=>[r.candidateId,r]));
 const errors:string[]=[];
 for(const item of input.items){
  const c=state.candidates.find(c=>c.id===item.candidateId),doc=state.documents.find(d=>d.id===c?.documentId),r=reports.get(item.candidateId);
  if(!c||!doc||c.fingerprint!==item.fingerprint||doc.contentHash!==item.documentHash||r?.hash!==item.verificationHash)errors.push(item.candidateId.slice(0,12)+': bron/kandidaat/verificatie gewijzigd');
  else if(state.decisions.some(d=>d.candidateId===c.id))errors.push(item.candidateId.slice(0,12)+': al menselijk beoordeeld');
  else if(reconciliationFor(c,r,candidateProblems(state,c,at.slice(0,10))).status!=='checks-passed')errors.push(item.candidateId.slice(0,12)+': niet volledig groen of bestaande bewijsblokkade actief');
 }
 if(errors.length)throw new IntelligenceError('Groepsgoedkeuring volledig gestopt; 0 beslissingen opgeslagen. '+errors.join('; '),409);
 let next=state;for(const item of input.items)next=decideCandidate(next,{candidateId:item.candidateId,fingerprint:item.fingerprint,documentHash:item.documentHash,action:'approve',reason:input.reason.trim()+'\nBronverificatie '+VERIFIER_VERSION+'; hash '+item.verificationHash+'; modelvrijgave: nee.',attested:true},at);
 return next;
}
