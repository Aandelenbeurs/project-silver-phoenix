import {
  calculateProductionRollForward,
} from "./scenario-engine";

import {
  calculateCanadianGasReserveDepletion,
} from "./reserve-depletion";

export interface CanadianGasRemainingProductionPlanInput {
  endingGasProductionMmcfPerDay: number;
  remainingReservesBcf: number;
  annualDeclineRate: number;
  projectionYears: number;
}

export interface CanadianGasRemainingProductionPlanYear {
  year: number;
  beginningGasProductionMmcfPerDay: number;
  endingGasProductionMmcfPerDay: number;
  requestedProductionBcf: number;
  actualProductionBcf: number;
  endingReservesBcf: number;
}

export function calculateCanadianGasRemainingProductionPlan(
  input: CanadianGasRemainingProductionPlanInput
): CanadianGasRemainingProductionPlanYear[] {
  if (
    !Number.isFinite(input.endingGasProductionMmcfPerDay) ||
    input.endingGasProductionMmcfPerDay < 0 ||
    !Number.isFinite(input.remainingReservesBcf) ||
    input.remainingReservesBcf < 0 ||
    !Number.isFinite(input.annualDeclineRate) ||
    input.annualDeclineRate < 0 ||
    input.annualDeclineRate > 1 ||
    !Number.isInteger(input.projectionYears) ||
    input.projectionYears <= 0
  ) {
    throw new Error("Invalid remaining production assumptions");
  }

  let currentProduction = input.endingGasProductionMmcfPerDay;
  const requestedProductionBcf: number[] = [];

  const productionYears: {
    beginningGasProductionMmcfPerDay: number;
    endingGasProductionMmcfPerDay: number;
  }[] = [];

  for (let index = 0; index < input.projectionYears; index += 1) {
    const production = calculateProductionRollForward({
      beginningGasProductionMmcfPerDay: currentProduction,
      annualBaseDeclineRate: input.annualDeclineRate,
      annualGasProductionAddedMmcfPerDay: 0,
    });

    productionYears.push({
      beginningGasProductionMmcfPerDay:
        production.beginningGasProductionMmcfPerDay,
      endingGasProductionMmcfPerDay:
        production.endingGasProductionMmcfPerDay,
    });

    requestedProductionBcf.push(
      production.endingGasProductionMmcfPerDay * 0.365
    );

    currentProduction = production.endingGasProductionMmcfPerDay;
  }

  const depletion = calculateCanadianGasReserveDepletion({
    beginningReservesBcf: input.remainingReservesBcf,
    annualProductionBcf: requestedProductionBcf,
  });

  return depletion.map((year, index) => ({
    year: year.year,
    beginningGasProductionMmcfPerDay:
      productionYears[index].beginningGasProductionMmcfPerDay,
    endingGasProductionMmcfPerDay:
      productionYears[index].endingGasProductionMmcfPerDay,
    requestedProductionBcf: year.requestedProductionBcf,
    actualProductionBcf: year.actualProductionBcf,
    endingReservesBcf: year.endingReservesBcf,
  }));
}