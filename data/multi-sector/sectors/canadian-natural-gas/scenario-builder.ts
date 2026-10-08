import type {
  ScenarioDistribution,
  ScenarioName,
} from "../../types";

import {
  calculateScenarioValuation,
} from "./scenario-engine";

import type {
  CanadianGasScenarioValuationInput,
} from "./scenario-engine";

import {
  adaptCanadianGasScenarioOutcome,
  createCanadianGasScenarioDistribution,
} from "./scenario-adapter";

export interface CanadianGasEconomicScenarioInput {
  probability: number;
  realizationYears: number;
  valuation: CanadianGasScenarioValuationInput;
  drivers?: string[];
  criticalAssumptions?: string[];
}

export interface CanadianGasEconomicDistributionInput {
  failure: CanadianGasEconomicScenarioInput;
  bear: CanadianGasEconomicScenarioInput;
  base: CanadianGasEconomicScenarioInput;
  bull: CanadianGasEconomicScenarioInput;
}

/**
 * Runs independent economic projections for all four scenarios.
 *
 * Each scenario has its own:
 * - production assumptions;
 * - commodity prices and realized netbacks;
 * - operating costs and capex;
 * - capital allocation;
 * - remaining asset values;
 * - probability and realization timing.
 *
 * No scenario values are manually assigned after valuation.
 */
export function buildCanadianGasEconomicDistribution(
  input: CanadianGasEconomicDistributionInput
): ScenarioDistribution {
  function buildScenario(
  scenario: ScenarioName,
  assumptions: CanadianGasEconomicScenarioInput
) {
  const years =
    assumptions.valuation.economicProjection.years;

  if (
    !Number.isInteger(assumptions.realizationYears) ||
    assumptions.realizationYears < 1 ||
    years.length !== assumptions.realizationYears
  ) {
    throw new Error(
      `${scenario}: projection length must match realizationYears`
    );
  }

  const valuation =
    calculateScenarioValuation(assumptions.valuation);

    return adaptCanadianGasScenarioOutcome({
      scenario,
      probability: assumptions.probability,
      realizationYears: assumptions.realizationYears,
      valuation,
      drivers: assumptions.drivers,
      criticalAssumptions: assumptions.criticalAssumptions,
    });
  }

  return createCanadianGasScenarioDistribution({
    failure: buildScenario("failure", input.failure),
    bear: buildScenario("bear", input.bear),
    base: buildScenario("base", input.base),
    bull: buildScenario("bull", input.bull),
  });
}
