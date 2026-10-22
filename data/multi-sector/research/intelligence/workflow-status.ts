/** Read-only views over existing evidence and decisions. Never persist these statuses. */
import type {Candidate,IntelligenceState} from './contracts';
import type {Verification} from './verification';
export const RECONCILIATION_LABELS={
 'checks-passed':'Automatische basiscontroles geslaagd',
 'manual-required':'Inhoudelijke aansluiting vereist',
 blocked:'Beoordelingsblokkade actief',
 'not-assessed':'Nog niet controleerbaar',
};
export type ReconciliationStatus=keyof typeof RECONCILIATION_LABELS;
export const HUMAN_LABELS={pending:'Nog geen menselijke beslissing',approve:'Menselijk goedgekeurd — onderzoek',reject:'Menselijk afgewezen'};
const plans:Record<string,string[]>={
 adjustedFundsFlow:['Controleer de managementdefinitie en IFRS-aansluiting in Specified Financial Measures en de segmenttoelichting van dezelfde rapportversie.','Vergelijk Advantage zonder Entropy, Entropy en geconsolideerd afzonderlijk. Adjusted funds flow is geen operationele kasstroom; neem correctieposten en hun tekens expliciet over.'],
 netCapex:['Controleer de aansluiting van cash used in investing activities naar net capital expenditures, inclusief werkkapitaal, overige investeringen, acquisities en desinvesteringen.','Bevestig scope en periode. Managementcapex is niet automatisch sustaining capex of de investering voor een productiemodel.'],
 netDebt:['Controleer de schulddefinitie en brug in Capital Management / Specified Financial Measures op exact dezelfde peildatum en voor dezelfde scope.','Neem bankschuld, werkkapitaal, cashbehandeling en relevante obligaties volgens die definitie op. Hoofdsom, boekwaarde en conversieaandelen zijn niet uitwisselbaar; voorkom dubbeltelling.'],
};
export function reconciliationFor(c:Candidate,report:Verification|undefined,approvalBlockers:readonly string[]){
 const unresolved=report?.checks.filter(x=>x.status==='missing'||x.status==='fail')??[];
 const requiredEvidence=[...(plans[c.metric]??[]),...unresolved.filter(x=>x.id!=='management-definition').map(x=>'Los broncontrole '+x.id+' op: '+x.message)];
 if(approvalBlockers.length)requiredEvidence.push('Los de bestaande beoordelingsblokkades op; een groene tabelcel bevestigt bijvoorbeeld geen ontbrekende publicatiedatum.');
 const status:ReconciliationStatus=!report?'not-assessed':report.classification==='red'||report.classification==='unverifiable'?'blocked':plans[c.metric]||report.classification==='orange'?'manual-required':approvalBlockers.length?'blocked':'checks-passed';
 return {status,label:RECONCILIATION_LABELS[status],reasons:[...new Set([...unresolved.map(x=>x.message),...approvalBlockers])],requiredEvidence,
  arithmetic:report?.checks.filter(x=>x.id==='additive-Q1+Q2=H1')??[],
  limitation:'Basiscontroles zijn geen volledige financiële reconciliatie, menselijke goedkeuring of modelvalidatie.'};
}
export function workflowStatuses(state:IntelligenceState,reports:Verification[],problems:{id:string;problems:string[]}[]){
 const by=new Map(reports.map(r=>[r.candidateId,r])),blocks=new Map(problems.map(p=>[p.id,p.problems]));
 return state.candidates.map(c=>{
  const doc=state.documents.find(d=>d.id===c.documentId),decision=state.decisions.find(d=>d.candidateId===c.id),report=by.get(c.id),approvalBlockers=blocks.get(c.id)??['Actuele beoordelingscontrole ontbreekt.'];
  return {candidateId:c.id,originalDocumentId:doc?.pdf?.sourceDocumentId??doc?.id??c.documentId,analysisDocumentId:c.documentId,
   source:report?.classification??'unverifiable',reconciliation:reconciliationFor(c,report,approvalBlockers),human:decision?.action??'pending' as const,
   extractionStatus:c.status,importWarnings:[...c.issues],approvalBlockers:[...approvalBlockers],
   basis:c.companyId==='advantage-energy'?(c.datum.period.end<'2026-09-11'?'historical-pre-wembley':'post-event-unreconciled'):'separate-company-basis',
   modelValidated:false as const,valuationReleased:false as const};
 });
}
export type WorkflowStatus=ReturnType<typeof workflowStatuses>[number];
export type CandidateGrouping='none'|'company'|'source'|'analysis'|'period'|'metric'|'verification'|'reconciliation'|'relevance';
export const modelRelevant=(c:Candidate)=>['netDebt','bankDebt','cash','shares','dilutedShares','gasProduction','liquidsProduction','totalProduction','netCapex','adjustedFundsFlow'].includes(c.metric);
export function groupCandidates(candidates:Candidate[],statuses:WorkflowStatus[],by:CandidateGrouping){
 const status=new Map(statuses.map(s=>[s.candidateId,s])),groups=new Map<string,Candidate[]>();
 for(const c of candidates){const s=status.get(c.id);const key=by==='none'?'Alle kandidaten':by==='company'?c.companyId:by==='source'?s?.originalDocumentId??c.documentId:by==='analysis'?c.documentId:by==='period'?c.datum.period.start+' — '+c.datum.period.end:by==='metric'?c.metric:by==='verification'?s?.source??'unverifiable':by==='reconciliation'?s?.reconciliation.label??'Nog niet controleerbaar':modelRelevant(c)?'Modelrelevante definitie, geen modelinvoer':'Overige context';groups.set(key,[...(groups.get(key)??[]),c]);}
 return [...groups].map(([key,candidates])=>({key,candidates}));
}
