import assert from "node:assert/strict";

import type {
  CanadianGasEconomicSnapshot,
} from "../data/multi-sector/sectors/canadian-natural-gas/types";

import {
  adaptCanadianGasBeginningPosition,
} from "../data/multi-sector/sectors/canadian-natural-gas/company-input-adapter";

function makeSnapshot(): CanadianGasEconomicSnapshot {
  return {
    identity: {
      companyId: "test-gas",
      companyName: "Test Gas Producer",
      ticker: "TEST",
      currency: "CAD",
      companyType: "gas-producer",
    },

    production: {
      gasProductionMmcfPerDay: 100,
      liquidsProductionBblPerDay: 500,
    },

    inventory: {},
    marketAccess: {},

        balanceSheet: {
      netDebt: 100_000_000,
      sharesOutstanding: 49_000_000,
      dilutedSharesOutstanding: 50_000_000,
    },

    operatingEconomics: {},
    capitalModel: {},

    dataAsOf: "2025-12-31",
  };
}

function test(
  name: string,
  run: () => void
) {
  run();
  console.log(`PASS: ${name}`);
}

// 1. Correcte beginpositie
test("valid beginning position", () => {
  const result =
    adaptCanadianGasBeginningPosition(makeSnapshot());

  assert.deepEqual(result, {
    beginningGasProductionMmcfPerDay: 100,
    beginningLiquidsProductionBblPerDay: 500,
    beginningNetDebtCad: 100_000_000,
    beginningDilutedShares: 50_000_000,
  });
});

// 2. Ontbrekende nettoschuld
test("missing net debt rejected", () => {
  const snapshot = makeSnapshot();
  delete snapshot.balanceSheet.netDebt;

  assert.throws(
    () => adaptCanadianGasBeginningPosition(snapshot),
    /Verified beginning net debt is required/
  );
});

// 3. Ontbrekende aandelen
test("missing shares rejected", () => {
  const snapshot = makeSnapshot();
    delete snapshot.balanceSheet.dilutedSharesOutstanding;

  assert.throws(
    () => adaptCanadianGasBeginningPosition(snapshot),
    /Verified beginning diluted shares are required/
  );
});

// 4. USD wordt niet stilzwijgend als CAD behandeld
test("USD reporting rejected", () => {
  const snapshot = makeSnapshot();
  snapshot.identity.currency = "USD";

  assert.throws(
    () => adaptCanadianGasBeginningPosition(snapshot),
    /requires CAD reporting currency/
  );
});

// 5. Negatieve nettoschuld (nettokaspositie)
test("net cash accepted", () => {
  const snapshot = makeSnapshot();
  snapshot.balanceSheet.netDebt = -25_000_000;

  const result =
    adaptCanadianGasBeginningPosition(snapshot);

  assert.equal(
    result.beginningNetDebtCad,
    -25_000_000
  );
});

// 6. Negatieve productie
test("negative production rejected", () => {
  const snapshot = makeSnapshot();
  snapshot.production.gasProductionMmcfPerDay = -10;

  assert.throws(
    () => adaptCanadianGasBeginningPosition(snapshot),
    /Invalid company data/
  );
});

// 7. Geen liquidsproductie opgegeven
test("missing liquids remains unknown", () => {
  const snapshot = makeSnapshot();
  delete snapshot.production.liquidsProductionBblPerDay;

  const result =
    adaptCanadianGasBeginningPosition(snapshot);

  assert.equal(
    result.beginningLiquidsProductionBblPerDay,
    undefined
  );
});

// 8. Ongeldig aantal aandelen
test("zero shares rejected", () => {
  const snapshot = makeSnapshot();
    snapshot.balanceSheet.dilutedSharesOutstanding = 0;

  assert.throws(
    () => adaptCanadianGasBeginningPosition(snapshot),
    /Invalid company data/
  );
});

console.log("\n8 company input adapter tests passed.");