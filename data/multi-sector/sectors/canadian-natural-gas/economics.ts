// -----------------------------------------------------------------------------
// Canadian Natural Gas Engine
// Core Economic Calculations v1
// -----------------------------------------------------------------------------

const DAYS_PER_YEAR = 365;

/**
 * Converts average daily natural gas production in MMcf/d
 * to annual production in Mcf.
 *
 * 1 MMcf = 1,000 Mcf
 */
export function calculateAnnualGasProductionMcf(
  gasProductionMmcfPerDay: number
): number {
  if (!Number.isFinite(gasProductionMmcfPerDay)) {
    throw new Error(
      "Gas production must be a finite number."
    );
  }

  if (gasProductionMmcfPerDay < 0) {
    throw new Error(
      "Gas production cannot be negative."
    );
  }

  return (
    gasProductionMmcfPerDay *
    1_000 *
    DAYS_PER_YEAR
  );
}

/**
 * Converts average daily liquids production in barrels/day
 * to annual barrels.
 */
export function calculateAnnualLiquidsProductionBbl(
  liquidsProductionBblPerDay: number
): number {
  if (!Number.isFinite(liquidsProductionBblPerDay)) {
    throw new Error(
      "Liquids production must be a finite number."
    );
  }

  if (liquidsProductionBblPerDay < 0) {
    throw new Error(
      "Liquids production cannot be negative."
    );
  }

  return (
    liquidsProductionBblPerDay *
    DAYS_PER_YEAR
  );
}

// -----------------------------------------------------------------------------
// Revenue
// -----------------------------------------------------------------------------

export interface CanadianGasRevenueInput {
  gasProductionMmcfPerDay: number;
  realizedGasPriceCadPerMcf: number;

  liquidsProductionBblPerDay?: number;
  realizedLiquidsPriceCadPerBbl?: number;
}

export interface CanadianGasRevenueResult {
  annualGasProductionMcf: number;
  annualLiquidsProductionBbl: number;

  gasRevenueCad: number;
  liquidsRevenueCad: number;

  totalRevenueCad: number;
}

/**
 * Calculates annual upstream revenue from natural gas and liquids.
 *
 * IMPORTANT:
 * This uses realized corporate prices, not AECO directly.
 * AECO-to-realized-price modelling belongs upstream in the
 * market-access/scenario layer.
 */
export function calculateAnnualRevenue(
  input: CanadianGasRevenueInput
): CanadianGasRevenueResult {
  if (!Number.isFinite(input.realizedGasPriceCadPerMcf)) {
    throw new Error(
      "Realized gas price must be a finite number."
    );
  }

  if (input.realizedGasPriceCadPerMcf < 0) {
    throw new Error(
      "Realized gas price cannot be negative."
    );
  }

  const annualGasProductionMcf =
    calculateAnnualGasProductionMcf(
      input.gasProductionMmcfPerDay
    );

  const annualLiquidsProductionBbl =
    calculateAnnualLiquidsProductionBbl(
      input.liquidsProductionBblPerDay ?? 0
    );

  const liquidsPrice =
    input.realizedLiquidsPriceCadPerBbl ?? 0;

  if (!Number.isFinite(liquidsPrice)) {
    throw new Error(
      "Realized liquids price must be a finite number."
    );
  }

  if (liquidsPrice < 0) {
    throw new Error(
      "Realized liquids price cannot be negative."
    );
  }

  const gasRevenueCad =
    annualGasProductionMcf *
    input.realizedGasPriceCadPerMcf;

  const liquidsRevenueCad =
    annualLiquidsProductionBbl *
    liquidsPrice;

  return {
    annualGasProductionMcf,
    annualLiquidsProductionBbl,
    gasRevenueCad,
    liquidsRevenueCad,
    totalRevenueCad:
      gasRevenueCad +
      liquidsRevenueCad,
  };
}

// -----------------------------------------------------------------------------
// Production Equivalency
// -----------------------------------------------------------------------------

const MCFE_PER_BBL = 6;

/**
 * Converts annual liquids production to Mcfe using the conventional
 * 6 Mcf-equivalent per barrel energy conversion.
 *
 * IMPORTANT:
 * Mcfe is an energy-equivalent reporting unit.
 * It must not be interpreted as a price equivalency.
 */
