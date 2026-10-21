/** Financial provenance alongside (not replacing) the existing MultiSector contract.
 * Review is a recorded human/source check, not an audit opinion or an API permission.
 */
export type EvidenceKind='reported'|'guidance'|'derived'|'hypothetical';
export type Verification='reviewed'|'unreviewed'|'conflicting';
export interface EvidenceDocument {
 id:string; title:string; uri:string; publishedAt:string; origin:'issuer'|'independent'|'internal';
}
export interface FinancialDatum {
 id:string; value:number|null; unit:string; kind:EvidenceKind; verification:Verification;
 period:{start:string;end:string}; scope:string; documentId?:string; locator?:string;
 calculation?:{description:string;inputs:string[];reconciliation?:string}; uncertainties:readonly string[];
}
export interface EvidenceRule {
 id:string; unit:string; scope:string; kinds:readonly EvidenceKind[];
 maxAgeDays?:number; notBefore?:string; periodGroup?:string;
}
export interface EvidencePolicy {asOf:string;rules:readonly EvidenceRule[]}
export interface EvidenceIssue {id:string;code:string;message:string}
export interface EvidenceReview {status:'blocked'|'review-ready';issues:EvidenceIssue[];usableIds:string[]}
const DAY=86400000;
export function validDate(value:string):boolean {
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
/** Validation is deterministic: no Date.now(), network, FX conversion or implicit age defaults. */
export function reviewEvidence(data:readonly FinancialDatum[],documents:readonly EvidenceDocument[],policy:EvidencePolicy):EvidenceReview {
 const issues:EvidenceIssue[]=[];const invalid=new Set<string>();
 const issue=(id:string,code:string,message:string)=>{invalid.add(id);issues.push({id,code,message});};
 if(!validDate(policy.asOf))issue('policy','date','Ongeldige analysepeildatum.');
 const ids=data.map(x=>x.id),docIds=documents.map(x=>x.id),ruleIds=policy.rules.map(x=>x.id);
 if(new Set(ids).size!==ids.length)issue('data','duplicate','Dubbele gegeven-ID.');
 if(new Set(docIds).size!==docIds.length)issue('documents','duplicate','Dubbele bron-ID.');
 if(new Set(ruleIds).size!==ruleIds.length)issue('policy','duplicate','Dubbele beleidsregel.');
 const lookup=new Map(data.map(x=>[x.id,x]));const docs=new Map(documents.map(x=>[x.id,x]));
 const checked=new Set<string>();const active=new Set<string>();
 function check(d:FinancialDatum):void {
  if(active.has(d.id)){issue(d.id,'cycle','Cirkel in afgeleide berekening.');return;}
  if(checked.has(d.id))return;active.add(d.id);
  if(d.value===null)issue(d.id,'missing','Waarde ontbreekt.');
  else if(!Number.isFinite(d.value))issue(d.id,'number','Waarde is niet eindig.');
  if(!d.id.trim()||!d.unit.trim()||!d.scope.trim())issue(d.id,'definition','Definitie, eenheid of scope ontbreekt.');
  if(!validDate(d.period.start)||!validDate(d.period.end)||d.period.start>d.period.end||(d.kind==='reported'&&d.period.end>policy.asOf))issue(d.id,'period','Ongeldige of toekomstige verslagperiode.');
  if(d.verification!=='reviewed')issue(d.id,d.verification==='conflicting'?'conflict':'unreviewed','Bron of berekening is niet eenduidig beoordeeld.');
  if(d.kind==='hypothetical')issue(d.id,'hypothetical','Hypothetische aanname blijft onderzoek.');
  if(d.kind==='reported'||d.kind==='guidance') {
   const doc=d.documentId?docs.get(d.documentId):undefined;
   if(!doc||!d.locator?.trim())issue(d.id,'source','Document of precieze vindplaats ontbreekt.');
   else {
    if(doc.origin==='internal')issue(d.id,'internal','Interne registratie bewijst geen bedrijfsfeit of managementverwachting.');
    if(!doc.title.trim()||!/^https:\/\//.test(doc.uri))issue(d.id,'source','Ongeldige officiële/externe bronverwijzing.');
    if(!validDate(doc.publishedAt)||doc.publishedAt>policy.asOf)issue(d.id,'publication','Publicatiedatum ontbreekt of ligt na de peildatum.');
    if(d.kind==='reported'&&doc.publishedAt<d.period.end)issue(d.id,'publication','Gerapporteerde periode eindigt na de publicatie.');
   }
  }
  if(d.kind==='derived'){
   if(!d.calculation?.description.trim()||!d.calculation.inputs.length)issue(d.id,'calculation','Berekening en inputs moeten expliciet zijn.');
   else for(const id of d.calculation.inputs){const parent=lookup.get(id);if(!parent)issue(d.id,'input','Berekeningsinput ontbreekt: '+id);else {
     check(parent);
     if(invalid.has(parent.id)&&!invalid.has(d.id))issue(d.id,'dependency','Onderliggende berekening bevat onvoldoende bewijs.');
     if((parent.period.start!==d.period.start||parent.period.end!==d.period.end||parent.scope!==d.scope)&&!d.calculation?.reconciliation?.trim())issue(d.id,'reconciliation','Afwijkende perioden of scope vragen een expliciete aansluiting.');
    }}
  }
  active.delete(d.id);checked.add(d.id);
 }
 const groups=new Map<string,string>();
 for(const rule of policy.rules){
  const d=lookup.get(rule.id);
  if(!d){issue(rule.id,'missing','Vereist financieel gegeven ontbreekt.');continue;}
  check(d);
  if(d.unit!==rule.unit)issue(d.id,'unit','Eenheden sluiten niet aan; geen impliciete conversie.');
  if(d.scope!==rule.scope)issue(d.id,'scope','Bedrijfsomvang / corporate-eventbasis komt niet overeen.');
  if(!rule.kinds.includes(d.kind))issue(d.id,'kind','Dit informatietype voldoet niet aan de regel.');
  if(rule.notBefore&&(!validDate(rule.notBefore)||d.period.end<rule.notBefore))issue(d.id,'event','Gegeven dateert van vóór de vereiste gebeurtenis.');
  if(rule.maxAgeDays!==undefined&&(!Number.isFinite(rule.maxAgeDays)||rule.maxAgeDays<0||(Date.parse(policy.asOf)-Date.parse(d.period.end))/DAY>rule.maxAgeDays))issue(d.id,'stale','Gegeven is verouderd volgens het expliciete beleid.');
  if(rule.periodGroup){const p=d.period.start+'/'+d.period.end;const prior=groups.get(rule.periodGroup);if(prior&&prior!==p)issue(d.id,'mismatch','Verslagperioden verschillen; expliciete gereconcilieerde inputs nodig.');groups.set(rule.periodGroup,p);}
 }
 const global=issues.some(x=>['policy','data','documents'].includes(x.id));
 return {status:issues.length?'blocked':'review-ready',issues,usableIds:global?[]:policy.rules.filter(r=>checked.has(r.id)&&!invalid.has(r.id)).map(r=>r.id)};
}
