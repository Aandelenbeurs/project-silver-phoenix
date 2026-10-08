import type {
  CanadianGasMultiYearEconomicResult,
} from "./scenario-engine";

import {
  calculateCanadianGasRemainingReserves,
} from "./remaining-reserves";

export function calculateRemainingReservesFromEconomicProjection(
  beginningReservesBcf: number,
  projection: CanadianGasMultiYearEconomicResult
): number {
  const annualProductionBcf = projection.years.map(
    (year) => {
      const annualGasProductionMcf =
        year.annualGasProductionMcf;

      if (
        !Number.isFinite(annualGasProductionMcf) ||
        annualGasProductionMcf < 0
      ) {
        throw new Error(
          "Invalid annual gas production from economic projection"
        );
      }

      return annualGasProductionMcf / 1_000_000;
    }
  );

  return calculateCanadianGasRemainingReserves({
    beginningReservesBcf,
    projectedAnnualProductionBcf: annualProductionBcf,
  });
}