export function calculateAnnualProductionMcfe(
  annualGasProductionMcf: number,
  annualLiquidsProductionBbl: number
): number {
  if (!Number.isFinite(annualGasProductionMcf)) {
    throw new Error(
      "Annual gas production must be a finite number."
    );
  }

  if (!Number.isFinite(annualLiquidsProductionBbl)) {
    throw new Error(
      "Annual liquids production must be a finite number."
    );
  }

  if (annualGasProductionMcf < 0) {
    throw new Error(
      "Annual gas production cannot be negative."
    );
  }

  if (annualLiquidsProductionBbl < 0) {
    throw new Error(
      "Annual liquids production cannot be negative."
    );
  }

  return (
    annualGasProductionMcf +
    annualLiquidsProductionBbl *
      MCFE_PER_BBL
  );
}

// -----------------------------------------------------------------------------
// Operating Cash Flow Before Capex
// -----------------------------------------------------------------------------

export interface CanadianGasOperatingCashFlowInput {
  totalRevenueCad: number;

  annualGasProductionMcf: number;
  annualLiquidsProductionBbl: number;

  royaltiesCadPerMcfe: number;
  operatingCostCadPerMcfe: number;
  transportationCostCadPerMcfe: number;
  gAndACostCadPerMcfe: number;

  annualInterestExpenseCad?: number;
  cashTaxesCad?: number;
}

export interface CanadianGasOperatingCashFlowResult {
  annualProductionMcfe: number;

  royaltiesCad: number;
  operatingCostsCad: number;
  transportationCostsCad: number;
  gAndACostsCad: number;

  interestExpenseCad: number;
  cashTaxesCad: number;

  operatingCashFlowBeforeCapexCad: number;
}

/**
 * Calculates simplified annual operating cash flow before capital spending.
 *
 * Revenue
 * - royalties
 * - operating costs
 * - transportation
 * - G&A
 * - interest
 * - cash taxes
 * = operating cash flow before capex
 */
export function calculateOperatingCashFlowBeforeCapex(
  input: CanadianGasOperatingCashFlowInput
): CanadianGasOperatingCashFlowResult {
  const numericInputs = [
    ["Total revenue", input.totalRevenueCad],
    ["Royalties per Mcfe", input.royaltiesCadPerMcfe],
    ["Operating cost per Mcfe", input.operatingCostCadPerMcfe],
    ["Transportation cost per Mcfe", input.transportationCostCadPerMcfe],
    ["G&A cost per Mcfe", input.gAndACostCadPerMcfe],
    ["Interest expense", input.annualInterestExpenseCad ?? 0],
    ["Cash taxes", input.cashTaxesCad ?? 0],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }

    if (value < 0) {
      throw new Error(
        `${label} cannot be negative.`
      );
    }
  }

  const annualProductionMcfe =
    calculateAnnualProductionMcfe(
      input.annualGasProductionMcf,
      input.annualLiquidsProductionBbl
    );

  const royaltiesCad =
    annualProductionMcfe *
    input.royaltiesCadPerMcfe;

  const operatingCostsCad =
    annualProductionMcfe *
    input.operatingCostCadPerMcfe;

  const transportationCostsCad =
    annualProductionMcfe *
    input.transportationCostCadPerMcfe;

  const gAndACostsCad =
    annualProductionMcfe *
    input.gAndACostCadPerMcfe;

  const interestExpenseCad =
    input.annualInterestExpenseCad ?? 0;

  const cashTaxesCad =
    input.cashTaxesCad ?? 0;

  const operatingCashFlowBeforeCapexCad =
    input.totalRevenueCad -
    royaltiesCad -
    operatingCostsCad -
    transportationCostsCad -
    gAndACostsCad -
    interestExpenseCad -
    cashTaxesCad;

  return {
    annualProductionMcfe,
    royaltiesCad,
    operatingCostsCad,
    transportationCostsCad,
    gAndACostsCad,
    interestExpenseCad,
    cashTaxesCad,
    operatingCashFlowBeforeCapexCad,
  };
}

// -----------------------------------------------------------------------------
// Free Cash Flow
// -----------------------------------------------------------------------------

export interface CanadianGasFreeCashFlowInput {
  operatingCashFlowBeforeCapexCad: number;

  /**
   * Capital required approximately to maintain current production.
   */
  sustainingCapexCad: number;

  /**
   * Additional capital allocated to production growth.
   */
  growthCapexCad: number;
}

