import {
  calculateCanadianGasReserveCashFlowValue,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-cashflow-valuation";

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

// TEST 1 — Productie wordt begrensd door reserves

const valuation = calculateCanadianGasReserveCashFlowValue({
  beginningReservesBcf: 100,
  annualDiscountRate: 0.10,

  years: Array.from({ length: 5 }, () => ({
    requestedProductionBcf: 30,
    realizedGasPriceCadPerMcf: 4,
    cashCostCadPerMcf: 2,
    annualCapexCad: 10_000_000,
  })),
});

const expectedProduction = [30, 30, 30, 10, 0];
const expectedCashFlows = [
  50_000_000,
  50_000_000,
  50_000_000,
  10_000_000,
  -10_000_000,
];

for (let index = 0; index < 5; index += 1) {
  assertClose(
    valuation.annualCashFlows[index].actualProductionBcf,
    expectedProduction[index],
    `Year ${index + 1} production`
  );

  assertClose(
    valuation.annualCashFlows[index].freeCashFlowCad,
    expectedCashFlows[index],
    `Year ${index + 1} free cash flow`
  );
}

// TEST 2 — Contante waarde controleren

const expectedPresentValue = expectedCashFlows.reduce(
  (sum, cashFlow, index) =>
    sum + cashFlow / Math.pow(1.10, index + 1),
  0
);

assertClose(
  valuation.presentValueCad,
  expectedPresentValue,
  "Discounted reserve cash flow valuation"
);

// TEST 3 — Reserves volledig uitgeput

assertClose(
  valuation.endingReservesBcf,
  0,
  "Ending reserves = 0 Bcf"
);

// TEST 4 — Geen productie, maar wel capex

const noProduction = calculateCanadianGasReserveCashFlowValue({
  beginningReservesBcf: 0,
  annualDiscountRate: 0.10,

  years: [
    {
      requestedProductionBcf: 20,
      realizedGasPriceCadPerMcf: 4,
      cashCostCadPerMcf: 2,
      annualCapexCad: 5_000_000,
    },
  ],
});

assertClose(
  noProduction.annualCashFlows[0].freeCashFlowCad,
  -5_000_000,
  "Capex remains when production is zero"
);

// TEST 5 — Ongeldige kosten afwijzen

let invalidCostsRejected = false;

try {
  calculateCanadianGasReserveCashFlowValue({
    beginningReservesBcf: 100,
    annualDiscountRate: 0.10,

    years: [
      {
        requestedProductionBcf: 20,
        realizedGasPriceCadPerMcf: 4,
        cashCostCadPerMcf: -1,
        annualCapexCad: 5_000_000,
      },
    ],
  });
} catch {
  invalidCostsRejected = true;
}

if (!invalidCostsRejected) {
  throw new Error("Negative cash costs were accepted");
}

console.log("PASS: Negative cash costs rejected");