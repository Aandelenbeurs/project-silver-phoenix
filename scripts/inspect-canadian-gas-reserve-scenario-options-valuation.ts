
import {
  calculateCanadianGasReserveScenarioOptionsValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-options-valuation";

import {
  calculateCanadianGasReserveScenarioValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-valuation";

import type {
  CanadianGasReserveScenarioValuationInput,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-valuation";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (
  !Number.isFinite(actual) ||
  !Number.isFinite(expected) ||
  Math.abs(actual - expected) > 0.01
) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

function assertEqual(
  actual: string,
  expected: string,
  description: string
): void {
  if (actual !== expected) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// This test uses an existing scenario fixture supplied separately.
// Import it from the current reserve scenario test or construct
// the same CanadianGasReserveScenarioValuationInput here.
function runTests(
  baseInput: CanadianGasReserveScenarioValuationInput
): void {
  // TEST 1 — Positive DCF must match existing valuation.
  const positiveInput: CanadianGasReserveScenarioValuationInput = {
    ...baseInput,
    producingAssetOptions: {
      canShutDown: true,
      shutdownObligationsCad: 10_000_000,
    },
  };

  const legacy =
    calculateCanadianGasReserveScenarioValuation(
      positiveInput
    );

  const updated =
    calculateCanadianGasReserveScenarioOptionsValuation(
      positiveInput
    );

  assertEqual(
    updated.producingAssetOption,
    "continue",
    "Positive reserve DCF continues production"
  );

  assertClose(
    updated.valuation.equityValueCad,
    legacy.valuation.equityValueCad,
    "Positive DCF equity matches legacy engine"
  );

  assertClose(
    updated.valuation.totalShareholderValuePerShareCad,
    legacy.valuation.totalShareholderValuePerShareCad,
    "Positive DCF shareholder value matches legacy engine"
  );

  assertClose(
    updated.negativeAssetAdjustmentCad,
    0,
    "Positive DCF has no negative adjustment"
  );

  // TEST 2 — Negative DCF, shutdown available.
  const shutdownInput: CanadianGasReserveScenarioValuationInput = {
    ...baseInput,
    remainingAssetYears:
      baseInput.remainingAssetYears.map((year) => ({
        ...year,
        realizedGasPriceCadPerMcf: 0,
        cashCostCadPerMcf: 10,
      })),
    producingAssetOptions: {
      canShutDown: true,
      shutdownObligationsCad: 12_000_000,
    },
  };

  const shutdown =
    calculateCanadianGasReserveScenarioOptionsValuation(
      shutdownInput
    );

  assertEqual(
    shutdown.producingAssetOption,
    "shutdown",
    "Negative DCF selects shutdown"
  );

  assertClose(
    shutdown.negativeAssetAdjustmentCad,
    12_000_000,
    "Shutdown obligations deducted once"
  );

  assertClose(
    shutdown.valuation.equityValueCad,
    shutdown.valuation.grossAssetValueCad -
      shutdown.valuation.endingNetDebtCad -
      shutdown.negativeAssetAdjustmentCad,
    "Shutdown equity reconciles"
  );

  // TEST 3 — Negative DCF, shutdown unavailable.
  const forcedInput: CanadianGasReserveScenarioValuationInput = {
    ...shutdownInput,
    producingAssetOptions: {
      canShutDown: false,
      shutdownObligationsCad: 12_000_000,
    },
  };

  const forced =
    calculateCanadianGasReserveScenarioOptionsValuation(
      forcedInput
    );

  assertEqual(
    forced.producingAssetOption,
    "continue",
    "Forced production continues"
  );

  assertClose(
    forced.negativeAssetAdjustmentCad,
    -forced.calculatedProducingAssetValueCad,
    "Full negative DCF retained"
  );

  assertClose(
    forced.valuation.equityValueCad,
    forced.valuation.grossAssetValueCad -
      forced.valuation.endingNetDebtCad -
      forced.negativeAssetAdjustmentCad,
    "Forced production equity reconciles"
  );
}

export { runTests };



import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

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

const baseInput: CanadianGasReserveScenarioValuationInput = {
  valuation: {
    economicProjection,

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
};

runTests(baseInput);
