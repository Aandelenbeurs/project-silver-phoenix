import assert from "node:assert/strict";

import {
  calculateCanadianGasRemainingProductionDcf,
} from "../data/multi-sector/sectors/canadian-natural-gas/remaining-production-dcf-adapter";

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
  tolerance = 1e-6
): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Expected ${expected}, received ${actual}`
  );
}

const baseInput = {
  endingGasProductionMmcfPerDay: 100,
  remainingReservesBcf: 500,
  annualDeclineRate: 0.10,
  annualDiscountRate: 0.10,
  years: [
    {
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 1_000_000,
    },
    {
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 1_000_000,
    },
    {
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 1_000_000,
    },
  ],
};

test("Production plan and DCF volumes match", () => {
  const result = calculateCanadianGasRemainingProductionDcf(baseInput);

  result.productionPlan.forEach((year, index) => {
    approximatelyEqual(
      year.actualProductionBcf,
      result.valuation.annualCashFlows[index].actualProductionBcf
    );
  });
});

test("Production plan and DCF reserve balances match", () => {
  const result = calculateCanadianGasRemainingProductionDcf(baseInput);

  result.productionPlan.forEach((year, index) => {
    approximatelyEqual(
      year.endingReservesBcf,
      result.valuation.annualCashFlows[index].endingReservesBcf
    );
  });
});

test("Declining production generates expected cash flows", () => {
  const result = calculateCanadianGasRemainingProductionDcf(baseInput);

  const expectedProductionBcf = [32.85, 29.565, 26.6085];

  expectedProductionBcf.forEach((productionBcf, index) => {
    const expectedFcfCad =
      productionBcf * 1_000_000 * (4 - 2) - 1_000_000;

    approximatelyEqual(
      result.valuation.annualCashFlows[index].freeCashFlowCad,
      expectedFcfCad
    );
  });
});

test("DCF present value matches independent calculation", () => {
  const result = calculateCanadianGasRemainingProductionDcf(baseInput);

  const expectedProductionBcf = [32.85, 29.565, 26.6085];

  const expectedPresentValue = expectedProductionBcf.reduce(
    (sum, productionBcf, index) => {
      const freeCashFlowCad =
        productionBcf * 1_000_000 * 2 - 1_000_000;

      return sum + freeCashFlowCad / Math.pow(1.10, index + 1);
    },
    0
  );

  approximatelyEqual(
    result.valuation.presentValueCad,
    expectedPresentValue
  );
});

test("Reserve depletion limits DCF production", () => {
  const result = calculateCanadianGasRemainingProductionDcf({
    ...baseInput,
    remainingReservesBcf: 40,
    annualDeclineRate: 0,
  });

  approximatelyEqual(
    result.valuation.annualCashFlows[0].actualProductionBcf,
    36.5
  );

  approximatelyEqual(
    result.valuation.annualCashFlows[1].actualProductionBcf,
    3.5
  );

  approximatelyEqual(
    result.valuation.annualCashFlows[2].actualProductionBcf,
    0
  );

  approximatelyEqual(result.valuation.endingReservesBcf, 0);
});

test("Zero reserves produce zero gas revenue contribution", () => {
  const result = calculateCanadianGasRemainingProductionDcf({
    ...baseInput,
    remainingReservesBcf: 0,
  });

  assert.ok(
    result.valuation.annualCashFlows.every(
      (year) =>
        year.actualProductionBcf === 0 &&
        year.operatingCashFlowCad === 0
    )
  );
});

test("Zero reserves still retain explicitly modeled capex", () => {
  const result = calculateCanadianGasRemainingProductionDcf({
    ...baseInput,
    remainingReservesBcf: 0,
  });

  assert.ok(
    result.valuation.annualCashFlows.every(
      (year) => year.freeCashFlowCad === -1_000_000
    )
  );
});

test("Invalid decline rate is rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionDcf({
      ...baseInput,
      annualDeclineRate: -0.1,
    })
  );
});

test("Empty projection is rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionDcf({
      ...baseInput,
      years: [],
    })
  );
});

test("Invalid discount rate is rejected", () => {
  assert.throws(() =>
    calculateCanadianGasRemainingProductionDcf({
      ...baseInput,
      annualDiscountRate: -0.1,
    })
  );
});

console.log(`\n${passed} remaining production DCF tests passed.`);