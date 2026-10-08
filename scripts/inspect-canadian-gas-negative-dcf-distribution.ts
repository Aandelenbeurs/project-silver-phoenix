
import {
  buildCanadianGasEconomicDistribution,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-builder";

import type {
  CanadianGasEconomicScenarioInput,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-builder";

import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateCanadianGasReserveScenarioOptionsValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-options-valuation";

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

function makeScenario(
  probability: number,
  realizationYears: number,
  gasPrice: number,
  beginningReservesBcf: number
): CanadianGasEconomicScenarioInput {
  return {
    probability,
    realizationYears,

    valuation: {
      economicProjection: createCanadianGasEconomicProjection({
        realizationYears,
        beginningGasProductionMmcfPerDay: 100,
        beginningNetDebtCad: 100_000_000,
        beginningDilutedShares: 100_000_000,

        annualAssumptions: {
          annualBaseDeclineRate: 0,
          annualGasProductionAddedMmcfPerDay: 0,
          annualLiquidsProductionAddedBblPerDay: 0,
          realizedGasPriceCadPerMcf: gasPrice,
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
      }),

      producingAssetValueCad: 500_000_000,
      undevelopedInventoryValueCad: 0,
      unbookedOptionalityValueCad: 0,
      otherAssetValueCad: 0,
    },

    reserveValuation: {
      beginningReservesBcf,
      remainingAssetDiscountRate: 0.10,
      remainingAssetYears: [
        {
          requestedProductionBcf: 20,
          realizedGasPriceCadPerMcf: gasPrice,
          cashCostCadPerMcf: 2,
          annualCapexCad: 5_000_000,
        },
        {
          requestedProductionBcf: 20,
          realizedGasPriceCadPerMcf: gasPrice,
          cashCostCadPerMcf: 2,
          annualCapexCad: 5_000_000,
        },
      ],
    },
  };
}

const scenarios = {
  failure: makeScenario(0.10, 5, 3, 220),
  bear: makeScenario(0.25, 5, 2.5, 240),
  base: makeScenario(0.45, 5, 4, 300),
  bull: makeScenario(0.20, 3, 6, 350),
};

// Keep the existing Base dividend fixture.
scenarios.base.valuation.economicProjection.years.forEach(
  (year) => {
    year.dividendsCad = 2_000_000;
  }
);

// Force a negative post-horizon reserve DCF in Failure.
const failureReserve = scenarios.failure.reserveValuation;

if (!failureReserve) {
  throw new Error("Missing Failure reserve assumptions");
}

failureReserve.remainingAssetYears =
  failureReserve.remainingAssetYears.map((year) => ({
    ...year,
    realizedGasPriceCadPerMcf: 0,
    cashCostCadPerMcf: 10,
  }));

failureReserve.producingAssetOptions = {
  canShutDown: true,
  shutdownObligationsCad: 12_000_000,
};

// Independent direct calculation for Failure.
const directFailure =
  calculateCanadianGasReserveScenarioOptionsValuation({
    valuation: scenarios.failure.valuation,
    beginningReservesBcf:
      failureReserve.beginningReservesBcf,
    remainingAssetDiscountRate:
      failureReserve.remainingAssetDiscountRate,
    remainingAssetYears:
      failureReserve.remainingAssetYears,
    producingAssetOptions:
      failureReserve.producingAssetOptions,
  });

if (directFailure.calculatedProducingAssetValueCad >= 0) {
  throw new Error("Failure DCF should be negative");
}

console.log("PASS: Failure reserve DCF is negative");

if (directFailure.producingAssetOption !== "shutdown") {
  throw new Error("Expected shutdown option");
}

console.log("PASS: Failure selects shutdown");

// Run all four scenarios through the actual builder.
const distribution =
  buildCanadianGasEconomicDistribution(scenarios);

const failure = distribution.failure;

if (failure.equityValue === undefined) {
  throw new Error("Missing Failure equity value");
}

assertClose(
  failure.equityValue,
  directFailure.valuation.equityValueCad,
  "Failure equity includes negative adjustment"
);

assertClose(
  failure.valuePerShare.mid,
  directFailure.valuation.equityValuePerShareCad,
  "Failure share price includes negative adjustment"
);

if (!failure.shareholderValuePerShare) {
  throw new Error("Missing Failure shareholder value");
}

assertClose(
  failure.shareholderValuePerShare.mid,
  directFailure.valuation.totalShareholderValuePerShareCad,
  "Failure shareholder value includes negative adjustment"
);

assertClose(
  directFailure.negativeAssetAdjustmentCad,
  12_000_000,
  "Failure shutdown adjustment is CAD 12m"
);

// Compare the other three scenarios with their original inputs.
const unchangedScenarios = {
  failure: makeScenario(0.10, 5, 3, 220),
  bear: makeScenario(0.25, 5, 2.5, 240),
  base: makeScenario(0.45, 5, 4, 300),
  bull: makeScenario(0.20, 3, 6, 350),
};

unchangedScenarios.base.valuation.economicProjection.years.forEach(
  (year) => {
    year.dividendsCad = 2_000_000;
  }
);

const originalDistribution =
  buildCanadianGasEconomicDistribution(unchangedScenarios);

for (const name of ["bear", "base", "bull"] as const) {
  const actual = distribution[name];
  const original = originalDistribution[name];

  if (
    actual.equityValue === undefined ||
    original.equityValue === undefined
  ) {
    throw new Error(`${name}: missing equity value`);
  }

  assertClose(
    actual.equityValue,
    original.equityValue,
    `${name} equity unchanged`
  );

  assertClose(
    actual.valuePerShare.mid,
    original.valuePerShare.mid,
    `${name} share price unchanged`
  );

  if (
    !actual.shareholderValuePerShare ||
    !original.shareholderValuePerShare
  ) {
    throw new Error(`${name}: missing shareholder value`);
  }

  assertClose(
    actual.shareholderValuePerShare.mid,
    original.shareholderValuePerShare.mid,
    `${name} shareholder value unchanged`
  );
}

// Probabilities must remain unchanged.
const totalProbability =
  distribution.failure.probability +
  distribution.bear.probability +
  distribution.base.probability +
  distribution.bull.probability;

assertClose(
  totalProbability,
  1,
  "Four scenario probabilities remain 100%"
);

// A negative DCF without explicit options must not
// silently acquire a free shutdown option.
const missingOptions = {
  ...scenarios,
  failure: {
    ...scenarios.failure,
    reserveValuation: {
      ...failureReserve,
      producingAssetOptions: undefined,
    },
  },
};

let rejected = false;

try {
  buildCanadianGasEconomicDistribution(missingOptions);
} catch (error) {
  if (
    error instanceof Error &&
    error.message ===
      "Producing asset value cannot be negative."
  ) {
    rejected = true;
  } else {
    throw error;
  }
}

if (!rejected) {
  throw new Error(
    "Negative DCF without explicit options was accepted"
  );
}

console.log(
  "PASS: Negative DCF without explicit options rejected"
);
