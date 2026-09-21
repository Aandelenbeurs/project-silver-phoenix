// -----------------------------------------------------------------------------
// Canadian Natural Gas
// Multi-Sector Scenario Adapter v1
// -----------------------------------------------------------------------------

import type {
  ScenarioName,
  ScenarioOutcome,
} from "../../types";

import type {
  CanadianGasScenarioValuationResult,
} from "./scenario-engine";

export interface CanadianGasScenarioOutcomeInput {
  scenario: ScenarioName;
  probability: number;

  /**
   * Time from today until the scenario value is expected
   * to be realized.
   *
   * This is deliberately separate from the number of
   * economic projection years.
   *
   * Bull may therefore realize earlier than Base when a
   * company-specific catalyst justifies it.
   */
  realizationYears: number;

  valuation: CanadianGasScenarioValuationResult;

  drivers?: string[];
  criticalAssumptions?: string[];
}

/**
 * Converts a completed Canadian gas scenario valuation into
 * the common Multi-Sector ScenarioOutcome contract.
 *
 * IMPORTANT:
 *
 * - Total shareholder value already includes cumulative
 *   dividends per share.
 *
 * - Buybacks are NOT added as distributions because their
 *   economic effect is already reflected in diluted shares.
 *
 * - realizationYears is supplied explicitly and is not
 *   inferred from the economic projection horizon.
 *
 * - This adapter does not apply probabilities, discounting,
 *   Required Return or Cross-Asset scoring.
 */
export function adaptCanadianGasScenarioOutcome(
  input: CanadianGasScenarioOutcomeInput
): ScenarioOutcome {
  if (
    !Number.isFinite(input.probability) ||
    input.probability < 0 ||
    input.probability > 1
  ) {
    throw new Error(
      "Scenario probability must be between 0 and 1."
    );
  }

  if (
    !Number.isFinite(input.realizationYears) ||
    input.realizationYears <= 0
  ) {
    throw new Error(
      "Scenario realization years must be greater than zero."
    );
  }

  const equityValuePerShareCad =
    input.valuation.equityValuePerShareCad;

  const cumulativeDividendsPerShareCad =
    input.valuation.cumulativeDividendsPerShareCad;

  const totalShareholderValuePerShareCad =
    input.valuation.totalShareholderValuePerShareCad;

  return {
    scenario: input.scenario,
    probability: input.probability,

    valuePerShare: {
      low: equityValuePerShareCad,
      mid: equityValuePerShareCad,
      high: equityValuePerShareCad,
    },

    cashDistributionsPerShare:
      cumulativeDividendsPerShareCad,

    shareholderValuePerShare: {
      low: totalShareholderValuePerShareCad,
      mid: totalShareholderValuePerShareCad,
      high: totalShareholderValuePerShareCad,
    },

    realizationYears:
      input.realizationYears,

    dilutedShares:
      input.valuation.endingDilutedShares,

    drivers:
      input.drivers ?? [],

    criticalAssumptions:
      input.criticalAssumptions ?? [],
  };
}