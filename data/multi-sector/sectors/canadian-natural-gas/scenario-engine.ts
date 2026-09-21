import {
  calculateAnnualRevenue,
  calculateOperatingCashFlowBeforeCapex,
  calculateFreeCashFlow,
  calculateCapitalAllocation,
  calculateBalanceSheetRollForward,
} from "./economics";

// -----------------------------------------------------------------------------
// Canadian Natural Gas Engine
// Multi-Year Scenario Engine v1
// -----------------------------------------------------------------------------

export interface CanadianGasProductionRollForwardInput {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  /**
   * Natural decline of existing production before replacement
   * or growth capital.
   *
   * Decimal: 0.30 = 30%.
   */
  annualBaseDeclineRate: number;

  /**
   * Production added during the year through sustaining and
   * growth development.
   *
   * These are explicit physical production additions rather
   * than percentage growth assumptions.
   */
  annualGasProductionAddedMmcfPerDay: number;
  annualLiquidsProductionAddedBblPerDay?: number;
}

export interface CanadianGasProductionRollForwardResult {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay: number;

  gasProductionAfterDeclineMmcfPerDay: number;
  liquidsProductionAfterDeclineBblPerDay: number;

  gasProductionAddedMmcfPerDay: number;
  liquidsProductionAddedBblPerDay: number;

  endingGasProductionMmcfPerDay: number;
  endingLiquidsProductionBblPerDay: number;
}

/**
 * Rolls production forward by one year.
 *
 * beginning production
 * × (1 - base decline)
 * = production remaining after natural decline
 *
 * + production added through development
 * = ending production
 *
 * IMPORTANT:
 * Production additions are explicit physical volumes.
 * We do not automatically infer them from capex yet.
 */
export function calculateProductionRollForward(
  input: CanadianGasProductionRollForwardInput
): CanadianGasProductionRollForwardResult {
  const beginningLiquidsProductionBblPerDay =
    input.beginningLiquidsProductionBblPerDay ?? 0;

  const annualLiquidsProductionAddedBblPerDay =
    input.annualLiquidsProductionAddedBblPerDay ?? 0;

  const numericInputs = [
    [
      "Beginning gas production",
      input.beginningGasProductionMmcfPerDay,
    ],
    [
      "Beginning liquids production",
      beginningLiquidsProductionBblPerDay,
    ],
    [
      "Annual base decline rate",
      input.annualBaseDeclineRate,
    ],
    [
      "Annual gas production added",
      input.annualGasProductionAddedMmcfPerDay,
    ],
    [
      "Annual liquids production added",
      annualLiquidsProductionAddedBblPerDay,
    ],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }
  }

  if (input.beginningGasProductionMmcfPerDay < 0) {
    throw new Error(
      "Beginning gas production cannot be negative."
    );
  }

  if (beginningLiquidsProductionBblPerDay < 0) {
    throw new Error(
      "Beginning liquids production cannot be negative."
    );
  }

  if (
    input.annualBaseDeclineRate < 0 ||
    input.annualBaseDeclineRate > 1
  ) {
    throw new Error(
      "Annual base decline rate must be between 0 and 1."
    );
  }

  if (input.annualGasProductionAddedMmcfPerDay < 0) {
    throw new Error(
      "Annual gas production added cannot be negative."
    );
  }

  if (annualLiquidsProductionAddedBblPerDay < 0) {
    throw new Error(
      "Annual liquids production added cannot be negative."
    );
  }

  const gasProductionAfterDeclineMmcfPerDay =
    input.beginningGasProductionMmcfPerDay *
    (1 - input.annualBaseDeclineRate);

  const liquidsProductionAfterDeclineBblPerDay =
    beginningLiquidsProductionBblPerDay *
    (1 - input.annualBaseDeclineRate);

  const endingGasProductionMmcfPerDay =
    gasProductionAfterDeclineMmcfPerDay +
    input.annualGasProductionAddedMmcfPerDay;

  const endingLiquidsProductionBblPerDay =
    liquidsProductionAfterDeclineBblPerDay +
    annualLiquidsProductionAddedBblPerDay;

  return {
    beginningGasProductionMmcfPerDay:
      input.beginningGasProductionMmcfPerDay,

    beginningLiquidsProductionBblPerDay,

    gasProductionAfterDeclineMmcfPerDay,
    liquidsProductionAfterDeclineBblPerDay,

    gasProductionAddedMmcfPerDay:
      input.annualGasProductionAddedMmcfPerDay,

    liquidsProductionAddedBblPerDay:
      annualLiquidsProductionAddedBblPerDay,

    endingGasProductionMmcfPerDay,
    endingLiquidsProductionBblPerDay,
  };
}

