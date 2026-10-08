
import {
  calculateCanadianGasAssetValuationAdjustment,
} from "../data/multi-sector/sectors/canadian-natural-gas/asset-valuation-adjustment";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

const result = calculateCanadianGasAssetValuationAdjustment({
  producingAssetValueCad: 100_000_000,
  residualLiabilityCad: 12_000_000,
  unadjustedEquityValueCad: 40_000_000,
  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0.05,
});

assertClose(
  result.adjustedEquityValueCad,
  28_000_000,
  "Residual liability deducted from equity"
);

assertClose(
  result.adjustedEquityValuePerShareCad,
  0.28,
  "Adjusted equity value per share"
);

assertClose(
  result.adjustedTotalShareholderValuePerShareCad,
  0.33,
  "Dividends included exactly once"
);

// Zero adjustment must preserve existing valuation.
const unchanged = calculateCanadianGasAssetValuationAdjustment({
  producingAssetValueCad: 100_000_000,
  residualLiabilityCad: 0,
  unadjustedEquityValueCad: 40_000_000,
  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0,
});

assertClose(
  unchanged.adjustedEquityValueCad,
  40_000_000,
  "Zero adjustment preserves equity"
);

// Negative equity is retained, not silently discarded.
const negative = calculateCanadianGasAssetValuationAdjustment({
  producingAssetValueCad: 0,
  residualLiabilityCad: 40_000_000,
  unadjustedEquityValueCad: 10_000_000,
  dilutedShares: 100_000_000,
  cumulativeDividendsPerShareCad: 0,
});

assertClose(
  negative.adjustedEquityValueCad,
  -30_000_000,
  "Negative economic equity retained"
);

// Invalid inputs must be rejected.
function expectRejected(
  residualLiabilityCad: number,
  description: string
): void {
  let rejected = false;

  try {
    calculateCanadianGasAssetValuationAdjustment({
      producingAssetValueCad: 0,
      residualLiabilityCad,
      unadjustedEquityValueCad: 10_000_000,
      dilutedShares: 100_000_000,
      cumulativeDividendsPerShareCad: 0,
    });
  } catch {
    rejected = true;
  }

  if (!rejected) {
    throw new Error(`${description}: expected rejection`);
  }

  console.log(`PASS: ${description}`);
}

expectRejected(-1, "Negative residual liability rejected");
expectRejected(Number.NaN, "Non-finite residual liability rejected");
