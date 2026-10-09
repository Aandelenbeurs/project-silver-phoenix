import assert from "node:assert/strict";

import {
  calculateCanadianGasRemainingProductionPlan,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-production-plan";

let passed = 0;

function test(name: string, run: () => void): void {
  try {
    run();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
}

function approximatelyEqual(
  actual: number,
  expected: number,
  tolerance = 1e-9
): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${expected}, received ${actual}`
  );
}

test("10% decline produces expected annual volumes", () => {
  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 100,
    remainingReservesBcf: 500,
    annualDeclineRate: 0.10,
    projectionYears: 3,
  });

  assert.equal(result.length, 3);

  approximatelyEqual(result[0].endingGasProductionMmcfPerDay, 90);
  approximatelyEqual(result[1].endingGasProductionMmcfPerDay, 81);
  approximatelyEqual(result[2].endingGasProductionMmcfPerDay, 72.9);

  approximatelyEqual(result[0].actualProductionBcf, 32.85);
  approximatelyEqual(result[1].actualProductionBcf, 29.565);
  approximatelyEqual(result[2].actualProductionBcf, 26.6085);
});

test("Production cannot exceed remaining reserves", () => {
  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 100,
    remainingReservesBcf: 40,
    annualDeclineRate: 0,
    projectionYears: 3,
  });

  approximatelyEqual(result[0].actualProductionBcf, 36.5);
  approximatelyEqual(result[1].actualProductionBcf, 3.5);
  approximatelyEqual(result[2].actualProductionBcf, 0);

  approximatelyEqual(result[2].endingReservesBcf, 0);
});

test("Zero reserves means zero actual production", () => {
  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 100,
    remainingReservesBcf: 0,
    annualDeclineRate: 0.10,
    projectionYears: 3,
  });

  assert.ok(result.every((year) => year.actualProductionBcf === 0));
});

test("Zero starting production remains zero", () => {
  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 0,
    remainingReservesBcf: 100,
    annualDeclineRate: 0.10,
    projectionYears: 3,
  });

  assert.ok(result.every((year) => year.actualProductionBcf === 0));
});

test("No decline preserves requested production", () => {
  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 100,
    remainingReservesBcf: 500,
    annualDeclineRate: 0,
    projectionYears: 3,
  });

  assert.ok(
    result.every((year) => year.requestedProductionBcf === 36.5)
  );
});

test("Reserve balance reconciles with actual production", () => {
  const beginningReserves = 75;

  const result = calculateCanadianGasRemainingProductionPlan({
    endingGasProductionMmcfPerDay: 100,
    remainingReservesBcf: beginningReserves,
    annualDeclineRate: 0.10,
    projectionYears: 5,
  });

  const totalProduced = result.reduce(
    (sum, year) => sum + year.actualProductionBcf,
    0
  );

  approximatelyEqual(
    totalProduced + result[result.length - 1].endingReservesBcf,
    beginningReserves
  );
});

test("Invalid decline rate is rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionPlan({
      endingGasProductionMmcfPerDay: 100,
      remainingReservesBcf: 100,
      annualDeclineRate: 1.1,
      projectionYears: 3,
    })
  );
});

test("Negative reserves are rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionPlan({
      endingGasProductionMmcfPerDay: 100,
      remainingReservesBcf: -1,
      annualDeclineRate: 0.10,
      projectionYears: 3,
    })
  );
});

test("Invalid projection years are rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionPlan({
      endingGasProductionMmcfPerDay: 100,
      remainingReservesBcf: 100,
      annualDeclineRate: 0.10,
      projectionYears: 0,
    })
  );
});

console.log(`\n${passed} remaining production plan tests passed.`);