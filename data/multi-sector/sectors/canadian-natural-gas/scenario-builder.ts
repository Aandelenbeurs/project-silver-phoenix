import {
  calculateCanadianGasReserveScenarioOptionsValuation,
} from "./reserve-scenario-options-valuation";

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

import {
  calculateCanadianGasReserveScenarioValuation,
} from "./reserve-scenario-valuation";

import {
  calculateMultiYearEconomicProjection,
} from "./scenario-engine";

import {
  calculateCanadianGasRemainingReserves,
} from "./remaining-reserves";

import {
  calculateCanadianGasRemainingProductionPlan,
} from "./remaining-production-plan";

import type {
  CanadianGasReserveCashFlowYear,
} from "./reserve-cashflow-valuation";

export interface CanadianGasEconomicScenarioInput {
  probability: number;
  realizationYears: number;
  valuation: CanadianGasScenarioValuationInput;

  // Optional reserve-based valuation.
    reserveValuation?: {
    beginningReservesBcf: number;
    remainingAssetDiscountRate: number;
        remainingAssetYears: CanadianGasReserveCashFlowYear[];

    automaticProduction?: {
      annualDeclineRate: number;
    };

    producingAssetOptions?: {
      canShutDown: boolean;
      shutdownObligationsCad: number;
    };
  };

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

    const reserveValuation = assumptions.reserveValuation;

  let remainingAssetYears =
    reserveValuation?.remainingAssetYears;

  if (reserveValuation?.automaticProduction) {
    const economicProjection =
      calculateMultiYearEconomicProjection(
        assumptions.valuation.economicProjection
      );

    const remainingReservesBcf =
      calculateCanadianGasRemainingReserves({
        beginningReservesBcf:
          reserveValuation.beginningReservesBcf,

        projectedAnnualProductionBcf:
          economicProjection.years.map(
            (year) =>
              year.annualGasProductionMcf / 1_000_000
          ),
      });

    const productionPlan =
      calculateCanadianGasRemainingProductionPlan({
        endingGasProductionMmcfPerDay:
          economicProjection.endingGasProductionMmcfPerDay,

        remainingReservesBcf,

        annualDeclineRate:
          reserveValuation.automaticProduction.annualDeclineRate,

        projectionYears:
          reserveValuation.remainingAssetYears.length,
      });

    remainingAssetYears =
      reserveValuation.remainingAssetYears.map(
        (year, index) => ({
          ...year,
          requestedProductionBcf:
            productionPlan[index].requestedProductionBcf,
        })
      );
  }

      const reserveInput = assumptions.reserveValuation
    ? {
        valuation: assumptions.valuation,
        beginningReservesBcf:
          assumptions.reserveValuation.beginningReservesBcf,
        remainingAssetDiscountRate:
          assumptions.reserveValuation.remainingAssetDiscountRate,
                remainingAssetYears:
          remainingAssetYears!,
        producingAssetOptions:
          assumptions.reserveValuation.producingAssetOptions,
      }
    : null;

  const valuation = reserveInput
    ? reserveInput.producingAssetOptions
      ? calculateCanadianGasReserveScenarioOptionsValuation(
          reserveInput
        ).valuation
      : calculateCanadianGasReserveScenarioValuation(
          reserveInput
        ).valuation
    : calculateScenarioValuation(assumptions.valuation);

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