export interface CanadianGasFreeCashFlowResult {
  operatingCashFlowBeforeCapexCad: number;

  sustainingCapexCad: number;
  growthCapexCad: number;
  totalCapexCad: number;

  /**
   * Cash flow remaining after both sustaining and growth capital.
   *
   * This is before discretionary capital allocation such as
   * dividends, buybacks and debt repayment.
   */
  freeCashFlowCad: number;

  /**
   * Cash generation after sustaining capital only.
   *
   * Useful for distinguishing maintenance economics from
   * discretionary growth spending.
   */
  cashFlowAfterSustainingCapexCad: number;
}

/**
 * Converts operating cash flow before capex into free cash flow.
 *
 * OCF before capex
 * - sustaining capex
 * = cash flow after sustaining capex
 *
 * cash flow after sustaining capex
 * - growth capex
 * = free cash flow
 */
export function calculateFreeCashFlow(
  input: CanadianGasFreeCashFlowInput
): CanadianGasFreeCashFlowResult {
  const numericInputs = [
    [
      "Operating cash flow before capex",
      input.operatingCashFlowBeforeCapexCad,
    ],
    [
      "Sustaining capex",
      input.sustainingCapexCad,
    ],
    [
      "Growth capex",
      input.growthCapexCad,
    ],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }
  }

  if (input.sustainingCapexCad < 0) {
    throw new Error(
      "Sustaining capex cannot be negative."
    );
  }

  if (input.growthCapexCad < 0) {
    throw new Error(
      "Growth capex cannot be negative."
    );
  }

  const cashFlowAfterSustainingCapexCad =
    input.operatingCashFlowBeforeCapexCad -
    input.sustainingCapexCad;

  const totalCapexCad =
    input.sustainingCapexCad +
    input.growthCapexCad;

  const freeCashFlowCad =
    input.operatingCashFlowBeforeCapexCad -
    totalCapexCad;

  return {
    operatingCashFlowBeforeCapexCad:
      input.operatingCashFlowBeforeCapexCad,

    sustainingCapexCad:
      input.sustainingCapexCad,

    growthCapexCad:
      input.growthCapexCad,

    totalCapexCad,

    cashFlowAfterSustainingCapexCad,

    freeCashFlowCad,
  };
}

// -----------------------------------------------------------------------------
// Capital Allocation
// -----------------------------------------------------------------------------

export interface CanadianGasCapitalAllocationInput {
  freeCashFlowCad: number;

  beginningNetDebtCad: number;
  beginningDilutedShares: number;

  dividendsCad: number;
  shareBuybacksCad: number;
  debtRepaymentCad: number;

  /**
   * Average price paid per share for repurchases.
   * Required when shareBuybacksCad > 0.
   */
  averageBuybackPriceCad?: number;
}

export interface CanadianGasCapitalAllocationResult {
  freeCashFlowCad: number;

  dividendsCad: number;
  shareBuybacksCad: number;
  debtRepaymentCad: number;

  totalCapitalAllocatedCad: number;
  residualCashFlowCad: number;

  sharesRepurchased: number;

  endingDilutedShares: number;
  netDebtAfterExplicitRepaymentCad: number;

  dividendPerBeginningShareCad: number;
}

/**
 * Applies discretionary capital allocation to free cash flow.
 *
 * IMPORTANT:
 *
 * Dividends are shareholder cash distributions.
 *
 * Buybacks are NOT shareholder cash distributions in the
 * scenario valuation. Their economic effect is represented
 * through the lower diluted share count.
 *
 * Debt repayment reduces net debt.
 */
