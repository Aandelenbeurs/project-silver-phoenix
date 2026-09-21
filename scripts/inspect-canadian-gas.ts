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