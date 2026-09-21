import {
  calculateAnnualGasProductionMcf,
  calculateAnnualLiquidsProductionBbl,
  calculateAnnualProductionMcfe,
  calculateAnnualRevenue,
  calculateOperatingCashFlowBeforeCapex,
  calculateFreeCashFlow,
  calculateCapitalAllocation,
  calculateBalanceSheetRollForward,
} from "../data/multi-sector/sectors/canadian-natural-gas/economics";

import {
  calculateProductionRollForward,
  calculateMultiYearProduction,
  calculateEconomicProjectionYear,
  calculateMultiYearEconomicProjection,
} from "../data/multi-sector/sectors/canadian-natural-gas/scenario-engine";

const tolerance = 1e-7;

// -----------------------------------------------------------------------------
// Production conversion tests
// -----------------------------------------------------------------------------

const annualGasProduction =
  calculateAnnualGasProductionMcf(100);

// 100 MMcf/d × 1,000 Mcf/MMcf × 365 days
const expectedAnnualGasProduction =
  36_500_000;

if (
  Math.abs(
    annualGasProduction -
      expectedAnnualGasProduction
  ) > tolerance
) {
  throw new Error(
    `Annual gas production test failed: expected ${expectedAnnualGasProduction}, received ${annualGasProduction}.`
  );
}

console.log(
  "PASS: 100 MMcf/d -> 36,500,000 Mcf/year"
);

const annualLiquidsProduction =
  calculateAnnualLiquidsProductionBbl(
    10_000
  );

// 10,000 bbl/d × 365 days
const expectedAnnualLiquidsProduction =
  3_650_000;

if (
  Math.abs(
    annualLiquidsProduction -
      expectedAnnualLiquidsProduction
  ) > tolerance
) {
  throw new Error(
    `Annual liquids production test failed: expected ${expectedAnnualLiquidsProduction}, received ${annualLiquidsProduction}.`
  );
}

console.log(
  "PASS: 10,000 bbl/d -> 3,650,000 bbl/year"
);

// -----------------------------------------------------------------------------
// Revenue test
// -----------------------------------------------------------------------------

const revenue =
  calculateAnnualRevenue({
    gasProductionMmcfPerDay: 100,
    realizedGasPriceCadPerMcf: 4,

    liquidsProductionBblPerDay: 10_000,
    realizedLiquidsPriceCadPerBbl: 70,
  });

const expectedGasRevenue =
  36_500_000 * 4;

const expectedLiquidsRevenue =
  3_650_000 * 70;

const expectedTotalRevenue =
  expectedGasRevenue +
  expectedLiquidsRevenue;

if (
  Math.abs(
    revenue.gasRevenueCad -
      expectedGasRevenue
  ) > tolerance
) {
  throw new Error(
    `Gas revenue test failed: expected ${expectedGasRevenue}, received ${revenue.gasRevenueCad}.`
  );
}

if (
  Math.abs(
    revenue.liquidsRevenueCad -
      expectedLiquidsRevenue
  ) > tolerance
) {
  throw new Error(
    `Liquids revenue test failed: expected ${expectedLiquidsRevenue}, received ${revenue.liquidsRevenueCad}.`
  );
}

if (
  Math.abs(
    revenue.totalRevenueCad -
      expectedTotalRevenue
  ) > tolerance
) {
  throw new Error(
    `Total revenue test failed: expected ${expectedTotalRevenue}, received ${revenue.totalRevenueCad}.`
  );
}