// -----------------------------------------------------------------------------
// Multi-Year Production Projection
// -----------------------------------------------------------------------------

export interface CanadianGasProductionYearAssumption {
  projectionYear: number;

  annualBaseDeclineRate: number;

  annualGasProductionAddedMmcfPerDay: number;
  annualLiquidsProductionAddedBblPerDay?: number;
}

export interface CanadianGasMultiYearProductionInput {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  years: CanadianGasProductionYearAssumption[];
}

export interface CanadianGasProductionProjectionYear
  extends CanadianGasProductionRollForwardResult {
  projectionYear: number;
}

export interface CanadianGasMultiYearProductionResult {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay: number;

  years: CanadianGasProductionProjectionYear[];

  endingGasProductionMmcfPerDay: number;
  endingLiquidsProductionBblPerDay: number;
}

/**
 * Builds a sequential multi-year production projection.
 *
 * Each year's ending production automatically becomes the
 * following year's beginning production.
 *
 * IMPORTANT:
 * Projection years must be sequential:
 * 1, 2, 3, ... N
 */
export function calculateMultiYearProduction(
  input: CanadianGasMultiYearProductionInput
): CanadianGasMultiYearProductionResult {
  if (
    !Number.isFinite(
      input.beginningGasProductionMmcfPerDay
    )
  ) {
    throw new Error(
      "Beginning gas production must be a finite number."
    );
  }

  if (
    input.beginningGasProductionMmcfPerDay < 0
  ) {
    throw new Error(
      "Beginning gas production cannot be negative."
    );
  }

  const beginningLiquidsProductionBblPerDay =
    input.beginningLiquidsProductionBblPerDay ?? 0;

  if (
    !Number.isFinite(
      beginningLiquidsProductionBblPerDay
    )
  ) {
    throw new Error(
      "Beginning liquids production must be a finite number."
    );
  }

  if (
    beginningLiquidsProductionBblPerDay < 0
  ) {
    throw new Error(
      "Beginning liquids production cannot be negative."
    );
  }

  if (input.years.length === 0) {
    throw new Error(
      "At least one projection year is required."
    );
  }

  let currentGasProduction =
    input.beginningGasProductionMmcfPerDay;

  let currentLiquidsProduction =
    beginningLiquidsProductionBblPerDay;

  const years: CanadianGasProductionProjectionYear[] =
    [];

  for (
    let index = 0;
    index < input.years.length;
    index += 1
  ) {
    const assumption =
      input.years[index];

    const expectedProjectionYear =
      index + 1;

    if (
      assumption.projectionYear !==
      expectedProjectionYear
    ) {
      throw new Error(
        `Projection years must be sequential starting at 1. Expected year ${expectedProjectionYear}, received ${assumption.projectionYear}.`
      );
    }

    const rollForward =
      calculateProductionRollForward({
        beginningGasProductionMmcfPerDay:
          currentGasProduction,

        beginningLiquidsProductionBblPerDay:
          currentLiquidsProduction,

        annualBaseDeclineRate:
          assumption.annualBaseDeclineRate,

        annualGasProductionAddedMmcfPerDay:
          assumption.annualGasProductionAddedMmcfPerDay,

        annualLiquidsProductionAddedBblPerDay:
          assumption.annualLiquidsProductionAddedBblPerDay,
      });

    years.push({
      projectionYear:
        assumption.projectionYear,

      ...rollForward,
    });

    currentGasProduction =
      rollForward.endingGasProductionMmcfPerDay;

    currentLiquidsProduction =
      rollForward.endingLiquidsProductionBblPerDay;
  }

  return {
    beginningGasProductionMmcfPerDay:
      input.beginningGasProductionMmcfPerDay,

    beginningLiquidsProductionBblPerDay,

    years,

    endingGasProductionMmcfPerDay:
      currentGasProduction,

    endingLiquidsProductionBblPerDay:
      currentLiquidsProduction,
  };
}

