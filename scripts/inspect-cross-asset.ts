import {
    calculateCycleOpportunityPrice,
  calculateExpectedFutureValue,
  calculateRequiredReturn,
  calculateOpportunityMargin,
  calculateTerminalOpportunityPrice,
  calculateCycleImpliedAnnualReturn,
calculateCycleExcessOpportunity,
  getModelUncertaintyPremium,
  getScenarioShareholderValue,
  PHOENIX_EQUITY_OPPORTUNITY_PREMIUM,
} from "../data/multi-sector/cross-asset";

import type {
  ConfidenceLevel,
} from "../data/multi-sector/types";

const riskFreeRate = 0.035;
const modelUncertaintyPremium = 0.035;

const requiredReturn =
  calculateRequiredReturn({
    riskFreeRate,
    modelUncertaintyPremium,
  });

console.log({
  riskFreeRate,
  equityOpportunityPremium:
    PHOENIX_EQUITY_OPPORTUNITY_PREMIUM,
  modelUncertaintyPremium,
  requiredReturn,
  requiredReturnPercent:
    `${(requiredReturn * 100).toFixed(2)}%`,
});

const expected = 0.12;
const tolerance = 0.0000001;

if (
  Math.abs(requiredReturn - expected) >
  tolerance
) {
  throw new Error(
    `Required Return test failed: expected ${expected}, received ${requiredReturn}.`
  );
}

console.log(
  "PASS: Required Return = 12.00%"
);

const confidenceTests: Array<{
  confidence: ConfidenceLevel;
  expectedPremium: number;
}> = [
  {
    confidence: "very-high",
    expectedPremium: 0,
  },
  {
    confidence: "high",
    expectedPremium: 0.02,
  },
  {
    confidence: "medium-high",
    expectedPremium: 0.035,
  },
  {
    confidence: "medium",
    expectedPremium: 0.05,
  },
  {
    confidence: "medium-low",
    expectedPremium: 0.08,
  },
  {
    confidence: "low",
    expectedPremium: 0.12,
  },
  {
    confidence: "very-low",
    expectedPremium: 0.18,
  },
];

for (const test of confidenceTests) {
  const premium =
    getModelUncertaintyPremium(
      test.confidence
    );

  if (
    Math.abs(
      premium - test.expectedPremium
    ) > tolerance
  ) {
    throw new Error(
      `Confidence premium test failed for "${test.confidence}": expected ${test.expectedPremium}, received ${premium}.`
    );
  }

  console.log(
    `PASS: ${test.confidence} -> ${(premium * 100).toFixed(1)} pp`
  );
}

// -----------------------------------------------------------------------------
// Terminal Opportunity Price tests
// -----------------------------------------------------------------------------

const terminalOpportunityPrice =
  calculateTerminalOpportunityPrice({
    expectedFutureValue: 40,
    requiredReturn: 0.12,
  });

const expectedTerminalOpportunityPrice =
  40 / Math.pow(1.12, 5);

if (
  Math.abs(
    terminalOpportunityPrice -
      expectedTerminalOpportunityPrice
  ) > tolerance
) {
  throw new Error(
    `Terminal Opportunity Price test failed: expected ${expectedTerminalOpportunityPrice}, received ${terminalOpportunityPrice}.`
  );
}

console.log(
  `PASS: Terminal Opportunity Price = ${terminalOpportunityPrice.toFixed(2)}`
);

// Zero future value should produce zero opportunity price.
const zeroFutureValue =
  calculateTerminalOpportunityPrice({
    expectedFutureValue: 0,
    requiredReturn: 0.12,
  });

if (zeroFutureValue !== 0) {
  throw new Error(
    `Zero future value test failed: expected 0, received ${zeroFutureValue}.`
  );
}

console.log(
  "PASS: Zero future value -> 0.00"
);

// Negative future value must be rejected.
let negativeFutureValueRejected = false;

try {
  calculateTerminalOpportunityPrice({
    expectedFutureValue: -10,
    requiredReturn: 0.12,
  });
} catch {
  negativeFutureValueRejected = true;
}

if (!negativeFutureValueRejected) {
  throw new Error(
    "Negative future value should have been rejected."
  );
}

console.log(
  "PASS: Negative future value rejected"
);

// Zero-year horizon must be rejected.
let zeroHorizonRejected = false;

try {
  calculateTerminalOpportunityPrice({
    expectedFutureValue: 40,
    requiredReturn: 0.12,
    horizonYears: 0,
  });
} catch {
  zeroHorizonRejected = true;
}

