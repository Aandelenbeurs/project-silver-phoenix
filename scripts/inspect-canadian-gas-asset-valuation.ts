import {
  calculateCanadianGasRemainingAssetValue,
} from "../data/multi-sector/sectors/canadian-natural-gas/asset-valuation";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 0.01) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// TEST 1 — Eén jaar toekomstige kasstroom
// CAD 110 miljoen / 1,10 = CAD 100 miljoen

const oneYearValue = calculateCanadianGasRemainingAssetValue({
  annualDiscountRate: 0.10,
  annualCashFlows: [
    { year: 1, freeCashFlowCad: 110_000_000 },
  ],
});

assertClose(
  oneYearValue,
  100_000_000,
  "One-year discounted cash flow"
);

// TEST 2 — Drie jaar toekomstige kasstromen

const threeYearValue = calculateCanadianGasRemainingAssetValue({
  annualDiscountRate: 0.10,
  annualCashFlows: [
    { year: 1, freeCashFlowCad: 100_000_000 },
    { year: 2, freeCashFlowCad: 100_000_000 },
    { year: 3, freeCashFlowCad: 100_000_000 },
  ],
});

const expectedThreeYearValue =
  100_000_000 / 1.10 +
  100_000_000 / Math.pow(1.10, 2) +
  100_000_000 / Math.pow(1.10, 3);

assertClose(
  threeYearValue,
  expectedThreeYearValue,
  "Three-year discounted cash flow"
);

// TEST 3 — Negatieve kasstroom verlaagt waarde

const negativeCashFlowValue =
  calculateCanadianGasRemainingAssetValue({
    annualDiscountRate: 0.10,
    annualCashFlows: [
      { year: 1, freeCashFlowCad: -50_000_000 },
      { year: 2, freeCashFlowCad: 100_000_000 },
    ],
  });

const expectedNegativeCashFlowValue =
  -50_000_000 / 1.10 +
  100_000_000 / Math.pow(1.10, 2);

assertClose(
  negativeCashFlowValue,
  expectedNegativeCashFlowValue,
  "Negative cash flow included correctly"
);

// TEST 4 — Dubbele jaren afwijzen

let duplicateYearRejected = false;

try {
  calculateCanadianGasRemainingAssetValue({
    annualDiscountRate: 0.10,
    annualCashFlows: [
      { year: 1, freeCashFlowCad: 100 },
      { year: 1, freeCashFlowCad: 200 },
    ],
  });
} catch {
  duplicateYearRejected = true;
}

if (!duplicateYearRejected) {
  throw new Error("Duplicate year was accepted");
}

console.log("PASS: Duplicate cash flow year rejected");

// TEST 5 — Ongeldige discontovoet afwijzen

let invalidDiscountRateRejected = false;

try {
  calculateCanadianGasRemainingAssetValue({
    annualDiscountRate: -1,
    annualCashFlows: [
      { year: 1, freeCashFlowCad: 100 },
    ],
  });
} catch {
  invalidDiscountRateRejected = true;
}

if (!invalidDiscountRateRejected) {
  throw new Error("Invalid discount rate was accepted");
}

console.log("PASS: Invalid discount rate rejected");