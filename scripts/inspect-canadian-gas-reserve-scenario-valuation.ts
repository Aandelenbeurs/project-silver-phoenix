import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateCanadianGasReserveScenarioValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-valuation";

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

const economicProjection = createCanadianGasEconomicProjection({
  realizationYears: 3,
  beginningGasProductionMmcfPerDay: 100,
  beginningLiquidsProductionBblPerDay: 0,
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

const result = calculateCanadianGasReserveScenarioValuation({
  valuation: {
    economicProjection,

    // Oude vaste waarde: deze moet worden overschreven.
    producingAssetValueCad: 500_000_000,

    undevelopedInventoryValueCad: 0,
    unbookedOptionalityValueCad: 0,
    otherAssetValueCad: 0,
  },

  beginningReservesBcf: 500,
  remainingAssetDiscountRate: 0.10,

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

// TEST 1 — Resterende reserves na economische projectie

assertClose(
  result.remainingReservesBcf,
  390.5,
  "Remaining reserves calculated correctly"
);

// TEST 2 — DCF vervangt vaste assetwaarde

const expectedDCF =
  50_000_000 / 1.10 +
  50_000_000 / Math.pow(1.10, 2) +
  50_000_000 / Math.pow(1.10, 3);

assertClose(
  result.calculatedProducingAssetValueCad,
  expectedDCF,
  "Producing asset value calculated from DCF"
);

assertClose(
  result.valuation.producingAssetValueCad,
  expectedDCF,
  "Fixed CAD 500m asset value replaced"
);

// TEST 3 — Nettoschuld blijft afkomstig uit Economic Engine

assertClose(
  result.valuation.endingNetDebtCad,
  result.valuation.economicProjection.endingNetDebtCad,
  "Ending net debt preserved"
);

// TEST 4 — Aandelen blijven afkomstig uit Economic Engine

assertClose(
  result.valuation.endingDilutedShares,
  result.valuation.economicProjection.endingDilutedShares,
  "Ending diluted shares preserved"
);

// TEST 5 — Equity value sluit aan op de DCF

assertClose(
  result.valuation.equityValueCad,
  expectedDCF - result.valuation.endingNetDebtCad,
  "Equity value reconciles with reserve DCF"
);

// TEST 6 — Dividenden worden niet dubbel geteld

assertClose(
  result.valuation.totalShareholderValuePerShareCad,
  result.valuation.equityValuePerShareCad +
    result.valuation.cumulativeDividendsPerShareCad,
  "Shareholder value reconciles with dividends"
);

// TEST 7 — Onvoldoende reserves worden afgewezen

let rejected = false;

try {
  calculateCanadianGasReserveScenarioValuation({
    valuation: {
      economicProjection,
      producingAssetValueCad: 500_000_000,
      undevelopedInventoryValueCad: 0,
      unbookedOptionalityValueCad: 0,
      otherAssetValueCad: 0,
    },
    beginningReservesBcf: 50,
    remainingAssetDiscountRate: 0.10,
    remainingAssetYears: [],
  });
} catch (error) {
  if (
    error instanceof Error &&
    error.message ===
      "Economic projection exceeds available gas reserves"
  ) {
    rejected = true;
  } else {
    throw error;
  }
}

if (!rejected) {
  throw new Error(
    "FAIL: Insufficient reserves were accepted"
  );
}

console.log("PASS: Insufficient reserves rejected");