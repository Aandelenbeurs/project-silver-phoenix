import {
  calculateCanadianGasReserveDepletion,
} from "./reserve-depletion";

export interface CanadianGasRemainingReservesInput {
  beginningReservesBcf: number;
  projectedAnnualProductionBcf: number[];
}

export function calculateCanadianGasRemainingReserves(
  input: CanadianGasRemainingReservesInput
): number {
  if (input.projectedAnnualProductionBcf.length === 0) {
    if (
      !Number.isFinite(input.beginningReservesBcf) ||
      input.beginningReservesBcf < 0
    ) {
      throw new Error("Invalid beginning reserves");
    }

    return input.beginningReservesBcf;
  }

  const depletion = calculateCanadianGasReserveDepletion({
    beginningReservesBcf: input.beginningReservesBcf,
    annualProductionBcf: input.projectedAnnualProductionBcf,
  });

  return depletion[depletion.length - 1].endingReservesBcf;
}