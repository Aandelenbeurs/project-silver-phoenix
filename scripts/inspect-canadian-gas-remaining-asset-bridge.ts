import {
  calculateMultiYearEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateCanadianGasRemainingAssetBridge,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-asset-bridge";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// TEST 1 — Economische projectie van drie jaar

const economicInput = createCanadianGasEconomicProjection({
  realizationYears: 3,
  beginningGasProductionMmcfPerDay: 100,
  beginningLiquidsProductionBblPerDay: 0,
  beginningNetDebtCad: 0,
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

const projection =
  calculateMultiYearEconomicProjection(economicInput);

// TEST 2 — Waardeer uitsluitend reserves na jaar 3

const bridge = calculateCanadianGasRemainingAssetBridge({
  beginningReservesBcf: 500,
  economicProjection: projection,
  remainingAssetDiscountRate: 0.10,

  // Deze jaren beginnen NA de economische projectie.
  remainingAssetYears: [
    {
      requestedProductionBcf: 30,
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 10_000_000,
    },
    {
      requestedProductionBcf: 30,
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 10_000_000,
    },
    {
      requestedProductionBcf: 30,
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 10_000_000,
    },
  ],
});

assertClose(
  bridge.remainingReservesBcf,
  390.5,
  "Remaining reserves after economic projection"
);

// TEST 3 — Controleer de toekomstige kasstromen

for (const year of bridge.remainingAssetCashFlows) {
  assertClose(
    year.freeCashFlowCad,
    50_000_000,
    `Remaining asset year ${year.year} FCF`
  );
}

// TEST 4 — Controleer de DCF

const expectedAssetValueCad =
  50_000_000 / 1.10 +
  50_000_000 / Math.pow(1.10, 2) +
  50_000_000 / Math.pow(1.10, 3);

assertClose(
  bridge.remainingAssetValueCad,
  expectedAssetValueCad,
  "Remaining asset DCF at end of year 3"
);

// TEST 5 — Controleer de eindreserves

assertClose(
  bridge.endingReservesBcf,
  300.5,
  "Reserves remaining after DCF years"
);

// TEST 6 — Controleer het totale gasvolume

const economicProductionBcf =
  projection.years.reduce(
    (sum, year) =>
      sum + year.annualGasProductionMcf / 1_000_000,
    0
  );

const remainingAssetProductionBcf =
  bridge.remainingAssetCashFlows.reduce(
    (sum, year) => sum + year.actualProductionBcf,
    0
  );

assertClose(
  economicProductionBcf +
    remainingAssetProductionBcf +
    bridge.endingReservesBcf,
  500,
  "Total reserves reconcile without double counting"
);

// TEST 7 — Onvoldoende reserves moeten worden afgewezen

let insufficientReservesRejected = false;

try {
  calculateCanadianGasRemainingAssetBridge({
    beginningReservesBcf: 50,
    economicProjection: projection,
    remainingAssetDiscountRate: 0.10,
    remainingAssetYears: [],
  });
} catch (error) {
  if (
    error instanceof Error &&
    error.message ===
      "Economic projection exceeds available gas reserves"
  ) {
    insufficientReservesRejected = true;
  } else {
    throw error;
  }
}

if (!insufficientReservesRejected) {
  throw new Error(
    "FAIL: Economic production exceeding reserves was accepted"
  );
}

console.log(
  "PASS: Economic production exceeding reserves rejected"
);

// TEST 8 — Exact voldoende reserves moeten worden geaccepteerd

const exactReservesBridge =
  calculateCanadianGasRemainingAssetBridge({
    beginningReservesBcf: 109.5,
    economicProjection: projection,
    remainingAssetDiscountRate: 0.10,
    remainingAssetYears: [],
  });

assertClose(
  exactReservesBridge.remainingReservesBcf,
  0,
  "Exact reserve exhaustion accepted"
);