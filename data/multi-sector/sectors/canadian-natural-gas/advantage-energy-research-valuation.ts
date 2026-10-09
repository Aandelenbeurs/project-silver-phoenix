import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioName } from './advantage-energy-scenario-engine';

/** Research estimates, never post-sale reported actuals or investment price targets. */
export const AAV_RESEARCH_INPUTS = {
  asOf: '2026-10-09',
  productionBoePerDay: 83_500, // midpoint Q4 2026 company guidance 83-84k boe/d
  gasEnergyShare: 0.86, // analyst proxy based on 2026 full-year gas mix guidance 85-87%; not Q4 gas mix guidance
  netDebtCad: 245_000_000, // company forecast for early Q4, not closing balance sheet
  shareCountProxy: 179_640_000, // Q2 diluted weighted-average shares; NOT current fully diluted shares
  royaltyRate: 0.10, // midpoint updated full-year royalty guidance 9-11%; applied hypothetically to forward revenue
  gaCadPerBoe: 0.70, // Q4 2026 management guidance, not reported actual
  sources: {
    disposition: 'https://www.newswire.ca/news-releases/advantage-announces-closing-of-wembley-disposition-801960819.html',
    guidance: 'https://www.advantageog.com/investors/newsreleases',
    q2: 'https://www.newswire.ca/news-releases/advantage-announces-second-quarter-2026-results-825111159.html',
  },
} as const;

export interface ResearchYear {
  year: number;
  productionBoePerDay: number;
  revenueCad: number;
  royaltiesCad: number;
  fieldAndTransportCad: number;
  gaCad: number;
  capexCad: number;
  preTaxCashFlowCad: number;
  discountedPreTaxCashFlowCad: number;
}
export interface ResearchResult {
  name: ScenarioName;
  enterpriseValueCad: number;
  equityValueCad: number;
  perShareCad: number;
  years: ResearchYear[];
}

export function calculateAavResearchValuation(
  input: {
    productionBoePerDay: number; gasEnergyShare: number; netDebtCad: number;
    shareCountProxy: number; royaltyRate: number; gaCadPerBoe: number;
  } = AAV_RESEARCH_INPUTS,
): ResearchResult[] {
  const vals = [input.productionBoePerDay, input.gasEnergyShare, input.netDebtCad, input.shareCountProxy, input.royaltyRate, input.gaCadPerBoe];
  if (vals.some(v => !Number.isFinite(v)) || input.productionBoePerDay <= 0 ||
      input.shareCountProxy <= 0 || input.netDebtCad < 0 || input.gaCadPerBoe < 0 ||
      input.gasEnergyShare < 0 || input.gasEnergyShare > 1 ||
      input.royaltyRate < 0 || input.royaltyRate > 1) {
    throw new Error('Invalid research inputs');
  }
  return AAV_ILLUSTRATIVE_SCENARIOS.map(s => {
    const years: ResearchYear[] = [];
    let enterpriseValueCad = 0;
    for (let year = 1; year <= s.forecastYears; year++) {
      const productionBoePerDay = input.productionBoePerDay * Math.pow(1 - s.annualDeclineRate, year - 1);
      const annualBoe = productionBoePerDay * 365;
      const annualGasMcf = annualBoe * input.gasEnergyShare * 6;
      const annualLiquidsBbl = annualBoe * (1 - input.gasEnergyShare);
      const revenueCad = annualGasMcf * s.gasPriceCadPerMcf + annualLiquidsBbl * s.liquidsPriceCadPerBbl;
      const royaltiesCad = revenueCad * input.royaltyRate;
      const fieldAndTransportCad = annualBoe * 6 * (s.operatingCostCadPerMcfe + s.transportationCostCadPerMcfe);
      const gaCad = annualBoe * input.gaCadPerBoe;
      const preTaxCashFlowCad = revenueCad - royaltiesCad - fieldAndTransportCad - gaCad - s.annualCapexCad;
      const discountedPreTaxCashFlowCad = preTaxCashFlowCad / Math.pow(1 + s.discountRate, year);
      if (![revenueCad, royaltiesCad, fieldAndTransportCad, gaCad, preTaxCashFlowCad, discountedPreTaxCashFlowCad].every(Number.isFinite)) throw new Error('Research overflow');
      enterpriseValueCad += discountedPreTaxCashFlowCad;
      years.push({year, productionBoePerDay, revenueCad, royaltiesCad, fieldAndTransportCad, gaCad, capexCad:s.annualCapexCad, preTaxCashFlowCad, discountedPreTaxCashFlowCad});
    }
    const equityValueCad = enterpriseValueCad - input.netDebtCad;
    return {name:s.name, enterpriseValueCad, equityValueCad, perShareCad:equityValueCad / input.shareCountProxy, years};
  });
}