if (!zeroHorizonRejected) {
  throw new Error(
    "Zero-year investment horizon should have been rejected."
  );
}

console.log(
  "PASS: Zero-year horizon rejected"
);

// -----------------------------------------------------------------------------
// Expected Future Value tests
// -----------------------------------------------------------------------------

const scenarioDistribution = {
  failure: {
    scenario: "failure" as const,
    probability: 0.10,
    valuePerShare: { mid: 5 },
    drivers: [],
    criticalAssumptions: [],
  },

  bear: {
    scenario: "bear" as const,
    probability: 0.20,
    valuePerShare: { mid: 15 },
    drivers: [],
    criticalAssumptions: [],
  },

  base: {
    scenario: "base" as const,
    probability: 0.50,

    // Equity value at realization:
    valuePerShare: { mid: 27 },

    // Cash received during the horizon:
    cashDistributionsPerShare: 3,

    drivers: [],
    criticalAssumptions: [],
  },

  bull: {
    scenario: "bull" as const,
    probability: 0.20,
    valuePerShare: { mid: 60 },
    drivers: [],
    criticalAssumptions: [],
  },
};

const expectedFutureValue =
  calculateExpectedFutureValue(
    scenarioDistribution
  );

const expectedScenarioValue = 30.5;

if (
  Math.abs(
    expectedFutureValue -
      expectedScenarioValue
  ) > tolerance
) {
  throw new Error(
    `Expected Future Value test failed: expected ${expectedScenarioValue}, received ${expectedFutureValue}.`
  );
}

console.log(
  `PASS: Expected Future Value = ${expectedFutureValue.toFixed(2)}`
);

// -----------------------------------------------------------------------------
// Distribution double-counting protection
// -----------------------------------------------------------------------------

const shareholderValueScenario = {
  scenario: "base" as const,
  probability: 1,

  valuePerShare: {
    mid: 27,
  },

  cashDistributionsPerShare: 3,

  // Total shareholder value already includes the distribution.
  shareholderValuePerShare: {
    mid: 30,
  },

  drivers: [],
  criticalAssumptions: [],
};

const shareholderValue =
  getScenarioShareholderValue(
    shareholderValueScenario
  );

if (
  Math.abs(
    shareholderValue - 30
  ) > tolerance
) {
  throw new Error(
    `Shareholder value double-counting test failed: expected 30, received ${shareholderValue}.`
  );
}

console.log(
  "PASS: Explicit shareholder value prevents distribution double counting"
);

// -----------------------------------------------------------------------------
// Cycle Opportunity Price tests
// -----------------------------------------------------------------------------

const cycleScenarios = {
  failure: {
    scenario: "failure" as const,
    probability: 0.10,
    valuePerShare: { mid: 5 },
    realizationYears: 2,
    drivers: [],
    criticalAssumptions: [],
  },

  bear: {
    scenario: "bear" as const,
    probability: 0.20,
    valuePerShare: { mid: 15 },
    realizationYears: 4,
    drivers: [],
    criticalAssumptions: [],
  },

  base: {
    scenario: "base" as const,
    probability: 0.50,
    valuePerShare: { mid: 27 },
    cashDistributionsPerShare: 3,
    realizationYears: 5,
    drivers: [],
    criticalAssumptions: [],
  },

  bull: {
    scenario: "bull" as const,
    probability: 0.20,
    valuePerShare: { mid: 60 },

    // Bull deliberately realizes before Base.
    realizationYears: 3,

    drivers: [],
    criticalAssumptions: [],
  },
};

const cycleRequiredReturn = 0.12;

const cycleOpportunityPrice =
  calculateCycleOpportunityPrice(
    cycleScenarios,
    cycleRequiredReturn
  );

const expectedCycleOpportunityPrice =
  0.10 * (5 / Math.pow(1.12, 2)) +
  0.20 * (15 / Math.pow(1.12, 4)) +
  0.50 * (30 / Math.pow(1.12, 5)) +
  0.20 * (60 / Math.pow(1.12, 3));

if (
  Math.abs(
    cycleOpportunityPrice -
      expectedCycleOpportunityPrice
  ) > tolerance
) {
  throw new Error(
    `Cycle Opportunity Price test failed: expected ${expectedCycleOpportunityPrice}, received ${cycleOpportunityPrice}.`
  );
}

