import type {
  ConfidenceLevel,
  ScenarioDistribution,
  ScenarioOutcome,
} from "./types";

// -----------------------------------------------------------------------------
// Numeric guards
// -----------------------------------------------------------------------------

function assertFiniteNumber(
  value: number,
  label: string
): void {
  if (!Number.isFinite(value)) {
    throw new Error(
      `${label} must be a finite number.`
    );
  }
}

/**
 * Phoenix Cross-Asset Engine v1
 *
 * Common economic comparison layer across investment sectors.
 *
 * IMPORTANT:
 * - Sector models determine economic scenario outcomes.
 * - Cross-Asset prices uncertainty through Required Return.
 * - Position Risk controls sizing elsewhere.
 * - Time discounts value; it does not add another risk premium.
 */

// -----------------------------------------------------------------------------
// Required Return
// -----------------------------------------------------------------------------

export const PHOENIX_EQUITY_OPPORTUNITY_PREMIUM = 0.05;

/**
 * Provisional Phoenix v1 uncertainty premiums.
 *
 * These premiums price uncertainty in the economic model.
 * They do NOT represent company quality, downside risk,
 * sector risk or probability of capital loss.
 *
 * Calibration may be refined later using empirical results.
 */
export const MODEL_UNCERTAINTY_PREMIUM_BY_CONFIDENCE: Record<
  ConfidenceLevel,
  number
> = {
  "very-high": 0,
  high: 0.02,
  "medium-high": 0.035,
  medium: 0.05,
  "medium-low": 0.08,
  low: 0.12,
  "very-low": 0.18,
};

export function getModelUncertaintyPremium(
  confidence: ConfidenceLevel
): number {
  return MODEL_UNCERTAINTY_PREMIUM_BY_CONFIDENCE[
    confidence
  ];
}

export interface RequiredReturnInput {
  /**
   * Currency- and horizon-matched risk-free rate.
   *
   * Example:
   * 0.036 = 3.6%
   */
  riskFreeRate: number;

  /**
   * Phoenix cross-asset opportunity premium.
   *
   * Defaults to 5 percentage points.
   */
  equityOpportunityPremium?: number;

  /**
   * Premium for uncertainty in the economic model.
   *
   * Example:
   * 0.035 = 3.5 percentage points.
   */
  modelUncertaintyPremium: number;
}

export function calculateRequiredReturn(
  input: RequiredReturnInput
): number {
  const equityOpportunityPremium =
    input.equityOpportunityPremium ??
    PHOENIX_EQUITY_OPPORTUNITY_PREMIUM;

  assertFiniteNumber(
    input.riskFreeRate,
    "Risk-free rate"
  );

  assertFiniteNumber(
    equityOpportunityPremium,
    "Equity opportunity premium"
  );

  assertFiniteNumber(
    input.modelUncertaintyPremium,
    "Model uncertainty premium"
  );

  return (
    input.riskFreeRate +
    equityOpportunityPremium +
    input.modelUncertaintyPremium
  );
}

// -----------------------------------------------------------------------------
// Terminal Opportunity Price
// -----------------------------------------------------------------------------

export interface TerminalOpportunityPriceInput {
  /**
   * Probability-weighted expected shareholder value
   * at the end of the fixed investment horizon.
   */
  expectedFutureValue: number;

  /**
   * Annual required return expressed as a decimal.
   * Example: 0.12 = 12%.
   */
  requiredReturn: number;

  /**
   * Investment horizon in years.
   *
   * Phoenix Cross-Asset v1 uses 5 years by default.
   */
  horizonYears?: number;
}

/**
 * Discounts expected future shareholder value back to the maximum
 * current price that would still earn the Required Return.
 *
 * Opportunity Price is a buy hurdle, not a price target.
 */
