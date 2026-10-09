import assert from "node:assert/strict";

import type {
  CanadianGasEconomicSnapshot,
} from "../data/multi-sector/sectors/canadian-natural-gas/types";

import {
  validateCanadianGasCompanyData,
} from "../data/multi-sector/sectors/canadian-natural-gas/company-data-validation";

function makeSnapshot(): CanadianGasEconomicSnapshot {
  return {
    identity: {
      companyId: "test-gas",
      companyName: "Test Gas Producer",
      ticker: "TEST",
      currency: "CAD",
      companyType: "gas-producer",
      primaryBasin: "montney",
    },

    production: {
      gasProductionMmcfPerDay: 100,
      liquidsProductionBblPerDay: 500,
    },

    inventory: {},

    marketAccess: {},

    balanceSheet: {
      netDebt: 100_000_000,
      sharesOutstanding: 100_000_000,
    },

    operatingEconomics: {},

    capitalModel: {},

    reportedReserves: {
      provedGasReservesBcf: 200,
      provedPlusProbableGasReservesBcf: 300,
      reservesAsOf: "2025-12-31",
    },

    dataAsOf: "2025-12-31",

    sources: [
      {
        sourceId: "annual-2025",
        sourceType: "annual-report",
        title: "Test Annual Report 2025",
        publishedAt: "2026-03-01",
        dataAsOf: "2025-12-31",
        fields: [
          "production.gasProductionMmcfPerDay",
          "balanceSheet.netDebt",
        ],
      },
    ],
  };
}

function test(
  description: string,
  modify: (snapshot: CanadianGasEconomicSnapshot) => void,
  expectedValid: boolean,
  expectedMessage?: string
) {
  const snapshot = makeSnapshot();

  modify(snapshot);

  const result = validateCanadianGasCompanyData(snapshot);

  assert.equal(
    result.valid,
    expectedValid,
    `${description}: unexpected validity`
  );

  if (expectedMessage) {
    assert.ok(
      [...result.errors, ...result.warnings].some(
        (message) => message.includes(expectedMessage)
      ),
      `${description}: expected message "${expectedMessage}"`
    );
  }

  console.log(`PASS: ${description}`);
}

// 1 — Geldige bedrijfsgegevens.
test(
  "valid company snapshot",
  () => {},
  true
);

// 2 — Negatieve gasproductie.
test(
  "negative gas production rejected",
  (snapshot) => {
    snapshot.production.gasProductionMmcfPerDay = -10;
  },
  false,
  "production.gasProductionMmcfPerDay"
);

// 3 — Ongeldige reserves.
test(
  "2P reserves below 1P rejected",
  (snapshot) => {
    snapshot.reportedReserves!.provedPlusProbableGasReservesBcf = 100;
  },
  false,
  "2P gas reserves cannot be smaller"
);

// 4 — Ontbrekende reserves geven waarschuwing.
test(
  "missing reserves warning",
  (snapshot) => {
    delete snapshot.reportedReserves;
  },
  true,
  "No reported gas reserves"
);

// 5 — Ontbrekende bronnen geven waarschuwing.
test(
  "missing sources warning",
  (snapshot) => {
    delete snapshot.sources;
  },
  true,
  "No supporting data sources"
);

// 6 — Dubbele bron-ID's.
test(
  "duplicate source IDs rejected",
  (snapshot) => {
    snapshot.sources!.push({
      sourceId: "annual-2025",
      sourceType: "quarterly-report",
      title: "Duplicate source",
    });
  },
  false,
  "Duplicate source ID"
);

// 7 — Negatieve nettoschuld is toegestaan.
test(
  "net cash position accepted",
  (snapshot) => {
    snapshot.balanceSheet.netDebt = -50_000_000;
  },
  true
);

// 8 — Nul uitstaande aandelen afgewezen.
test(
  "zero shares rejected",
  (snapshot) => {
    snapshot.balanceSheet.sharesOutstanding = 0;
  },
  false,
  "Shares outstanding must be greater than zero"
);

// 9 — Ongeldige productie afgewezen.
test(
  "non-finite production rejected",
  (snapshot) => {
    snapshot.production.gasProductionMmcfPerDay = Number.NaN;
  },
  false,
  "production.gasProductionMmcfPerDay"
);

// 10 — Lege brontitel afgewezen.
test(
  "empty source title rejected",
  (snapshot) => {
    snapshot.sources![0].title = " ";
  },
  false,
  "has no title"
);

console.log("\n10 company data validation tests passed.");