// -----------------------------------------------------------------------------
// Single-Year Economic Projection
// -----------------------------------------------------------------------------

export interface CanadianGasEconomicYearInput {
  projectionYear: number;

  // Production
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  annualBaseDeclineRate: number;

  annualGasProductionAddedMmcfPerDay: number;
  annualLiquidsProductionAddedBblPerDay?: number;

  // Realized prices
  realizedGasPriceCadPerMcf: number;
  realizedLiquidsPriceCadPerBbl?: number;

  // Operating economics
  royaltiesCadPerMcfe: number;
  operatingCostCadPerMcfe: number;
  transportationCostCadPerMcfe: number;
  gAndACostCadPerMcfe: number;

  annualInterestExpenseCad?: number;
  cashTaxesCad?: number;

  // Capital spending
  sustainingCapexCad: number;
  growthCapexCad: number;

  // Beginning balance sheet
  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  // Capital allocation
  dividendsCad: number;
  shareBuybacksCad: number;
  debtRepaymentCad: number;

  averageBuybackPriceCad?: number;
}

export interface CanadianGasEconomicYearResult {
  projectionYear: number;

  production: CanadianGasProductionRollForwardResult;

  annualGasProductionMcf: number;
  annualLiquidsProductionBbl: number;
  annualProductionMcfe: number;

  gasRevenueCad: number;
  liquidsRevenueCad: number;
  totalRevenueCad: number;

  royaltiesCad: number;
  operatingCostsCad: number;
  transportationCostsCad: number;
  gAndACostsCad: number;

  interestExpenseCad: number;
  cashTaxesCad: number;

  operatingCashFlowBeforeCapexCad: number;

  sustainingCapexCad: number;
  growthCapexCad: number;
  totalCapexCad: number;

  cashFlowAfterSustainingCapexCad: number;
  freeCashFlowCad: number;

  dividendsCad: number;
  shareBuybacksCad: number;
  debtRepaymentCad: number;

  dividendPerBeginningShareCad: number;
  sharesRepurchased: number;

  residualCashFlowCad: number;

  beginningNetDebtCad: number;
  endingNetDebtCad: number;

  beginningDilutedShares: number;
  endingDilutedShares: number;
}

/**
 * Calculates one complete economic projection year.
 *
 * Production
 * -> Revenue
 * -> Operating cash flow
 * -> Capex
 * -> Free cash flow
 * -> Capital allocation
 * -> Balance-sheet roll-forward
 *
 * IMPORTANT:
 * Revenue currently uses ENDING annualized production as the
 * representative production rate for the projection year.
 *
 * This is a deliberate v1 simplification. A later refinement can
 * introduce average intra-year production when warranted.
 */
