import assert from "node:assert/strict";

import {
  buildCanadianGasEconomicDistribution,
  type CanadianGasEconomicScenarioInput,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-builder";

import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateMultiYearEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

import {
  calculateCanadianGasRemainingReserves,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-reserves";

import {
  calculateCanadianGasRemainingProductionDcf,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-production-dcf-adapter";

import {
  calculateCanadianGasProducingAssetOptions,
} from "../data/multi-sector/sectors/canadian-natural-gas/producing-asset-options";

import {
  calculateCanadianGasReserveScenarioOptionsValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-options-valuation";

function assertClose(
  actual: number,
  expected: number,
  description: string
) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `${description}: expected ${expected}, got ${actual}`
  );

  console.log(`PASS: ${description}`);
}

function makeScenario(
  probability: number,
  gasPrice: number,
  canShutDown: boolean,
  shutdownObligationsCad: number
): CanadianGasEconomicScenarioInput {
  return {
    probability,
    realizationYears: 3,

    valuation: {
      economicProjection: createCanadianGasEconomicProjection({
        realizationYears: 3,
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
      beginningReservesBcf: 300,
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

      automaticProduction: {
        annualDeclineRate: 0.10,
      },

      producingAssetOptions: {
        canShutDown,
        shutdownObligationsCad,
      },
    },
  };
}

const scenarios = {
  failure: makeScenario(0.10, 1, true, 10_000_000),
  bear: makeScenario(0.25, 1, false, 10_000_000),
  base: makeScenario(0.45, 4, true, 10_000_000),
  bull: makeScenario(0.20, 6, true, 10_000_000),
};

const distribution =
  buildCanadianGasEconomicDistribution(scenarios);

const names = [
  "failure",
  "bear",
  "base",
  "bull",
] as const;

for (const name of names) {
  const scenario = scenarios[name];
  const reserve = scenario.reserveValuation!;

  const economic = calculateMultiYearEconomicProjection(
    scenario.valuation.economicProjection
  );

  const remainingReservesBcf =
    calculateCanadianGasRemainingReserves({
      beginningReservesBcf: reserve.beginningReservesBcf,
      projectedAnnualProductionBcf: economic.years.map(
        (year) => year.annualGasProductionMcf / 1_000_000
      ),
    });

  const productionDcf =
    calculateCanadianGasRemainingProductionDcf({
      endingGasProductionMmcfPerDay:
        economic.endingGasProductionMmcfPerDay,
      remainingReservesBcf,
      annualDeclineRate: 0.10,
      annualDiscountRate:
        reserve.remainingAssetDiscountRate,
      years: reserve.remainingAssetYears,
    });

  const expectedOptions =
    calculateCanadianGasProducingAssetOptions({
      continueProductionDcfCad:
        productionDcf.valuation.presentValueCad,
      canShutDown:
        reserve.producingAssetOptions!.canShutDown,
      shutdownObligationsCad:
        reserve.producingAssetOptions!.shutdownObligationsCad,
    });

  const direct = calculateCanadianGasReserveScenarioOptionsValuation({
    valuation: scenario.valuation,
    beginningReservesBcf: reserve.beginningReservesBcf,
    remainingAssetDiscountRate:
      reserve.remainingAssetDiscountRate,
    remainingAssetYears: productionDcf.cashFlowYears,
    producingAssetOptions:
      reserve.producingAssetOptions,
  });

  assert.equal(
    direct.producingAssetOption,
    expectedOptions.selectedOption
  );

  console.log(
    `PASS: ${name} selects ${expectedOptions.selectedOption}`
  );

  assertClose(
    direct.negativeAssetAdjustmentCad,
    expectedOptions.residualLiabilityCad,
    `${name} negative liability`
  );

  assertClose(
    direct.valuation.equityValueCad,
    distribution[name].equityValue!,
    `${name} automatic production equity valuation`
  );

  assertClose(
    direct.valuation.equityValuePerShareCad,
    distribution[name].valuePerShare.mid,
    `${name} automatic production share price`
  );
}

// Controleer expliciet de gewenste beslissingen.
assert.equal(
  calculateCanadianGasProducingAssetOptions({
    continueProductionDcfCad: -50_000_000,
    canShutDown: true,
    shutdownObligationsCad: 10_000_000,
  }).selectedOption,
  "shutdown"
);

assert.equal(
  calculateCanadianGasProducingAssetOptions({
    continueProductionDcfCad: -5_000_000,
    canShutDown: true,
    shutdownObligationsCad: 20_000_000,
  }).selectedOption,
  "continue"
);

assert.equal(
  calculateCanadianGasProducingAssetOptions({
    continueProductionDcfCad: -50_000_000,
    canShutDown: false,
    shutdownObligationsCad: 10_000_000,
  }).selectedOption,
  "continue"
);

console.log("PASS: shutdown decision boundaries");
console.log("\nAutomatic production + shutdown integration tests passed.");