console.log(
  `PASS: Cycle Opportunity Price = ${cycleOpportunityPrice.toFixed(2)}`
);

console.log(
  "PASS: Bull can realize before Base"
);

// Missing realization timing must be rejected.
const missingTimingScenarios = {
  ...cycleScenarios,

  bull: {
    ...cycleScenarios.bull,
    realizationYears: undefined,
  },
};

let missingTimingRejected = false;

try {
  calculateCycleOpportunityPrice(
    missingTimingScenarios,
    cycleRequiredReturn
  );
} catch {
  missingTimingRejected = true;
}

if (!missingTimingRejected) {
  throw new Error(
    "Cycle Opportunity Price should reject missing realization timing."
  );
}

console.log(
  "PASS: Missing realization timing rejected"
);

// -----------------------------------------------------------------------------
// Opportunity Margin tests
// -----------------------------------------------------------------------------

const positiveOpportunityMargin =
  calculateOpportunityMargin({
    currentPrice: 16,
    opportunityPrice: 20,
  });

if (
  Math.abs(
    positiveOpportunityMargin - 0.25
  ) > tolerance
) {
  throw new Error(
    `Positive Opportunity Margin test failed: expected 0.25, received ${positiveOpportunityMargin}.`
  );
}

console.log(
  "PASS: Opportunity Margin below hurdle = +25.0%"
);

const zeroOpportunityMargin =
  calculateOpportunityMargin({
    currentPrice: 20,
    opportunityPrice: 20,
  });

if (
  Math.abs(zeroOpportunityMargin) >
  tolerance
) {
  throw new Error(
    `Zero Opportunity Margin test failed: expected 0, received ${zeroOpportunityMargin}.`
  );
}

console.log(
  "PASS: Opportunity Margin at hurdle = 0.0%"
);

const negativeOpportunityMargin =
  calculateOpportunityMargin({
    currentPrice: 25,
    opportunityPrice: 20,
  });

if (
  Math.abs(
    negativeOpportunityMargin - (-0.20)
  ) > tolerance
) {
  throw new Error(
    `Negative Opportunity Margin test failed: expected -0.20, received ${negativeOpportunityMargin}.`
  );
}

console.log(
  "PASS: Opportunity Margin above hurdle = -20.0%"
);

// Current price must always be positive.
let invalidCurrentPriceRejected = false;

try {
  calculateOpportunityMargin({
    currentPrice: 0,
    opportunityPrice: 20,
  });
} catch {
  invalidCurrentPriceRejected = true;
}

if (!invalidCurrentPriceRejected) {
  throw new Error(
    "Opportunity Margin should reject a zero current price."
  );
}

console.log(
  "PASS: Zero current price rejected"
);

// -----------------------------------------------------------------------------
// Cycle-Implied Annual Return tests
// -----------------------------------------------------------------------------

const cycleImpliedAnnualReturn =
  calculateCycleImpliedAnnualReturn({
    scenarios: cycleScenarios,
    currentPrice: cycleOpportunityPrice,
  });

if (
  Math.abs(
    cycleImpliedAnnualReturn -
      cycleRequiredReturn
  ) > tolerance
) {
  throw new Error(
    `Cycle-Implied Annual Return inverse test failed: expected ${cycleRequiredReturn}, received ${cycleImpliedAnnualReturn}.`
  );
}

console.log(
  `PASS: Cycle-Implied Annual Return = ${(cycleImpliedAnnualReturn * 100).toFixed(2)}%`
);

const cycleExcessOpportunity =
  calculateCycleExcessOpportunity(
    cycleImpliedAnnualReturn,
    cycleRequiredReturn
  );

if (
  Math.abs(cycleExcessOpportunity) >
  tolerance
) {
  throw new Error(
    `Cycle Excess Opportunity hurdle test failed: expected 0, received ${cycleExcessOpportunity}.`
  );
}

console.log(
  `PASS: Cycle Excess Opportunity at hurdle = ${(cycleExcessOpportunity * 100).toFixed(2)}%`
);

// A lower market price should imply a return above the hurdle.
const lowerPriceImpliedReturn =
  calculateCycleImpliedAnnualReturn({
    scenarios: cycleScenarios,
    currentPrice: 16,
  });

const lowerPriceExcessOpportunity =
  calculateCycleExcessOpportunity(
    lowerPriceImpliedReturn,
    cycleRequiredReturn
  );

