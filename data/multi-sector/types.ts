/**
 * Phoenix Multi-Sector Architecture
 * Shared Domain Contract v1.0
 *
 * This file defines the common language between sector-specific
 * investment models and the Phoenix cross-asset / portfolio layers.
 *
 * IMPORTANT:
 * - Sector-specific fundamentals do NOT belong here.
 * - This file contains types only; no valuation logic.
 * - Existing Phoenix V2 functionality remains authoritative during migration.
 */

// -----------------------------------------------------------------------------
// Core classifications
// -----------------------------------------------------------------------------

export type InvestmentSector =
  | "precious-metals"
  | "uranium-nuclear"
  | "copper"
  | "natural-gas"
  | "oil"
  | "lithium"
  | "nickel"
  | "cobalt"
  | "coal"
  | "technology"
  | "quantum"
  | "semiconductors"
  | "dividend"
  | "other";

export type BusinessModel =
  | "producer"
  | "developer"
  | "explorer"
  | "producer-developer"
  | "resource-company"
  | "fuel-cycle-supplier"
  | "smr-developer"
  | "utility"
  | "industrial"
  | "technology-developer"
  | "dividend-growth"
  | "other";

export type ScenarioName = "failure" | "bear" | "base" | "bull";

export type ConfidenceLevel =
  | "very-low"
  | "low"
  | "medium-low"
  | "medium"
  | "medium-high"
  | "high"
  | "very-high";

export type PositionRiskCapacity =
  | "very-low"
  | "low"
  | "medium"
  | "high"
  | "very-high";

export type DataStatus =
  | "complete"
  | "partial"
  | "stale"
  | "estimated"
  | "insufficient"
  | "not-available";

export type AllocationStatus =
  | "below-ideal"
  | "ideal"
  | "above-ideal"
  | "above-hard-max"
  | "not-assessed";

export type PortfolioAdvice =
  | "strong-buy"
  | "buy"
  | "on-target"
  | "do-not-add"
  | "reduce"
  | "review"
  | "not-assessed";

// -----------------------------------------------------------------------------
// Identity
// -----------------------------------------------------------------------------

export interface InvestmentIdentity {
  companyId: string;
  name: string;
  ticker: string;

  currency: string;

  sector: InvestmentSector;
  businessModel: BusinessModel;

  /**
   * Short description of how shareholder value is expected
   * to be created, e.g.:
   * "Margin + Growth + LNG Repricing + Income"
   */
  valueCaptureMode?: string;

  /**
   * Sector model that produced the analysis.
   * Examples:
   * "PreciousMetals-v2-legacy"
   * "CanadianGasProducer-v1.0"
   * "UraniumDeveloper-v1.0"
   */
  modelVersion: string;

  /**
   * ISO date or timestamp representing the information cutoff.
   */
  dataAsOf: string;
}

// -----------------------------------------------------------------------------
// Sector assessment
// -----------------------------------------------------------------------------

export interface SectorAssessment {
  /**
   * Sector-specific quality assessment.
   * It is NOT intended to be compared mechanically across sectors.
   */
  sectorQuality?: number;

  sectorRank?: number;
  sectorUniverseSize?: number;

  strengths: string[];
  weaknesses: string[];
}

// -----------------------------------------------------------------------------
// Scenario distribution
// -----------------------------------------------------------------------------

export interface ScenarioValueRange {
  low?: number;
  mid: number;
  high?: number;
}

export interface ScenarioOutcome {
  scenario: ScenarioName;

  /**
   * Probability expressed from 0 to 1.
   */
  probability: number;

  /**
   * Total equity value in the investment's valuation currency.
   */
  equityValue?: number;

  /**
   * Expected diluted share count under this scenario.
   */
  dilutedShares?: number;

  /**
   * Scenario value per share.
   * A range is preserved to avoid false precision.
   */
  valuePerShare: ScenarioValueRange;

  /**
   * Cash distributions received per share during the scenario horizon.
   * Buybacks do NOT belong here; buybacks should affect dilutedShares.
   */
  cashDistributionsPerShare?: number;

  /**
   * Total shareholder value per share:
   * valuePerShare + relevant cash distributions.
   */
  shareholderValuePerShare?: ScenarioValueRange;

  /**
   * Expected number of years until material value realization.
   */
  realizationYears?: number;

  drivers: string[];
  criticalAssumptions: string[];
}

export interface ScenarioDistribution {
  failure: ScenarioOutcome;
  bear: ScenarioOutcome;
  base: ScenarioOutcome;
  bull: ScenarioOutcome;
}

// -----------------------------------------------------------------------------
// Value realization
// -----------------------------------------------------------------------------

export interface Catalyst {
  id?: string;
  type: string;
  description: string;

  /**
   * ISO date when known.
   */
  expectedDate?: string;

  impact?: "low" | "medium" | "high";
  confidence?: ConfidenceLevel;

  linkedScenarios?: ScenarioName[];
}

export interface ValueRealization {
  primaryCatalysts: Catalyst[];

  nextCatalyst?: Catalyst;

  /**
   * Optional cycle / realization window.
   * Not every business model has a conventional commodity cycle.
   */
  realizationWindowStart?: string;
  realizationWindowEnd?: string;

