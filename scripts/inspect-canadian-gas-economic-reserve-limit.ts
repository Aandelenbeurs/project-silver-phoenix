import assert from "node:assert/strict";

import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateMultiYearEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

import {
  calculateCanadianGasRemainingAssetBridge,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-asset-bridge";

function makeEconomicProjection() {
  const assumptions = createCanadianGasEconomicProjection({
    realizationYears: 4,
    beginningGasProductionMmcfPerDay: 100,
    beginningNetDebtCad: 100_000_000,
    beginningDilutedShares: 100_000_000,

    annualAssumptions: {
      annualBaseDeclineRate: 0,
      annualGasProductionAddedMmcfPerDay: 0,
      annualLiquidsProductionAddedBblPerDay: 0,
      realizedGasPriceCadPerMcf: 4,
      realizedLiquidsPriceCadPerBbl: 0,
      royaltiesCadPerMcfe: 0,
      operatingCostCadPerMcfe: 1,
      transportationCostCadPerMcfe: 0,
      gAndACostCadPerMcfe: 0,
      annualInterestExpenseCad: 0,
      cashTaxesCad: 0,
      sustainingCapexCad: 0,
      growthCapexCad: 0,
      dividendsCad: 0,
      shareBuybacksCad: 0,
      debtRepaymentCad: 0,
    },
  });

  return calculateMultiYearEconomicProjection(assumptions);
}

const economicProjection = makeEconomicProjection();

// Productie: 36,5 Bcf per jaar, vier jaar lang.
const annualProductionBcf = economicProjection.years.map(
  (year) => year.annualGasProductionMcf / 1_000_000
);

for (const production of annualProductionBcf) {
  assert.ok(Math.abs(production - 36.5) < 0.000001);
}

console.log("PASS: annual production is 36.5 Bcf");

// TEST 1 — Reserves precies toereikend.

const exactReserves = calculateCanadianGasRemainingAssetBridge({
  beginningReservesBcf: 146,
  economicProjection,
  remainingAssetDiscountRate: 0.10,
  remainingAssetYears: [],
});

assert.ok(
  Math.abs(exactReserves.remainingReservesBcf) < 0.000001
);

console.log("PASS: exact reserve depletion accepted");

// TEST 2 — Overschrijding in jaar 4.

assert.throws(
  () =>
    calculateCanadianGasRemainingAssetBridge({
      beginningReservesBcf: 100,
      economicProjection,
      remainingAssetDiscountRate: 0.10,
      remainingAssetYears: [],
    }),
  /Economic projection exceeds available gas reserves in year 3/
);

console.log("PASS: reserve exhaustion detected in year 3");

// TEST 3 — Overschrijding in jaar 2.

assert.throws(
  () =>
    calculateCanadianGasRemainingAssetBridge({
      beginningReservesBcf: 50,
      economicProjection,
      remainingAssetDiscountRate: 0.10,
      remainingAssetYears: [],
    }),
  /Economic projection exceeds available gas reserves in year 2/
);

console.log("PASS: reserve exhaustion detected in year 2");

// TEST 4 — Ruim voldoende reserves.

const sufficientReserves = calculateCanadianGasRemainingAssetBridge({
  beginningReservesBcf: 200,
  economicProjection,
  remainingAssetDiscountRate: 0.10,
  remainingAssetYears: [],
});

assert.ok(
  Math.abs(sufficientReserves.remainingReservesBcf - 54) <
    0.000001
);

console.log("PASS: sufficient reserves correctly calculated");

console.log("\n4 economic reserve limit tests passed.");