import {
  calculateMultiYearEconomicProjection,
  calculateScenarioValuation,
} from "./scenario-engine";

import type {
  CanadianGasScenarioValuationInput,
  CanadianGasScenarioValuationResult,
} from "./scenario-engine";

import {
  calculateCanadianGasRemainingAssetBridge,
} from "./remaining-asset-bridge";

import type {
  CanadianGasReserveCashFlowYear,
} from "./reserve-cashflow-valuation";

export interface CanadianGasReserveScenarioValuationInput {
  valuation: CanadianGasScenarioValuationInput;

  beginningReservesBcf: number;
  remainingAssetDiscountRate: number;
  remainingAssetYears: CanadianGasReserveCashFlowYear[];
}

export interface CanadianGasReserveScenarioValuationResult {
  valuation: CanadianGasScenarioValuationResult;
  remainingReservesBcf: number;
  calculatedProducingAssetValueCad: number;
  endingReservesBcf: number;
}

export function calculateCanadianGasReserveScenarioValuation(
  input: CanadianGasReserveScenarioValuationInput
): CanadianGasReserveScenarioValuationResult {
  const economicProjection =
    calculateMultiYearEconomicProjection(
      input.valuation.economicProjection
    );

  const bridge = calculateCanadianGasRemainingAssetBridge({
    beginningReservesBcf: input.beginningReservesBcf,
    economicProjection,
    remainingAssetDiscountRate:
      input.remainingAssetDiscountRate,
    remainingAssetYears: input.remainingAssetYears,
  });

    const valuation = calculateScenarioValuation(
    {
      ...input.valuation,

      // Replace the fixed producing asset value with DCF.
      producingAssetValueCad:
        bridge.remainingAssetValueCad,
    },
    economicProjection
  );

  return {
    valuation,
    remainingReservesBcf: bridge.remainingReservesBcf,
    calculatedProducingAssetValueCad:
      bridge.remainingAssetValueCad,
    endingReservesBcf: bridge.endingReservesBcf,
  };
}
