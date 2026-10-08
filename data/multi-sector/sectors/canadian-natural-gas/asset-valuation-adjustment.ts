
export interface CanadianGasAssetValuationAdjustmentInput {
  // Nonnegative asset value accepted by the existing engine.
  producingAssetValueCad: number;

  // Negative economic component from producing-asset-options.
  residualLiabilityCad: number;

  // Equity value calculated by the existing valuation engine.
  unadjustedEquityValueCad: number;

  // Ending diluted shares.
  dilutedShares: number;

  // Cumulative dividends already calculated by the engine.
  cumulativeDividendsPerShareCad: number;
}

export interface CanadianGasAssetValuationAdjustmentResult {
  unadjustedEquityValueCad: number;
  residualLiabilityCad: number;

  adjustedEquityValueCad: number;
  adjustedEquityValuePerShareCad: number;
  adjustedTotalShareholderValuePerShareCad: number;
}

/**
 * Applies a separate negative economic adjustment.
 *
 * The residual component must NOT already be included
 * in net debt, other asset values or another adjustment.
 *
 * Dividends are added once; buybacks are reflected
 * through diluted shares.
 */
export function calculateCanadianGasAssetValuationAdjustment(
  input: CanadianGasAssetValuationAdjustmentInput
): CanadianGasAssetValuationAdjustmentResult {
  const values = [
    input.producingAssetValueCad,
    input.residualLiabilityCad,
    input.unadjustedEquityValueCad,
    input.dilutedShares,
    input.cumulativeDividendsPerShareCad,
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("Invalid asset valuation adjustment input");
  }

  if (
    input.producingAssetValueCad < 0 ||
    input.residualLiabilityCad < 0
  ) {
    throw new Error("Asset value and residual liability must be nonnegative");
  }

  if (input.dilutedShares <= 0) {
    throw new Error("Diluted shares must be greater than zero");
  }

  if (input.cumulativeDividendsPerShareCad < 0) {
    throw new Error("Cumulative dividends cannot be negative");
  }

  const adjustedEquityValueCad =
    input.unadjustedEquityValueCad -
    input.residualLiabilityCad;

  const adjustedEquityValuePerShareCad =
    adjustedEquityValueCad / input.dilutedShares;

  const adjustedTotalShareholderValuePerShareCad =
    adjustedEquityValuePerShareCad +
    input.cumulativeDividendsPerShareCad;

  return {
    unadjustedEquityValueCad:
      input.unadjustedEquityValueCad,

    residualLiabilityCad:
      input.residualLiabilityCad,

    adjustedEquityValueCad,
    adjustedEquityValuePerShareCad,
    adjustedTotalShareholderValuePerShareCad,
  };
}