export function calculateTerminalOpportunityPrice(
  input: TerminalOpportunityPriceInput
): number {
  const horizonYears =
    input.horizonYears ?? 5;

    assertFiniteNumber(
  input.expectedFutureValue,
  "Expected future value"
);

assertFiniteNumber(
  input.requiredReturn,
  "Required return"
);

assertFiniteNumber(
  horizonYears,
  "Investment horizon"
);

  if (input.expectedFutureValue < 0) {
    throw new Error(
      "Expected future value cannot be negative."
    );
  }

  if (input.requiredReturn <= -1) {
    throw new Error(
      "Required return must be greater than -100%."
    );
  }

  if (horizonYears <= 0) {
    throw new Error(
      "Investment horizon must be greater than zero."
    );
  }

  return (
    input.expectedFutureValue /
    Math.pow(
      1 + input.requiredReturn,
      horizonYears
    )
  );
}

// -----------------------------------------------------------------------------
// Expected Future Value
// -----------------------------------------------------------------------------

/**
 * Returns the midpoint total shareholder value for a scenario.
 *
 * Preferred source:
 * shareholderValuePerShare.mid
 *
 * Fallback:
 * valuePerShare.mid + cashDistributionsPerShare
 *
 * This prevents cash distributions from being counted twice when a sector
 * model has already included them in shareholderValuePerShare.
 */
export function getScenarioShareholderValue(
  scenario: ScenarioOutcome
): number {
  if (
    scenario.shareholderValuePerShare !==
    undefined
  ) {
    assertFiniteNumber(
      scenario.shareholderValuePerShare.mid,
      `Scenario "${scenario.scenario}" shareholder value`
    );

    return scenario.shareholderValuePerShare.mid;
  }

  assertFiniteNumber(
    scenario.valuePerShare.mid,
    `Scenario "${scenario.scenario}" value per share`
  );

  const cashDistributions =
    scenario.cashDistributionsPerShare ?? 0;

  assertFiniteNumber(
    cashDistributions,
    `Scenario "${scenario.scenario}" cash distributions`
  );

  return (
    scenario.valuePerShare.mid +
    cashDistributions
  );
}

/**
 * Probability-weighted expected future shareholder value.
 *
 * Probabilities are assumed to have been validated by the shared
 * Multi-Sector validator before this calculation is used in production.
 */
export function calculateExpectedFutureValue(
  scenarios: ScenarioDistribution
): number {
  const outcomes: ScenarioOutcome[] = [
    scenarios.failure,
    scenarios.bear,
    scenarios.base,
    scenarios.bull,
  ];

 return outcomes.reduce(
  (expectedValue, scenario) => {
    assertFiniteNumber(
      scenario.probability,
      `Scenario "${scenario.scenario}" probability`
    );

    return (
      expectedValue +
      scenario.probability *
        getScenarioShareholderValue(
          scenario
        )
    );
  },
  0
);
}

// -----------------------------------------------------------------------------
// Cycle Opportunity Price
// -----------------------------------------------------------------------------

/**
 * Calculates the timing-aware opportunity price.
 *
 * Each scenario is discounted using its own expected realization time:
 *
 *   Σ [ P(s) × ShareholderValue(s) / (1 + RequiredReturn)^T(s) ]
 *
 * This allows, for example, a Bull scenario to realize in year 3
 * while Base may require 5 years.
 *
 * IMPORTANT:
 * realizationYears must come from the sector/business model.
 * The Cross-Asset Engine must never shorten realization time merely
 * because a scenario is more bullish.
 */
export function calculateCycleOpportunityPrice(
  scenarios: ScenarioDistribution,
  requiredReturn: number
): number {
  assertFiniteNumber(
    requiredReturn,
    "Required return"
  );

  if (requiredReturn <= -1) {
    throw new Error(
      "Required return must be greater than -100%."
    );
  }

  const outcomes: ScenarioOutcome[] = [
    scenarios.failure,
    scenarios.bear,
    scenarios.base,
    scenarios.bull,
  ];

  return outcomes.reduce(
    (opportunityPrice, scenario) => {
      if (
        scenario.realizationYears ===
        undefined
      ) {
        throw new Error(
          `Scenario "${scenario.scenario}" requires realizationYears for Cycle Opportunity Price.`
        );
      }

      assertFiniteNumber(
        scenario.realizationYears,
        `Scenario "${scenario.scenario}" realization years`
      );

      assertFiniteNumber(
        scenario.probability,
        `Scenario "${scenario.scenario}" probability`
      );

      if (scenario.realizationYears <= 0) {
        throw new Error(
          `Scenario "${scenario.scenario}" realizationYears must be greater than zero.`
        );
      }

      const shareholderValue =
        getScenarioShareholderValue(
          scenario
        );

      const discountedValue =
        shareholderValue /
        Math.pow(
          1 + requiredReturn,
          scenario.realizationYears
        );

      return (
        opportunityPrice +
        scenario.probability *
          discountedValue
      );
    },
    0
  );
}

