import type {
  CanadianGasMultiYearEconomicInput,
} from "./scenario-engine";

type EconomicYearAssumption =
  CanadianGasMultiYearEconomicInput["years"][number];

export interface CanadianGasEconomicFactoryInput {
  realizationYears: number;

  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  // All economic assumptions except the year number.
  annualAssumptions: Omit<
    EconomicYearAssumption,
    "projectionYear"
  >;
}

export function createCanadianGasEconomicProjection(
  input: CanadianGasEconomicFactoryInput
): CanadianGasMultiYearEconomicInput {
  if (
    !Number.isInteger(input.realizationYears) ||
    input.realizationYears < 1
  ) {
    throw new Error(
      "realizationYears must be a positive integer"
    );
  }

  return {
    beginningGasProductionMmcfPerDay:
      input.beginningGasProductionMmcfPerDay,

    beginningLiquidsProductionBblPerDay:
      input.beginningLiquidsProductionBblPerDay,

    beginningNetDebtCad:
      input.beginningNetDebtCad,

    beginningDilutedShares:
      input.beginningDilutedShares,

    years: Array.from(
      { length: input.realizationYears },
      (_, index) => ({
        ...input.annualAssumptions,
        projectionYear: index + 1,
      })
    ),
  };
}

import {
  buildCanadianGasEconomicDistribution,
} from "./scenario-builder";

import type {
  CanadianGasEconomicScenarioInput,
} from "./scenario-builder";

export interface CanadianGasFactoryScenarioInput {
  probability: number;
  realizationYears: number;

  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  annualAssumptions: Omit<
    EconomicYearAssumption,
    "projectionYear"
  >;

  // Explicit remaining asset values.
  producingAssetValueCad: number;
  undevelopedInventoryValueCad: number;
  unbookedOptionalityValueCad: number;
  otherAssetValueCad: number;
}

function toEconomicScenario(
  input: CanadianGasFactoryScenarioInput
): CanadianGasEconomicScenarioInput {
  return {
    probability: input.probability,
    realizationYears: input.realizationYears,

    valuation: {
      economicProjection:
        createCanadianGasEconomicProjection(input),

      producingAssetValueCad:
        input.producingAssetValueCad,

      undevelopedInventoryValueCad:
        input.undevelopedInventoryValueCad,

      unbookedOptionalityValueCad:
        input.unbookedOptionalityValueCad,

      otherAssetValueCad:
        input.otherAssetValueCad,
    },
  };
}

export function buildCanadianGasFactoryDistribution(
  input: {
    failure: CanadianGasFactoryScenarioInput;
    bear: CanadianGasFactoryScenarioInput;
    base: CanadianGasFactoryScenarioInput;
    bull: CanadianGasFactoryScenarioInput;
  }
) {
  return buildCanadianGasEconomicDistribution({
    failure: toEconomicScenario(input.failure),
    bear: toEconomicScenario(input.bear),
    base: toEconomicScenario(input.base),
    bull: toEconomicScenario(input.bull),
  });
}