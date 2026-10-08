import {
  calculateMultiYearEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

import {
  createCanadianGasEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/economic-scenario-factory";

import {
  calculateRemainingReservesFromEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/reserve-projection-adapter";

function assertClose(
  actual: number,
  expected: number,
  description: string
): void {
  if (Math.abs(actual - expected) > 0.000001) {
    throw new Error(
      `${description}: expected ${expected}, received ${actual}`
    );
  }

  console.log(`PASS: ${description}`);
}

// TEST 1 — Maak een economische projectie van 3 jaar.

const input = createCanadianGasEconomicProjection({
  realizationYears: 3,
  beginningGasProductionMmcfPerDay: 100,
  beginningLiquidsProductionBblPerDay: 0,
  beginningNetDebtCad: 0,
  beginningDilutedShares: 100_000_000,

  annualAssumptions: {
    annualBaseDeclineRate: 0,
    annualGasProductionAddedMmcfPerDay: 0,
    annualLiquidsProductionAddedBblPerDay: 0,

    realizedGasPriceCadPerMcf: 4,
    realizedLiquidsPriceCadPerBbl: 0,

    royaltiesCadPerMcfe: 0,
    operatingCostCadPerMcfe: 1,
    transportationCostCadPerMcfe: 0,
    gAndACostCadPerMcfe: 0,

    annualInterestExpenseCad: 0,
    cashTaxesCad: 0,

    sustainingCapexCad: 0,
    growthCapexCad: 0,

    dividendsCad: 0,
    shareBuybacksCad: 0,
    debtRepaymentCad: 0,
  },
});

const projection = calculateMultiYearEconomicProjection(input);

// TEST 2 — Bereken de jaarlijkse gasproductie in Bcf.

const annualProductionBcf = projection.years.map(
  (year) => year.annualGasProductionMcf / 1_000_000
);

const totalProductionBcf = annualProductionBcf.reduce(
  (sum, production) => sum + production,
  0
);

console.log(
  `Economic Engine production: ${totalProductionBcf.toFixed(4)} Bcf`
);

// TEST 3 — Adapter gebruikt dezelfde productie.

const beginningReservesBcf = 500;

const remainingReservesBcf =
  calculateRemainingReservesFromEconomicProjection(
    beginningReservesBcf,
    projection
  );

assertClose(
  remainingReservesBcf,
  beginningReservesBcf - totalProductionBcf,
  "Adapter matches economic engine production"
);

// TEST 4 — Reserves kunnen niet negatief worden.

const depletedReservesBcf =
  calculateRemainingReservesFromEconomicProjection(
    50,
    projection
  );

assertClose(
  depletedReservesBcf,
  0,
  "Reserve depletion capped at zero"
);

// TEST 5 — Geen reserve-uitputting bij nulproductie.

const zeroProduction = {
  ...projection,
  years: projection.years.map((year) => ({
    ...year,
    annualGasProductionMcf: 0,
  })),
};

assertClose(
  calculateRemainingReservesFromEconomicProjection(
    500,
    zeroProduction
  ),
  500,
  "Zero production preserves reserves"
);
