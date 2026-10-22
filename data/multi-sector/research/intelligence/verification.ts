/** Deterministic source verification, independent of human decisions/model release. */
import {digest,fingerprint} from './extraction';
import {documentIdentity} from './workflow';
import {validateReference} from './sources';
import {financialNumber,rowText,type PdfText,type PdfRow} from './pdf-tables';
import type {Candidate,IntelligenceState} from './contracts';
import {PDF_LIMITS} from './pdf-parser';
export const VERIFIER_VERSION='phoenix-source-verifier/1.1';
export type Classification='green'|'orange'|'red'|'unverifiable';
export interface Proof {schema:1;fileHash:string;parser:string;layout:PdfText;hash:string}
export interface Check {id:string;status:'pass'|'fail'|'missing'|'not-applicable';message:string;references?:string[]}
export interface Verification {candidateId:string;version:string;classification:Classification;hash:string;checks:Check[];explanation:string;independentConfirmations:number;historical:boolean;context:string;modelEligible:false;valuationReleased:false;sources:{documentId:string;url:string;page:number;fileHash:string}[]}
export function makeProof(fileHash:string,parser:string,layout:PdfText):Proof {const base={schema:1 as const,fileHash,parser,layout};return {...base,hash:digest(JSON.stringify(base))};}
export function validProof(p:Proof){const {hash,...base}=p;return p.schema===1&&/^[a-f0-9]{64}$/.test(p.fileHash)&&Array.isArray(p.layout?.pages)&&p.layout.pages.length>0&&p.layout.pages.length<=PDF_LIMITS.maxPages&&hash===digest(JSON.stringify(base));}
type Definition={re:RegExp;unit:string;currency:'CAD'|null;type:'flow'|'balance'|'average'|'shares';nonGaap?:boolean};
export const DEFINITIONS:Record<string,Definition>={
 revenue:{re:/^Natural gas and liquids sales$/,unit:'CAD',currency:'CAD',type:'flow'},
 operatingCashFlow:{re:/^Cash (?:provided by|flows? from) operating activities$/,unit:'CAD',currency:'CAD',type:'flow'},
 netIncome:{re:/^Net income(?: and comprehensive income)?(?: \(4\))?$/,unit:'CAD',currency:'CAD',type:'flow'},
 adjustedFundsFlow:{re:/^(?:Advantage )?Adjusted funds flow$/,unit:'CAD',currency:'CAD',type:'flow',nonGaap:true},
 netCapex:{re:/^Net capital expenditures$/,unit:'CAD',currency:'CAD',type:'flow',nonGaap:true},
 netDebt:{re:/^Net debt(?: attributable to Advantage)?$/,unit:'CAD',currency:'CAD',type:'balance',nonGaap:true},
 bankDebt:{re:/^Bank indebtedness$/,unit:'CAD',currency:'CAD',type:'balance'},
 cash:{re:/^Cash and cash equivalents(?:, end of period)?$/,unit:'CAD',currency:'CAD',type:'balance'},
 basicWeightedShares:{re:/^Basic weighted average shares \(000\)$/,unit:'shares',currency:null,type:'average'},
 dilutedWeightedShares:{re:/^Diluted weighted average shares \(000\)$/,unit:'shares',currency:null,type:'average'},
 shares:{re:/^Shares outstanding$/,unit:'shares',currency:null,type:'shares'},
 gasProduction:{re:/^Natural gas \(Mcf\/d\)$/,unit:'Mcf/d',currency:null,type:'average'},
 liquidsProduction:{re:/^Total liquids \(bbls?\/d\)$/,unit:'bbl/d',currency:null,type:'average'},
 totalProduction:{re:/^Total production \(boe\/d\)$/,unit:'boe/d',currency:null,type:'average'},
 condensateProduction:{re:/^Condensate \(bbls?\/d\)$/,unit:'bbl/d',currency:null,type:'average'},
 crudeOilProduction:{re:/^Crude oil \(bbls?\/d\)$/,unit:'bbl/d',currency:null,type:'average'},
};
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const same=(a:Candidate,b:Candidate)=>a.companyId===b.companyId&&a.metric===b.metric&&a.datum.scope===b.datum.scope&&a.datum.unit===b.datum.unit&&a.currency===b.currency&&a.datum.period.start===b.datum.period.start&&a.datum.period.end===b.datum.period.end&&a.pdf?.periodType===b.pdf?.periodType&&a.pdf?.definition===b.pdf?.definition;
const close=(a:number|null,b:number|null,tolerance=0.000001)=>a!==null&&b!==null&&Math.abs(a-b)<=tolerance;
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
function sourceScope(rows:PdfRow[],index:number){
 const opening=rows.slice(0,4).map(rowText).join(' ');let scope=/Consolidated Statements|Consolidated Financial/i.test(opening)?'consolidated':/Operating Highlights/i.test(opening)&&/Advantage.{0,30}natural gas and liquids operations/i.test(rows.map(rowText).join(' '))?'excluding-entropy':'';
 for(const r of rows.slice(0,index+1)){const text=rowText(r);if(/Consolidated Financial Statement Highlights/.test(text))scope='consolidated';if(/^Advantage Energy Ltd\.$/.test(text)&&/Financial Highlights/.test(opening))scope='excluding-entropy';if(/^Entropy Inc\.$/.test(text))scope='entropy';}
 return scope;
}
/** Independently resolve the selected cell using coordinates, headers and metric semantics.
 * Does not call the candidate extractor or trust its reported normalized value.
 */
