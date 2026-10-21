import {validateMultiSectorInvestmentResult} from '../validation';
import type {MultiSectorInvestmentResult,InvestmentSector} from '../types';
import type {FinancialDatum,EvidenceDocument,EvidencePolicy,EvidenceReview} from './evidence';
import {reviewEvidence,validDate} from './evidence';
export interface MethodDefinition {
 id:string;sector:InvestmentSector;label:string;implemented:boolean;cashFlowBasis:string;
 explanation:string;
}
/** Capability declarations, not new formula implementations. */
export const RESEARCH_METHODS:readonly MethodDefinition[]=[
 {id:'precious-metals-legacy',sector:'precious-metals',label:'Phoenix V2 / legacy metals',implemented:true,cashFlowBasis:'ordinal-score',explanation:'Bestaande scores en metaalblootstelling; geen onderbouwde equity-DCF uit alleen deze velden.'},
 {id:'canadian-gas',sector:'natural-gas',label:'Canadian Gas / reserve-DCF',implemented:true,cashFlowBasis:'sector-cashflow',explanation:'Productie, decline, prijzen, royalties, kosten, capex en reserves; AAV-gate blijft afzonderlijk verplicht.'},
 {id:'uranium',sector:'uranium-nuclear',label:'Uranium',implemented:false,cashFlowBasis:'not-implemented',explanation:'Contractprijzen, mijnplanning en financiering vereisen een eigen gevalideerd model.'},
 {id:'industry',sector:'other',label:'Industrie',implemented:false,cashFlowBasis:'not-implemented',explanation:'Bedrijfscashflow, werkkapitaal en onderhoudscapex; geen gas- of metalsformule hergebruiken.'},
 {id:'technology',sector:'technology',label:'Technologie',implemented:false,cashFlowBasis:'not-implemented',explanation:'Omzetcohorten, marges, herinvestering en aandelenverwatering vragen een eigen model.'},
];
export interface ResearchPacket {
 model:MultiSectorInvestmentResult;methodId:string;
 documents:readonly EvidenceDocument[];data:readonly FinancialDatum[];policy:EvidencePolicy;
 sectorBlockers:readonly string[];limitations:readonly string[];
 // Kept separate: AAV Moonshot is not a probability-weighted shared "failure" scenario.
 scenarioNames:readonly string[];
}
export function assessResearchPacket(packet:ResearchPacket):{
 evidence:EvidenceReview;status:'blocked'|'review-ready';reasons:string[];
 economicComparability:'not-established';portfolioUse:'informational-only';
}{
 const evidence=reviewEvidence(packet.data,packet.documents,packet.policy);
 const method=RESEARCH_METHODS.find(x=>x.id===packet.methodId);
 const contract=validateMultiSectorInvestmentResult(packet.model);
 const reasons=[...contract.errors.map(e=>`${e.field}: ${e.message}`),...evidence.issues.map(i=>`${i.id}: ${i.message}`),...packet.sectorBlockers];
 if(!method?.implemented)reasons.push('Sectorspecifieke rekenmethode is niet geïmplementeerd.');
 if(method&&method.sector!==packet.model.identity.sector)reasons.push('Sector en rekenmethode sluiten niet aan.');
 if(packet.model.identity.companyId.trim()===''||packet.model.identity.dataAsOf!==packet.policy.asOf||packet.model.provenance.dataAsOf!==packet.policy.asOf)reasons.push('Identiteit en peildatum sluiten niet aan.');
 if(!packet.policy.rules.length)reasons.push('Zonder vereiste financiële inputs geen vrijgave.');
 return {evidence,status:reasons.length?'blocked':'review-ready',reasons,economicComparability:'not-established',portfolioUse:'informational-only'};
}
/** No universal score: compare only explicitly reviewed valuation bases. */
export interface ComparisonBasis {currency:string;asOf:string;horizonYears:number;cashFlowBasis:string;status:'blocked'|'illustrative'|'review-ready'}
export function comparisonIssues(a:ComparisonBasis,b:ComparisonBasis):string[]{
 const errors:string[]=[];
 if(a.status!=='review-ready'||b.status!=='review-ready')errors.push('Bewijsonderzoek of modelvalidatie onvolledig.');
 if(a.currency!==b.currency||!a.currency.trim())errors.push('Valuta verschillen of ontbreken; geen impliciete FX.');
 if(!validDate(a.asOf)||!validDate(b.asOf)||a.asOf!==b.asOf)errors.push('Analysepeildata verschillen.');
 if(!Number.isFinite(a.horizonYears)||a.horizonYears<=0||a.horizonYears!==b.horizonYears)errors.push('Realistatiehorizon ontbreekt of verschilt.');
 if(a.cashFlowBasis!==b.cashFlowBasis||!a.cashFlowBasis.trim()||a.cashFlowBasis==='ordinal-score')errors.push('Cashflowbasis is niet vergelijkbaar.');
 return errors;
}
