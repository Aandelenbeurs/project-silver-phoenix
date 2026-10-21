import {createHash} from 'node:crypto';
import {validDate} from '../evidence';
import type {Candidate,SourceDocument} from './contracts';
export const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export const fingerprint=(c:Omit<Candidate,'fingerprint'|'id'>)=>digest(JSON.stringify(c));
const RULES=[
 {metric:'netDebt',label:'Nettoschuld',pattern:/\bnet debt\b(?:\([a-z0-9]+\))?\s*(?:of|was|:)?\s*(C\$|US\$|CAD|USD|\$)?\s*([\d][\d,.]*)\s*(billion|million|thousand)?/ig,money:true,companies:['advantage-energy']},
 {metric:'cash',label:'Kas en kasequivalenten',pattern:/\bcash and cash equivalents\b\s*(?:of|was|:)?\s*(C\$|US\$|CAD|USD|\$)?\s*([\d][\d,.]*)\s*(billion|million|thousand)?/ig,money:true,companies:['abrasilver','advantage-energy']},
 {metric:'projectNPV',label:'Project-NPV (geen equity)',pattern:/\bafter-tax NPV\s*\(?5%\)?\s*(?:of|was|:)?\s*(C\$|US\$|CAD|USD|\$)?\s*([\d][\d,.]*)\s*(billion|million|thousand)?/ig,money:true,companies:['abrasilver']},
 {metric:'initialCapex',label:'Initiële projectcapex',pattern:/\binitial capital(?: expenditures| costs)?\s*(?:of|was|:)?\s*(C\$|US\$|CAD|USD|\$)?\s*([\d][\d,.]*)\s*(billion|million|thousand)?/ig,money:true,companies:['abrasilver']},
] as const;
import {METRICS,UNITS} from './catalog';
export {METRICS,UNITS} from './catalog';
export function parseNumber(raw:string):number|null{
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(raw))return null;
 const n=Number(raw.replace(/,/g,''));return Number.isFinite(n)&&n>=0&&n<=1e15?n:null;
}
function make(doc:SourceDocument,input:{metric:string;label:string;value:number|null;unit:string;currency:'CAD'|'USD'|null;kind:'reported'|'guidance';raw:string;quote:string;locator:string;method:'rule-v1'|'manual-v1';formula:string|null;issues:string[]}):Candidate{
 const issues=[...input.issues];
 if(!doc.publishedAt)issues.push('Publicatiedatum ontbreekt.');
 if(!validDate(doc.period.start)||!validDate(doc.period.end))issues.push('Verslagperiode ontbreekt.');
 if(doc.sourceClass!=='primary')issues.push('Secundaire bron: onafhankelijk primair bewijs nodig.');
 if(input.value===null||!input.unit)issues.push('Waarde of eenheid is onduidelijk.');
 if(doc.currency===null&&/CAD|USD/.test(input.unit))issues.push('Documentvaluta moet expliciet worden bevestigd.');
 if(doc.publishedAt&&input.kind==='reported'&&doc.period.end>doc.publishedAt)issues.push('Gerapporteerde periode eindigt na publicatie. Gebruik guidance alleen als de bron dat daadwerkelijk aangeeft.');
 const {value,unit,kind,metric,label,currency,raw,quote,locator,method,formula}=input;
 const c:Omit<Candidate,'id'|'fingerprint'>={documentId:doc.id,companyId:doc.companyId,metric,label,currency,raw,quote,locator,method,formula,
  datum:{id:metric,value,unit,kind,verification:'unreviewed',period:{...doc.period},scope:doc.companyId+':unreconciled-source',documentId:doc.id,locator,uncertainties:issues},
  status:issues.length?'insufficient-evidence':'to-review',issues,
  relation:kind==='guidance'?'guidance':doc.supersedes?'correction':doc.event==='financial-report'?'new-period':'event',
  relevance:'Mogelijke invloed op financieel dossier en '+(metric==='shares'||metric==='dilutedShares'?'aandelennoemer':metric==='projectNPV'?'projectanalyse; geen equitywaarde':'modelinvoer')+'. Scope en aansluiting moeten afzonderlijk worden gevalideerd.'};
 const h=fingerprint(c);return {...c,id:h,fingerprint:h};
}
export function extractCandidates(doc:SourceDocument):Candidate[]{
 const result:Candidate[]=[];
 for(const rule of RULES){if(!(rule.companies as readonly string[]).includes(doc.companyId))continue;
  const re=new RegExp(rule.pattern.source,rule.pattern.flags);let m:RegExpExecArray|null;
  while((m=re.exec(doc.text))&&result.length<100){
   const prefix=m[1],raw=m[2],scale=m[3]?.toLowerCase();
   const currency=prefix==='US$'||prefix==='USD'?'USD':prefix==='C$'||prefix==='CAD'?'CAD':doc.currency;
   const multiplier=scale==='billion'?1e9:scale==='million'?1e6:scale==='thousand'?1e3:1;
   const n=parseNumber(raw);const scaled=n===null?null:n*multiplier;const value=scaled!==null&&scaled<=1e15?scaled:null;
   const line=doc.text.slice(0,m.index).split('\n').length;
   // A rule deliberately never infers actual vs forecast from document type.
   const before=doc.text.slice(Math.max(0,m.index-100),m.index).split('\n').pop()??'';
   const guidance=/expect|forecast|guidance|target|estimate/i.test(before)||rule.metric==='projectNPV'||rule.metric==='initialCapex';
   const issues:string[]=[];
   if(!currency)issues.push('Valuta niet expliciet vastgelegd.');
   if(!scale)issues.push('Schaal niet expliciet bij het bedrag; controleer de tabelkop en maak zo nodig een handmatige kandidaat.');
   if(currency&&doc.currency&&currency!==doc.currency)issues.push('Valuta in tekst wijkt af van documentcontext.');
   if(n===null)issues.push('Onduidelijke getalnotatie; decimale komma wordt niet geraden.');
   result.push(make(doc,{metric:rule.metric,label:rule.label,value,unit:currency??'',currency:currency??null,kind:guidance?'guidance':'reported',raw:m[0],quote:m[0],locator:`${doc.locator}; fragmentregel ${line}`,method:'rule-v1',formula:multiplier!==1?`${raw} × ${multiplier} (schaalnormalisatie)` :null,issues}));
  }
 }
 // Same-metric contradictions within an excerpt block all competing values.
 return result.map(c=>{if(!result.some(x=>x.metric===c.metric&&x.datum.value!==c.datum.value))return c;
  const {id:_id,fingerprint:_fp,...base}=c;const issues=[...c.issues,'Tegenstrijdige waarden voor dezelfde metriek in dit fragment; selecteer periode/kolom handmatig.'];
  const updated={...base,status:'conflicting' as const,issues,datum:{...base.datum,uncertainties:issues}};const h=fingerprint(updated);return {...updated,id:h,fingerprint:h};
 });
}
export interface ManualValue {metric:keyof typeof METRICS;value:number;unit:typeof UNITS[number];currency:'CAD'|'USD'|null;kind:'reported'|'guidance';quote:string;locator:string;rawNumber:string;scale:1|1000|1000000|1000000000}
export function manualCandidate(doc:SourceDocument,v:ManualValue):Candidate{
 if(typeof v.rawNumber!=='string'||v.rawNumber.length<1||v.rawNumber.length>40||typeof v.quote!=='string'||typeof v.locator!=='string')throw Error('Getal, bronfragment en vindplaats zijn vereist.');
 if(!Object.hasOwn(METRICS,v.metric)||!UNITS.includes(v.unit)||!['reported','guidance'].includes(v.kind)||!['CAD','USD',null].includes(v.currency)||![1,1000,1000000,1000000000].includes(v.scale))throw Error('Ongeldige handmatige definitie.');
 if(!v.quote||v.quote.length>1500||!doc.text.includes(v.quote)||!v.locator.trim()||v.locator.length>300)throw Error('Letterlijk fragment moet in de geïmporteerde tekst staan; originele vindplaats is vereist.');
 const raw=parseNumber(v.rawNumber);
 let exactNumber=false;let index=v.quote.indexOf(v.rawNumber);
 while(index>=0){const before=v.quote[index-1]??' ',after=v.quote[index+v.rawNumber.length]??' ';if(!/[0-9.,]/.test(before)&&!/[0-9.,]/.test(after)){exactNumber=true;break;}index=v.quote.indexOf(v.rawNumber,index+1);}
 if(raw===null||!exactNumber||!Number.isFinite(v.value)||v.value!==raw*v.scale||v.value>1e15)throw Error('Waarde moet exact aansluiten op het getal in het fragment en de gekozen schaal.');
 if(['projectNPV','initialCapex','sustainingCapex'].includes(v.metric)&&v.kind!=='guidance')throw Error('Projectstudiewaarden moeten als schatting/guidance worden geregistreerd.');
 const issues:string[]=[];
 if((v.unit.includes('CAD')&&v.currency!=='CAD')||(v.unit.includes('USD')&&v.currency!=='USD'))issues.push('Valuta en eenheid sluiten niet aan.');
 return make(doc,{...v,label:METRICS[v.metric],raw:v.rawNumber,method:'manual-v1',formula:v.scale===1?null:`${v.rawNumber} × ${v.scale} (handmatige schaalnormalisatie)`,issues});
}
