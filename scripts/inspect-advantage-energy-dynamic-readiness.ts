
import assert from "node:assert/strict";

import {
  evaluateAdvantageEnergyReadiness,
} from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-readiness";

import type {
  AdvantageValuationInput,
  Evidence,
} from "../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-valuation-input";

function evidence(
  value: number,
  kind: Evidence<number>["kind"] = "reported"
): Evidence<number> {
  return {
    value,
    kind,
    asOf: "2026-09-30",
    sourceId: "test-fixture",
  };
}

const base: AdvantageValuationInput = {
  companyId: "advantage-energy",
};

const empty = evaluateAdvantageEnergyReadiness(
  undefined,
  base
);

assert.equal(empty.status, "blocked");
assert.equal(empty.checks.currentDebt, false);
assert.equal(empty.checks.currentProduction, false);
console.log("PASS: missing actuals blocked");

const guidance = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    postSaleNetDebtCad: evidence(
      245_000_000,
      "guidance"
    ),
  }
);

assert.equal(guidance.checks.currentDebt, false);
console.log("PASS: debt guidance rejected as actual");

const validDebt = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    postSaleNetDebtCad: evidence(245_000_000),
  }
);

assert.equal(validDebt.checks.currentDebt, true);
console.log("PASS: sourced actual debt accepted");

const invalidShares = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    currentFullyDilutedShares: evidence(0),
  }
);

assert.equal(
  invalidShares.checks.currentDilutedShares,
  false
);
console.log("PASS: zero shares rejected");

const validProduction = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    postSaleGasProductionMmcfPerDay: evidence(400),
    postSaleLiquidsProductionBblPerDay: evidence(10000),
  }
);

assert.equal(
  validProduction.checks.currentProduction,
  true
);
console.log("PASS: valid production accepted");

const invalidEconomics = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    forwardEconomics: {
      declineRate: evidence(1.5, "analyst-assumption"),
      annualCapitalExpenditureCad: evidence(100),
      operatingCostCadPerMcfe: evidence(1),
      transportationCostCadPerMcfe: evidence(1),
      gasPriceCadPerMcf: evidence(3),
      liquidsPriceCadPerBbl: evidence(70),
    },
  }
);

assert.equal(
  invalidEconomics.checks.forwardEconomicAssumptions,
  false
);
console.log("PASS: impossible decline rejected");

const invalidReserves = evaluateAdvantageEnergyReadiness(
  undefined,
  {
    ...base,
    adjustedProvedGasReservesBcf: evidence(3000),
    adjustedProvedPlusProbableGasReservesBcf:
      evidence(2000),
  }
);

assert.equal(
  invalidReserves.checks.reserveAdjustment,
  false
);
console.log("PASS: inconsistent reserves rejected");

assert.equal(empty.errors.length, 5);
console.log("PASS: five valuation gates remain blocked");

console.log("\nDynamic AAV readiness tests passed.");
