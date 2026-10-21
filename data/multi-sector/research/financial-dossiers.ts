import {reviewEvidence,type EvidenceDocument,type FinancialDatum} from './evidence';
import {BRIDGE_FIELDS,reconcileEquity,dilutionSensitivity,type BridgeBasis} from './equity-bridge';
import {getAavValidationReview,REVIEW_SOURCES} from '../sectors/canadian-natural-gas/advantage-energy-validation-review';
export const FINANCIAL_RESEARCH_AS_OF='2026-10-21';
const abra='https://www.abrasilver.com/';
export const FINANCIAL_DOCUMENTS:readonly EvidenceDocument[]=[
 {id:'abra-dfs-release',title:'Diablillos DFS results — 22 June 2026',uri:abra+'news-releases/abrasilvers-definitive-feasibility-study-positions-diablillos-among-the-premier-undeveloped-silver-gold-projects-globally-with-cad42b-after-tax-npv5--42-irr',publishedAt:'2026-06-22',origin:'issuer'},
 {id:'abra-dfs-filing',title:'DFS technical report filed; heap leach PEA update',uri:abra+'news-releases/abrasilver-files-definitive-feasibility-study-technical-report--provides-heap-leach-pea-update',publishedAt:'2026-07-21',origin:'issuer'},
 {id:'abra-q2',title:'Q2 2026 financial statements (unaudited)',uri:abra+'_resources/financials/ABRA-Q2-FS-2026.pdf',publishedAt:'',origin:'issuer'},
 {id:'abra-mda',title:'Q2 2026 MD&A (board approval 13 August; publication date not established)',uri:abra+'_resources/financials/ABRA-Q2-MDA-2026.pdf',publishedAt:'',origin:'issuer'},
 {id:'abra-financing',title:'Closing C$50m public offering',uri:abra+'news-releases/abrasilver-announces-closing-of-c50-million-bought-deal-public-offering-of-common-shares',publishedAt:'2026-07-29',origin:'issuer'},
 {id:'abra-private',title:'Closing concurrent private placement',uri:abra+'news-releases/abrasilver-announces-closing-of-concurrent-private-placement',publishedAt:'2026-07-31',origin:'issuer'},
 ...(['q2','guidance','closing','aif'] as const).map(id=>({id:'aav-'+id,title:REVIEW_SOURCES[id].title,uri:REVIEW_SOURCES[id].url,publishedAt:REVIEW_SOURCES[id].published,origin:'issuer' as const})),
];
export interface DossierDatum extends FinancialDatum {label:string;company:'AbraSilver'|'Advantage Energy'}
function datum(company:DossierDatum['company'],id:string,label:string,value:number,unit:string,kind:FinancialDatum['kind'],date:string,documentId:string,locator:string,uncertainties:string[]=[],start=date):DossierDatum{
 return {company,id,label,value,unit,kind,verification:'reviewed',period:{start,end:date},scope:company==='AbraSilver'?'abrasilver':documentId==='aav-closing'?'advantage-wembley-transaction':documentId==='aav-guidance'?'advantage-post-wembley-guidance':'advantage-pre-wembley',documentId,locator,uncertainties};
}
export const FINANCIAL_DATA:readonly DossierDatum[]=[
 datum('AbraSilver','ownership','Diablillos eigendom',100,'%', 'reported','2026-07-21','abra-dfs-filing','About AbraSilver'),
 datum('AbraSilver','projectNPV5','Project-NPV na belasting, 5%',3003,'USD million','guidance','2026-06-19','abra-dfs-release','Table 1, base case',['Studieresultaat; geen gerealiseerde kasstroom of aandelenwaarde. Effectieve DFS-datum bevestigd door filingbericht.']),
 datum('AbraSilver','projectNPV8','Project-NPV na belasting, 8%',2223,'USD million','guidance','2026-06-19','abra-dfs-release','Table 1, base case'),
 datum('AbraSilver','studySilver','Studieaanname zilver',50,'USD/oz','guidance','2026-06-19','abra-dfs-release','Table 1'),
 datum('AbraSilver','studyGold','Studieaanname goud',3650,'USD/oz','guidance','2026-06-19','abra-dfs-release','Table 1'),
 datum('AbraSilver','initialCapex','Initiële capex vanaf FID',721.5,'USD million','guidance','2026-06-19','abra-dfs-release','Table 4',['Contingency inbegrepen; niet opnieuw aftrekken van netto project-NPV.']),
 datum('AbraSilver','sustainingCapex','Onderhoudscapex, gehele mijnleven',519.8,'USD million','guidance','2026-06-19','abra-dfs-release','Table 4'),
 datum('AbraSilver','closureCost','Ontmantelingskosten',74.1,'USD million','guidance','2026-06-19','abra-dfs-release','Table 4',['Geen extra aftrek zonder controle welke kasstromen al in NPV zitten.']),
 datum('AbraSilver','mineLife','Mijnlevensduur',25,'years','guidance','2026-06-19','abra-dfs-release','Table 5'),
 {...datum('AbraSilver','aiscConflict','AISC LOM: niet eenduidig',19.98,'USD/oz AgEq','guidance','2026-06-19','abra-dfs-release','Operating Costs paragraph vs Table 5',['Lopende tekst 19,89; tabel 5 19,98. Niet als één bewezen modelinput gebruiken. Volledig technisch rapport niet opnieuw doorgerekend.']),verification:'conflicting'},
 datum('AbraSilver','oreReserve','Bewezen + waarschijnlijke reserves',77.9,'million tonnes','reported','2026-05-16','abra-dfs-release','Mineral Reserve Estimate',['Schatting, geen resource optellen bij reserves; geen heap leach upside toegevoegd.']),
 datum('AbraSilver','royalty','Provinciale royalty',3,'%','guidance','2026-06-19','abra-dfs-release','Taxes and Royalties'),
 datum('AbraSilver','nsr','NSR royalty Elemental',1,'%','guidance','2026-06-19','abra-dfs-release','Taxes and Royalties'),
 datum('AbraSilver','tax','Inkomstenbelasting in DFS',25,'%','guidance','2026-06-19','abra-dfs-release','Taxes and Royalties',['RIGI-voorwaarden en belastingbasis van toepassing.']),
 datum('AbraSilver','cashJune','Kas en kasequivalenten juni',8.088,'CAD million','reported','2026-06-30','abra-q2','PDF p.2 balance sheet',['Historisch, vóór juli-uitgiften. Publicatiedatum nog niet vastgesteld; bronpoort blijft dicht.']),
 datum('AbraSilver','termJune','Termijndeposito’s juni',15.435,'CAD million','reported','2026-06-30','abra-q2','PDF p.2; maturities August 2026–April 2027',['Niet gelijk aan onmiddellijk vrij beschikbare cash. Publicatiedatum onbekend.']),
 datum('AbraSilver','liabilitiesJune','Totale verplichtingen juni',5.404,'CAD million','reported','2026-06-30','abra-q2','PDF p.2 balance sheet',['Geen vervanger voor actuele financieringsverplichtingen.']),
 datum('AbraSilver','sharesAugust','Uitstaande aandelen 13 augustus',165492573,'shares','reported','2026-08-13','abra-mda','PDF p.17 section 10',['Geen actuele fully diluted noemer. Board approval is geen bewezen publicatiedatum.']),
 datum('AbraSilver','optionsAugust','Opties 13 augustus',4676000,'options','reported','2026-08-13','abra-mda','PDF p.17 section 10'),
 datum('AbraSilver','rsuAugust','RSU’s 13 augustus',730004,'RSUs','reported','2026-08-13','abra-mda','PDF p.17 section 10'),
 datum('AbraSilver','issueJuly','Aandelen uitgegeven 29 juli',3401000,'shares','reported','2026-07-29','abra-financing','Opening paragraph',['Al opgenomen in latere augustusstand; niet nogmaals optellen.']),
 datum('AbraSilver','grossJuly','Bruto-opbrengst openbare uitgifte',49994700,'CAD','reported','2026-07-29','abra-financing','Opening paragraph',['Geen nettocash; kosten en uitgaven niet afgetrokken. Uitgifteprijs CAD14,70 is geen actuele beurskoers.']),
 datum('AbraSilver','privateJuly','Aandelen private placement',139241,'shares','reported','2026-07-31','abra-private','Opening paragraph'),
 datum('Advantage Energy','productionQ2','Productie Q2, vóór verkoop',70611,'boe/d','reported','2026-06-30','aav-q2','Operating highlights',[], '2026-04-01'),
 datum('Advantage Energy','gasQ2','Gasproductie Q2',347.770,'MMcf/d','reported','2026-06-30','aav-q2','Operating highlights',[],'2026-04-01'),
 datum('Advantage Energy','liquidsQ2','Liquids Q2',12650,'bbl/d','reported','2026-06-30','aav-q2','Operating highlights',[],'2026-04-01'),
 datum('Advantage Energy','gasPriceQ2','Gerealiseerde gasprijs excl. derivaten',2.07,'CAD/Mcf','reported','2026-06-30','aav-q2','PDF p.10 Commodity Prices and Marketing',['Historische verkooprealisatie; geen forward AECO-prijs.'],'2026-04-01'),
 datum('Advantage Energy','gasPriceHedgedQ2','Gerealiseerde gasprijs incl. derivaten',2.56,'CAD/Mcf','reported','2026-06-30','aav-q2','PDF p.10 Commodity Prices and Marketing',['Hedge-effect niet nogmaals als aparte opbrengst toevoegen.'],'2026-04-01'),
 datum('Advantage Energy','opexQ2','Operationele kosten',5.78,'CAD/boe','reported','2026-06-30','aav-q2','PDF p.16 Operating Expense',[],'2026-04-01'),
 datum('Advantage Energy','transportQ2','Transportkosten',4.11,'CAD/boe','reported','2026-06-30','aav-q2','PDF p.17 Operating Netback',[],'2026-04-01'),
 datum('Advantage Energy','royaltyQ2','Royalty als deel gas/liquidsomzet',12.2,'%','reported','2026-06-30','aav-q2','PDF p.16 Royalty Expense',['Geen vaste royaltyvoet voor alle toekomstscenario’s.'],'2026-04-01'),
 datum('Advantage Energy','netDebtQ2','Nettoschuld juni',560.248,'CAD million','reported','2026-06-30','aav-q2','Net debt reconciliation',['397,896 bank + 143,750 convertible hoofdsom + 18,602 werkkapitaaltekort (CAD mln).']),
 datum('Advantage Energy','saleGross','Wembley bruto-opbrengst',316,'CAD million','reported','2026-09-11','aav-closing','Closing announcement',['Vóór closing adjustments; op bankschuld toegepast. Geen actuele nettoschuld.']),
 datum('Advantage Energy','netDebtGuidance','Verwachte nettoschuld begin Q4',245,'CAD million','guidance','2026-10-01','aav-guidance','Transaction Rationale',['Circa; omvat ongeveer CAD144 mln convertibles. Geen gerealiseerde schuldstand.']),
];
export function inspectDossierDatum(d:DossierDatum){
 return reviewEvidence([d],FINANCIAL_DOCUMENTS,{asOf:FINANCIAL_RESEARCH_AS_OF,rules:[{id:d.id,unit:d.unit,scope:d.scope,kinds:[d.kind]}]});
}
// Source-published scenarios, not a newly invented cash-flow engine. Values are study estimates.
export const DIABLILLOS_SCENARIOS=[
 {label:'Metalen −20%',silver:40,gold:2920,npv5:1884,npv8:1359},
 {label:'DFS-basis',silver:50,gold:3650,npv5:3003,npv8:2223},
 {label:'Metalen +20%',silver:60,gold:4380,npv5:4116,npv8:3083},
] as const;
export const DILUTION_SCENARIOS=[0,.25,.5,1].map(dilutionSensitivity);
export function buildFinancialDossiers(){
 const basis:BridgeBasis={asOf:FINANCIAL_RESEARCH_AS_OF,scope:'abrasilver-reconciled-equity',currency:'CAD',assetBasis:'after-tax-unlevered-net-of-project-capex',conversion:'debt',fundingComplete:false};
 const missing=BRIDGE_FIELDS.map(id=>({id,value:null,unit:id==='ownership'?'fraction':id==='dilutedShares'||id==='convertibleShares'?'shares':'CAD',kind:'reported' as const,verification:'unreviewed' as const,period:{start:basis.asOf,end:basis.asOf},scope:basis.scope,uncertainties:['Geen gezamenlijk gereconcilieerde invoer op onderzoekspeildatum.']}));
 return {asOf:FINANCIAL_RESEARCH_AS_OF,data:FINANCIAL_DATA,documents:FINANCIAL_DOCUMENTS,
  abraBridge:reconcileEquity(missing,[],basis,{data:missing,documents:[]}),aav:getAavValidationReview(),
  decision:{valuation:'blocked' as const,observedPrice:null,safetyMargin:null,automaticAdvice:false,
   conclusion:'De beschikbare informatie onderbouwt projectonderzoek en historische bedrijfsanalyse; aantrekkelijkheid van de huidige aandelenprijs is niet vast te stellen.'}};
}