export function calculateEconomicProjectionYear(
  input: CanadianGasEconomicYearInput
): CanadianGasEconomicYearResult {
  if (
    !Number.isInteger(input.projectionYear) ||
    input.projectionYear <= 0
  ) {
    throw new Error(
      "Projection year must be a positive integer."
    );
  }

  const production =
    calculateProductionRollForward({
      beginningGasProductionMmcfPerDay:
        input.beginningGasProductionMmcfPerDay,

      beginningLiquidsProductionBblPerDay:
        input.beginningLiquidsProductionBblPerDay,

      annualBaseDeclineRate:
        input.annualBaseDeclineRate,

      annualGasProductionAddedMmcfPerDay:
        input.annualGasProductionAddedMmcfPerDay,

      annualLiquidsProductionAddedBblPerDay:
        input.annualLiquidsProductionAddedBblPerDay,
    });

  const revenue =
    calculateAnnualRevenue({
      gasProductionMmcfPerDay:
        production.endingGasProductionMmcfPerDay,

      realizedGasPriceCadPerMcf:
        input.realizedGasPriceCadPerMcf,

      liquidsProductionBblPerDay:
        production.endingLiquidsProductionBblPerDay,

      realizedLiquidsPriceCadPerBbl:
        input.realizedLiquidsPriceCadPerBbl,
    });

  const operatingCashFlow =
    calculateOperatingCashFlowBeforeCapex({
      totalRevenueCad:
        revenue.totalRevenueCad,

      annualGasProductionMcf:
        revenue.annualGasProductionMcf,

      annualLiquidsProductionBbl:
        revenue.annualLiquidsProductionBbl,

      royaltiesCadPerMcfe:
        input.royaltiesCadPerMcfe,

      operatingCostCadPerMcfe:
        input.operatingCostCadPerMcfe,

      transportationCostCadPerMcfe:
        input.transportationCostCadPerMcfe,

      gAndACostCadPerMcfe:
        input.gAndACostCadPerMcfe,

      annualInterestExpenseCad:
        input.annualInterestExpenseCad,

      cashTaxesCad:
        input.cashTaxesCad,
    });

  const freeCashFlow =
    calculateFreeCashFlow({
      operatingCashFlowBeforeCapexCad:
        operatingCashFlow.operatingCashFlowBeforeCapexCad,

      sustainingCapexCad:
        input.sustainingCapexCad,

      growthCapexCad:
        input.growthCapexCad,
    });

  const capitalAllocation =
    calculateCapitalAllocation({
      freeCashFlowCad:
        freeCashFlow.freeCashFlowCad,

      beginningNetDebtCad:
        input.beginningNetDebtCad,

      beginningDilutedShares:
        input.beginningDilutedShares,

      dividendsCad:
        input.dividendsCad,

      shareBuybacksCad:
        input.shareBuybacksCad,

      debtRepaymentCad:
        input.debtRepaymentCad,

      averageBuybackPriceCad:
        input.averageBuybackPriceCad,
    });

  const balanceSheet =
    calculateBalanceSheetRollForward({
      beginningNetDebtCad:
        input.beginningNetDebtCad,

      debtRepaymentCad:
        input.debtRepaymentCad,

      residualCashFlowCad:
        capitalAllocation.residualCashFlowCad,
    });

  return {
    projectionYear:
      input.projectionYear,

    production,

    annualGasProductionMcf:
      revenue.annualGasProductionMcf,

    annualLiquidsProductionBbl:
      revenue.annualLiquidsProductionBbl,

    annualProductionMcfe:
      operatingCashFlow.annualProductionMcfe,

    gasRevenueCad:
      revenue.gasRevenueCad,

    liquidsRevenueCad:
      revenue.liquidsRevenueCad,

    totalRevenueCad:
      revenue.totalRevenueCad,

    royaltiesCad:
      operatingCashFlow.royaltiesCad,

    operatingCostsCad:
      operatingCashFlow.operatingCostsCad,

    transportationCostsCad:
      operatingCashFlow.transportationCostsCad,

    gAndACostsCad:
      operatingCashFlow.gAndACostsCad,

    interestExpenseCad:
      operatingCashFlow.interestExpenseCad,

    cashTaxesCad:
      operatingCashFlow.cashTaxesCad,

    operatingCashFlowBeforeCapexCad:
      operatingCashFlow.operatingCashFlowBeforeCapexCad,

    sustainingCapexCad:
      freeCashFlow.sustainingCapexCad,

    growthCapexCad:
      freeCashFlow.growthCapexCad,

    totalCapexCad:
      freeCashFlow.totalCapexCad,

    cashFlowAfterSustainingCapexCad:
      freeCashFlow.cashFlowAfterSustainingCapexCad,

    freeCashFlowCad:
      freeCashFlow.freeCashFlowCad,

    dividendsCad:
      capitalAllocation.dividendsCad,

    shareBuybacksCad:
      capitalAllocation.shareBuybacksCad,

    debtRepaymentCad:
      capitalAllocation.debtRepaymentCad,

    dividendPerBeginningShareCad:
      capitalAllocation.dividendPerBeginningShareCad,

    sharesRepurchased:
      capitalAllocation.sharesRepurchased,

    residualCashFlowCad:
      capitalAllocation.residualCashFlowCad,

    beginningNetDebtCad:
      input.beginningNetDebtCad,

    endingNetDebtCad:
      balanceSheet.endingNetDebtCad,

    beginningDilutedShares:
      input.beginningDilutedShares,

    endingDilutedShares:
      capitalAllocation.endingDilutedShares,
  };
}