export function calculateCapitalAllocation(
  input: CanadianGasCapitalAllocationInput
): CanadianGasCapitalAllocationResult {
  const numericInputs = [
    ["Free cash flow", input.freeCashFlowCad],
    ["Beginning net debt", input.beginningNetDebtCad],
    ["Beginning diluted shares", input.beginningDilutedShares],
    ["Dividends", input.dividendsCad],
    ["Share buybacks", input.shareBuybacksCad],
    ["Debt repayment", input.debtRepaymentCad],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }
  }

  if (input.beginningDilutedShares <= 0) {
    throw new Error(
      "Beginning diluted shares must be greater than zero."
    );
  }

  if (input.dividendsCad < 0) {
    throw new Error(
      "Dividends cannot be negative."
    );
  }

  if (input.shareBuybacksCad < 0) {
    throw new Error(
      "Share buybacks cannot be negative."
    );
  }

  if (input.debtRepaymentCad < 0) {
    throw new Error(
      "Debt repayment cannot be negative."
    );
  }

  let sharesRepurchased = 0;

  if (input.shareBuybacksCad > 0) {
    if (
      input.averageBuybackPriceCad === undefined ||
      !Number.isFinite(input.averageBuybackPriceCad) ||
      input.averageBuybackPriceCad <= 0
    ) {
      throw new Error(
        "A positive finite average buyback price is required when share buybacks are greater than zero."
      );
    }

    sharesRepurchased =
      input.shareBuybacksCad /
      input.averageBuybackPriceCad;
  }

  if (
    sharesRepurchased >
    input.beginningDilutedShares
  ) {
    throw new Error(
      "Share buybacks cannot repurchase more shares than are outstanding."
    );
  }

  const totalCapitalAllocatedCad =
    input.dividendsCad +
    input.shareBuybacksCad +
    input.debtRepaymentCad;

  const residualCashFlowCad =
    input.freeCashFlowCad -
    totalCapitalAllocatedCad;

  const endingDilutedShares =
    input.beginningDilutedShares -
    sharesRepurchased;

  const netDebtAfterExplicitRepaymentCad =
  input.beginningNetDebtCad -
  input.debtRepaymentCad;

  const dividendPerBeginningShareCad =
    input.dividendsCad /
    input.beginningDilutedShares;

  return {
    freeCashFlowCad:
      input.freeCashFlowCad,

    dividendsCad:
      input.dividendsCad,

    shareBuybacksCad:
      input.shareBuybacksCad,

    debtRepaymentCad:
      input.debtRepaymentCad,

    totalCapitalAllocatedCad,
    residualCashFlowCad,

    sharesRepurchased,
    endingDilutedShares,
    netDebtAfterExplicitRepaymentCad,

    dividendPerBeginningShareCad,
  };
}

// -----------------------------------------------------------------------------
// Balance Sheet Roll-Forward
// -----------------------------------------------------------------------------

export interface CanadianGasBalanceSheetRollForwardInput {
  beginningNetDebtCad: number;

  /**
   * Explicit debt repayment already included in capital allocation.
   */
  debtRepaymentCad: number;

  /**
   * Cash remaining after dividends, buybacks and explicit debt repayment.
   *
   * Positive residual cash reduces net debt.
   * Negative residual cash increases net debt.
   */
  residualCashFlowCad: number;
}

export interface CanadianGasBalanceSheetRollForwardResult {
  beginningNetDebtCad: number;
  debtRepaymentCad: number;
  residualCashFlowCad: number;

  netDebtAfterExplicitRepaymentCad: number;
  endingNetDebtCad: number;
}

/**
 * Rolls net debt forward after capital allocation.
 *
 * beginning net debt
 * - explicit debt repayment
 * - residual cash flow
 * = ending net debt
 *
 * A negative ending net debt value represents a net cash position.
 */
export function calculateBalanceSheetRollForward(
  input: CanadianGasBalanceSheetRollForwardInput
): CanadianGasBalanceSheetRollForwardResult {
  const numericInputs = [
    [
      "Beginning net debt",
      input.beginningNetDebtCad,
    ],
    [
      "Debt repayment",
      input.debtRepaymentCad,
    ],
    [
      "Residual cash flow",
      input.residualCashFlowCad,
    ],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }
  }

  if (input.debtRepaymentCad < 0) {
    throw new Error(
      "Debt repayment cannot be negative."
    );
  }

  const netDebtAfterExplicitRepaymentCad =
    input.beginningNetDebtCad -
    input.debtRepaymentCad;

  const endingNetDebtCad =
    netDebtAfterExplicitRepaymentCad -
    input.residualCashFlowCad;

  return {
    beginningNetDebtCad:
      input.beginningNetDebtCad,

    debtRepaymentCad:
      input.debtRepaymentCad,

    residualCashFlowCad:
      input.residualCashFlowCad,

    netDebtAfterExplicitRepaymentCad,
    endingNetDebtCad,
  };
}

// -----------------------------------------------------------------------------
// Remaining Asset Value / Total Shareholder Value
// -----------------------------------------------------------------------------

