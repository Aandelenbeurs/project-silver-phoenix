import {
  calculateCanadianGasReserveDepletion,
} from "./reserve-depletion";

import {
  calculateCanadianGasRemainingAssetValue,
} from "./asset-valuation";

export interface CanadianGasReserveCashFlowYear {
  requestedProductionBcf: number;
  realizedGasPriceCadPerMcf: number;
  cashCostCadPerMcf: number;
  annualCapexCad: number;
}

export interface CanadianGasReserveCashFlowValuationInput {
  beginningReservesBcf: number;
  annualDiscountRate: number;
  years: CanadianGasReserveCashFlowYear[];
}

export function calculateCanadianGasReserveCashFlowValue(
  input: CanadianGasReserveCashFlowValuationInput
) {
  for (const year of input.years) {
    if (
      !Number.isFinite(year.realizedGasPriceCadPerMcf) ||
      !Number.isFinite(year.cashCostCadPerMcf) ||
      year.cashCostCadPerMcf < 0 ||
      !Number.isFinite(year.annualCapexCad) ||
      year.annualCapexCad < 0
    ) {
      throw new Error("Invalid reserve cash flow assumptions");
    }
  }

  const depletion = calculateCanadianGasReserveDepletion({
    beginningReservesBcf: input.beginningReservesBcf,
    annualProductionBcf: input.years.map(
      (year) => year.requestedProductionBcf
    ),
  });

  const annualCashFlows = depletion.map(
    (year, index) => {
      const assumptions = input.years[index];

      // 1 Bcf = 1,000,000 Mcf
      const actualProductionMcf =
        year.actualProductionBcf * 1_000_000;

      const operatingCashFlowCad =
        actualProductionMcf *
        (
          assumptions.realizedGasPriceCadPerMcf -
          assumptions.cashCostCadPerMcf
        );

      const freeCashFlowCad =
        operatingCashFlowCad -
        assumptions.annualCapexCad;

      return {
        year: year.year,
        actualProductionBcf: year.actualProductionBcf,
        endingReservesBcf: year.endingReservesBcf,
        operatingCashFlowCad,
        freeCashFlowCad,
      };
    }
  );

  const presentValueCad =
    calculateCanadianGasRemainingAssetValue({
      annualDiscountRate: input.annualDiscountRate,
      annualCashFlows: annualCashFlows.map(
        (year) => ({
          year: year.year,
          freeCashFlowCad: year.freeCashFlowCad,
        })
      ),
    });

  return {
    presentValueCad,
    annualCashFlows,
    endingReservesBcf:
      depletion.length > 0
        ? depletion[depletion.length - 1].endingReservesBcf
        : input.beginningReservesBcf,
  };
}