// -----------------------------------------------------------------------------
// Opportunity Margin
// -----------------------------------------------------------------------------

export interface OpportunityMarginInput {
  currentPrice: number;
  opportunityPrice: number;
}

/**
 * Measures the percentage gap between the Opportunity Price
 * and the current market price.
 *
 * Positive:
 * current price is below the Opportunity Price.
 *
 * Zero:
 * current price equals the Opportunity Price.
 *
 * Negative:
 * current price is above the Opportunity Price.
 *
 * Example:
 * currentPrice = 16
 * opportunityPrice = 20
 *
 * margin = 25%
 */
export function calculateOpportunityMargin(
  input: OpportunityMarginInput
): number {
  assertFiniteNumber(
    input.currentPrice,
    "Current price"
  );

  assertFiniteNumber(
    input.opportunityPrice,
    "Opportunity price"
  );

  if (input.currentPrice <= 0) {
    throw new Error(
      "Current price must be greater than zero."
    );
  }

  return (
    input.opportunityPrice /
      input.currentPrice -
    1
  );
}

// -----------------------------------------------------------------------------
// Cycle-Implied Annual Return
// -----------------------------------------------------------------------------

export interface CycleImpliedAnnualReturnInput {
  scenarios: ScenarioDistribution;
  currentPrice: number;
}

/**
 * Solves for the annual return at which the probability-weighted
 * present value of all scenario outcomes equals the current market price.
 *
 * Because scenarios may have different realization times, this cannot
 * generally be calculated with a simple single-horizon CAGR formula.
 *
 * A binary search is used to solve:
 *
 * currentPrice =
 * Σ [ P(s) × ShareholderValue(s) / (1 + r)^T(s) ]
 */
export function calculateCycleImpliedAnnualReturn(
  input: CycleImpliedAnnualReturnInput
): number {
  assertFiniteNumber(
    input.currentPrice,
    "Current price"
  );

  if (input.currentPrice <= 0) {
    throw new Error(
      "Current price must be greater than zero."
    );
  }

  // Keep the lower bound above -100%, where discounting becomes invalid.
  let lowerBound = -0.999999;
  let upperBound = 10;

  const valueAtRate = (rate: number) =>
    calculateCycleOpportunityPrice(
      input.scenarios,
      rate
    );

  const lowerValue =
    valueAtRate(lowerBound);

  const upperValue =
    valueAtRate(upperBound);

  if (
    input.currentPrice > lowerValue ||
    input.currentPrice < upperValue
  ) {
    throw new Error(
      "Current price is outside the solvable Cycle-Implied Annual Return range."
    );
  }

  for (
    let iteration = 0;
    iteration < 200;
    iteration++
  ) {
    const midpoint =
      (lowerBound + upperBound) / 2;

    const midpointValue =
      valueAtRate(midpoint);

    if (
      Math.abs(
        midpointValue -
          input.currentPrice
      ) < 1e-10
    ) {
      return midpoint;
    }

    // Present value falls as the discount rate rises.
    if (
      midpointValue >
      input.currentPrice
    ) {
      lowerBound = midpoint;
    } else {
      upperBound = midpoint;
    }
  }

  return (
    lowerBound +
    upperBound
  ) / 2;
}

/**
 * Measures annualized economic opportunity above or below
 * the Required Return hurdle.
 */
export function calculateCycleExcessOpportunity(
  cycleImpliedAnnualReturn: number,
  requiredReturn: number
): number {
  assertFiniteNumber(
    cycleImpliedAnnualReturn,
    "Cycle-implied annual return"
  );

  assertFiniteNumber(
    requiredReturn,
    "Required return"
  );

  return (
    cycleImpliedAnnualReturn -
    requiredReturn
  );
}