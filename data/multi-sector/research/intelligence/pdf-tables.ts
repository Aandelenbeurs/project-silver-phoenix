/** Narrow, deterministic AAV financial-table reader. No numbers are selected by text order alone. */
import {validDate} from '../evidence';
export interface PdfRow {y:number;cells:{x:number;text:string}[]}
export interface PdfPage {number:number;rows:PdfRow[]}
export interface PdfText {version:string;pages:PdfPage[]}
export type PeriodType='quarter'|'year-to-date'|'annual'|'instant';
export interface PdfValue {metric:string;label:string;value:number;unit:string;currency:'CAD'|null;period:{start:string;end:string};periodType:PeriodType;scope:string;definition:string;page:number;quote:string;header:string;rawNumber:string;scale:number;warnings:string[];supportingPages:number[]}
export const rowText=(r:PdfRow)=>r.cells.map(c=>c.text).join(' ').replace(/\s+/g,' ').trim();
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export function financialNumber(raw:string):number|null{
 let t=raw.trim(),negative=false;if(/^\(.*\)$/.test(t)){negative=true;t=t.slice(1,-1);}if(t.startsWith('-')){if(negative)return null;negative=true;t=t.slice(1);}
 // English reporting convention only. A comma must be a proper thousands group.
 if(!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(t))return null;
 const n=Number(t.replace(/,/g,''))*(negative?-1:1);return Number.isFinite(n)&&Math.abs(n)<=1e15?n:null;
}
const RULES=[
 {re:/^Natural gas and liquids sales$/,metric:'revenue',label:'Omzet aardgas en liquids (vóór royalty’s)',money:true},
 {re:/^Cash (?:provided by|flows? from) operating activities$/,metric:'operatingCashFlow',label:'Operationele kasstroom',money:true},
 {re:/^(?:Advantage )?Adjusted funds flow$/,metric:'adjustedFundsFlow',label:'Adjusted funds flow (geen operationele kasstroom)',money:true,nonGaap:true},
 {re:/^Net capital expenditures$/,metric:'netCapex',label:'Netto kapitaaluitgaven (gerapporteerde definitie)',money:true,nonGaap:true},
 {re:/^Net debt(?: attributable to Advantage)?$/,metric:'netDebt',label:'Nettoschuld',money:true,point:true,nonGaap:true},
 {re:/^Bank indebtedness$/,metric:'bankDebt',label:'Bankschuld (geen totale brutoschuld)',money:true,point:true},
 {re:/^Cash and cash equivalents(?:, end of period)?$/,metric:'cash',label:'Kas en kasequivalenten',money:true,point:true},
 {re:/^Basic weighted average shares \(000\)$/,metric:'basicWeightedShares',label:'Gewogen gemiddeld aantal basisaandelen',shares:true},
 {re:/^Diluted weighted average shares \(000\)$/,metric:'dilutedWeightedShares',label:'Gewogen gemiddeld verwaterde aandelen (EPS)',shares:true},
 {re:/^Shares outstanding$/,metric:'shares',label:'Uitstaande aandelen op peildatum',shares:true,point:true},
 {re:/^Total production \(boe\/d\)$/,metric:'totalProduction',label:'Gemiddelde totale productie',unit:'boe/d'},
 {re:/^Natural gas \(Mcf\/d\)$/,metric:'gasProduction',label:'Gemiddelde gasproductie',unit:'Mcf/d'},
 {re:/^Total liquids \(bbls?\/d\)$/,metric:'liquidsProduction',label:'Gemiddelde liquidsproductie',unit:'bbl/d'},
 {re:/^Condensate \(bbls?\/d\)$/,metric:'condensateProduction',label:'Gemiddelde condensaatproductie',unit:'bbl/d'},
 {re:/^Crude oil \(bbls?\/d\)$/,metric:'crudeOilProduction',label:'Gemiddelde olieproductie',unit:'bbl/d'},
] as const;
function date(year:number,month:number,day:number){const result=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;return validDate(result)?result:null;}
interface Column {x:number;period:{start:string;end:string};type:PeriodType}
function columns(rows:PdfRow[],index:number):Column[]|null{
 const years=rows[index].cells.filter(c=>/^20\d{2}$/.test(c.text.trim())&&c.x>180);
 if(![2,4].includes(years.length))return null;
 const preceding=rows.slice(Math.max(0,index-3),index).map(rowText).join(' ');
 const months=[...preceding.matchAll(new RegExp('('+MONTHS.join('|')+')\\s+(\\d{1,2})','g'))];
 const three=/Three months ended/i.test(preceding),six=/Six months ended/i.test(preceding),annual=/Year(?:s)? ended/i.test(preceding);
 if(years.length===4&&(!three||!six||months.length!==2||months[0][0]!==months[1][0]))return null;
 if(years.length===2&&months.length!==1&&months.length!==2)return null;
 return years.map((c,i)=>{
  const m=months[years.length===4?0:months.length===2?i:0];const month=MONTHS.indexOf(m[1])+1,year=Number(c.text.trim()),day=Number(m[2]);const end=date(year,month,day);
  if(!end||day!==new Date(Date.UTC(year,month,0)).getUTCDate()||three&&![3,6,9,12].includes(month)||six&&month!==6||annual&&month!==12)throw Error('DATE');
  const type:PeriodType=years.length===4?(i<2?'quarter':'year-to-date'):three?'quarter':annual?'annual':'instant';
  const start=type==='quarter'?date(year,month-2,1):type==='annual'||type==='year-to-date'?date(year,1,1):end;
  if(!start)throw Error('DATE');return {x:c.x,period:{start,end},type};
 });
}
export function extractPdfTables(pdf:PdfText){
 const found:PdfValue[]=[],warnings:string[]=[];let unresolved=0;
 const all=pdf.pages.map(p=>p.rows.map(rowText).join('\n')).join('\n');
 const cad=/Canadian dollars unless otherwise indicated/i.test(all)||/expressed in thousands of Canadian dollars/i.test(all);
 for(const page of pdf.pages){
  let noteX:number|undefined;let cols:Column[]|null=null,header='',moneyScale:number|null=null,scope='unknown';
  const opening=page.rows.slice(0,4).map(rowText).join(' ');
  if(/Consolidated Statements|Consolidated Financial/i.test(opening))scope='consolidated';
  if(/Operating Highlights/i.test(opening)&&/Advantage.{0,30}natural gas and liquids operations/i.test(page.rows.map(rowText).join(' ')))scope='excluding-entropy';
  for(let i=0;i<page.rows.length;i++){
   const row=page.rows[i],text=rowText(row);
   if(/Consolidated Financial Statement Highlights/.test(text))scope='consolidated';
   if(/^Advantage Energy Ltd\.$/.test(text)&&/Financial Highlights/.test(opening))scope='excluding-entropy';
   if(/^Entropy Inc\.$/.test(text))scope='entropy';
   if(/\(\$000|thousands of Canadian dollars/.test(text))moneyScale=1000;
   if(/\(\$ millions|millions of Canadian dollars/.test(text))moneyScale=1000000;
   if(row.cells.filter(c=>/^20\d{2}$/.test(c.text.trim())&&c.x>180).length>=2){
    try{cols=columns(page.rows,i);}catch{cols=null;}
    noteX=row.cells.find(c=>/^Notes$/i.test(c.text.trim()))?.x;
    header=page.rows.slice(Math.max(0,i-3),i+1).map(rowText).join('\n');continue;
   }
   const label=row.cells.filter(c=>c.x<220).map(c=>c.text).join(' ').trim();
   const rule=RULES.find(r=>r.re.test(label));if(!rule)continue;
   if(!cols){unresolved++;continue;}
   if(scope==='entropy')continue;
   let rowScope=scope;
   if(/attributable to Advantage|^Advantage Adjusted funds flow/i.test(label))rowScope='excluding-entropy';
   if(rowScope==='unknown'){unresolved++;continue;}
   // The monetary total in a per-boe/netback table must NEVER be treated as revenue.
   if(rule.metric==='revenue'&&/Netback|realized prices/.test(page.rows.slice(0,i).map(rowText).join(' ')))continue;
   if(/US\$|USD|U\.S\. dollars|United States dollars/i.test(header)&&'money' in rule){unresolved++;continue;}
   const currency='money' in rule&&rule.money?cad?'CAD':null:null;
   const scale='shares' in rule?(/\(000\)/.test(label)?1000:1):'money' in rule?moneyScale:1;
   if(scale===null||'money' in rule&&!currency){unresolved++;continue;}
   // Every numeric cell must map uniquely to a year-column anchor; note references are left of those anchors.
   const numbers=row.cells.filter(c=>c.x>cols![0].x-30&&(noteX===undefined||Math.abs(c.x-noteX)>28)&&financialNumber(c.text)!==null);
   if(numbers.length!==cols.length){unresolved++;continue;}
   const assignments=numbers.map(c=>cols!.map((col,j)=>({j,distance:Math.abs(col.x-c.x)})).sort((a,b)=>a.distance-b.distance)[0]);
   if(new Set(assignments.map(a=>a.j)).size!==cols.length||assignments.some(a=>a.distance>42)){unresolved++;continue;}
   for(let k=0;k<numbers.length;k++){
    const col=cols[assignments[k].j],n=financialNumber(numbers[k].text)!;
    const point='point' in rule&&rule.point;
    const period=point?{start:col.period.end,end:col.period.end}:col.period;
    const periodType=point?'instant':col.type;
    if(!point&&col.type==='instant'){unresolved++;continue;}
    const itemWarnings=['Historisch brongegeven; geen aansluiting naar de huidige financiële positie.'];
    if(period.end<'2026-09-11')itemWarnings.push('Vóór Wembley-verkoop: niet als actuele nettoschuld, productie of aandelenbasis gebruiken.');
    if('shares' in rule&&scale===1000)itemWarnings.push('Aantal aandelen is gerapporteerd in duizenden; afgerond tabelcijfer, geen exacte actuele equitynoemer.');
    if('nonGaap' in rule)itemWarnings.push('Niet-IFRS/managementmaatstaf: controleer definitie en reconciliatie in het originele rapport.');
    const value=n*scale;if(!Number.isFinite(value)||Math.abs(value)>1e15){unresolved++;continue;}
    found.push({metric:rule.metric,label:rule.label,value,unit:'unit' in rule?rule.unit:'shares' in rule?'shares':'CAD',currency,period,periodType,scope:'advantage-energy:'+rowScope+':'+(period.end<'2026-09-11'?'pre-wembley':'event-basis-unreconciled'),definition:label,page:page.number,quote:text,header,rawNumber:numbers[k].text,scale,warnings:itemWarnings,supportingPages:[]});
   }
  }
 }
 // Preserve different periods/scopes/definitions, coalesce exact corroborations only.
 const result:PdfValue[]=[];
 for(const value of found){const known=result.find(v=>v.metric===value.metric&&v.period.start===value.period.start&&v.period.end===value.period.end&&v.periodType===value.periodType&&v.scope===value.scope&&v.unit===value.unit&&v.value===value.value);
  if(known){if(known.page!==value.page&&!known.supportingPages.includes(value.page))known.supportingPages.push(value.page);continue;}result.push(value);
 }
 if(unresolved)warnings.push(`${unresolved} herkende rijen/waarden niet automatisch verwerkt wegens onduidelijke kolom, periode, scope of eenheid.`);
 if(/convertible debentures/i.test(all))warnings.push('Converteerbare obligaties niet automatisch geëxtraheerd: hoofdsom, schuldboekwaarde en eigenvermogenscomponent moeten afzonderlijk worden gereconcilieerd.');
 if(/guidance|forecast|expects/i.test(all))warnings.push('Guidance en ranges zijn niet automatisch geïnterpreteerd; gebruik handmatige import met toekomstperiode en managementdefinitie.');
 if(!result.length)warnings.push('Geen betrouwbaar ondersteunde financiële tabel gevonden. Handmatige bronimport vereist.');
 if(result.length>100)throw Error('CANDIDATE_LIMIT');
 return {values:result,warnings,reportDate:/dated as of ([A-Za-z]+ \d{1,2}, 20\d{2})/.exec(all)?.[1]??null};
}
