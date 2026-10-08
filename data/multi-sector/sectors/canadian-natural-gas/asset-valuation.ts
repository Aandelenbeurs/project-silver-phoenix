export interface CanadianGasRemainingAssetCashFlow {
  year: number;
  freeCashFlowCad: number;
}

export interface CanadianGasRemainingAssetValuationInput {
  annualCashFlows: CanadianGasRemainingAssetCashFlow[];
  annualDiscountRate: number;
}

export function calculateCanadianGasRemainingAssetValue(
  input: CanadianGasRemainingAssetValuationInput
): number {
  if (
    !Number.isFinite(input.annualDiscountRate) ||
    input.annualDiscountRate <= -1
  ) {
    throw new Error("Invalid discount rate");
  }

  let presentValueCad = 0;
  const seenYears = new Set<number>();

  for (const cashFlow of input.annualCashFlows) {
    if (
      !Number.isInteger(cashFlow.year) ||
      cashFlow.year < 1 ||
      seenYears.has(cashFlow.year)
    ) {
      throw new Error("Invalid or duplicate cash flow year");
    }

    if (!Number.isFinite(cashFlow.freeCashFlowCad)) {
      throw new Error("Invalid free cash flow");
    }

    seenYears.add(cashFlow.year);

    presentValueCad +=
      cashFlow.freeCashFlowCad /
      Math.pow(
        1 + input.annualDiscountRate,
        cashFlow.year
      );
  }

  return presentValueCad;
}