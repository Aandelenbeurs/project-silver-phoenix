import {validDate,reviewEvidence,type FinancialDatum,type EvidenceDocument} from '../evidence';
import {FINANCIAL_DATA} from '../financial-dossiers';
import {COMPANIES,validateReference,IMPACT} from './sources';
import {digest,extractCandidates,fingerprint,manualCandidate,type ManualValue} from './extraction';
import {emptyIntelligenceState,type CompanyId,type DocumentType,type EventType,type IntelligenceState,type SourceDocument,type Candidate,type SourceCheck} from './contracts';
export class IntelligenceError extends Error {constructor(message:string,public status=400){super(message);}}
const TYPES:DocumentType[]=['annual','quarterly','mda','press-release','technical-study','reserves','financial-notes','material-event'];
const EVENTS:EventType[]=['financial-report','guidance','disposition','acquisition','issuance','share-count','reserves','study','financing','other'];
export interface ImportDocument {companyId:CompanyId;title:string;type:DocumentType;event:EventType;url:string;publishedAt:string|null;period:{start:string;end:string};currency:'CAD'|'USD'|null;text:string;locator:string;supersedes:string|null}
export const documentIdentity=(d:Omit<SourceDocument,'id'|'version'|'discoveredAt'|'status'>)=>digest(JSON.stringify(d));
export function assertState(s:IntelligenceState):void{
 if(s.schema!==1||!Number.isSafeInteger(s.revision)||s.revision<0||s.revision!==s.audit?.length||!Array.isArray(s.documents)||!Array.isArray(s.candidates)||!Array.isArray(s.decisions)||!Array.isArray(s.checks)||!Array.isArray(s.audit))throw new IntelligenceError('Onleesbare Intelligence-opslag; niets gewijzigd.',409);
 for(const list of [s.documents,s.candidates,s.decisions,s.checks])if(new Set(list.map(x=>x.id)).size!==list.length)throw new IntelligenceError('Dubbele opslagidentiteit.',409);
 let prev='';for(const a of s.audit){const {hash,...payload}=a;if(a.sequence!==s.audit.indexOf(a)+1||a.previousHash!==prev||digest(JSON.stringify(payload))!==hash)throw new IntelligenceError('Auditketen beschadigd; niets gewijzigd.',409);prev=hash;}
 for(const d of s.documents){const {id,version,...rest}=d;const {discoveredAt,status,...core}=rest;
  if(digest(d.text)!==d.contentHash||documentIdentity(core)!==id||version!==id)throw new IntelligenceError('Documentversie beschadigd.',409);
 }
 for(const c of s.candidates){const {id,fingerprint:fp,...base}=c;if(fingerprint(base)!==fp||id!==fp||!s.documents.some(d=>d.id===c.documentId))throw new IntelligenceError('Kandidaat beschadigd.',409);}
 for(const d of s.decisions){const c=s.candidates.find(c=>c.id===d.candidateId),doc=s.documents.find(x=>x.id===c?.documentId);if(!c||!doc||d.fingerprint!==c.fingerprint||d.documentHash!==doc.contentHash||!s.audit.some(a=>a.subject===c.id&&a.action===d.action&&a.fingerprint===digest(JSON.stringify(d))))throw new IntelligenceError('Beslissing mist geldige bron-/auditbinding.',409);}
 if(new Set(s.decisions.map(x=>x.candidateId)).size!==s.decisions.length)throw new IntelligenceError('Meerdere beslissingen voor één kandidaat.',409);
}
function audit(s:IntelligenceState,at:string,action:IntelligenceState['audit'][number]['action'],subject:string,fp:string){
 const payload={sequence:s.audit.length+1,at,action,subject,fingerprint:fp,previousHash:s.audit.at(-1)?.hash??''};s.audit.push({...payload,hash:digest(JSON.stringify(payload))});s.revision++;
}
function bounded(s:IntelligenceState){if(s.documents.length>150||s.candidates.length>1500||s.audit.length>5000||Buffer.byteLength(JSON.stringify(s))>3*1024*1024)throw new IntelligenceError('Lokale onderzoeksopslag bereikt de limiet; bewaar eerst een back-up.');}
function nowCheck(at:string){if(!Number.isFinite(Date.parse(at)))throw new IntelligenceError('Ongeldig tijdstip.');}
export function importDocument(original:IntelligenceState,v:ImportDocument,at:string){
 assertState(original);nowCheck(at);
 if(!Object.hasOwn(COMPANIES,v.companyId)||!TYPES.includes(v.type)||!EVENTS.includes(v.event))throw new IntelligenceError('Onbekend bedrijf of documenttype.');
 if(typeof v.title!=='string'||!v.title.trim()||v.title.length>200||typeof v.text!=='string'||v.text.length<5||v.text.length>30000||typeof v.locator!=='string'||!v.locator.trim()||v.locator.length>300)throw new IntelligenceError('Titel, documentfragment en originele vindplaats zijn vereist (maximaal 30.000 tekens tekst).');
 if(!v.period||!validDate(v.period.start)||!validDate(v.period.end)||v.period.start>v.period.end)throw new IntelligenceError('Eenduidige begin- en einddatum zijn vereist.');
 if(v.publishedAt!==null&&(!validDate(v.publishedAt)||v.publishedAt>at.slice(0,10)))throw new IntelligenceError('Publicatiedatum is ongeldig of toekomstig.');
 if(!['CAD','USD',null].includes(v.currency))throw new IntelligenceError('Documentvaluta moet CAD, USD of onbekend zijn.');
 let ref:ReturnType<typeof validateReference>;try{ref=validateReference(v.url,v.companyId);}catch{throw new IntelligenceError('Ongeldige of onveilige bronverwijzing.');}
 if(v.supersedes!==null){const prior=original.documents.find(d=>d.id===v.supersedes);if(!prior||prior.companyId!==v.companyId||prior.period.start!==v.period.start||prior.period.end!==v.period.end)throw new IntelligenceError('Een correctie moet verwijzen naar hetzelfde bedrijf en dezelfde verslagperiode.');}
 const core={companyId:v.companyId,title:v.title.trim(),type:v.type,event:v.event,...ref,publishedAt:v.publishedAt,period:v.period,currency:v.currency,text:v.text.replace(/\r\n/g,'\n'),locator:v.locator.trim(),supersedes:v.supersedes,contentHash:digest(v.text.replace(/\r\n/g,'\n')),method:'manual-excerpt' as const};
 const id=documentIdentity(core);
 if(original.documents.some(d=>d.id===id))return {state:original,documentId:id,duplicate:true};
 const s=structuredClone(original);const doc:SourceDocument={...core,id,version:id,discoveredAt:at,status:'discovered'};
 const candidates=extractCandidates(doc);doc.status=candidates.length?'extracted':'extraction-error';s.documents.push(doc);s.candidates.push(...candidates);audit(s,at,'import',id,id);bounded(s);
 return {state:s,documentId:id,duplicate:false};
}
export function addManualCandidate(original:IntelligenceState,documentId:string,value:ManualValue,at:string){
 assertState(original);const doc=original.documents.find(d=>d.id===documentId);if(!doc)throw new IntelligenceError('Document bestaat niet.');
 let c:Candidate;try{c=manualCandidate(doc,value);}catch(e){throw new IntelligenceError(e instanceof Error?e.message:'Handmatige invoer ongeldig.');}
 if(original.candidates.some(x=>x.id===c.id))return original;
 const s=structuredClone(original);s.candidates.push(c);audit(s,at,'candidate',c.id,c.fingerprint);bounded(s);return s;
}
export function candidateProblems(s:IntelligenceState,c:Candidate,asOf:string){
 const doc=s.documents.find(d=>d.id===c.documentId)!;
 const d:FinancialDatum={...c.datum,verification:'reviewed'};
 const ev:EvidenceDocument={id:doc.id,title:doc.title,uri:doc.url,publishedAt:doc.publishedAt??'',origin:doc.sourceClass==='primary'?'issuer':'internal'};
 const review=reviewEvidence([d],[ev],{asOf,rules:[{id:d.id,unit:d.unit,scope:d.scope,kinds:['reported','guidance']}]});
 const reasons=[...c.issues,...review.issues.map(x=>x.message)];
 if(s.documents.some(x=>x.id!==doc.id&&x.companyId===doc.companyId&&(x.supersedes===doc.id||x.url===doc.url)&&s.documents.indexOf(x)>s.documents.indexOf(doc)))reasons.push('Nieuwere importversie van deze bronlink bekend; beoordeel die versie. Dit bewijst geen wijziging van het externe volledige document.');
 if(s.candidates.some(x=>x.id!==c.id&&x.documentId===c.documentId&&x.metric===c.metric&&x.datum.value!==c.datum.value&&s.decisions.find(d=>d.candidateId===x.id)?.action!=='reject'))reasons.push('Conflicterende kandidaat voor dezelfde documentmetriek; wijs foutieve extractie eerst af.');
 const competing=s.candidates.some(x=>x.id!==c.id&&x.companyId===c.companyId&&x.metric===c.metric&&x.datum.unit===c.datum.unit&&x.datum.period.start===c.datum.period.start&&x.datum.period.end===c.datum.period.end&&x.datum.value!==c.datum.value&&doc.supersedes!==x.documentId&&s.decisions.find(d=>d.candidateId===x.id)?.action!=='reject');
 if(competing)reasons.push('Andere waarde voor dezelfde bedrijfsmetriek en periode; wijs de foutieve kandidaat af of registreer een expliciete broncorrectie.');
 return [...new Set(reasons)];
}
export function decideCandidate(original:IntelligenceState,input:{candidateId:string;fingerprint:string;documentHash:string;action:'approve'|'reject';reason:string;attested:boolean},at:string){
 assertState(original);nowCheck(at);
 const c=original.candidates.find(c=>c.id===input.candidateId),doc=original.documents.find(d=>d.id===c?.documentId);
 if(!c||!doc)throw new IntelligenceError('Kandidaat bestaat niet.');
 if(!['approve','reject'].includes(input.action)||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>1000)throw new IntelligenceError('Kies één beslissing met een inhoudelijke toelichting (8–1.000 tekens).');
 if(c.fingerprint!==input.fingerprint||doc.contentHash!==input.documentHash)throw new IntelligenceError('Bron of waarde gewijzigd; laad de beoordeling opnieuw.',409);
 if(original.decisions.some(d=>d.candidateId===c.id))throw new IntelligenceError('Deze kandidaat heeft al een definitieve beslissing.',409);
 if(input.action==='approve'&&(!input.attested||candidateProblems(original,c,at.slice(0,10)).length))throw new IntelligenceError('Goedkeuring geblokkeerd: bevestig de originele broncontrole en los alle bewijsproblemen op.',422);
 const s=structuredClone(original);const decision={id:digest(JSON.stringify(input)+at),candidateId:c.id,fingerprint:c.fingerprint,documentHash:doc.contentHash,action:input.action,reason:input.reason.trim(),at,actor:'local-user' as const};s.decisions.push(decision);audit(s,at,input.action,c.id,digest(JSON.stringify(decision)));bounded(s);return s;
}
export function recordSourceCheck(original:IntelligenceState,check:SourceCheck){
 assertState(original);const s=structuredClone(original);s.checks.push(check);audit(s,check.at,'source-check',check.id,digest(JSON.stringify(check)));bounded(s);return s;
}
const BASE_METRIC:Record<string,string>={netDebt:'netDebtQ2',cash:'cashJune',shares:'sharesAugust',gasProduction:'gasQ2',liquidsProduction:'liquidsQ2',totalProduction:'productionQ2',projectNPV:'projectNPV5',initialCapex:'initialCapex',opex:'opexQ2'};
export function priorObservation(s:IntelligenceState,c:Candidate){
 const previous=s.candidates.filter(x=>x.companyId===c.companyId&&x.metric===c.metric&&x.id!==c.id&&x.datum.period.end<=c.datum.period.end&&s.decisions.some(d=>d.candidateId===x.id&&d.action==='approve')).sort((a,b)=>b.datum.period.end.localeCompare(a.datum.period.end))[0];
 if(previous)return {label:previous.label,value:previous.datum.value,unit:previous.datum.unit,period:previous.datum.period};
 const old=FINANCIAL_DATA.find(x=>x.id===BASE_METRIC[c.metric]&&(c.companyId==='abrasilver'?x.company==='AbraSilver':x.company==='Advantage Energy'));
 return old?{label:old.label,value:old.value,unit:old.unit,period:old.period}:null;
}
/** Approved evidence is an exportable research input only, never a production engine patch. */
export function approvedResearchInputs(s:IntelligenceState,asOf:string){
 assertState(s);return s.candidates.filter(c=>s.decisions.some(d=>d.candidateId===c.id&&d.action==='approve')).map(c=>({candidateId:c.id,documentId:c.documentId,
  datum:{...c.datum,verification:'reviewed' as const},sourceApproved:true,modelInputValidated:false,valuationReleased:false,
  availability:candidateProblems(s,c,asOf).length?'needs-review' as const:'research-only' as const,problems:candidateProblems(s,c,asOf)}));
}
export function assessFreshness(input:{asOf:string;essentialOutdated:boolean;pendingRelevant:boolean;coverageComplete:boolean;lastSuccessfulAt:string|null}):import('./contracts').FreshnessStatus{
 if(input.essentialOutdated)return 'outdated';if(input.pendingRelevant)return 'revision-needed';
 const age=input.lastSuccessfulAt?(Date.parse(input.asOf)-Date.parse(input.lastSuccessfulAt))/86400000:NaN;
 return input.coverageComplete&&Number.isFinite(age)&&age>=0&&age<=7?'current':'unknown';
}
export function documentReviewStatus(s:IntelligenceState,d:SourceDocument){
 const values=s.candidates.filter(c=>c.documentId===d.id);
 if(s.documents.some(x=>x.supersedes===d.id||x.url===d.url&&s.documents.indexOf(x)>s.documents.indexOf(d)))return 'Nieuwe importversie bekend';
 if(!values.length)return 'Extractiefout / geen regelmatch';
 const decided=values.map(c=>s.decisions.find(x=>x.candidateId===c.id));
 if(decided.every(x=>x?.action==='reject'))return 'Alle voorstellen afgewezen';
 if(decided.some(x=>x?.action==='approve'))return 'Brongegevens deels goedgekeurd; geen integrale documentaudit';
 if(values.some(c=>c.status==='conflicting'))return 'Tegenstrijdige gegevens';
 if(values.some(c=>c.status==='insufficient-evidence'))return 'Onvoldoende bewijs';
 return 'Te beoordelen';
}
export function analysisImpact(s:IntelligenceState,companyId:CompanyId,asOf:string){
 const docs=s.documents.filter(d=>d.companyId===companyId);
 const events=docs.map(d=>({documentId:d.id,title:d.title,event:d.event,affected:IMPACT[d.event],approved:s.candidates.some(c=>c.documentId===d.id&&s.decisions.some(x=>x.candidateId===c.id&&x.action==='approve'))}));
 const usedDate=companyId==='advantage-energy'?'2026-06-30':'2026-06-19';
 const relevant=events.filter(e=>{const d=docs.find(x=>x.id===e.documentId)!;return d.period.end>usedDate||Boolean(d.supersedes)||docs.some(x=>x.id!==d.id&&x.url===d.url&&docs.indexOf(x)<docs.indexOf(d));});
 const outdated=relevant.some(e=>e.approved&&['issuance','disposition','reserves','study','financial-report','share-count'].includes(e.event));
 // Index coverage alone can NEVER establish freshness of an entire financial analysis.
 const status=assessFreshness({asOf,essentialOutdated:outdated,pendingRelevant:relevant.length>0,coverageComplete:false,lastSuccessfulAt:null});
 return {companyId,asOf,usedDate,status,events,explanation:outdated?'Goedgekeurde relevante informatie dateert na een essentieel uitgangspunt. Historische cijfers blijven behouden.':relevant.length?'Nieuwe informatie kan de analyse beïnvloeden; nog geen modelvalidatie.':'Geen voldoende volledige actuele broncontrole; een lege indexcontrole bewijst geen actualiteit.',engineChanged:false,financialGateChanged:false};
}
export {emptyIntelligenceState};