export function inspectCell(c:Candidate,proof:Proof,pageNumber:number){
 const pdf=c.pdf!,page=proof.layout.pages.find(p=>p.number===pageNumber),rule=DEFINITIONS[c.metric];
 if(!page||!rule)return {missing:'Bronpagina of ondersteunde definitie ontbreekt.'};
 const matches=page.rows.map((r,i)=>({r,i})).filter(({r})=>normalize(rowText(r))===normalize(c.quote));
 if(matches.length!==1)return {missing:'De exacte bronrij is niet uniek op deze pagina.'};
 const {r,i}=matches[0];const label=normalize(r.cells.filter(x=>x.x<220).map(x=>x.text).join(' '));
 if(!rule.re.test(label))return {error:'De brontabel gebruikt een andere financiële definitie.'};
 const before=page.rows.slice(0,i);const headerIndex=before.map((r,j)=>({j,years:r.cells.filter(x=>x.x>180&&/^20\d{2}$/.test(x.text.trim()))})).filter(x=>[2,4].includes(x.years.length)).at(-1);
 if(!headerIndex)return {missing:'Jaarkolommen ontbreken in de bewaarde bronlayout.'};
 const {j,years}=headerIndex;const header=page.rows.slice(Math.max(0,j-3),j+1).map(rowText).join('\n');
 if(normalize(header)!==normalize(pdf.header))return {error:'Bewaarde tabelkop verschilt van de oorspronkelijke bronlayout.'};
 const dates=[...header.matchAll(new RegExp('('+MONTHS.join('|')+')\\s+(\\d{1,2})','g'))];
 const quarter=/Three months ended/i.test(header),half=/Six months ended/i.test(header),annual=/Years? ended/i.test(header);
 if(years.length===4&&(!quarter||!half||dates.length!==2||dates[0][0]!==dates[1][0])||years.length===2&&![1,2].includes(dates.length))return {missing:'Geen eenduidig ondersteunde periodekop. TTM/guidance wordt niet geraden.'};
 const noteX=page.rows[j].cells.find(x=>/^Notes$/i.test(x.text.trim()))?.x;
 const numeric=r.cells.filter(x=>x.x>years[0].x-30&&(noteX===undefined||Math.abs(x.x-noteX)>28)&&financialNumber(x.text)!==null);
 if(numeric.length!==years.length)return {missing:'Aantal tabelwaarden komt niet overeen met de jaarkolommen.'};
 const assigned=numeric.map(x=>({cell:x,column:years.map((y,k)=>({k,d:Math.abs(x.x-y.x)})).sort((a,b)=>a.d-b.d)[0]}));
 if(new Set(assigned.map(x=>x.column.k)).size!==years.length||assigned.some(x=>x.column.d>42))return {missing:'Kolomcoördinaten zijn niet eenduidig.'};
 let amountScale:number|null=null;for(const text of page.rows.slice(0,i+1).map(rowText)){if(/\(\$000|thousands of Canadian dollars/.test(text))amountScale=1000;if(/\(\$ millions|millions of Canadian dollars/.test(text))amountScale=1000000;}
 const scale=rule.unit==='shares'?/\(000\)/.test(label)?1000:1:rule.currency?amountScale:1;
 const cad=proof.layout.pages.some(p=>p.rows.some(r=>/Canadian dollars unless otherwise indicated|expressed in thousands of Canadian dollars/i.test(rowText(r))));
 if(scale===null||rule.currency&&!cad)return {missing:'Expliciete schaal of Canadese rapportagevaluta ontbreekt.'};
 if(/US\$|USD|U\.S\. dollars|United States dollars/.test(header)&&rule.currency)return {error:'De brontabel vermeldt een andere valuta.'};
 // The audited CAD caption excludes EPS amounts from its currency scale; it
 // does not turn every preceding revenue cell into revenue per share. Only this
 // exact caption exception is removed; real per-unit/netback headers still fail.
 const unitContext=page.rows.slice(0,i).map(rowText).map(t=>t.replace(/^(\(Expressed in (?:thousands|millions) of Canadian dollars), except per share amounts(\))$/i,'$1$2')).join(' ');
 if(rule.unit==='CAD'&&/per share|per boe|Netback|realized prices/i.test(label+' '+unitContext)&&c.metric==='revenue')return {error:'Bedrag per eenheid/netback mag geen totale omzet zijn.'};
 if(c.metric==='netIncome'&&proof.layout.pages.some(p=>p.rows.some(r=>/Net income and comprehensive income attributable to Advantage shareholders/.test(rowText(r)))))return {missing:'Nettoresultaat is volgens voetnoot toerekenbaar aan Advantage-aandeelhouders; expliciete definitie/scopebeoordeling vereist.'};
 const scope=sourceScope(page.rows,i);if(!scope)return {missing:'Bedrijfsscope kan niet uit de bronsectie worden vastgesteld.'};
 const actualScope=/attributable to Advantage|^Advantage Adjusted funds flow/.test(label)?'excluding-entropy':scope;
 if(!/^advantage-energy:(consolidated|excluding-entropy|entropy):(pre-wembley|event-basis-unreconciled)$/.test(c.datum.scope)||c.datum.scope.split(':')[2]!== (c.datum.period.end<'2026-09-11'?'pre-wembley':'event-basis-unreconciled'))return {error:'Bedrijfsidentiteit of transactiecontext in het scopeveld is ongeldig.'};
 const expectedScope=c.datum.scope.split(':')[1];if(actualScope!==expectedScope)return {error:'Bronsectie en kandidaat hebben verschillende bedrijfsscope (Advantage/Entropy/geconsolideerd).'};
 const cells=[];for(const {cell,column} of assigned){const k=column.k,m=dates[years.length===4?0:dates.length===2?k:0];const month=MONTHS.indexOf(m[1])+1,year=Number(years[k].text),day=Number(m[2]);
  if(quarter&&![3,6,9,12].includes(month)||half&&month!==6||annual&&month!==12)return {missing:'Niet-ondersteunde kalender-/halfjaargrens; beginperiode wordt niet geraden.'};
  if(day!==new Date(Date.UTC(year,month,0)).getUTCDate())return {missing:'De datumkop is niet een ondersteunde einddatum.'};
  const instant=rule.type==='balance'||rule.type==='shares';const periodType=instant?'instant':years.length===4?k<2?'quarter':'year-to-date':quarter?'quarter':half?'year-to-date':annual?'annual':null;
  if(!periodType)return {missing:'Looptijd niet bewezen. Geen TTM of toekomstperiode afgeleid.'};
  const end=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const start=instant?end:`${year}-${String(periodType==='quarter'?month-2:1).padStart(2,'0')}-01`;
  cells.push({start,end,periodType,raw:cell.text,value:financialNumber(cell.text)!*scale,scale});
 }
 const chosen=cells.filter(v=>v.start===c.datum.period.start&&v.end===c.datum.period.end&&v.periodType===pdf.periodType);
 if(!chosen.length)return {error:'Verslagperiode of peildatum verschilt van de geselecteerde bronkolom.'};
 if(chosen.some(v=>v.raw===pdf.rawNumber&&close(v.value,c.datum.value)))return {cell:chosen.find(v=>v.raw===pdf.rawNumber&&close(v.value,c.datum.value))!,unit:rule.unit,currency:rule.currency};
 return {error:'Bronkolom bevat een andere waarde, teken of schaal voor deze periode.'};
}
export function verifyCandidate(state:IntelligenceState,c:Candidate,proofs:Map<string,Proof>):Verification{
 const checks:Check[]=[];const add=(id:string,status:Check['status'],message:string,references?:string[])=>checks.push({id,status,message,...(references?{references}: {})});
 const doc=state.documents.find(d=>d.id===c.documentId),pdf=c.pdf,rule=DEFINITIONS[c.metric];
 const finish=():Verification=>{
  const classification:Classification=checks.some(x=>x.status==='fail')?'red':checks.some(x=>['source-layout','quote','page'].includes(x.id)&&x.status==='missing')||!doc||!pdf?'unverifiable':checks.some(x=>x.status==='missing')?'orange':'green';
  const historical=c.datum.period.end<'2026-09-11';
  const base={candidateId:c.id,version:VERIFIER_VERSION,classification,checks,explanation:{green:'Alle verplichte broncontroles geslaagd; geen menselijke goedkeuring of modelvrijgave.',orange:'Aanvullende handmatige broncontrole nodig; ontbrekend bewijs is geen bewezen conflict.',red:'Een concreet conflict of ongeldige bronbinding verhindert automatische verificatie.',unverifiable:'Onvoldoende controleerbaar bronmateriaal; geen automatische verificatieclaim.'}[classification],independentConfirmations:checks.filter(x=>x.id.startsWith('corroboration:')&&x.status==='pass').length,historical,context:historical?'Historische periode vóór Wembley; geen directe actuele modelinvoer.':'Transactie-/actuele modelaansluiting afzonderlijk vereist.',modelEligible:false as const,valuationReleased:false as const,sources:doc&&pdf?[{documentId:doc.id,url:doc.url,page:pdf.page,fileHash:pdf.fileHash}]:[]};
  return {...base,hash:digest(JSON.stringify(base))};
 };
 try{
  if(!doc){add('document','fail','Gekoppeld document ontbreekt.');return finish();}
  const {id,version,discoveredAt,status,...core}=doc;add('document',id===version&&documentIdentity(core)===id&&digest(doc.text)===doc.contentHash?'pass':'fail','Documentidentiteit, versie en teksthash gecontroleerd.');
  const {id:cid,fingerprint:fp,...candidateCore}=c;add('candidate',cid===fp&&fingerprint(candidateCore)===fp&&c.datum.documentId===doc.id&&c.companyId===doc.companyId?'pass':'fail','Kandidaatidentiteit en document-/bedrijfskoppeling gecontroleerd.');
  try{add('official-source',validateReference(doc.url,doc.companyId).sourceClass==='primary'&&doc.sourceClass==='primary'?'pass':'fail','Officiële bronherkomst gecontroleerd.');}catch{add('official-source','fail','Bronadres is niet toegestaan.');}
  if(!pdf||!doc.pdf){add('source-layout','missing','Deze kandidaat heeft geen ondersteund PDF-bronbewijs.');return finish();}
  add('candidate-origin',c.method==='pdf-table-v1'&&doc.method==='pdf-extraction'?'pass':'missing','Herkomst van de kandidaat is een ondersteunde PDF-tabelextractie.');
  add('pdf-binding',pdf.fileHash===doc.pdf.fileHash&&pdf.parser===doc.pdf.parser&&doc.pdf.status==='processed'?'pass':'fail','PDF-hash, parser en verwerkingsstatus vergeleken.');
  const source=state.documents.find(d=>d.id===doc.pdf!.sourceDocumentId);
  add('source-chain',source&&source.companyId===doc.companyId&&source.url===doc.url?'pass':'fail','Oorspronkelijke registratie en analyseversie gecontroleerd.');
  add('page',!pdf.page?'missing':Number.isInteger(pdf.page)&&pdf.page>0&&pdf.page<=doc.pdf.pages?'pass':'fail','Fysieke PDF-bronpagina ligt binnen het document.');
  add('quote',Boolean(c.quote)&&doc.text.includes(c.quote)&&normalize(c.quote).includes(normalize(pdf.rawNumber))?'pass':'missing','Letterlijke bronpassage en oorspronkelijk getal gecontroleerd.');
  const n=financialNumber(pdf.rawNumber);add('number',n!==null&&Number.isFinite(pdf.scale)&&pdf.scale>0&&close(n*pdf.scale,c.datum.value)?'pass':'fail','Teken, Engelse getalnotatie en vermenigvuldiging met schaal gecontroleerd.');
  add('definition',rule&&rule.re.test(pdf.definition)?'pass':'missing','Exacte financiële definitie moet een ondersteunde regel hebben; labels alleen zijn onvoldoende.');
  if(rule)add('unit',rule.unit===c.datum.unit&&rule.currency===c.currency?'pass':'fail','Valuta, geld/aandelen/productie-eenheid en definitietype gecontroleerd.');
  add('information-kind',c.datum.kind==='reported'?'pass':'missing','Guidance/ramingen vereisen afzonderlijke expliciete toekomstcontext.');
  const proof=proofs.get(pdf.fileHash);
  if(!proof||!validProof(proof)||proof.fileHash!==pdf.fileHash||proof.parser!==pdf.parser){add('source-layout','missing','Volledige hashgebonden bronlayout ontbreekt of is ongeldig; opgeslagen extractievelden alleen bewijzen de kolom niet.');return finish();}
  add('page-count',proof.layout.pages.length===doc.pdf.pages?'pass':'fail','Aantal fysieke PDF-pagina’s vergeleken met de geregistreerde analyse.');
  add('source-layout','pass','Oorspronkelijke PDF-layout beschikbaar met gecontroleerde volledige bestandshash.',[proof.hash]);
  const inspected=inspectCell(c,proof,pdf.page);
  if(inspected.error)add('source-cell','fail',inspected.error);
  else if(inspected.missing)add('source-cell','missing',inspected.missing);
  else{add('source-cell','pass','Waarde en periode onafhankelijk uit de oorspronkelijke tabelkolom gecontroleerd.');add('scale',inspected.cell!.scale===pdf.scale?'pass':'fail','Tabelschaal vergeleken; 1.000× verschil is een ernstig conflict.');}
  if(rule?.nonGaap)add('management-definition','missing','Niet-IFRS/managementmaatstaf: inhoudelijke definitie en reconciliatie moeten nog expliciet worden beoordeeld.');
  // The supportingPages list itself is not independent confirmation: recheck the actual row.
  for(const page of [...new Set(pdf.supportingPages)].filter(p=>p!==pdf.page)){
   const result=inspectCell(c,proof,page);add('corroboration:'+page,result.cell?'pass':'not-applicable',result.cell?'Zelfde definitie, periode, scope, valuta en waarde op een andere bronpagina bevestigd.':'Ondersteuningspagina levert geen volledig vergelijkbare onafhankelijke tabelrij; niet als bevestiging geteld.');
  }
  for(const peer of state.candidates.filter(p=>p.documentId!==c.documentId&&same(c,p)&&close(p.datum.value,c.datum.value))){
   const pd=state.documents.find(d=>d.id===peer.documentId),pp=peer.pdf&&proofs.get(peer.pdf.fileHash);
   if(!pp||!peer.pdf||!pd?.pdf||pd.pdf.fileHash===pdf.fileHash||!validProof(pp)||pp.fileHash!==peer.pdf.fileHash||pp.parser!==peer.pdf.parser)continue;
   const result=inspectCell(peer,pp,peer.pdf.page);if(result.cell)add('corroboration:document:'+pd.id,'pass','Vergelijkbare bronwaarde in een ander hashgebonden document opnieuw tegen de oorspronkelijke kolom gecontroleerd.',[peer.id,pp.hash]);
  }
  if(state.candidates.some(p=>p.id!==c.id&&p.documentId===c.documentId&&same(c,p)&&close(p.datum.value,c.datum.value)))add('duplicate','fail','Dubbele kandidaat voor dezelfde bronwaarde en definitie; geen dubbele telling of onafhankelijke bevestiging.');
  // Historical other-document values can reflect restatements. Never choose a winner.
  for(const peer of state.candidates.filter(p=>p.id!==c.id&&same(c,p)&&!close(p.datum.value,c.datum.value))){
   const pd=state.documents.find(d=>d.id===peer.documentId);const changed=Boolean(doc.supersedes||pd?.supersedes||/restat/i.test(doc.text+' '+(pd?.text??'')));
   add('conflict:'+peer.id,changed?'missing':'fail',changed?'Afwijkende vergelijkbare bronwaarde met correctie/restatementcontext; handmatige aansluiting vereist.':'Tegenstrijdige kandidaat met dezelfde exacte definitie, scope, periode, eenheid en valuta.',[peer.id]);
  }
  return finish();
 }catch{add('verification-error','missing','Deze kandidaat kon niet volledig worden gecontroleerd; overige kandidaten worden afzonderlijk verwerkt.');return finish();}
}
/** Only additive flow amounts: never debt, stock balances, weighted shares, production averages or ratios. */
export function flowCrossChecks(state:IntelligenceState){
 const results:{rule:string;candidateIds:string[];status:'pass'|'conflict';message:string}[]=[];
 for(const h of state.candidates){if(!['revenue','operatingCashFlow','netIncome'].includes(h.metric)||h.pdf?.periodType!=='year-to-date'||!h.datum.period.end.endsWith('-06-30'))continue;
  const year=h.datum.period.end.slice(0,4);const comparable=(c:Candidate)=>c.companyId===h.companyId&&c.metric===h.metric&&c.datum.scope===h.datum.scope&&c.datum.unit===h.datum.unit&&c.currency===h.currency&&c.pdf?.definition===h.pdf?.definition;
  const q1=state.candidates.filter(c=>comparable(c)&&c.pdf?.periodType==='quarter'&&c.datum.period.start===year+'-01-01'&&c.datum.period.end===year+'-03-31');
  const q2=state.candidates.filter(c=>comparable(c)&&c.pdf?.periodType==='quarter'&&c.datum.period.start===year+'-04-01'&&c.datum.period.end===h.datum.period.end);
  if(q1.length!==1||q2.length!==1)continue;const tolerance=Math.max(h.pdf?.scale??1,q1[0].pdf?.scale??1,q2[0].pdf?.scale??1)*1.5;
  const pass=close(q1[0].datum.value!+q2[0].datum.value!,h.datum.value!,tolerance);
  results.push({rule:'additive-Q1+Q2=H1',candidateIds:[q1[0].id,q2[0].id,h.id],status:pass?'pass':'conflict',message:pass?'Optelbare periodebedragen sluiten binnen expliciete afrondingstolerantie aan.':'Periodebedragen sluiten niet aan; correctie/restatement of scopewijziging handmatig onderzoeken.'});
 }
 return results;
}
export function verifyAll(state:IntelligenceState,proofs:Map<string,Proof>){
 const arithmetic=flowCrossChecks(state);return state.candidates.map(c=>{
  const result=verifyCandidate(state,c,proofs);const related=arithmetic.filter(r=>r.candidateIds.includes(c.id));
  if(!related.length)return result;
  const {hash,...base}=result;const checks=[...base.checks,...related.map(r=>({id:r.rule,status:r.status==='pass'?'pass' as const:'missing' as const,message:r.message,references:r.candidateIds}))];
  const classification=base.classification==='green'&&related.some(r=>r.status==='conflict')?'orange':base.classification;
  const updated={...base,classification,checks,explanation:classification==='orange'?'Rekenkundige aansluiting vereist handmatig onderzoek; bronverificatie geeft geen modelvrijgave.':base.explanation};return {...updated,hash:digest(JSON.stringify(updated))};
 });
}