// -----------------------------------------------------------------------------
// Multi-Year Economic Projection
// -----------------------------------------------------------------------------

export interface CanadianGasEconomicYearAssumption {
  projectionYear: number;

  // Production
  annualBaseDeclineRate: number;

  annualGasProductionAddedMmcfPerDay: number;
  annualLiquidsProductionAddedBblPerDay?: number;

  // Realized prices
  realizedGasPriceCadPerMcf: number;
  realizedLiquidsPriceCadPerBbl?: number;

  // Operating economics
  royaltiesCadPerMcfe: number;
  operatingCostCadPerMcfe: number;
  transportationCostCadPerMcfe: number;
  gAndACostCadPerMcfe: number;

  annualInterestExpenseCad?: number;
  cashTaxesCad?: number;

  // Capital spending
  sustainingCapexCad: number;
  growthCapexCad: number;

  // Capital allocation
  dividendsCad: number;
  shareBuybacksCad: number;
  debtRepaymentCad: number;

  averageBuybackPriceCad?: number;
}

export interface CanadianGasMultiYearEconomicInput {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay?: number;

  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  years: CanadianGasEconomicYearAssumption[];
}

export interface CanadianGasMultiYearEconomicResult {
  beginningGasProductionMmcfPerDay: number;
  beginningLiquidsProductionBblPerDay: number;

  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  years: CanadianGasEconomicYearResult[];

  cumulativeFreeCashFlowCad: number;
  cumulativeDividendsCad: number;
  cumulativeDividendsPerBeginningShareCad: number;
  cumulativeShareBuybacksCad: number;
  cumulativeDebtRepaymentCad: number;

  endingGasProductionMmcfPerDay: number;
  endingLiquidsProductionBblPerDay: number;

  endingNetDebtCad: number;
  endingDilutedShares: number;
}

/**
 * Runs the complete economic model sequentially across
 * multiple projection years.
 *
 * The following state variables automatically roll forward:
 *
 * - ending gas production -> next year's beginning production
 * - ending liquids production -> next year's beginning production
 * - ending net debt -> next year's beginning net debt
 * - ending diluted shares -> next year's beginning shares
 *
 * Economic assumptions such as prices, costs, capex and
 * capital allocation remain explicit year-by-year inputs.
 */
