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
  calculateCanadianGasRemainingProductionPlan,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-production-plan";

import {
  calculateCanadianGasReserveScenarioValuation,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-scenario-valuation";

function close(actual: number, expected: number): void {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `Expected ${expected}, received ${actual}`
  );
}

function makeScenario(
  probability: number,
  gasPrice: number,
  automatic: boolean
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
          annualCapexCad: 0,
        },
        {
          requestedProductionBcf: 20,
          realizedGasPriceCadPerMcf: gasPrice,
          cashCostCadPerMcf: 2,
          annualCapexCad: 0,
        },
      ],

      ...(automatic
        ? { automaticProduction: { annualDeclineRate: 0.10 } }
        : {}),
    },
  };
}

const names = ["failure", "bear", "base", "bull"] as const;

const manualScenarios = {
  failure: makeScenario(0.10, 3, false),
  bear: makeScenario(0.25, 3.5, false),
  base: makeScenario(0.45, 4, false),
  bull: makeScenario(0.20, 6, false),
};

const automaticScenarios = {
  failure: makeScenario(0.10, 3, true),
  bear: makeScenario(0.25, 3.5, true),
  base: makeScenario(0.45, 4, true),
  bull: makeScenario(0.20, 6, true),
};

const manualDistribution =
  buildCanadianGasEconomicDistribution(manualScenarios);

const automaticDistribution =
  buildCanadianGasEconomicDistribution(automaticScenarios);

for (const name of names) {
  const manual = manualScenarios[name];
  const automatic = automaticScenarios[name];

  const reserve = automatic.reserveValuation!;

  const economic = calculateMultiYearEconomicProjection(
    automatic.valuation.economicProjection
  );

  const economicProductionBcf = economic.years.map(
    (year) => year.annualGasProductionMcf / 1_000_000
  );

  const remainingReservesBcf =
    calculateCanadianGasRemainingReserves({
      beginningReservesBcf: reserve.beginningReservesBcf,
      projectedAnnualProductionBcf: economicProductionBcf,
    });

  const productionPlan =
    calculateCanadianGasRemainingProductionPlan({
      endingGasProductionMmcfPerDay:
        economic.endingGasProductionMmcfPerDay,
      remainingReservesBcf,
      annualDeclineRate: 0.10,
      projectionYears: reserve.remainingAssetYears.length,
    });

  const expectedYears = reserve.remainingAssetYears.map(
    (year, index) => ({
      ...year,
      requestedProductionBcf:
        productionPlan[index].requestedProductionBcf,
    })
  );

  const directManual = calculateCanadianGasReserveScenarioValuation({
    valuation: manual.valuation,
    beginningReservesBcf:
      manual.reserveValuation!.beginningReservesBcf,
    remainingAssetDiscountRate:
      manual.reserveValuation!.remainingAssetDiscountRate,
    remainingAssetYears:
      manual.reserveValuation!.remainingAssetYears,
  });

  const directAutomatic = calculateCanadianGasReserveScenarioValuation({
    valuation: automatic.valuation,
    beginningReservesBcf: reserve.beginningReservesBcf,
    remainingAssetDiscountRate: reserve.remainingAssetDiscountRate,
    remainingAssetYears: expectedYears,
  });

  // Handmatige route blijft ongewijzigd.
  close(
    manualDistribution[name].valuePerShare.mid,
    directManual.valuation.equityValuePerShareCad
  );

  console.log(`PASS: ${name} manual valuation preserved`);

  // Automatische route gebruikt de berekende productie.
  close(
    automaticDistribution[name].valuePerShare.mid,
    directAutomatic.valuation.equityValuePerShareCad
  );

  console.log(`PASS: ${name} automatic production valuation`);

  // Scenario-instellingen blijven behouden.
  close(
    automaticDistribution[name].probability,
    automatic.probability
  );

  assert.equal(
    automaticDistribution[name].realizationYears,
    automatic.realizationYears
  );

  console.log(`PASS: ${name} probability and horizon preserved`);

  // De totale productie mag de reserves niet overschrijden.
  const actualEconomicProductionBcf = Math.min(
    reserve.beginningReservesBcf,
    economicProductionBcf.reduce((sum, value) => sum + value, 0)
  );

  const remainingProductionBcf = productionPlan.reduce(
    (sum, year) => sum + year.actualProductionBcf,
    0
  );

  assert.ok(
    actualEconomicProductionBcf + remainingProductionBcf <=
      reserve.beginningReservesBcf + 0.000001
  );

  console.log(`PASS: ${name} reserve limit preserved`);
}

console.log("\n16 automatic production distribution tests passed.");