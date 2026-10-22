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
 for(const doc of s.documents)if(doc.pdf&&!s.audit.some(a=>a.action==='import'&&a.subject===doc.id&&a.fingerprint===doc.id))throw new IntelligenceError('PDF mist auditbinding.',409);
 for(const check of s.checks)if(!s.audit.some(a=>a.action==='source-check'&&a.subject===check.id&&a.fingerprint===digest(JSON.stringify(check))))throw new IntelligenceError('Broncontrole mist geldige auditbinding.',409);
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
/** Trusted connector entry, not an API import surface. Unknown periods stay unknown.
 * Automatic candidates can never pass evidence review until a complete manual import. */
export function registerDiscovered(original:IntelligenceState,input:Omit<SourceDocument,'id'|'version'|'discoveredAt'|'status'|'contentHash'>,at:string){
 assertState(original);nowCheck(at);
 if(!input.monitoring||input.method!=='automatic-discovery'||input.text.length>30000||validateReference(input.url,input.companyId).sourceClass!=='primary')throw new IntelligenceError('Ongeldige ontdekkingsregistratie.');
 const core={...input,contentHash:digest(input.text)};const id=documentIdentity(core);
 if(original.documents.some(d=>d.id===id))return {state:original,documentId:id};
 const s=structuredClone(original);const doc:SourceDocument={...core,id,version:id,discoveredAt:at,status:'discovered'};
 // Only actual downloaded text enters the existing rule extractor. No candidates from titles or PDF metadata.
 const candidates=input.monitoring.processing==='processed'?extractCandidates(doc):[];
 if(candidates.length)doc.status='extracted';
 s.documents.push(doc);s.candidates.push(...candidates);audit(s,at,'import',id,id);bounded(s);
 return {state:s,documentId:id};
}
/** Appends a PDF-derived document, never rewrites imported history or decisions. */
export function registerPdfAnalysis(original:IntelligenceState,sourceId:string,result:{fileHash:string|null;parser:string;pages:number;values:import('./pdf-tables').PdfValue[];warnings:string[];reportDate:string|null;errorCode:string|null;publishedAt:string|null},at:string){
 assertState(original);nowCheck(at);const source=original.documents.find(d=>d.id===sourceId);
 if(!source||source.companyId!=='advantage-energy'||source.sourceClass!=='primary')throw new IntelligenceError('Officieel geregistreerd Advantage-document vereist.');
 const duplicate=result.fileHash&&original.documents.find(d=>d.companyId===source.companyId&&d.pdf?.fileHash===result.fileHash&&d.pdf.parser===result.parser&&d.pdf.status==='processed');
 if(duplicate)return original;
 if(result.values.length>100||result.values.some(v=>v.quote.length>1500||!v.header||!Number.isFinite(v.value)||!validDate(v.period.start)||!validDate(v.period.end)))throw new IntelligenceError('Ongeldig PDF-extractieresultaat.');
 const quotes=[...new Set(result.values.map(v=>`PDF-pagina ${v.page}\n${v.header}\n${v.quote}`))].join('\n\n');
 if(quotes.length>30000)throw new IntelligenceError('Te veel bronpassages; handmatige selectie vereist.');
 const core={companyId:source.companyId,title:source.title,type:source.type,event:source.event,issuer:source.issuer,url:source.url,sourceClass:source.sourceClass,publishedAt:result.publishedAt,
  period:source.period,currency:null,text:quotes,locator:'Fysieke PDF-pagina’s; iedere kandidaat heeft eigen kolom en verslagperiode',supersedes:original.documents.filter(d=>d.url===source.url&&d.pdf?.status==='processed').at(-1)?.id??null,contentHash:digest(quotes),method:'pdf-extraction' as const,
  pdf:{parser:result.parser,fileHash:result.fileHash,sourceDocumentId:source.pdf?.sourceDocumentId??source.id,status:result.errorCode?(result.errorCode.startsWith('PDF_')?'unreadable' as const:'error' as const):'processed' as const,pages:result.pages,reportDate:result.reportDate,warnings:result.warnings,errorCode:result.errorCode}};
 const id=documentIdentity(core);if(original.documents.some(d=>d.id===id))return original;
 const doc:SourceDocument={...core,id,version:id,discoveredAt:at,status:result.errorCode?'extraction-error':result.values.length?'extracted':'discovered'};
 const s=structuredClone(original);s.documents.push(doc);
 for(const v of result.values){
  const {value,metric,label,unit,currency,period,scope,...evidence}=v;
  const issues:string[]=[];if(!doc.publishedAt)issues.push('Publicatiedatum ontbreekt; MD&A-/bestandsdatum is geen bewezen publicatie.');
  const locator=`PDF-pagina ${v.page}; ${v.definition}; ${v.periodType}; ${period.start} — ${period.end}`;
  const base:Omit<Candidate,'id'|'fingerprint'>={documentId:id,companyId:doc.companyId,metric,label,currency,raw:v.rawNumber,quote:v.quote,locator,method:'pdf-table-v1',formula:v.scale===1?null:`${v.rawNumber} × ${v.scale} (expliciete tabelschaal)`,
   datum:{id:metric,value,unit,kind:'reported',verification:'unreviewed',period,scope,documentId:id,locator,uncertainties:issues},status:issues.length?'insufficient-evidence':'to-review',issues,relation:doc.supersedes?'correction':'new-period',relevance:'Historisch financieel brongegeven; bedrijfsscope en Wembley-aansluiting afzonderlijk controleren. Geen gevalideerde modelinvoer.',
   pdf:{...evidence,fileHash:result.fileHash!,parser:result.parser,confidence:'review-required'}};
  const h=fingerprint(base);s.candidates.push({...base,id:h,fingerprint:h});
 }
 audit(s,at,'import',id,id);bounded(s);return s;
}
function replaces(s:IntelligenceState,doc:SourceDocument,prior:string){const seen=new Set<string>();let id=doc.supersedes;while(id&&!seen.has(id)){if(id===prior)return true;seen.add(id);id=s.documents.find(d=>d.id===id)?.supersedes??null;}return false;}
function samePeriodAndScope(a:Candidate,b:Candidate){
 return a.datum.period.start===b.datum.period.start&&a.datum.period.end===b.datum.period.end&&a.datum.unit===b.datum.unit&&(!a.pdf&&!b.pdf||a.datum.scope===b.datum.scope&&a.pdf?.periodType===b.pdf?.periodType);
}
function newerDocument(s:IntelligenceState,doc:SourceDocument,x:SourceDocument){
 if(x.id===doc.id||x.companyId!==doc.companyId||s.documents.indexOf(x)<=s.documents.indexOf(doc))return false;
 if(x.pdf&&!x.pdf.fileHash)return false;
 if(x.supersedes===doc.id)return true;if(x.url!==doc.url)return false;
 if(doc.pdf?.fileHash&&(x.pdf?.fileHash===doc.pdf.fileHash||x.monitoring?.bodyHash===doc.pdf.fileHash))return false;
 return true;
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
 if(c.pdf&&(!doc.pdf||c.pdf.fileHash!==doc.pdf.fileHash||!c.quote.includes(c.pdf.rawNumber)||!doc.text.includes(c.quote)||!c.pdf.page||!c.pdf.definition||!c.pdf.periodType))reasons.push('PDF-bewijsbinding, definitie of periode ontbreekt.');
 if(doc.method==='automatic-discovery')reasons.push('Automatische ontdekking: publicatie, verslagperiode en inhoud moeten via een volledige handmatige bronimport worden bevestigd.');
 if(s.documents.some(x=>newerDocument(s,doc,x)))reasons.push('Nieuwere importversie van deze bronlink bekend; beoordeel die versie. Dit bewijst geen wijziging van het externe volledige document.');
 if(s.candidates.some(x=>x.id!==c.id&&x.documentId===c.documentId&&x.metric===c.metric&&samePeriodAndScope(x,c)&&x.datum.value!==c.datum.value&&s.decisions.find(d=>d.candidateId===x.id)?.action!=='reject'))reasons.push('Conflicterende kandidaat voor dezelfde documentmetriek; wijs foutieve extractie eerst af.');
 const competing=s.candidates.some(x=>x.id!==c.id&&x.companyId===c.companyId&&x.metric===c.metric&&samePeriodAndScope(x,c)&&x.datum.unit===c.datum.unit&&x.datum.period.start===c.datum.period.start&&x.datum.period.end===c.datum.period.end&&x.datum.value!==c.datum.value&&!replaces(s,doc,x.documentId)&&s.decisions.find(d=>d.candidateId===x.id)?.action!=='reject');
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
 if(s.documents.some(x=>newerDocument(s,d,x)))return 'Nieuwe importversie bekend';
 if(!values.length)return d.monitoring?'Ontdekt; handmatige broncontrole vereist':'Extractiefout / geen regelmatch';
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
 const relevant=events.filter(e=>{const d=docs.find(x=>x.id===e.documentId)!;return Boolean(d.monitoring)||d.period.end>usedDate||Boolean(d.supersedes)||docs.some(x=>x.id!==d.id&&x.url===d.url&&docs.indexOf(x)<docs.indexOf(d));});
 const outdated=relevant.some(e=>e.approved&&['issuance','disposition','reserves','study','financial-report','share-count'].includes(e.event));
 // Index coverage alone can NEVER establish freshness of an entire financial analysis.
 const status=assessFreshness({asOf,essentialOutdated:outdated,pendingRelevant:relevant.length>0,coverageComplete:false,lastSuccessfulAt:null});
 return {companyId,asOf,usedDate,status,events,explanation:outdated?'Goedgekeurde relevante informatie dateert na een essentieel uitgangspunt. Historische cijfers blijven behouden.':relevant.length?'Nieuwe informatie kan de analyse beïnvloeden; nog geen modelvalidatie.':'Geen voldoende volledige actuele broncontrole; een lege indexcontrole bewijst geen actualiteit.',engineChanged:false,financialGateChanged:false};
}
export {emptyIntelligenceState};

