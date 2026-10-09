import { evaluateClaimBackedAdvantageReadiness } from "./advantage-energy-claim-readiness";
import { advantageValuationInput, type AdvantageValuationInput } from "./advantage-energy-valuation-input";

export type ScenarioName = "bear" | "base" | "bull" | "moonshot";
export interface ScenarioAssumptions {
  name: ScenarioName;
  gasPriceCadPerMcf: number;
  liquidsPriceCadPerBbl: number;
  annualDeclineRate: number;
  annualCapexCad: number;
  operatingCostCadPerMcfe: number;
  transportationCostCadPerMcfe: number;
  discountRate: number;
  forecastYears: number;
  // These scenarios use unhedged prices and no taxes, royalties, G&A, financing
  // costs, asset retirement liabilities, terminal value or reserve constraint.
  // Hence outputs are ILLUSTRATIVE ONLY, not investment fair values.
}
export interface ScenarioProjection {
  year: number;
  gasMmcfPerDay: number;
  liquidsBblPerDay: number;
  revenueCad: number;
  operatingAndTransportationCad: number;
  capexCad: number;
  unleveredCashFlowCad: number;
  discountedCashFlowCad: number;
}
export interface ScenarioResult {
  name: ScenarioName;
  illustrativeEnterpriseValueCad: number;
  illustrativeEquityValueCad: number;
  illustrativePerShareCad: number;
  projections: ScenarioProjection[];
  caveat: string;
}
export type ScenarioRun =
  | { status: "blocked"; errors: string[]; checks: Record<string, boolean>; results: [] }
  | { status: "illustrative-only"; errors: []; checks: Record<string, boolean>; results: ScenarioResult[] };

const CAVEAT = "Simplified unhedged pre-tax discounted cash flow, not fair value: excludes royalties, G&A, taxes, hedges, financing, asset retirement, reserve depletion, and terminal value.";

// Explicitly hypothetical stress inputs, NOT company guidance or forecasts.
export const AAV_ILLUSTRATIVE_SCENARIOS: readonly ScenarioAssumptions[] = [
  {name:"bear",gasPriceCadPerMcf:2,liquidsPriceCadPerBbl:65,annualDeclineRate:0.15,annualCapexCad:400_000_000,operatingCostCadPerMcfe:1.25,transportationCostCadPerMcfe:0.85,discountRate:0.15,forecastYears:5},
  {name:"base",gasPriceCadPerMcf:3,liquidsPriceCadPerBbl:80,annualDeclineRate:0.10,annualCapexCad:350_000_000,operatingCostCadPerMcfe:1.1,transportationCostCadPerMcfe:0.75,discountRate:0.12,forecastYears:5},
  {name:"bull",gasPriceCadPerMcf:4.5,liquidsPriceCadPerBbl:95,annualDeclineRate:0.07,annualCapexCad:330_000_000,operatingCostCadPerMcfe:1,transportationCostCadPerMcfe:0.7,discountRate:0.10,forecastYears:5},
  {name:"moonshot",gasPriceCadPerMcf:6,liquidsPriceCadPerBbl:115,annualDeclineRate:0.04,annualCapexCad:310_000_000,operatingCostCadPerMcfe:0.9,transportationCostCadPerMcfe:0.6,discountRate:0.09,forecastYears:5},
];

function finiteNonnegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function assertAssumptions(s: ScenarioAssumptions): void {
  if (![s.gasPriceCadPerMcf,s.liquidsPriceCadPerBbl,s.annualDeclineRate,s.annualCapexCad,s.operatingCostCadPerMcfe,s.transportationCostCadPerMcfe,s.discountRate].every(finiteNonnegative)) throw new Error(`Invalid scenario numeric input: ${s.name}`);
  if (s.annualDeclineRate > 1 || s.discountRate <= 0 || !Number.isInteger(s.forecastYears) || s.forecastYears < 1 || s.forecastYears > 30) throw new Error(`Invalid scenario rates/horizon: ${s.name}`);
}

