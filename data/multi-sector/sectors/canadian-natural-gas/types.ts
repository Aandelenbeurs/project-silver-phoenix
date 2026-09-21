import type {
  ScenarioName,
} from "../../types";

// -----------------------------------------------------------------------------
// Canadian Natural Gas Engine
// Domain Contract v1
// -----------------------------------------------------------------------------

export type CanadianGasCompanyType =
  | "gas-producer"
  | "gas-liquids-producer"
  | "integrated-gas-producer";

export type CanadianGasBasin =
  | "montney"
  | "deep-basin"
  | "alberta"
  | "british-columbia"
  | "other";

export interface CanadianGasIdentity {
  companyId: string;
  companyName: string;
  ticker: string;
  currency: "CAD" | "USD";

  companyType: CanadianGasCompanyType;

  primaryBasin?: CanadianGasBasin;
  secondaryBasins?: CanadianGasBasin[];
}

// -----------------------------------------------------------------------------
// Production
// -----------------------------------------------------------------------------

export interface CanadianGasProduction {
  /**
   * Natural gas production in MMcf/d.
   */
  gasProductionMmcfPerDay: number;

  /**
   * Liquids production in barrels per day.
   */
  liquidsProductionBblPerDay?: number;

  /**
   * Annual production growth assumption.
   * Decimal: 0.05 = 5%.
   */
  annualProductionGrowth?: number;
}

// -----------------------------------------------------------------------------
// Resource / Inventory
// -----------------------------------------------------------------------------

export interface CanadianGasInventory {
  /**
   * Remaining drilling inventory expressed as approximate years
   * at the current development pace.
   */
  inventoryLifeYears?: number;

  /**
   * Optional qualitative description for resources that cannot yet
   * be represented reliably as a numeric inventory-life estimate.
   */
  inventoryNotes?: string;
}

// -----------------------------------------------------------------------------
// Market Access
// -----------------------------------------------------------------------------

export interface CanadianGasMarketAccess {
  /**
   * Approximate percentage of gas volumes exposed directly or
   * indirectly to AECO pricing.
   *
   * Decimal: 0.70 = 70%.
   */
  aecoExposure?: number;

  /**
   * Percentage exposed to non-AECO North American benchmarks,
   * transport arrangements or diversified sales points.
   */
  diversifiedNorthAmericanExposure?: number;

  /**
   * Percentage economically exposed to LNG-linked pricing or
   * LNG export market access.
   */
  lngLinkedExposure?: number;

  notes?: string;
}

// -----------------------------------------------------------------------------
// Balance Sheet
// -----------------------------------------------------------------------------

export interface CanadianGasBalanceSheet {
  netDebt?: number;

  /**
   * Net debt / cash flow or comparable leverage measure.
   * Kept explicit because source definitions may differ by company.
   */
  leverageRatio?: number;

  sharesOutstanding?: number;
}

// -----------------------------------------------------------------------------
// Scenario assumptions
// -----------------------------------------------------------------------------

export interface CanadianGasScenarioAssumptions {
  scenario: ScenarioName;

  /**
   * AECO gas price assumption in CAD/GJ.
   */
  aecoPriceCadPerGj?: number;

  /**
   * Realized corporate gas price after market access,
   * transport, hedging and basis effects.
   */
  realizedGasPriceCadPerMcf?: number;

  /**
   * Realized liquids price where economically material.
   */
  realizedLiquidsPriceCadPerBbl?: number;

  /**
   * Expected realization time for this scenario.
   */
  realizationYears: number;
}

// -----------------------------------------------------------------------------
// Operating Economics
// -----------------------------------------------------------------------------

export interface CanadianGasOperatingEconomics {
  /**
   * Royalties per Mcfe of production.
   */
  royaltiesCadPerMcfe?: number;

  /**
   * Operating costs per Mcfe.
   */
  operatingCostCadPerMcfe?: number;

  /**
   * Transportation costs per Mcfe.
   */
  transportationCostCadPerMcfe?: number;

  /**
   * General and administrative costs per Mcfe.
   */
  gAndACostCadPerMcfe?: number;

  /**
   * Interest and financing costs where useful for scenario modelling.
   */
  annualInterestExpenseCad?: number;
}

// -----------------------------------------------------------------------------
// Decline and Capital Requirements
// -----------------------------------------------------------------------------

export interface CanadianGasCapitalModel {
  /**
   * Approximate corporate production decline before new drilling.
   * Decimal: 0.30 = 30% annual decline.
   */
  baseDeclineRate?: number;

  /**
   * Annual capital required approximately to maintain current production.
   */
  sustainingCapexCad?: number;

  /**
   * Additional annual capital allocated to production growth.
   */
  growthCapexCad?: number;

  /**
   * Total expected capital spending when a source reports only
   * consolidated capital guidance.
   */
  totalCapexCad?: number;
}