export interface CanadianGasShareholderValueInput {
  producingAssetValueCad: number;
  undevelopedInventoryValueCad: number;
  unbookedOptionalityValueCad: number;
  otherAssetValueCad: number;

  netDebtCad: number;
  dilutedShares: number;

  /**
   * Cash dividends received by one share over the scenario horizon.
   *
   * Buybacks are deliberately excluded here because their economic
   * effect is already reflected in the diluted share count.
   */
  cumulativeDividendsPerShareCad: number;
}

export interface CanadianGasShareholderValueResult {
  grossAssetValueCad: number;

  producingAssetValueCad: number;
  undevelopedInventoryValueCad: number;
  unbookedOptionalityValueCad: number;
  otherAssetValueCad: number;

  netDebtCad: number;

  equityValueCad: number;
  dilutedShares: number;
  equityValuePerShareCad: number;

  cumulativeDividendsPerShareCad: number;

  totalShareholderValuePerShareCad: number;
}

/**
 * Converts remaining asset value into equity value and total
 * shareholder value per share.
 *
 * Producing Asset Value
 * + Risked Undeveloped Inventory
 * + Unbooked Optionality
 * + Other Assets
 * - Net Debt
 * = Equity Value
 *
 * Equity Value / Diluted Shares
 * = Equity Value per Share
 *
 * + Cumulative Dividends per Share
 * = Total Shareholder Value per Share
 *
 * IMPORTANT:
 * Net debt may be negative. Negative net debt represents net cash
 * and therefore increases equity value.
 *
 * Buybacks must NOT be added as shareholder distributions here.
 * Their effect is already captured through dilutedShares.
 */
export function calculateShareholderValue(
  input: CanadianGasShareholderValueInput
): CanadianGasShareholderValueResult {
  const numericInputs = [
    [
      "Producing asset value",
      input.producingAssetValueCad,
    ],
    [
      "Undeveloped inventory value",
      input.undevelopedInventoryValueCad,
    ],
    [
      "Unbooked optionality value",
      input.unbookedOptionalityValueCad,
    ],
    [
      "Other asset value",
      input.otherAssetValueCad,
    ],
    [
      "Net debt",
      input.netDebtCad,
    ],
    [
      "Diluted shares",
      input.dilutedShares,
    ],
    [
      "Cumulative dividends per share",
      input.cumulativeDividendsPerShareCad,
    ],
  ] as const;

  for (const [label, value] of numericInputs) {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} must be a finite number.`
      );
    }
  }

  if (input.producingAssetValueCad < 0) {
    throw new Error(
      "Producing asset value cannot be negative."
    );
  }

  if (input.undevelopedInventoryValueCad < 0) {
    throw new Error(
      "Undeveloped inventory value cannot be negative."
    );
  }

  if (input.unbookedOptionalityValueCad < 0) {
    throw new Error(
      "Unbooked optionality value cannot be negative."
    );
  }

  if (input.otherAssetValueCad < 0) {
    throw new Error(
      "Other asset value cannot be negative."
    );
  }

  if (input.dilutedShares <= 0) {
    throw new Error(
      "Diluted shares must be greater than zero."
    );
  }

  if (input.cumulativeDividendsPerShareCad < 0) {
    throw new Error(
      "Cumulative dividends per share cannot be negative."
    );
  }

  const grossAssetValueCad =
    input.producingAssetValueCad +
    input.undevelopedInventoryValueCad +
    input.unbookedOptionalityValueCad +
    input.otherAssetValueCad;

  const equityValueCad =
    grossAssetValueCad -
    input.netDebtCad;

  const equityValuePerShareCad =
    equityValueCad /
    input.dilutedShares;

  const totalShareholderValuePerShareCad =
    equityValuePerShareCad +
    input.cumulativeDividendsPerShareCad;

  return {
    grossAssetValueCad,

    producingAssetValueCad:
      input.producingAssetValueCad,

    undevelopedInventoryValueCad:
      input.undevelopedInventoryValueCad,

    unbookedOptionalityValueCad:
      input.unbookedOptionalityValueCad,

    otherAssetValueCad:
      input.otherAssetValueCad,

    netDebtCad:
      input.netDebtCad,

    equityValueCad,
    dilutedShares:
      input.dilutedShares,

    equityValuePerShareCad,

    cumulativeDividendsPerShareCad:
  input.cumulativeDividendsPerShareCad,

    totalShareholderValuePerShareCad,
  };
}