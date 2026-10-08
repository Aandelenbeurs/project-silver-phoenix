export interface CanadianGasReserveDepletionInput {
  beginningReservesBcf: number;
  annualProductionBcf: number[];
}

export interface CanadianGasReserveDepletionYear {
  year: number;
  beginningReservesBcf: number;
  requestedProductionBcf: number;
  actualProductionBcf: number;
  endingReservesBcf: number;
}

export function calculateCanadianGasReserveDepletion(
  input: CanadianGasReserveDepletionInput
): CanadianGasReserveDepletionYear[] {
  if (
    !Number.isFinite(input.beginningReservesBcf) ||
    input.beginningReservesBcf < 0
  ) {
    throw new Error("Invalid beginning reserves");
  }

  let remainingReservesBcf = input.beginningReservesBcf;

  return input.annualProductionBcf.map(
    (requestedProductionBcf, index) => {
      if (
        !Number.isFinite(requestedProductionBcf) ||
        requestedProductionBcf < 0
      ) {
        throw new Error("Invalid annual production");
      }

      const beginningReservesBcf = remainingReservesBcf;

      const actualProductionBcf = Math.min(
        requestedProductionBcf,
        beginningReservesBcf
      );

      remainingReservesBcf = Math.max(
        0,
        beginningReservesBcf - actualProductionBcf
      );

      return {
        year: index + 1,
        beginningReservesBcf,
        requestedProductionBcf,
        actualProductionBcf,
        endingReservesBcf: remainingReservesBcf,
      };
    }
  );
}