// -----------------------------------------------------------------------------
// Cash Flow
// -----------------------------------------------------------------------------

export interface CanadianGasCashFlow {
  /**
   * Operating cash flow before capital expenditures.
   */
  operatingCashFlowCad?: number;

  /**
   * Free cash flow after sustaining and growth capital.
   */
  freeCashFlowCad?: number;

  /**
   * Cash taxes where economically material.
   */
  cashTaxesCad?: number;
}

// -----------------------------------------------------------------------------
// Capital Allocation
// -----------------------------------------------------------------------------

export interface CanadianGasCapitalAllocation {
  /**
   * Expected annual cash dividends.
   */
  dividendsCad?: number;

  /**
   * Expected annual share repurchases.
   *
   * IMPORTANT:
   * Buybacks affect future diluted share count.
   * They are not shareholder cash distributions in the scenario engine.
   */
  shareBuybacksCad?: number;

  /**
   * Expected annual debt repayment.
   */
  debtRepaymentCad?: number;

  /**
   * Other discretionary capital allocation.
   */
  otherCapitalAllocationCad?: number;
}

// -----------------------------------------------------------------------------
// Company Economic Snapshot
// -----------------------------------------------------------------------------

export interface CanadianGasEconomicSnapshot {
  identity: CanadianGasIdentity;

  production: CanadianGasProduction;
  inventory: CanadianGasInventory;
  marketAccess: CanadianGasMarketAccess;
  balanceSheet: CanadianGasBalanceSheet;

  operatingEconomics: CanadianGasOperatingEconomics;
  capitalModel: CanadianGasCapitalModel;

  cashFlow?: CanadianGasCashFlow;
  capitalAllocation?: CanadianGasCapitalAllocation;

  /**
   * Date to which the company fundamentals relate.
   * ISO date: YYYY-MM-DD.
   */
  dataAsOf: string;

  /**
   * Optional notes for source-specific definitions or assumptions.
   */
  notes?: string[];
}

// -----------------------------------------------------------------------------
// Scenario Economic Output
// -----------------------------------------------------------------------------

export interface CanadianGasScenarioEconomics {
  scenario: ScenarioName;

  /**
   * Scenario probability.
   * Decimal: 0.25 = 25%.
   */
  probability: number;

  /**
   * Expected realization time for this scenario.
   */
  realizationYears: number;

  // ---------------------------------------------------------------------------
  // Operating outcome
  // ---------------------------------------------------------------------------

  gasProductionMmcfPerDay?: number;
  liquidsProductionBblPerDay?: number;

  realizedGasPriceCadPerMcf?: number;
  realizedLiquidsPriceCadPerBbl?: number;

  annualRevenueCad?: number;
  operatingCashFlowCad?: number;

  sustainingCapexCad?: number;
  growthCapexCad?: number;
  freeCashFlowCad?: number;

  // ---------------------------------------------------------------------------
  // Capital allocation during scenario horizon
  // ---------------------------------------------------------------------------

  /**
   * Cumulative cash dividends paid per share during the
   * scenario realization period.
   */
  cumulativeDividendsPerShareCad?: number;

  /**
   * Expected diluted shares outstanding at scenario realization.
   *
   * Buybacks and dilution are reflected here rather than being
   * treated as cash distributions.
   */
  dilutedSharesAtRealization?: number;

  // ---------------------------------------------------------------------------
  // Balance sheet at realization
  // ---------------------------------------------------------------------------

  netDebtAtRealizationCad?: number;

  // ---------------------------------------------------------------------------
  // Remaining asset value
  // ---------------------------------------------------------------------------

  /**
   * Value of producing assets remaining at realization.
   */
  producingAssetValueCad?: number;

  /**
   * Risked value of booked undeveloped inventory.
   */
  undevelopedInventoryValueCad?: number;

  /**
   * Haircut value assigned to longer-dated or unbooked optionality.
   */
  unbookedOptionalityValueCad?: number;

  /**
   * Other material assets not captured above.
   */
  otherAssetValueCad?: number;

  // ---------------------------------------------------------------------------
  // Equity / shareholder value
  // ---------------------------------------------------------------------------

  /**
   * Equity value at scenario realization before adding cumulative
   * cash distributions to Total Shareholder Value.
   */
  equityValueCad?: number;

  /**
   * Equity value per diluted share at realization.
   */
  equityValuePerShareCad?: number;

  /**
   * Total Shareholder Value per share:
   *
   * equityValuePerShareCad
   * + cumulativeDividendsPerShareCad
   *
   * Buybacks must NOT be added here separately.
   */
  totalShareholderValuePerShareCad?: number;

  // ---------------------------------------------------------------------------
  // Explanation
  // ---------------------------------------------------------------------------

  drivers?: string[];
  criticalAssumptions?: string[];
}