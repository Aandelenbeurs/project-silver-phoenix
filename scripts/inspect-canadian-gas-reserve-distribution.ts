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
  calculateCanadianGasReserveScenarioValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-valuation";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 0.000001) {
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

      // Sentinel: must be replaced by the reserve DCF.
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

// Test positive dividends in the Base scenario.
scenarios.base.valuation.economicProjection.years.forEach(
  (year) => {
    year.dividendsCad = 2_000_000;
  }
);

const distribution =
  buildCanadianGasEconomicDistribution(scenarios);

// TEST 1 — Vier scenario's worden verwerkt.

const scenarioNames = [
  "failure",
  "bear",
  "base",
  "bull",
] as const;

if (
  scenarioNames.some(
    (name) => distribution[name] === undefined
  )
) {
  throw new Error("Expected four scenarios");
}

console.log("PASS: Four reserve-based scenarios generated");

// TEST 2 — Vergelijk de builder met directe DCF-waardering.

for (const scenarioName of [
  "failure",
  "bear",
  "base",
  "bull",
] as const) {
  const input = scenarios[scenarioName];

  if (!input.reserveValuation) {
    throw new Error("Missing reserve valuation");
  }

  const direct = calculateCanadianGasReserveScenarioValuation({
    valuation: input.valuation,
    beginningReservesBcf:
      input.reserveValuation.beginningReservesBcf,
    remainingAssetDiscountRate:
      input.reserveValuation.remainingAssetDiscountRate,
    remainingAssetYears:
      input.reserveValuation.remainingAssetYears,
  });

  console.log(
    `${scenarioName.toUpperCase()}: DCF CAD ${(
      direct.calculatedProducingAssetValueCad / 1_000_000
    ).toFixed(2)}m, remaining reserves ${direct.remainingReservesBcf.toFixed(2)} Bcf`
  );

  if (
    Math.abs(
      direct.calculatedProducingAssetValueCad -
        500_000_000
    ) < 0.01
  ) {
    throw new Error(
      `${scenarioName}: fixed asset value was not replaced`
    );
  }

  console.log(
    `PASS: ${scenarioName} reserve DCF replaces fixed asset value`
  );
}

// TEST 3 — Direct valuation must match the Scenario Builder.

for (const scenarioName of scenarioNames) {
  const input = scenarios[scenarioName];
  const reserve = input.reserveValuation;

  if (!reserve) {
    throw new Error(`${scenarioName}: missing reserve valuation`);
  }

  const direct = calculateCanadianGasReserveScenarioValuation({
    valuation: input.valuation,
    beginningReservesBcf: reserve.beginningReservesBcf,
    remainingAssetDiscountRate: reserve.remainingAssetDiscountRate,
    remainingAssetYears: reserve.remainingAssetYears,
  });

  const outcome = distribution[scenarioName];

  // Equity value must be identical.
  if (outcome.equityValue === undefined) {
    throw new Error(`${scenarioName}: missing equity value`);
  }

  assertClose(
    outcome.equityValue,
    direct.valuation.equityValueCad,
    `${scenarioName} equity value matches direct reserve valuation`
  );

  // Ending diluted shares must be identical.
  if (outcome.dilutedShares === undefined) {
    throw new Error(`${scenarioName}: missing diluted shares`);
  }

  assertClose(
    outcome.dilutedShares,
    direct.valuation.economicProjection.endingDilutedShares,
    `${scenarioName} diluted shares match economic projection`
  );

  // Scenario probability and realization timing must be preserved.
  assertClose(
    outcome.probability,
    input.probability,
    `${scenarioName} probability preserved`
  );

  if (outcome.realizationYears !== input.realizationYears) {
    throw new Error(`${scenarioName}: incorrect realization horizon`);
  }

  console.log(`PASS: ${scenarioName} realization horizon preserved`);

  // Share price must match direct valuation.
  assertClose(
    outcome.valuePerShare.mid,
    direct.valuation.equityValuePerShareCad,
    `${scenarioName} share price matches direct valuation`
  );

  // Dividends must be passed through exactly once.
  if (outcome.cashDistributionsPerShare === undefined) {
    throw new Error(`${scenarioName}: missing dividend distribution`);
  }

  assertClose(
    outcome.cashDistributionsPerShare,
    direct.valuation.cumulativeDividendsPerShareCad,
    `${scenarioName} dividends match direct valuation`
  );

  // Total shareholder value includes dividends.
  if (!outcome.shareholderValuePerShare) {
    throw new Error(`${scenarioName}: missing shareholder value`);
  }

  assertClose(
    outcome.shareholderValuePerShare.mid,
    direct.valuation.totalShareholderValuePerShareCad,
    `${scenarioName} total shareholder value matches direct valuation`
  );
}

// TEST 4 — Probabilities must sum to 100%.

const totalProbability = scenarioNames.reduce(
  (sum, name) => sum + distribution[name].probability,
  0
);

assertClose(
  totalProbability,
  1,
  "Four scenario probabilities total 100%"
);