export function calculateMultiYearEconomicProjection(
  input: CanadianGasMultiYearEconomicInput
): CanadianGasMultiYearEconomicResult {
  if (
    !Number.isFinite(
      input.beginningGasProductionMmcfPerDay
    )
  ) {
    throw new Error(
      "Beginning gas production must be a finite number."
    );
  }

  const beginningLiquidsProductionBblPerDay =
    input.beginningLiquidsProductionBblPerDay ?? 0;

  if (
    !Number.isFinite(
      beginningLiquidsProductionBblPerDay
    )
  ) {
    throw new Error(
      "Beginning liquids production must be a finite number."
    );
  }

  if (
    !Number.isFinite(input.beginningNetDebtCad)
  ) {
    throw new Error(
      "Beginning net debt must be a finite number."
    );
  }

  if (
    !Number.isFinite(input.beginningDilutedShares) ||
    input.beginningDilutedShares <= 0
  ) {
    throw new Error(
      "Beginning diluted shares must be a finite number greater than zero."
    );
  }

  if (input.years.length === 0) {
    throw new Error(
      "At least one economic projection year is required."
    );
  }

  let currentGasProduction =
    input.beginningGasProductionMmcfPerDay;

  let currentLiquidsProduction =
    beginningLiquidsProductionBblPerDay;

  let currentNetDebt =
    input.beginningNetDebtCad;

  let currentDilutedShares =
    input.beginningDilutedShares;

  let cumulativeFreeCashFlowCad = 0;
  let cumulativeDividendsCad = 0;
  let cumulativeShareBuybacksCad = 0;
  let cumulativeDebtRepaymentCad = 0;

  const years: CanadianGasEconomicYearResult[] = [];

  for (
    let index = 0;
    index < input.years.length;
    index += 1
  ) {
    const assumption = input.years[index];

    const expectedProjectionYear = index + 1;

    if (
      assumption.projectionYear !==
      expectedProjectionYear
    ) {
      throw new Error(
        `Economic projection years must be sequential starting at 1. Expected year ${expectedProjectionYear}, received ${assumption.projectionYear}.`
      );
    }

    const year =
      calculateEconomicProjectionYear({
        projectionYear:
          assumption.projectionYear,

        beginningGasProductionMmcfPerDay:
          currentGasProduction,

        beginningLiquidsProductionBblPerDay:
          currentLiquidsProduction,

        annualBaseDeclineRate:
          assumption.annualBaseDeclineRate,

        annualGasProductionAddedMmcfPerDay:
          assumption.annualGasProductionAddedMmcfPerDay,

        annualLiquidsProductionAddedBblPerDay:
          assumption.annualLiquidsProductionAddedBblPerDay,

        realizedGasPriceCadPerMcf:
          assumption.realizedGasPriceCadPerMcf,

        realizedLiquidsPriceCadPerBbl:
          assumption.realizedLiquidsPriceCadPerBbl,

        royaltiesCadPerMcfe:
          assumption.royaltiesCadPerMcfe,

        operatingCostCadPerMcfe:
          assumption.operatingCostCadPerMcfe,

        transportationCostCadPerMcfe:
          assumption.transportationCostCadPerMcfe,

        gAndACostCadPerMcfe:
          assumption.gAndACostCadPerMcfe,

        annualInterestExpenseCad:
          assumption.annualInterestExpenseCad,

        cashTaxesCad:
          assumption.cashTaxesCad,

        sustainingCapexCad:
          assumption.sustainingCapexCad,

        growthCapexCad:
          assumption.growthCapexCad,

        beginningNetDebtCad:
          currentNetDebt,

        beginningDilutedShares:
          currentDilutedShares,

        dividendsCad:
          assumption.dividendsCad,

        shareBuybacksCad:
          assumption.shareBuybacksCad,

        debtRepaymentCad:
          assumption.debtRepaymentCad,

        averageBuybackPriceCad:
          assumption.averageBuybackPriceCad,
      });

    years.push(year);

    cumulativeFreeCashFlowCad +=
      year.freeCashFlowCad;

    cumulativeDividendsCad +=
      year.dividendsCad;

    cumulativeShareBuybacksCad +=
      year.shareBuybacksCad;

    cumulativeDebtRepaymentCad +=
      year.debtRepaymentCad;

    currentGasProduction =
      year.production.endingGasProductionMmcfPerDay;

    currentLiquidsProduction =
      year.production.endingLiquidsProductionBblPerDay;

    currentNetDebt =
      year.endingNetDebtCad;

    currentDilutedShares =
      year.endingDilutedShares;
  }

  return {
    beginningGasProductionMmcfPerDay:
      input.beginningGasProductionMmcfPerDay,

    beginningLiquidsProductionBblPerDay,

    beginningNetDebtCad:
      input.beginningNetDebtCad,

    beginningDilutedShares:
      input.beginningDilutedShares,

    years,

    cumulativeFreeCashFlowCad,
    cumulativeDividendsCad,

    cumulativeDividendsPerBeginningShareCad:
      cumulativeDividendsCad /
      input.beginningDilutedShares,

    cumulativeShareBuybacksCad,
    cumulativeDebtRepaymentCad,

    endingGasProductionMmcfPerDay:
      currentGasProduction,

    endingLiquidsProductionBblPerDay:
      currentLiquidsProduction,

    endingNetDebtCad:
      currentNetDebt,

    endingDilutedShares:
      currentDilutedShares,
  };
}