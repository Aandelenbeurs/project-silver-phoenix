import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
import { AAV_ILLUSTRATIVE_SCENARIOS, type ScenarioName } from './advantage-energy-scenario-engine';

/** Hypothetical sensitivity engine, NOT an estimate of AAV's post-Wembley reserves or fair value. */
export interface V2Assumptions {
  recoverableBudgetBoe: number; // synthetic budget, never sourced reserves
  naturalDeclineRate: number; // annual decline of the producing base before reinvestment
  developmentCadPerFlowingBoeDay: number; // proxy capital efficiency
  forecastYears: number;
  annualDays: number;
}
export const AAV_V2_HYPOTHETICAL: Readonly<V2Assumptions> = {
  recoverableBudgetBoe: 250_000_000,
  naturalDeclineRate: 0.20,
  developmentCadPerFlowingBoeDay: 35_000,
  forecastYears: 12,
  annualDays: 365,
};
export interface V2Year {
  year: number; beginningProductionBoeDay: number; endProductionBoeDay: number;
  averageProductionBoeDay: number; producedBoe: number; remainingBudgetBoe: number;
  addedCapacityBoeDay: number; preTaxCashFlowCad: number; discountedCashFlowCad: number;
}
export interface V2Result {
  name: ScenarioName; enterpriseValueCad: number; equityValueCad: number;
  modelValuePerShareCad: number; producedBoe: number; remainingBudgetBoe: number;
  years: V2Year[];
}
export function calculateAavV2(
  assumptions: V2Assumptions = AAV_V2_HYPOTHETICAL,
): V2Result[] {
  const a = assumptions;
  const vals = [a.recoverableBudgetBoe, a.naturalDeclineRate, a.developmentCadPerFlowingBoeDay, a.forecastYears, a.annualDays];
  if (vals.some(v => !Number.isFinite(v)) || a.recoverableBudgetBoe <= 0 ||
      a.naturalDeclineRate < 0 || a.naturalDeclineRate >= 1 ||
      a.developmentCadPerFlowingBoeDay <= 0 || !Number.isInteger(a.forecastYears) ||
      a.forecastYears < 1 || a.forecastYears > 40 || a.annualDays <= 0 || a.annualDays > 366) {
    throw new Error('Invalid AAV V2 hypothetical assumptions');
  }
  return AAV_ILLUSTRATIVE_SCENARIOS.map(s => {
    let rate: number = AAV_RESEARCH_INPUTS.productionBoePerDay;
    let remaining = a.recoverableBudgetBoe;
    let ev = 0;
    const years: V2Year[] = [];
    for (let year = 1; year <= a.forecastYears && remaining > 0; year++) {
      const begin = rate;
      // Reinvestment adds producing capacity, offsetting some natural decline.
      const added = s.annualCapexCad / a.developmentCadPerFlowingBoeDay;
      const end = begin * (1 - a.naturalDeclineRate) + added;
      const unconstrained = Math.max(0, (begin + end) / 2) * a.annualDays;
      const produced = Math.min(remaining, unconstrained);
      const avgRate = produced / a.annualDays;
      const gasMcf = produced * AAV_RESEARCH_INPUTS.gasEnergyShare * 6;
      const liquidsBbl = produced * (1 - AAV_RESEARCH_INPUTS.gasEnergyShare);
      const revenue = gasMcf * s.gasPriceCadPerMcf + liquidsBbl * s.liquidsPriceCadPerBbl;
      const royalties = revenue * AAV_RESEARCH_INPUTS.royaltyRate;
      const fieldAndTransport = produced * 6 * (s.operatingCostCadPerMcfe + s.transportationCostCadPerMcfe);
      const ga = produced * AAV_RESEARCH_INPUTS.gaCadPerBoe;
      const cash = revenue - royalties - fieldAndTransport - ga - s.annualCapexCad;
      const discounted = cash / Math.pow(1 + s.discountRate, year);
      if (![end, produced, revenue, cash, discounted].every(Number.isFinite)) throw new Error('AAV V2 overflow');
      ev += discounted;
      remaining -= produced;
      years.push({year, beginningProductionBoeDay:begin, endProductionBoeDay:end,
        averageProductionBoeDay:avgRate, producedBoe:produced, remainingBudgetBoe:remaining,
        addedCapacityBoeDay:added, preTaxCashFlowCad:cash, discountedCashFlowCad:discounted});
      rate = remaining > 0 ? end : 0;
    }
    const equity = ev - AAV_RESEARCH_INPUTS.netDebtCad;
    return {name:s.name, enterpriseValueCad:ev, equityValueCad:equity,
      modelValuePerShareCad:equity / AAV_RESEARCH_INPUTS.shareCountProxy,
      producedBoe:a.recoverableBudgetBoe-remaining, remainingBudgetBoe:remaining, years};
  });
}