export function candidateComparison(s:IntelligenceState,c:Candidate){
 const old=priorObservation(s,c);const reasons:string[]=[];
 if(!old)return {old:null,comparable:false,difference:null,reasons:['Geen vergelijkbaar eerder gegeven.']};
 if(old.unit!==c.datum.unit)reasons.push('Eenheden of schaal verschillen; geen impliciete conversie.');
 if(old.period.start!==c.datum.period.start||old.period.end!==c.datum.period.end)reasons.push('Verslagperioden verschillen; afzonderlijke aansluiting vereist.');
 if(c.pdf){
  const prior=s.candidates.find(x=>x.id!==c.id&&x.metric===c.metric&&x.companyId===c.companyId&&x.datum.value===old.value&&x.datum.period.start===old.period.start&&s.decisions.some(d=>d.candidateId===x.id&&d.action==='approve'));
  if(!prior?.pdf||prior.datum.scope!==c.datum.scope||prior.pdf.definition!==c.pdf.definition||prior.pdf.periodType!==c.pdf.periodType)reasons.push('Financiële definitie of bedrijfsscope is niet aantoonbaar gelijk.');
 }
 return {old,comparable:reasons.length===0,difference:reasons.length||old.value===null||c.datum.value===null?null:c.datum.value-old.value,reasons};
}
