import type {
  CanadianGasMultiYearEconomicResult,
} from "./scenario-engine";

import {
  calculateRemainingReservesFromEconomicProjection,
} from "./reserve-projection-adapter";

import {
  calculateCanadianGasReserveCashFlowValue,
} from "./reserve-cashflow-valuation";

import type {
  CanadianGasReserveCashFlowYear,
} from "./reserve-cashflow-valuation";

export interface CanadianGasRemainingAssetBridgeInput {
  beginningReservesBcf: number;

  economicProjection: CanadianGasMultiYearEconomicResult;

  remainingAssetDiscountRate: number;

  // Years start AFTER the economic projection.
  remainingAssetYears: CanadianGasReserveCashFlowYear[];
}

export function calculateCanadianGasRemainingAssetBridge(
  input: CanadianGasRemainingAssetBridgeInput
) {

      const projectedProductionBcf =
    input.economicProjection.years.reduce(
      (total, year) => {
        const productionBcf =
          year.annualGasProductionMcf / 1_000_000;

        if (
          !Number.isFinite(productionBcf) ||
          productionBcf < 0
        ) {
          throw new Error(
            "Invalid economic projection gas production"
          );
        }

        return total + productionBcf;
      },
      0
    );

  if (
    Number.isFinite(input.beginningReservesBcf) &&
    input.beginningReservesBcf >= 0 &&
    projectedProductionBcf >
      input.beginningReservesBcf + 1e-9
  ) {
    throw new Error(
      "Economic projection exceeds available gas reserves"
    );
  }

  const remainingReservesBcf =
    calculateRemainingReservesFromEconomicProjection(
      input.beginningReservesBcf,
      input.economicProjection
    );

  const valuation = calculateCanadianGasReserveCashFlowValue({
    beginningReservesBcf: remainingReservesBcf,
    annualDiscountRate: input.remainingAssetDiscountRate,
    years: input.remainingAssetYears,
  });

  return {
    remainingReservesBcf,
    remainingAssetValueCad: valuation.presentValueCad,
    remainingAssetCashFlows: valuation.annualCashFlows,
    endingReservesBcf: valuation.endingReservesBcf,
  };
}