console.log(
  `PASS: Gas revenue = CAD ${(revenue.gasRevenueCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Liquids revenue = CAD ${(revenue.liquidsRevenueCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Total revenue = CAD ${(revenue.totalRevenueCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Guard tests
// -----------------------------------------------------------------------------

let negativeGasProductionRejected =
  false;

try {
  calculateAnnualGasProductionMcf(-1);
} catch {
  negativeGasProductionRejected =
    true;
}

if (!negativeGasProductionRejected) {
  throw new Error(
    "Negative gas production should be rejected."
  );
}

console.log(
  "PASS: Negative gas production rejected"
);

let nanGasPriceRejected = false;

try {
  calculateAnnualRevenue({
    gasProductionMmcfPerDay: 100,
    realizedGasPriceCadPerMcf:
      Number.NaN,
  });
} catch {
  nanGasPriceRejected = true;
}

if (!nanGasPriceRejected) {
  throw new Error(
    "NaN realized gas price should be rejected."
  );
}

console.log(
  "PASS: NaN realized gas price rejected"
);

// -----------------------------------------------------------------------------
// Mcfe conversion test
// -----------------------------------------------------------------------------

const annualProductionMcfe =
  calculateAnnualProductionMcfe(
    36_500_000,
    3_650_000
  );

// Gas:
// 36.5m Mcf
//
// Liquids:
// 3.65m bbl × 6 Mcfe/bbl = 21.9m Mcfe
//
// Total:
// 58.4m Mcfe
const expectedAnnualProductionMcfe =
  58_400_000;

if (
  Math.abs(
    annualProductionMcfe -
      expectedAnnualProductionMcfe
  ) > tolerance
) {
  throw new Error(
    `Annual Mcfe production test failed: expected ${expectedAnnualProductionMcfe}, received ${annualProductionMcfe}.`
  );
}

console.log(
  "PASS: Annual production = 58,400,000 Mcfe"
);

// -----------------------------------------------------------------------------
// Operating cash flow before capex test
// -----------------------------------------------------------------------------

const operatingCashFlow =
  calculateOperatingCashFlowBeforeCapex({
    totalRevenueCad: 401_500_000,

    annualGasProductionMcf:
      36_500_000,

    annualLiquidsProductionBbl:
      3_650_000,

    royaltiesCadPerMcfe: 0.50,
    operatingCostCadPerMcfe: 1.00,
    transportationCostCadPerMcfe: 0.50,
    gAndACostCadPerMcfe: 0.25,

    annualInterestExpenseCad:
      10_000_000,

    cashTaxesCad:
      5_000_000,
  });

const expectedRoyalties =
  58_400_000 * 0.50;

const expectedOperatingCosts =
  58_400_000 * 1.00;

const expectedTransportationCosts =
  58_400_000 * 0.50;

const expectedGAndACosts =
  58_400_000 * 0.25;

const expectedOperatingCashFlow =
  401_500_000 -
  expectedRoyalties -
  expectedOperatingCosts -
  expectedTransportationCosts -
  expectedGAndACosts -
  10_000_000 -
  5_000_000;

if (
  Math.abs(
    operatingCashFlow.royaltiesCad -
      expectedRoyalties
  ) > tolerance
) {
  throw new Error(
    "Royalty calculation failed."
  );
}

if (
  Math.abs(
    operatingCashFlow.operatingCostsCad -
      expectedOperatingCosts
  ) > tolerance
) {
  throw new Error(
    "Operating cost calculation failed."
  );
}

if (
  Math.abs(
    operatingCashFlow.transportationCostsCad -
      expectedTransportationCosts
  ) > tolerance
) {
  throw new Error(
    "Transportation cost calculation failed."
  );
}

if (
  Math.abs(
    operatingCashFlow.gAndACostsCad -
      expectedGAndACosts
  ) > tolerance
) {
  throw new Error(
    "G&A cost calculation failed."
  );
}

if (
  Math.abs(
    operatingCashFlow.operatingCashFlowBeforeCapexCad -
      expectedOperatingCashFlow
  ) > tolerance
) {
  throw new Error(
    `Operating cash flow test failed: expected ${expectedOperatingCashFlow}, received ${operatingCashFlow.operatingCashFlowBeforeCapexCad}.`
  );
}

console.log(
  `PASS: Royalties = CAD ${(operatingCashFlow.royaltiesCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Operating costs = CAD ${(operatingCashFlow.operatingCostsCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Transportation = CAD ${(operatingCashFlow.transportationCostsCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: G&A = CAD ${(operatingCashFlow.gAndACostsCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Operating cash flow before capex = CAD ${(operatingCashFlow.operatingCashFlowBeforeCapexCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Free cash flow test
// -----------------------------------------------------------------------------

const freeCashFlow =
  calculateFreeCashFlow({
    operatingCashFlowBeforeCapexCad:
      255_100_000,

    sustainingCapexCad:
      100_000_000,

    growthCapexCad:
      50_000_000,
  });

const expectedCashFlowAfterSustainingCapex =
  155_100_000;

const expectedTotalCapex =
  150_000_000;

const expectedFreeCashFlow =
  105_100_000;

if (
  Math.abs(
    freeCashFlow.cashFlowAfterSustainingCapexCad -
      expectedCashFlowAfterSustainingCapex
  ) > tolerance
) {
  throw new Error(
    `Cash flow after sustaining capex test failed: expected ${expectedCashFlowAfterSustainingCapex}, received ${freeCashFlow.cashFlowAfterSustainingCapexCad}.`
  );
}

if (
  Math.abs(
    freeCashFlow.totalCapexCad -
      expectedTotalCapex
  ) > tolerance
) {
  throw new Error(
    `Total capex test failed: expected ${expectedTotalCapex}, received ${freeCashFlow.totalCapexCad}.`
  );
}

if (
  Math.abs(
    freeCashFlow.freeCashFlowCad -
      expectedFreeCashFlow
  ) > tolerance
) {
  throw new Error(
    `Free cash flow test failed: expected ${expectedFreeCashFlow}, received ${freeCashFlow.freeCashFlowCad}.`
  );
}

console.log(
  `PASS: Cash flow after sustaining capex = CAD ${(freeCashFlow.cashFlowAfterSustainingCapexCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Total capex = CAD ${(freeCashFlow.totalCapexCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Free cash flow = CAD ${(freeCashFlow.freeCashFlowCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Negative free cash flow is economically valid
// -----------------------------------------------------------------------------

const negativeFreeCashFlow =
  calculateFreeCashFlow({
    operatingCashFlowBeforeCapexCad:
      100_000_000,

    sustainingCapexCad:
      80_000_000,

    growthCapexCad:
      50_000_000,
  });

if (
  Math.abs(
    negativeFreeCashFlow.freeCashFlowCad -
      -30_000_000
  ) > tolerance
) {
  throw new Error(
    `Negative FCF test failed: expected -30000000, received ${negativeFreeCashFlow.freeCashFlowCad}.`
  );
}

console.log(
  "PASS: Negative FCF is allowed = CAD -30.0m"
);

// -----------------------------------------------------------------------------
// Invalid capex guard
// -----------------------------------------------------------------------------

let negativeSustainingCapexRejected =
  false;

try {
  calculateFreeCashFlow({
    operatingCashFlowBeforeCapexCad:
      100_000_000,

    sustainingCapexCad:
      -10_000_000,

    growthCapexCad: 0,
  });
} catch {
  negativeSustainingCapexRejected =
    true;
}

if (!negativeSustainingCapexRejected) {
  throw new Error(
    "Negative sustaining capex should be rejected."
  );
}

console.log(
  "PASS: Negative sustaining capex rejected"
);

// -----------------------------------------------------------------------------
// Capital allocation test
// -----------------------------------------------------------------------------

const capitalAllocation =
  calculateCapitalAllocation({
    freeCashFlowCad:
      105_100_000,

    beginningNetDebtCad:
      300_000_000,

    beginningDilutedShares:
      100_000_000,

    dividendsCad:
      20_000_000,

    shareBuybacksCad:
      25_000_000,

    debtRepaymentCad:
      40_000_000,

    averageBuybackPriceCad:
      5,
  });

// CAD 25m / CAD 5 per share
// = 5m shares repurchased
const expectedSharesRepurchased =
  5_000_000;

const expectedEndingDilutedShares =
  95_000_000;

// CAD 300m - CAD 40m
const expectedEndingNetDebt =
  260_000_000;

// 20m + 25m + 40m
const expectedTotalCapitalAllocated =
  85_000_000;

// 105.1m - 85m
const expectedResidualCashFlow =
  20_100_000;

// CAD 20m / 100m beginning shares
const expectedDividendPerBeginningShare =
  0.20;

if (
  Math.abs(
    capitalAllocation.sharesRepurchased -
      expectedSharesRepurchased
  ) > tolerance
) {
  throw new Error(
    `Shares repurchased test failed: expected ${expectedSharesRepurchased}, received ${capitalAllocation.sharesRepurchased}.`
  );
}

if (
  Math.abs(
    capitalAllocation.endingDilutedShares -
      expectedEndingDilutedShares
  ) > tolerance
) {
  throw new Error(
    `Ending diluted shares test failed: expected ${expectedEndingDilutedShares}, received ${capitalAllocation.endingDilutedShares}.`
  );
}

if (
  Math.abs(
    capitalAllocation.netDebtAfterExplicitRepaymentCad -
      expectedEndingNetDebt
  ) > tolerance
) {
  throw new Error(
    `Ending net debt test failed: expected ${expectedEndingNetDebt}, received ${capitalAllocation.netDebtAfterExplicitRepaymentCad}.`
  );
}

if (
  Math.abs(
    capitalAllocation.totalCapitalAllocatedCad -
      expectedTotalCapitalAllocated
  ) > tolerance
) {
  throw new Error(
    `Total capital allocated test failed: expected ${expectedTotalCapitalAllocated}, received ${capitalAllocation.totalCapitalAllocatedCad}.`
  );
}

if (
  Math.abs(
    capitalAllocation.residualCashFlowCad -
      expectedResidualCashFlow
  ) > tolerance
) {
  throw new Error(
    `Residual cash flow test failed: expected ${expectedResidualCashFlow}, received ${capitalAllocation.residualCashFlowCad}.`
  );
}

if (
  Math.abs(
    capitalAllocation.dividendPerBeginningShareCad -
      expectedDividendPerBeginningShare
  ) > tolerance
) {
  throw new Error(
    `Dividend per share test failed: expected ${expectedDividendPerBeginningShare}, received ${capitalAllocation.dividendPerBeginningShareCad}.`
  );
}

console.log(
  "PASS: Shares repurchased = 5,000,000"
);

console.log(
  "PASS: Ending diluted shares = 95,000,000"
);

console.log(
  `PASS: Ending net debt = CAD ${(capitalAllocation.netDebtAfterExplicitRepaymentCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Total capital allocated = CAD ${(capitalAllocation.totalCapitalAllocatedCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Residual cash flow = CAD ${(capitalAllocation.residualCashFlowCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Dividend per beginning share = CAD ${capitalAllocation.dividendPerBeginningShareCad.toFixed(2)}`
);

// -----------------------------------------------------------------------------
// Buyback price guard
// -----------------------------------------------------------------------------

let missingBuybackPriceRejected =
  false;

try {
  calculateCapitalAllocation({
    freeCashFlowCad:
      100_000_000,

    beginningNetDebtCad:
      200_000_000,

    beginningDilutedShares:
      100_000_000,

    dividendsCad: 0,
    shareBuybacksCad:
      10_000_000,
    debtRepaymentCad: 0,
  });
} catch {
  missingBuybackPriceRejected =
    true;
}

if (!missingBuybackPriceRejected) {
  throw new Error(
    "Missing buyback price should be rejected when buybacks are greater than zero."
  );
}

console.log(
  "PASS: Missing buyback price rejected"
);

// -----------------------------------------------------------------------------
// Negative residual cash flow is allowed
// -----------------------------------------------------------------------------

const overAllocatedCapital =
  calculateCapitalAllocation({
    freeCashFlowCad:
      100_000_000,

    beginningNetDebtCad:
      300_000_000,

    beginningDilutedShares:
      100_000_000,

    dividendsCad:
      50_000_000,

    shareBuybacksCad:
      40_000_000,

    debtRepaymentCad:
      30_000_000,

    averageBuybackPriceCad:
      5,
  });

if (
  Math.abs(
    overAllocatedCapital.residualCashFlowCad -
      -20_000_000
  ) > tolerance
) {
  throw new Error(
    `Negative residual cash flow test failed: expected -20000000, received ${overAllocatedCapital.residualCashFlowCad}.`
  );
}

console.log(
  "PASS: Negative residual cash flow is allowed = CAD -20.0m"
);

// -----------------------------------------------------------------------------
// Balance sheet roll-forward tests
// -----------------------------------------------------------------------------

// Case 1:
// Positive residual cash reduces net debt further.
const positiveResidualBalanceSheet =
  calculateBalanceSheetRollForward({
    beginningNetDebtCad:
      300_000_000,

    debtRepaymentCad:
      40_000_000,

    residualCashFlowCad:
      20_100_000,
  });

const expectedNetDebtAfterRepayment =
  260_000_000;

const expectedEndingNetDebtPositiveResidual =
  239_900_000;

if (
  Math.abs(
    positiveResidualBalanceSheet.netDebtAfterExplicitRepaymentCad -
      expectedNetDebtAfterRepayment
  ) > tolerance
) {
  throw new Error(
    `Net debt after explicit repayment test failed: expected ${expectedNetDebtAfterRepayment}, received ${positiveResidualBalanceSheet.netDebtAfterExplicitRepaymentCad}.`
  );
}

if (
  Math.abs(
    positiveResidualBalanceSheet.endingNetDebtCad -
      expectedEndingNetDebtPositiveResidual
  ) > tolerance
) {
  throw new Error(
    `Positive residual cash balance-sheet test failed: expected ${expectedEndingNetDebtPositiveResidual}, received ${positiveResidualBalanceSheet.endingNetDebtCad}.`
  );
}

console.log(
  "PASS: Positive residual cash reduces ending net debt to CAD 239.9m"
);

// -----------------------------------------------------------------------------
// Case 2:
// Negative residual cash increases net debt.
// -----------------------------------------------------------------------------

const negativeResidualBalanceSheet =
  calculateBalanceSheetRollForward({
    beginningNetDebtCad:
      300_000_000,

    debtRepaymentCad:
      30_000_000,

    residualCashFlowCad:
      -20_000_000,
  });

const expectedEndingNetDebtNegativeResidual =
  290_000_000;

// 300m - 30m - (-20m)
// = 290m

if (
  Math.abs(
    negativeResidualBalanceSheet.endingNetDebtCad -
      expectedEndingNetDebtNegativeResidual
  ) > tolerance
) {
  throw new Error(
    `Negative residual cash balance-sheet test failed: expected ${expectedEndingNetDebtNegativeResidual}, received ${negativeResidualBalanceSheet.endingNetDebtCad}.`
  );
}

console.log(
  "PASS: Negative residual cash increases ending net debt to CAD 290.0m"
);

// -----------------------------------------------------------------------------
// Case 3:
// Company moves from net debt into a net cash position.
// -----------------------------------------------------------------------------

const netCashBalanceSheet =
  calculateBalanceSheetRollForward({
    beginningNetDebtCad:
      50_000_000,

    debtRepaymentCad:
      20_000_000,

    residualCashFlowCad:
      80_000_000,
  });

// 50m - 20m - 80m
// = -50m net debt
// = 50m net cash

const expectedEndingNetCash =
  -50_000_000;

if (
  Math.abs(
    netCashBalanceSheet.endingNetDebtCad -
      expectedEndingNetCash
  ) > tolerance
) {
  throw new Error(
    `Net cash transition test failed: expected ${expectedEndingNetCash}, received ${netCashBalanceSheet.endingNetDebtCad}.`
  );
}

console.log(
  "PASS: Net debt can transition to CAD 50.0m net cash"
);

// -----------------------------------------------------------------------------
// Invalid debt repayment guard
// -----------------------------------------------------------------------------

let negativeDebtRepaymentRejected =
  false;

try {
  calculateBalanceSheetRollForward({
    beginningNetDebtCad:
      100_000_000,

    debtRepaymentCad:
      -10_000_000,

    residualCashFlowCad: 0,
  });
} catch {
  negativeDebtRepaymentRejected =
    true;
}

if (!negativeDebtRepaymentRejected) {
  throw new Error(
    "Negative debt repayment should be rejected."
  );
}

console.log(
  "PASS: Negative debt repayment rejected"
);

// -----------------------------------------------------------------------------
// Production roll-forward tests
// -----------------------------------------------------------------------------

// Case 1:
// Natural decline with no replacement production.
const declineOnlyProduction =
  calculateProductionRollForward({
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    annualBaseDeclineRate: 0.30,

    annualGasProductionAddedMmcfPerDay: 0,
    annualLiquidsProductionAddedBblPerDay: 0,
  });

if (
  Math.abs(
    declineOnlyProduction.endingGasProductionMmcfPerDay -
      350
  ) > tolerance
) {
  throw new Error(
    `Decline-only gas production test failed: expected 350, received ${declineOnlyProduction.endingGasProductionMmcfPerDay}.`
  );
}

if (
  Math.abs(
    declineOnlyProduction.endingLiquidsProductionBblPerDay -
      14_000
  ) > tolerance
) {
  throw new Error(
    `Decline-only liquids production test failed: expected 14000, received ${declineOnlyProduction.endingLiquidsProductionBblPerDay}.`
  );
}

console.log(
  "PASS: 30% decline reduces gas production from 500 to 350 MMcf/d"
);

console.log(
  "PASS: 30% decline reduces liquids production from 20,000 to 14,000 bbl/d"
);

// -----------------------------------------------------------------------------
// Case 2:
// Development exactly replaces natural decline.
// -----------------------------------------------------------------------------

const maintenanceProduction =
  calculateProductionRollForward({
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    annualBaseDeclineRate: 0.30,

    annualGasProductionAddedMmcfPerDay: 150,
    annualLiquidsProductionAddedBblPerDay: 6_000,
  });

if (
  Math.abs(
    maintenanceProduction.endingGasProductionMmcfPerDay -
      500
  ) > tolerance
) {
  throw new Error(
    `Maintenance gas production test failed: expected 500, received ${maintenanceProduction.endingGasProductionMmcfPerDay}.`
  );
}

if (
  Math.abs(
    maintenanceProduction.endingLiquidsProductionBblPerDay -
      20_000
  ) > tolerance
) {
  throw new Error(
    `Maintenance liquids production test failed: expected 20000, received ${maintenanceProduction.endingLiquidsProductionBblPerDay}.`
  );
}

console.log(
  "PASS: Replacement development maintains gas production at 500 MMcf/d"
);

console.log(
  "PASS: Replacement development maintains liquids production at 20,000 bbl/d"
);

// -----------------------------------------------------------------------------
// Case 3:
// Development exceeds natural decline and creates net growth.
// -----------------------------------------------------------------------------

const growthProduction =
  calculateProductionRollForward({
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    annualBaseDeclineRate: 0.30,

    annualGasProductionAddedMmcfPerDay: 175,
    annualLiquidsProductionAddedBblPerDay: 7_000,
  });

// Gas:
// 500 × 70% = 350
// + 175 = 525 MMcf/d
//
// Liquids:
// 20,000 × 70% = 14,000
// + 7,000 = 21,000 bbl/d

if (
  Math.abs(
    growthProduction.endingGasProductionMmcfPerDay -
      525
  ) > tolerance
) {
  throw new Error(
    `Growth gas production test failed: expected 525, received ${growthProduction.endingGasProductionMmcfPerDay}.`
  );
}

if (
  Math.abs(
    growthProduction.endingLiquidsProductionBblPerDay -
      21_000
  ) > tolerance
) {
  throw new Error(
    `Growth liquids production test failed: expected 21000, received ${growthProduction.endingLiquidsProductionBblPerDay}.`
  );
}

console.log(
  "PASS: Development creates gas growth from 500 to 525 MMcf/d"
);

console.log(
  "PASS: Development creates liquids growth from 20,000 to 21,000 bbl/d"
);

// -----------------------------------------------------------------------------
// Invalid decline-rate guard
// -----------------------------------------------------------------------------

let invalidDeclineRateRejected = false;

try {
  calculateProductionRollForward({
    beginningGasProductionMmcfPerDay: 500,

    annualBaseDeclineRate: 1.10,

    annualGasProductionAddedMmcfPerDay: 0,
  });
} catch {
  invalidDeclineRateRejected = true;
}

if (!invalidDeclineRateRejected) {
  throw new Error(
    "A decline rate above 100% should be rejected."
  );
}

console.log(
  "PASS: Decline rate above 100% rejected"
);

// -----------------------------------------------------------------------------
// Multi-year production projection tests
// -----------------------------------------------------------------------------

const fiveYearProduction =
  calculateMultiYearProduction({
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    years: [
      {
        projectionYear: 1,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
      },
      {
        projectionYear: 2,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
      },
      {
        projectionYear: 3,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
      },
      {
        projectionYear: 4,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
      },
      {
        projectionYear: 5,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
      },
    ],
  });

const expectedGasByYear = [
  525,
  542.5,
  554.75,
  563.325,
  569.3275,
];

const expectedLiquidsByYear = [
  21_000,
  21_700,
  22_190,
  22_533,
  22_773.1,
];

for (
  let index = 0;
  index < fiveYearProduction.years.length;
  index += 1
) {
  const year =
    fiveYearProduction.years[index];

  if (
    Math.abs(
      year.endingGasProductionMmcfPerDay -
        expectedGasByYear[index]
    ) > tolerance
  ) {
    throw new Error(
      `Multi-year gas production failed in year ${year.projectionYear}: expected ${expectedGasByYear[index]}, received ${year.endingGasProductionMmcfPerDay}.`
    );
  }

  if (
    Math.abs(
      year.endingLiquidsProductionBblPerDay -
        expectedLiquidsByYear[index]
    ) > tolerance
  ) {
    throw new Error(
      `Multi-year liquids production failed in year ${year.projectionYear}: expected ${expectedLiquidsByYear[index]}, received ${year.endingLiquidsProductionBblPerDay}.`
    );
  }
}

console.log(
  "PASS: Five-year gas production roll-forward matches expected values"
);

console.log(
  "PASS: Five-year liquids production roll-forward matches expected values"
);

// -----------------------------------------------------------------------------
// Year-to-year continuity
// -----------------------------------------------------------------------------

for (
  let index = 1;
  index < fiveYearProduction.years.length;
  index += 1
) {
  const previousYear =
    fiveYearProduction.years[index - 1];

  const currentYear =
    fiveYearProduction.years[index];

  if (
    Math.abs(
      previousYear.endingGasProductionMmcfPerDay -
        currentYear.beginningGasProductionMmcfPerDay
    ) > tolerance
  ) {
    throw new Error(
      `Gas production continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }

  if (
    Math.abs(
      previousYear.endingLiquidsProductionBblPerDay -
        currentYear.beginningLiquidsProductionBblPerDay
    ) > tolerance
  ) {
    throw new Error(
      `Liquids production continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }
}

console.log(
  "PASS: Year-to-year production continuity preserved"
);

console.log(
  `PASS: Five-year ending gas production = ${fiveYearProduction.endingGasProductionMmcfPerDay.toFixed(4)} MMcf/d`
);

console.log(
  `PASS: Five-year ending liquids production = ${fiveYearProduction.endingLiquidsProductionBblPerDay.toFixed(1)} bbl/d`
);

// -----------------------------------------------------------------------------
// Sequential projection-year guard
// -----------------------------------------------------------------------------

let nonSequentialYearsRejected = false;

try {
  calculateMultiYearProduction({
    beginningGasProductionMmcfPerDay: 500,

    years: [
      {
        projectionYear: 1,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 150,
      },
      {
        projectionYear: 3,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 150,
      },
    ],
  });
} catch {
  nonSequentialYearsRejected = true;
}

if (!nonSequentialYearsRejected) {
  throw new Error(
    "Non-sequential projection years should be rejected."
  );
}

console.log(
  "PASS: Non-sequential projection years rejected"
);

// -----------------------------------------------------------------------------
// Complete single-year economic projection test
// -----------------------------------------------------------------------------

const economicYear =
  calculateEconomicProjectionYear({
    projectionYear: 1,

    // Production:
    // 500 × 70% + 175 = 525 MMcf/d
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    annualBaseDeclineRate: 0.30,

    annualGasProductionAddedMmcfPerDay: 175,
    annualLiquidsProductionAddedBblPerDay: 7_000,

    // Prices
    realizedGasPriceCadPerMcf: 4,
    realizedLiquidsPriceCadPerBbl: 70,

    // Operating economics
    royaltiesCadPerMcfe: 0.50,
    operatingCostCadPerMcfe: 1.00,
    transportationCostCadPerMcfe: 0.50,
    gAndACostCadPerMcfe: 0.25,

    annualInterestExpenseCad: 10_000_000,
    cashTaxesCad: 5_000_000,

    // Capex
    sustainingCapexCad: 100_000_000,
    growthCapexCad: 50_000_000,

    // Beginning balance sheet
    beginningNetDebtCad: 300_000_000,
    beginningDilutedShares: 100_000_000,

    // Capital allocation
    dividendsCad: 20_000_000,
    shareBuybacksCad: 25_000_000,
    debtRepaymentCad: 40_000_000,

    averageBuybackPriceCad: 5,
  });

// -----------------------------------------------------------------------------
// Production
// -----------------------------------------------------------------------------

if (
  Math.abs(
    economicYear.production.endingGasProductionMmcfPerDay -
      525
  ) > tolerance
) {
  throw new Error(
    "Economic-year ending gas production failed."
  );
}

if (
  Math.abs(
    economicYear.production.endingLiquidsProductionBblPerDay -
      21_000
  ) > tolerance
) {
  throw new Error(
    "Economic-year ending liquids production failed."
  );
}

console.log(
  "PASS: Economic year production = 525 MMcf/d + 21,000 bbl/d"
);

// -----------------------------------------------------------------------------
// Revenue
// -----------------------------------------------------------------------------

const expectedEconomicYearGasRevenue =
  525 *
  1_000 *
  365 *
  4;

const expectedEconomicYearLiquidsRevenue =
  21_000 *
  365 *
  70;

const expectedEconomicYearRevenue =
  expectedEconomicYearGasRevenue +
  expectedEconomicYearLiquidsRevenue;

if (
  Math.abs(
    economicYear.totalRevenueCad -
      expectedEconomicYearRevenue
  ) > tolerance
) {
  throw new Error(
    `Economic-year revenue failed: expected ${expectedEconomicYearRevenue}, received ${economicYear.totalRevenueCad}.`
  );
}

console.log(
  `PASS: Economic year revenue = CAD ${(economicYear.totalRevenueCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Operating economics
// -----------------------------------------------------------------------------

const expectedEconomicYearMcfe =
  525 *
  1_000 *
  365 +
  21_000 *
  365 *
  6;

const expectedEconomicYearOperatingCosts =
  expectedEconomicYearMcfe *
  (0.50 + 1.00 + 0.50 + 0.25);

const expectedEconomicYearOcf =
  expectedEconomicYearRevenue -
  expectedEconomicYearOperatingCosts -
  10_000_000 -
  5_000_000;

if (
  Math.abs(
    economicYear.operatingCashFlowBeforeCapexCad -
      expectedEconomicYearOcf
  ) > tolerance
) {
  throw new Error(
    `Economic-year OCF failed: expected ${expectedEconomicYearOcf}, received ${economicYear.operatingCashFlowBeforeCapexCad}.`
  );
}

console.log(
  `PASS: Economic year OCF before capex = CAD ${(economicYear.operatingCashFlowBeforeCapexCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Free cash flow
// -----------------------------------------------------------------------------

const expectedEconomicYearFcf =
  expectedEconomicYearOcf -
  100_000_000 -
  50_000_000;

if (
  Math.abs(
    economicYear.freeCashFlowCad -
      expectedEconomicYearFcf
  ) > tolerance
) {
  throw new Error(
    `Economic-year FCF failed: expected ${expectedEconomicYearFcf}, received ${economicYear.freeCashFlowCad}.`
  );
}

console.log(
  `PASS: Economic year FCF = CAD ${(economicYear.freeCashFlowCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Buybacks / share count
// -----------------------------------------------------------------------------

if (
  Math.abs(
    economicYear.sharesRepurchased -
      5_000_000
  ) > tolerance
) {
  throw new Error(
    "Economic-year share repurchase calculation failed."
  );
}

if (
  Math.abs(
    economicYear.endingDilutedShares -
      95_000_000
  ) > tolerance
) {
  throw new Error(
    "Economic-year ending diluted shares failed."
  );
}

console.log(
  "PASS: Economic year diluted shares = 95,000,000"
);

// -----------------------------------------------------------------------------
// Balance sheet
// -----------------------------------------------------------------------------

const expectedEconomicYearResidualCash =
  expectedEconomicYearFcf -
  20_000_000 -
  25_000_000 -
  40_000_000;

const expectedEconomicYearEndingNetDebt =
  300_000_000 -
  40_000_000 -
  expectedEconomicYearResidualCash;

if (
  Math.abs(
    economicYear.residualCashFlowCad -
      expectedEconomicYearResidualCash
  ) > tolerance
) {
  throw new Error(
    `Economic-year residual cash failed: expected ${expectedEconomicYearResidualCash}, received ${economicYear.residualCashFlowCad}.`
  );
}

if (
  Math.abs(
    economicYear.endingNetDebtCad -
      expectedEconomicYearEndingNetDebt
  ) > tolerance
) {
  throw new Error(
    `Economic-year ending net debt failed: expected ${expectedEconomicYearEndingNetDebt}, received ${economicYear.endingNetDebtCad}.`
  );
}

console.log(
  `PASS: Economic year residual cash = CAD ${(economicYear.residualCashFlowCad / 1_000_000).toFixed(1)}m`
);

console.log(
  `PASS: Economic year ending net debt = CAD ${(economicYear.endingNetDebtCad / 1_000_000).toFixed(1)}m`
);

// -----------------------------------------------------------------------------
// Multi-year economic projection tests
// -----------------------------------------------------------------------------

const fiveYearEconomicProjection =
  calculateMultiYearEconomicProjection({
    beginningGasProductionMmcfPerDay: 500,
    beginningLiquidsProductionBblPerDay: 20_000,

    beginningNetDebtCad: 300_000_000,
    beginningDilutedShares: 100_000_000,

    years: [
      {
        projectionYear: 1,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
        realizedGasPriceCadPerMcf: 4,
        realizedLiquidsPriceCadPerBbl: 70,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1.00,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        annualInterestExpenseCad: 10_000_000,
        cashTaxesCad: 5_000_000,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 25_000_000,
        debtRepaymentCad: 40_000_000,
        averageBuybackPriceCad: 5,
      },
      {
        projectionYear: 2,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
        realizedGasPriceCadPerMcf: 4,
        realizedLiquidsPriceCadPerBbl: 70,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1.00,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        annualInterestExpenseCad: 10_000_000,
        cashTaxesCad: 5_000_000,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 25_000_000,
        debtRepaymentCad: 40_000_000,
        averageBuybackPriceCad: 5,
      },
      {
        projectionYear: 3,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
        realizedGasPriceCadPerMcf: 4,
        realizedLiquidsPriceCadPerBbl: 70,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1.00,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        annualInterestExpenseCad: 10_000_000,
        cashTaxesCad: 5_000_000,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 25_000_000,
        debtRepaymentCad: 40_000_000,
        averageBuybackPriceCad: 5,
      },
      {
        projectionYear: 4,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
        realizedGasPriceCadPerMcf: 4,
        realizedLiquidsPriceCadPerBbl: 70,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1.00,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        annualInterestExpenseCad: 10_000_000,
        cashTaxesCad: 5_000_000,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 25_000_000,
        debtRepaymentCad: 40_000_000,
        averageBuybackPriceCad: 5,
      },
      {
        projectionYear: 5,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 175,
        annualLiquidsProductionAddedBblPerDay: 7_000,
        realizedGasPriceCadPerMcf: 4,
        realizedLiquidsPriceCadPerBbl: 70,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1.00,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        annualInterestExpenseCad: 10_000_000,
        cashTaxesCad: 5_000_000,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 20_000_000,
        shareBuybacksCad: 25_000_000,
        debtRepaymentCad: 40_000_000,
        averageBuybackPriceCad: 5,
      },
    ],
  });

// -----------------------------------------------------------------------------
// Production continuity
// -----------------------------------------------------------------------------

for (
  let index = 1;
  index < fiveYearEconomicProjection.years.length;
  index += 1
) {
  const previousYear =
    fiveYearEconomicProjection.years[index - 1];

  const currentYear =
    fiveYearEconomicProjection.years[index];

  if (
    Math.abs(
      previousYear.production
        .endingGasProductionMmcfPerDay -
        currentYear.production
          .beginningGasProductionMmcfPerDay
    ) > tolerance
  ) {
    throw new Error(
      `Economic gas-production continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }

  if (
    Math.abs(
      previousYear.production
        .endingLiquidsProductionBblPerDay -
        currentYear.production
          .beginningLiquidsProductionBblPerDay
    ) > tolerance
  ) {
    throw new Error(
      `Economic liquids-production continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }
}

console.log(
  "PASS: Multi-year economic production continuity preserved"
);

// -----------------------------------------------------------------------------
// Balance-sheet continuity
// -----------------------------------------------------------------------------

for (
  let index = 1;
  index < fiveYearEconomicProjection.years.length;
  index += 1
) {
  const previousYear =
    fiveYearEconomicProjection.years[index - 1];

  const currentYear =
    fiveYearEconomicProjection.years[index];

  if (
    Math.abs(
      previousYear.endingNetDebtCad -
        currentYear.beginningNetDebtCad
    ) > tolerance
  ) {
    throw new Error(
      `Net-debt continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }
}

console.log(
  "PASS: Multi-year economic net-debt continuity preserved"
);

// -----------------------------------------------------------------------------
// Share-count continuity
// -----------------------------------------------------------------------------

for (
  let index = 1;
  index < fiveYearEconomicProjection.years.length;
  index += 1
) {
  const previousYear =
    fiveYearEconomicProjection.years[index - 1];

  const currentYear =
    fiveYearEconomicProjection.years[index];

  if (
    Math.abs(
      previousYear.endingDilutedShares -
        currentYear.beginningDilutedShares
    ) > tolerance
  ) {
    throw new Error(
      `Diluted-share continuity failed between years ${previousYear.projectionYear} and ${currentYear.projectionYear}.`
    );
  }
}

console.log(
  "PASS: Multi-year economic diluted-share continuity preserved"
);

// -----------------------------------------------------------------------------
// Final production
// -----------------------------------------------------------------------------

if (
  Math.abs(
    fiveYearEconomicProjection
      .endingGasProductionMmcfPerDay -
      569.3275
  ) > tolerance
) {
  throw new Error(
    "Five-year economic ending gas production failed."
  );
}

if (
  Math.abs(
    fiveYearEconomicProjection
      .endingLiquidsProductionBblPerDay -
      22_773.1
  ) > tolerance
) {
  throw new Error(
    "Five-year economic ending liquids production failed."
  );
}

console.log(
  `PASS: Economic projection ends at ${fiveYearEconomicProjection.endingGasProductionMmcfPerDay.toFixed(4)} MMcf/d gas`
);

console.log(
  `PASS: Economic projection ends at ${fiveYearEconomicProjection.endingLiquidsProductionBblPerDay.toFixed(1)} bbl/d liquids`
);

// -----------------------------------------------------------------------------
// Cumulative capital allocation
// -----------------------------------------------------------------------------

if (
  Math.abs(
    fiveYearEconomicProjection
      .cumulativeDividendsCad -
      100_000_000
  ) > tolerance
) {
  throw new Error(
    "Five-year cumulative dividends failed."
  );
}

if (
  Math.abs(
    fiveYearEconomicProjection
      .cumulativeShareBuybacksCad -
      125_000_000
  ) > tolerance
) {
  throw new Error(
    "Five-year cumulative buybacks failed."
  );
}

if (
  Math.abs(
    fiveYearEconomicProjection
      .cumulativeDebtRepaymentCad -
      200_000_000
  ) > tolerance
) {
  throw new Error(
    "Five-year cumulative debt repayment failed."
  );
}

console.log(
  "PASS: Five-year cumulative dividends = CAD 100.0m"
);

console.log(
  "PASS: Five-year cumulative buybacks = CAD 125.0m"
);

console.log(
  "PASS: Five-year cumulative debt repayment = CAD 200.0m"
);

// -----------------------------------------------------------------------------
// Buyback effect
// -----------------------------------------------------------------------------

const expectedEndingShares =
  100_000_000 -
  5 * 5_000_000;

if (
  Math.abs(
    fiveYearEconomicProjection.endingDilutedShares -
      expectedEndingShares
  ) > tolerance
) {
  throw new Error(
    `Five-year ending diluted shares failed: expected ${expectedEndingShares}, received ${fiveYearEconomicProjection.endingDilutedShares}.`
  );
}

console.log(
  `PASS: Five-year ending diluted shares = ${fiveYearEconomicProjection.endingDilutedShares.toLocaleString()}`
);

// -----------------------------------------------------------------------------
// Economic projection-year guard
// -----------------------------------------------------------------------------

let nonSequentialEconomicYearsRejected = false;

try {
  calculateMultiYearEconomicProjection({
    beginningGasProductionMmcfPerDay: 500,
    beginningNetDebtCad: 300_000_000,
    beginningDilutedShares: 100_000_000,

    years: [
      {
        projectionYear: 2,
        annualBaseDeclineRate: 0.30,
        annualGasProductionAddedMmcfPerDay: 150,
        realizedGasPriceCadPerMcf: 4,
        royaltiesCadPerMcfe: 0.50,
        operatingCostCadPerMcfe: 1,
        transportationCostCadPerMcfe: 0.50,
        gAndACostCadPerMcfe: 0.25,
        sustainingCapexCad: 100_000_000,
        growthCapexCad: 50_000_000,
        dividendsCad: 0,
        shareBuybacksCad: 0,
        debtRepaymentCad: 0,
      },
    ],
  });
} catch {
  nonSequentialEconomicYearsRejected = true;
}

if (!nonSequentialEconomicYearsRejected) {
  throw new Error(
    "Non-sequential economic projection years should be rejected."
  );
}

console.log(
  "PASS: Non-sequential economic projection years rejected"
);