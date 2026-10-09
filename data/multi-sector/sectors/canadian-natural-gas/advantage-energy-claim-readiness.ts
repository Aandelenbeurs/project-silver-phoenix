/** Additional fail-closed gate; does not weaken existing readiness validation. */
import { evaluateAdvantageEnergyReadiness } from "./advantage-energy-readiness";
import { advantageValuationInput, type AdvantageValuationInput, type Evidence } from "./advantage-energy-valuation-input";
import { validateAdvantageClaim } from "./advantage-energy-claim-validation";
import type { ClaimUnit } from "./advantage-energy-claims";

type ClaimEvidence = Evidence<number> & {claimId?: string};
const requirements: {key:keyof AdvantageValuationInput; metric:string; unit:ClaimUnit}[] = [
  {key:"postSaleGasProductionMmcfPerDay",metric:"postSaleGasProduction",unit:"MMcf/d"},
  {key:"postSaleLiquidsProductionBblPerDay",metric:"postSaleLiquidsProduction",unit:"bbl/d"},
  {key:"postSaleNetDebtCad",metric:"postSaleNetDebt",unit:"CAD"},
  {key:"currentFullyDilutedShares",metric:"currentFullyDilutedShares",unit:"shares"},
  {key:"adjustedProvedGasReservesBcf",metric:"postSaleProvedGasReserves",unit:"Bcf"},
  {key:"adjustedProvedPlusProbableGasReservesBcf",metric:"postSaleTwoPReserves",unit:"Bcf"},
];
export function evaluateClaimBackedAdvantageReadiness(
  valuation: AdvantageValuationInput = advantageValuationInput
) {
  const base = evaluateAdvantageEnergyReadiness(undefined, valuation);
  const errors = [...base.errors];
  const checks = {...base.checks};
  for (const requirement of requirements) {
    const evidence = valuation[requirement.key] as ClaimEvidence | undefined;
    const result = evidence ? validateAdvantageClaim({metric:requirement.metric,unit:requirement.unit,evidence}) : {valid:false,errors:["Missing evidence"]};
    const key = `claim:${requirement.metric}`;
    checks[key] = result.valid;
    if (!result.valid) errors.push(`${key}: ${result.errors.join(", ")}`);
  }
  // Forward assumptions are scenario inputs, not historical company claims.
  // They still require the existing evidence validation and economic review.
  return {...base, checks, errors, status: errors.length === 0 ? "ready" as const : "blocked" as const};
}