/** Pure mathematical projection; caller must never label output as verified valuation. */
export function calculateIllustrativeAavScenario(
  s: ScenarioAssumptions,
  actual: {gasMmcfPerDay:number; liquidsBblPerDay:number; netDebtCad:number; fullyDilutedShares:number}
): ScenarioResult {
  assertAssumptions(s);
  if (![actual.gasMmcfPerDay,actual.liquidsBblPerDay,actual.netDebtCad].every(finiteNonnegative) || !Number.isFinite(actual.fullyDilutedShares) || actual.fullyDilutedShares <= 0) throw new Error("Invalid post-sale inputs");
  const projections: ScenarioProjection[] = [];
  let ev = 0;
  for (let year=1;year<=s.forecastYears;year++) {
    const multiplier = Math.pow(1-s.annualDeclineRate,year-1);
    const gasMmcfPerDay = actual.gasMmcfPerDay * multiplier;
    const liquidsBblPerDay = actual.liquidsBblPerDay * multiplier;
    const annualGasMcf = gasMmcfPerDay * 1000 * 365;
    const annualLiquidsBbl = liquidsBblPerDay * 365;
    const revenueCad = annualGasMcf*s.gasPriceCadPerMcf + annualLiquidsBbl*s.liquidsPriceCadPerBbl;
    const annualMcfe = annualGasMcf + annualLiquidsBbl*6; // 6 Mcf : 1 boe energy equivalence, not price equivalence.
    const operatingAndTransportationCad = annualMcfe*(s.operatingCostCadPerMcfe+s.transportationCostCadPerMcfe);
    const unleveredCashFlowCad = revenueCad-operatingAndTransportationCad-s.annualCapexCad;
    const discountedCashFlowCad = unleveredCashFlowCad/Math.pow(1+s.discountRate,year);
    if (![revenueCad,operatingAndTransportationCad,unleveredCashFlowCad,discountedCashFlowCad].every(Number.isFinite)) throw new Error("Scenario overflow");
    ev += discountedCashFlowCad;
    projections.push({year,gasMmcfPerDay,liquidsBblPerDay,revenueCad,operatingAndTransportationCad,capexCad:s.annualCapexCad,unleveredCashFlowCad,discountedCashFlowCad});
  }
  const equity = ev-actual.netDebtCad;
  return {name:s.name,illustrativeEnterpriseValueCad:ev,illustrativeEquityValueCad:equity,illustrativePerShareCad:equity/actual.fullyDilutedShares,projections,caveat:CAVEAT};
}

/** Public fail-closed entry point. NEVER call pure calculator directly from production UI. */
export function runAdvantageEnergyScenarios(
  valuation: AdvantageValuationInput = advantageValuationInput,
  scenarios: readonly ScenarioAssumptions[] = AAV_ILLUSTRATIVE_SCENARIOS
): ScenarioRun {
  const readiness = evaluateClaimBackedAdvantageReadiness(valuation);
  if (readiness.status !== "ready") return {status:"blocked",errors:readiness.errors,checks:readiness.checks,results:[]};
  const gas=valuation.postSaleGasProductionMmcfPerDay?.value;
  const liquids=valuation.postSaleLiquidsProductionBblPerDay?.value;
  const debt=valuation.postSaleNetDebtCad?.value;
  const shares=valuation.currentFullyDilutedShares?.value;
  if (gas===undefined || liquids===undefined || debt===undefined || shares===undefined) return {status:"blocked",errors:["Missing mandatory actual inputs"],checks:readiness.checks,results:[]};
  const names = scenarios.map(s=>s.name);
  if (scenarios.length!==4 || new Set(names).size!==4 || !(["bear","base","bull","moonshot"] as const).every(n=>names.includes(n))) return {status:"blocked",errors:["Exactly four distinct scenarios required"],checks:readiness.checks,results:[]};
  try {
    const results=scenarios.map(s=>calculateIllustrativeAavScenario(s,{gasMmcfPerDay:gas,liquidsBblPerDay:liquids,netDebtCad:debt,fullyDilutedShares:shares}));
    return {status:"illustrative-only",errors:[],checks:readiness.checks,results};
  } catch (error) {
    return {status:"blocked",errors:[error instanceof Error ? error.message : "Scenario calculation failed"],checks:readiness.checks,results:[]};
  }
}
