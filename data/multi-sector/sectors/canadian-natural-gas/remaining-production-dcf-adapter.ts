import {
  calculateCanadianGasRemainingProductionPlan,
} from "./remaining-production-plan";

import {
  calculateCanadianGasReserveCashFlowValue,
  type CanadianGasReserveCashFlowYear,
} from "./reserve-cashflow-valuation";

export interface CanadianGasRemainingProductionDcfYear {
  realizedGasPriceCadPerMcf: number;
  cashCostCadPerMcf: number;
  annualCapexCad: number;
}

export interface CanadianGasRemainingProductionDcfInput {
  endingGasProductionMmcfPerDay: number;
  remainingReservesBcf: number;
  annualDeclineRate: number;
  annualDiscountRate: number;
  years: CanadianGasRemainingProductionDcfYear[];
}

export function calculateCanadianGasRemainingProductionDcf(
  input: CanadianGasRemainingProductionDcfInput
) {
  if (
    !Number.isFinite(input.annualDiscountRate) ||
    input.annualDiscountRate < 0
  ) {
    throw new Error(
      "Annual discount rate must be a finite non-negative number"
    );
  }

  if (input.years.length === 0) {
    throw new Error("At least one remaining production year is required");
  }

  const productionPlan =
    calculateCanadianGasRemainingProductionPlan({
      endingGasProductionMmcfPerDay:
        input.endingGasProductionMmcfPerDay,
      remainingReservesBcf:
        input.remainingReservesBcf,
      annualDeclineRate:
        input.annualDeclineRate,
      projectionYears:
        input.years.length,
    });

  const cashFlowYears: CanadianGasReserveCashFlowYear[] =
    input.years.map((assumptions, index) => ({
      requestedProductionBcf:
        productionPlan[index].requestedProductionBcf,
      realizedGasPriceCadPerMcf:
        assumptions.realizedGasPriceCadPerMcf,
      cashCostCadPerMcf:
        assumptions.cashCostCadPerMcf,
      annualCapexCad:
        assumptions.annualCapexCad,
    }));

  const valuation =
    calculateCanadianGasReserveCashFlowValue({
      beginningReservesBcf:
        input.remainingReservesBcf,
      annualDiscountRate:
        input.annualDiscountRate,
      years: cashFlowYears,
    });

  return {
    productionPlan,
    cashFlowYears,
    valuation,
  };
}