import { AAV_RESEARCH_INPUTS } from './advantage-energy-research-valuation';
import { AAV_ILLUSTRATIVE_SCENARIOS } from './advantage-energy-scenario-engine';
import { AAV_V2_HYPOTHETICAL } from './advantage-energy-v2';
import { calculateAavV3 } from './advantage-energy-v3';

/** Exact accounting bridge of V3's illustrative cash flows, NOT an independent fair value. */
export function diagnoseAavBaseEconomics() {
  const scenario = AAV_ILLUSTRATIVE_SCENARIOS.find(s => s.name === 'base');
  const result = calculateAavV3().find(s => s.name === 'base');
  if (!scenario || !result) throw new Error('Base scenario missing');
  const shares = AAV_RESEARCH_INPUTS.shareCountProxy;
  const pv = { revenue: 0, royalties: 0, fieldAndTransport: 0, ga: 0, capex: 0 };
  const annual = result.years.map(y => {
    const gasMcf = y.producedBoe * AAV_RESEARCH_INPUTS.gasEnergyShare * 6;
    const liquidsBbl = y.producedBoe * (1 - AAV_RESEARCH_INPUTS.gasEnergyShare);
    const gasRevenueCad = gasMcf * scenario.gasPriceCadPerMcf;
    const liquidsRevenueCad = liquidsBbl * scenario.liquidsPriceCadPerBbl;
    const revenueCad = gasRevenueCad + liquidsRevenueCad;
    const royaltiesCad = revenueCad * AAV_RESEARCH_INPUTS.royaltyRate;
    const fieldAndTransportCad = y.producedBoe * 6 * (scenario.operatingCostCadPerMcfe + scenario.transportationCostCadPerMcfe);
    const gaCad = y.producedBoe * AAV_RESEARCH_INPUTS.gaCadPerBoe;
    const discount = Math.pow(1 + scenario.discountRate, y.year);
    pv.revenue += revenueCad / discount;
    pv.royalties += royaltiesCad / discount;
    pv.fieldAndTransport += fieldAndTransportCad / discount;
    pv.ga += gaCad / discount;
    pv.capex += y.capexCad / discount;
    const cashCad = revenueCad - royaltiesCad - fieldAndTransportCad - gaCad - y.capexCad;
    if (Math.abs(cashCad - y.preTaxCashFlowCad) > 0.01) throw new Error('V3 cash-flow bridge mismatch');
    return {year:y.year, gasRevenueCad, liquidsRevenueCad, revenueCad, royaltiesCad,
      fieldAndTransportCad, gaCad, capexCad:y.capexCad, cashCad,
      startRateBoeDay:y.beginningProductionBoeDay, endRateBoeDay:y.endingProductionBoeDay,
      capexToOffsetDeclineCad:y.beginningProductionBoeDay * AAV_V2_HYPOTHETICAL.naturalDeclineRate * AAV_V2_HYPOTHETICAL.developmentCadPerFlowingBoeDay,
      yearFraction:y.operatingYearFraction};
  });
  const enterpriseCad = pv.revenue - pv.royalties - pv.fieldAndTransport - pv.ga - pv.capex;
  const equityCad = enterpriseCad - AAV_RESEARCH_INPUTS.netDebtCad;
  if (Math.abs(enterpriseCad - result.enterpriseValueCad) > 0.02 || Math.abs(equityCad - result.equityValueCad) > 0.02) {
    throw new Error('V3 discounted bridge mismatch');
  }
  const evaluateGas = (gasPriceCadPerMcf:number) => {
    const scenarios = AAV_ILLUSTRATIVE_SCENARIOS.map(s => s.name === 'base' ? {...s, gasPriceCadPerMcf} : s);
    const outcome = calculateAavV3(AAV_V2_HYPOTHETICAL, scenarios).find(s => s.name === 'base');
    if (!outcome) throw new Error('Missing break-even result');
    return outcome.modelValuePerShareCad;
  };
  // Pure model-implied break-even, not a forecast of realized gas prices.
  let low = 0, high = 30;
  const bracketed = evaluateGas(low) <= 0 && evaluateGas(high) >= 0;
  if (bracketed) for (let i=0;i<60;i++) {
    const mid = (low+high)/2;
    if (evaluateGas(mid) < 0) low=mid; else high=mid;
  }
  const first = annual[0];
  return {pv, enterpriseCad, equityCad, perShareCad:equityCad/shares, debtCad:AAV_RESEARCH_INPUTS.netDebtCad,
    shares, annual, firstYear: first, baseGasPriceCadPerMcf:scenario.gasPriceCadPerMcf,
    modelBreakEvenGasPriceCadPerMcf:bracketed ? (low+high)/2 : null,
    firstYearMaintenanceProxyCad:first.capexToOffsetDeclineCad,
    firstYearGrowthCapexProxyCad:scenario.annualCapexCad-first.capexToOffsetDeclineCad,
    firstYearAnnualCapexCad:scenario.annualCapexCad};
}