  timingConfidence: ConfidenceLevel;
}

// -----------------------------------------------------------------------------
// Confidence
// -----------------------------------------------------------------------------

export interface ConfidenceComponents {
  /**
   * Component scores use a 0-100 scale.
   *
   * Components may be unavailable during legacy migration or when a
   * sector model does not yet provide enough information to score them
   * responsibly.
   */
  dataQuality?: number;
  economicModelMaturity?: number;
  outcomeVisibility?: number;
  financingVisibility?: number;
  forecastReliability?: number;
}

export interface DataStatusEntry {
  key: string;
  status: DataStatus;
  note?: string;
}

export interface ConfidenceAssessment {
  components: ConfidenceComponents;

  /**
   * Overall valuation confidence score, 0-100.
   */
  valuationConfidenceScore?: number;
  valuationConfidence: ConfidenceLevel;

  timingConfidence: ConfidenceLevel;

  dataStatus: DataStatus;
  dataStatusDetails?: DataStatusEntry[];
}

// -----------------------------------------------------------------------------
// Cross-asset opportunity
// -----------------------------------------------------------------------------

export interface CrossAssetOpportunity {
  currentPrice: number;

  /**
   * Annual rates expressed as decimals.
   * Example: 0.086 = 8.6%.
   */
  riskFreeRate: number;
  equityOpportunityPremium: number;
  modelUncertaintyPremium: number;
  requiredReturn: number;

  /**
   * Probability-weighted future shareholder value before discounting.
   */
  expectedFutureValue?: number;

  /**
   * Common fixed-horizon opportunity threshold.
   */
  terminalOpportunityPrice?: number;

  /**
   * Scenario-timing-aware opportunity threshold.
   */
  cycleOpportunityPrice?: number;

  /**
   * Implied / expected annual opportunity above the required return.
   */
  terminalExcessOpportunity?: number;
  cycleExcessOpportunity?: number;

  /**
   * Opportunity-price margins versus the current market price.
   */
  terminalOpportunityMargin?: number;
  cycleOpportunityMargin?: number;
}

// -----------------------------------------------------------------------------
// Position risk
// -----------------------------------------------------------------------------

export interface PositionRiskComponents {
  /**
   * Component scores use a 0-100 scale.
   * Higher scores should consistently represent greater capacity/resilience.
   */
  severeDownside: number;
  balanceSheetSurvival: number;
  financingDilutionRisk: number;
  businessAssetResilience: number;
  liquidityTradability: number;
}

export interface PositionRiskAssessment {
  components: PositionRiskComponents;

  positionRiskCapacity: PositionRiskCapacity;

  /**
   * Return under the thesis-failure scenario versus current price.
   * Example: -0.48 = -48%.
   */
  failureLoss?: number;

  /**
   * Scenario-based probability of a negative shareholder outcome.
   * Expressed from 0 to 1.
   */
  probabilityOfCapitalLoss?: number;
}

// -----------------------------------------------------------------------------
// Portfolio context
// -----------------------------------------------------------------------------

export interface PortfolioContext {
  workspaceId: string;

  /**
   * Percentages expressed from 0 to 100 to remain compatible with
   * the existing Phoenix allocation-band convention.
   */
  currentAllocationPercent: number;
  sectorAllocationPercent?: number;
  correlatedExposurePercent?: number;

  /**
   * Portfolio-specific assessment. This must not alter the company's
   * underlying intrinsic economic analysis.
   */
  portfolioFit?: number;

  idealMin?: number;
  idealMax?: number;
  hardMax?: number;

  allocationStatus: AllocationStatus;
  advice: PortfolioAdvice;
}

// -----------------------------------------------------------------------------
// Provenance / reproducibility
// -----------------------------------------------------------------------------

export interface ManualOverride {
  field: string;

  originalValue?: unknown;
  overrideValue: unknown;

  reason: string;

  /**
   * ISO timestamp.
   */
  date: string;

  source?: "user" | "model" | "system";
}

export interface AnalysisProvenance {
  analysisId: string;

  modelVersion: string;

  /**
   * ISO timestamp at which the analysis was produced.
   */
  createdAt: string;

  /**
   * Information cutoff used by the analysis.
   */
  dataAsOf: string;

  sourceSnapshot?: string;
  assumptionSetVersion?: string;
  commodityScenarioVersion?: string;

  manualOverrides?: ManualOverride[];
}

// -----------------------------------------------------------------------------
// Complete shared result
// -----------------------------------------------------------------------------

export interface MultiSectorInvestmentResult {
  identity: InvestmentIdentity;

  sectorAssessment: SectorAssessment;

  scenarios?: ScenarioDistribution;

  valueRealization?: ValueRealization;

  confidence?: ConfidenceAssessment;

  /**
   * Filled by the Phoenix Cross-Asset Engine, not by a sector model.
   */
  crossAsset?: CrossAssetOpportunity;

  /**
   * Filled after economic valuation. It controls exposure, not intrinsic value.
   */
  positionRisk?: PositionRiskAssessment;

  /**
   * Workspace-specific and therefore optional on a global company analysis.
   */
  portfolioContext?: PortfolioContext;

  provenance: AnalysisProvenance;
}