if (
  lowerPriceExcessOpportunity <= 0
) {
  throw new Error(
    `Lower-price Cycle Excess Opportunity should be positive, received ${lowerPriceExcessOpportunity}.`
  );
}

console.log(
  `PASS: Lower price -> Implied Return ${(lowerPriceImpliedReturn * 100).toFixed(2)}%, Excess Opportunity +${(lowerPriceExcessOpportunity * 100).toFixed(2)} pp`
);

// -----------------------------------------------------------------------------
// Non-finite input protection tests
// -----------------------------------------------------------------------------

let nanRequiredReturnRejected = false;

try {
  calculateRequiredReturn({
    riskFreeRate: Number.NaN,
    modelUncertaintyPremium: 0.035,
  });
} catch {
  nanRequiredReturnRejected = true;
}

if (!nanRequiredReturnRejected) {
  throw new Error(
    "Required Return should reject NaN."
  );
}

console.log(
  "PASS: Required Return rejects NaN"
);

let infiniteTerminalValueRejected = false;

try {
  calculateTerminalOpportunityPrice({
    expectedFutureValue: Number.POSITIVE_INFINITY,
    requiredReturn: 0.12,
  });
} catch {
  infiniteTerminalValueRejected = true;
}

if (!infiniteTerminalValueRejected) {
  throw new Error(
    "Terminal Opportunity Price should reject Infinity."
  );
}

console.log(
  "PASS: Terminal Opportunity Price rejects Infinity"
);

let nanTerminalRateRejected = false;

try {
  calculateTerminalOpportunityPrice({
    expectedFutureValue: 40,
    requiredReturn: Number.NaN,
  });
} catch {
  nanTerminalRateRejected = true;
}

if (!nanTerminalRateRejected) {
  throw new Error(
    "Terminal Opportunity Price should reject NaN Required Return."
  );
}

console.log(
  "PASS: Terminal Opportunity Price rejects NaN Required Return"
);

// -----------------------------------------------------------------------------
// Remaining non-finite input protection tests
// -----------------------------------------------------------------------------

let nanScenarioValueRejected = false;

try {
  getScenarioShareholderValue({
    scenario: "base",
    probability: 1,
    valuePerShare: {
      mid: Number.NaN,
    },
    drivers: [],
    criticalAssumptions: [],
  });
} catch {
  nanScenarioValueRejected = true;
}

if (!nanScenarioValueRejected) {
  throw new Error(
    "Scenario shareholder value should reject NaN."
  );
}

console.log(
  "PASS: Scenario shareholder value rejects NaN"
);

let infiniteCycleTimingRejected = false;

try {
  calculateCycleOpportunityPrice(
    {
      ...cycleScenarios,
      bull: {
        ...cycleScenarios.bull,
        realizationYears:
          Number.POSITIVE_INFINITY,
      },
    },
    0.12
  );
} catch {
  infiniteCycleTimingRejected = true;
}

if (!infiniteCycleTimingRejected) {
  throw new Error(
    "Cycle Opportunity Price should reject infinite realization timing."
  );
}

console.log(
  "PASS: Cycle Opportunity Price rejects Infinity timing"
);

let nanOpportunityPriceRejected = false;

try {
  calculateOpportunityMargin({
    currentPrice: 16,
    opportunityPrice: Number.NaN,
  });
} catch {
  nanOpportunityPriceRejected = true;
}

if (!nanOpportunityPriceRejected) {
  throw new Error(
    "Opportunity Margin should reject NaN Opportunity Price."
  );
}

console.log(
  "PASS: Opportunity Margin rejects NaN"
);

let infiniteImpliedPriceRejected = false;

try {
  calculateCycleImpliedAnnualReturn({
    scenarios: cycleScenarios,
    currentPrice:
      Number.POSITIVE_INFINITY,
  });
} catch {
  infiniteImpliedPriceRejected = true;
}

if (!infiniteImpliedPriceRejected) {
  throw new Error(
    "Cycle-Implied Annual Return should reject Infinity."
  );
}

console.log(
  "PASS: Cycle-Implied Annual Return rejects Infinity"
);

let nanExcessOpportunityRejected = false;

try {
  calculateCycleExcessOpportunity(
    Number.NaN,
    0.12
  );
} catch {
  nanExcessOpportunityRejected = true;
}

if (!nanExcessOpportunityRejected) {
  throw new Error(
    "Cycle Excess Opportunity should reject NaN."
  );
}

console.log(
  "PASS: Cycle Excess Opportunity rejects NaN"
);