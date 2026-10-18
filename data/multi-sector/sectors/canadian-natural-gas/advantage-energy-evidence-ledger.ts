import { advantageEnergyReportedData as reported } from './advantage-energy-reported-data';
import { AAV_RESEARCH_INPUTS as research } from './advantage-energy-research-valuation';

export type EvidenceStatus = 'reported-historical' | 'reported-transaction' | 'management-guidance' | 'analyst-proxy' | 'unverified';
export interface EvidenceItem {
  id: string; label: string; value: number | null; unit: string;
  asOf: string; status: EvidenceStatus; sourceUrl?: string; note: string;
  eligibleForVerifiedPostSaleModel: boolean;
}
const q2 = research.sources.q2;
const wembley = research.sources.disposition;
const company = research.sources.guidance;
/** Single view of already researched evidence; no fabricated post-sale actuals. */
export const AAV_EVIDENCE_LEDGER: readonly EvidenceItem[] = [
  {id:'q2-gas',label:'Gasproductie Q2',value:reported.production.gasProductionMmcfPerDay,unit:'MMcf/d',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Kwartaalgemiddelde vóór Wembley; niet de actuele productie.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-liquids',label:'Liquids Q2',value:reported.production.liquidsProductionBblPerDay,unit:'bbl/d',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Kwartaalgemiddelde vóór Wembley.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-debt',label:'Nettoschuld Q2',value:reported.balanceSheet.netDebtCad,unit:'CAD',asOf:reported.balanceSheet.asOf,status:'reported-historical',sourceUrl:q2,note:'Exclusief Entropy; vóór de verkoop.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-shares',label:'Verwaterd gewogen gemiddelde aandelen Q2',value:reported.financialsQ2.shares.dilutedWeightedAverage,unit:'aandelen',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Geen geverifieerde actuele volledig verwaterde aandelenstand.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-operating',label:'Operationele kosten Q2',value:reported.financialsQ2.operatingCostsCadPerBoe.operating,unit:'CAD/boe',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Gerapporteerde historische kosten, geen toekomstig kostenniveau.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-transport',label:'Transportkosten Q2',value:reported.financialsQ2.operatingCostsCadPerBoe.transportation,unit:'CAD/boe',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Historisch.',eligibleForVerifiedPostSaleModel:false},
  {id:'q2-capex',label:'Netto capex Q2',value:reported.financialsQ2.netCapitalExpendituresCad,unit:'CAD',asOf:'2026-Q2',status:'reported-historical',sourceUrl:q2,note:'Kwartaaluitgaven; geen jaarlijkse forward-capex.',eligibleForVerifiedPostSaleModel:false},
  {id:'wembley-proceeds',label:'Wembley bruto verkoopopbrengst',value:reported.corporateEvents[0].proceedsCad,unit:'CAD',asOf:'2026-09-11',status:'reported-transaction',sourceUrl:wembley,note:'Niet gelijk aan netto schulddaling; geen tweede keer als cash optellen.',eligibleForVerifiedPostSaleModel:false},
  {id:'wembley-2p',label:'Afgestoten 2P reserves',value:reported.corporateEvents[0].divestedReserves.provedPlusProbableMboe,unit:'Mboe',asOf:'2025-12-31',status:'reported-transaction',sourceUrl:company,note:'Niet omrekenen naar gas-Bcf zonder samenstelling.',eligibleForVerifiedPostSaleModel:false},
  {id:'q4-production',label:'Q4 productie midpoint',value:research.productionBoePerDay,unit:'boe/d',asOf:'2026-Q4',status:'management-guidance',sourceUrl:company,note:'83–84k guidance midpoint; geen gerealiseerde productie.',eligibleForVerifiedPostSaleModel:false},
  {id:'debt-forecast',label:'Verwachte nettoschuld begin Q4',value:research.netDebtCad,unit:'CAD',asOf:'begin 2026-Q4',status:'management-guidance',sourceUrl:company,note:'Managementverwachting, geen geverifieerde slotbalans.',eligibleForVerifiedPostSaleModel:false},
  {id:'gas-share',label:'Gas aandeel research',value:research.gasEnergyShare,unit:'fractie',asOf:research.asOf,status:'analyst-proxy',sourceUrl:company,note:'Proxy op basis van full-year mix guidance.',eligibleForVerifiedPostSaleModel:false},
  {id:'post-sale-reserves',label:'Geverifieerde post-Wembley reservebasis',value:null,unit:'boe',asOf:'post-2026-09-11',status:'unverified',note:'Nog geen passende gevalideerde reservebasis in project.',eligibleForVerifiedPostSaleModel:false},
  {id:'post-sale-shares',label:'Actuele fully diluted aandelenstand',value:null,unit:'aandelen',asOf:'post-2026-09-11',status:'unverified',note:'Q2 gewogen gemiddelde is geen actuele aandelenstand.',eligibleForVerifiedPostSaleModel:false},
  {id:'post-sale-debt',label:'Gerapporteerde nettoschuld na Wembley',value:null,unit:'CAD',asOf:'post-2026-09-11',status:'unverified',note:'Verkoopopbrengst niet rechtstreeks van oude schuld aftrekken.',eligibleForVerifiedPostSaleModel:false},
];
export function validateAavEvidenceLedger(items: readonly EvidenceItem[] = AAV_EVIDENCE_LEDGER): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Dubbele sleutel: ${item.id}`);
    seen.add(item.id);
    if (item.value !== null && !Number.isFinite(item.value)) errors.push(`Ongeldige waarde: ${item.id}`);
    if (item.status === 'unverified' && item.value !== null) errors.push(`Ongeverifieerde waarde ingevuld: ${item.id}`);
    if (item.eligibleForVerifiedPostSaleModel && (item.value === null || item.status === 'unverified' || item.status === 'analyst-proxy' || item.status === 'management-guidance')) errors.push(`Onveilige verified claim: ${item.id}`);
  }
  return errors;
}
