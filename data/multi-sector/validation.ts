import type {
  ConfidenceAssessment,
  CrossAssetOpportunity,
  MultiSectorInvestmentResult,
  PortfolioContext,
  PositionRiskAssessment,
  ScenarioDistribution,
  ScenarioName,
  ScenarioOutcome,
} from "./types";

// -----------------------------------------------------------------------------
// Validation result
// -----------------------------------------------------------------------------

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

const EPSILON = 0.000001;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNumberBetween(
  value: number,
  min: number,
  max: number
): boolean {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function approximatelyEqual(
  left: number,
  right: number,
  tolerance = EPSILON
): boolean {
  return Math.abs(left - right) <= tolerance;
}

// -----------------------------------------------------------------------------
// Scenario validation
// -----------------------------------------------------------------------------

function validateScenarioOutcome(
  expectedScenario: ScenarioName,
  outcome: ScenarioOutcome,
  errors: ValidationIssue[]
): void {
  const prefix = `scenarios.${expectedScenario}`;

  if (outcome.scenario !== expectedScenario) {
    errors.push({
      field: `${prefix}.scenario`,
      message: `Expected scenario "${expectedScenario}" but received "${outcome.scenario}".`,
    });
  }

  if (!isNumberBetween(outcome.probability, 0, 1)) {
    errors.push({
      field: `${prefix}.probability`,
      message: "Scenario probability must be a finite number between 0 and 1.",
    });
  }

  if (!isFiniteNumber(outcome.valuePerShare.mid)) {
    errors.push({
      field: `${prefix}.valuePerShare.mid`,
      message: "Scenario midpoint value per share must be a finite number.",
    });
  }

  if (
    outcome.valuePerShare.low !== undefined &&
    !isFiniteNumber(outcome.valuePerShare.low)
  ) {
    errors.push({
      field: `${prefix}.valuePerShare.low`,
      message: "Scenario low value per share must be a finite number.",
    });
  }

  if (
    outcome.valuePerShare.high !== undefined &&
    !isFiniteNumber(outcome.valuePerShare.high)
  ) {
    errors.push({
      field: `${prefix}.valuePerShare.high`,
      message: "Scenario high value per share must be a finite number.",
    });
  }

  if (
    outcome.valuePerShare.low !== undefined &&
    outcome.valuePerShare.low > outcome.valuePerShare.mid
  ) {
    errors.push({
      field: `${prefix}.valuePerShare`,
      message: "Scenario low value cannot exceed the midpoint value.",
    });
  }

  if (
    outcome.valuePerShare.high !== undefined &&
    outcome.valuePerShare.high < outcome.valuePerShare.mid
  ) {
    errors.push({
      field: `${prefix}.valuePerShare`,
      message: "Scenario high value cannot be below the midpoint value.",
    });
  }

  if (
    outcome.equityValue !== undefined &&
    !isFiniteNumber(outcome.equityValue)
  ) {
    errors.push({
      field: `${prefix}.equityValue`,
      message: "Equity value must be a finite number.",
    });
  }

  if (
    outcome.dilutedShares !== undefined &&
    (!isFiniteNumber(outcome.dilutedShares) || outcome.dilutedShares <= 0)
  ) {
    errors.push({
      field: `${prefix}.dilutedShares`,
      message: "Diluted share count must be a finite number greater than zero.",
    });
  }

  if (
    outcome.cashDistributionsPerShare !== undefined &&
    !isFiniteNumber(outcome.cashDistributionsPerShare)
  ) {
    errors.push({
      field: `${prefix}.cashDistributionsPerShare`,
      message: "Cash distributions per share must be a finite number.",
    });
  }

  if (
    outcome.realizationYears !== undefined &&
    (!isFiniteNumber(outcome.realizationYears) ||
      outcome.realizationYears < 0)
  ) {
    errors.push({
      field: `${prefix}.realizationYears`,
      message: "Realization years must be a finite non-negative number.",
    });
  }
}

function validateScenarios(
  scenarios: ScenarioDistribution,
  errors: ValidationIssue[]
): void {
  validateScenarioOutcome("failure", scenarios.failure, errors);
  validateScenarioOutcome("bear", scenarios.bear, errors);
  validateScenarioOutcome("base", scenarios.base, errors);
  validateScenarioOutcome("bull", scenarios.bull, errors);

  const totalProbability =
    scenarios.failure.probability +
    scenarios.bear.probability +
    scenarios.base.probability +
    scenarios.bull.probability;

  if (
    !isFiniteNumber(totalProbability) ||
    !approximatelyEqual(totalProbability, 1)
  ) {
    errors.push({
      field: "scenarios",
      message: `Scenario probabilities must total 1.00. Received ${totalProbability}.`,
    });
  }
}

// -----------------------------------------------------------------------------
// Confidence validation
// -----------------------------------------------------------------------------

function validateConfidence(
  confidence: ConfidenceAssessment,
  errors: ValidationIssue[]
): void {
  const components = confidence.components;

  const componentEntries: Array<[string, number]> = [
    ["dataQuality", components.dataQuality],
    ["economicModelMaturity", components.economicModelMaturity],
    ["outcomeVisibility", components.outcomeVisibility],
    ["financingVisibility", components.financingVisibility],
    ["forecastReliability", components.forecastReliability],
  ];

  for (const [key, value] of componentEntries) {
    if (!isNumberBetween(value, 0, 100)) {
      errors.push({
        field: `confidence.components.${key}`,
        message: "Confidence component must be between 0 and 100.",
      });
    }
  }

  if (!isNumberBetween(confidence.valuationConfidenceScore, 0, 100)) {
    errors.push({
      field: "confidence.valuationConfidenceScore",
      message: "Valuation confidence score must be between 0 and 100.",
    });
  }
}

// -----------------------------------------------------------------------------
// Cross-asset validation
// -----------------------------------------------------------------------------

function validateCrossAsset(
  crossAsset: CrossAssetOpportunity,
  errors: ValidationIssue[]
): void {
  const finiteFields: Array<[string, number | undefined]> = [
    ["currentPrice", crossAsset.currentPrice],
    ["riskFreeRate", crossAsset.riskFreeRate],
    ["equityOpportunityPremium", crossAsset.equityOpportunityPremium],
    ["modelUncertaintyPremium", crossAsset.modelUncertaintyPremium],
    ["requiredReturn", crossAsset.requiredReturn],
    ["expectedFutureValue", crossAsset.expectedFutureValue],
    ["terminalOpportunityPrice", crossAsset.terminalOpportunityPrice],
    ["cycleOpportunityPrice", crossAsset.cycleOpportunityPrice],
    ["terminalExcessOpportunity", crossAsset.terminalExcessOpportunity],
    ["cycleExcessOpportunity", crossAsset.cycleExcessOpportunity],
    ["terminalOpportunityMargin", crossAsset.terminalOpportunityMargin],
    ["cycleOpportunityMargin", crossAsset.cycleOpportunityMargin],
  ];

  for (const [key, value] of finiteFields) {
    if (value !== undefined && !isFiniteNumber(value)) {
      errors.push({
        field: `crossAsset.${key}`,
        message: "Cross-asset value must be a finite number.",
      });
    }
  }

  if (crossAsset.currentPrice <= 0) {
    errors.push({
      field: "crossAsset.currentPrice",
      message: "Current price must be greater than zero.",
    });
  }

  const expectedRequiredReturn =
    crossAsset.riskFreeRate +
    crossAsset.equityOpportunityPremium +
    crossAsset.modelUncertaintyPremium;

  if (
    isFiniteNumber(expectedRequiredReturn) &&
    isFiniteNumber(crossAsset.requiredReturn) &&
    !approximatelyEqual(
      expectedRequiredReturn,
      crossAsset.requiredReturn,
      0.000001
    )
  ) {
    errors.push({
      field: "crossAsset.requiredReturn",
      message:
        "Required return must equal risk-free rate + equity opportunity premium + model uncertainty premium.",
    });
  }
}

function validatePositionRisk(
  positionRisk: PositionRiskAssessment,
  errors: ValidationIssue[]
): void {
  const components = positionRisk.components;

  const componentEntries: Array<[string, number]> = [
    ["severeDownside", components.severeDownside],
    ["balanceSheetSurvival", components.balanceSheetSurvival],
    ["financingDilutionRisk", components.financingDilutionRisk],
    ["businessAssetResilience", components.businessAssetResilience],
    ["liquidityTradability", components.liquidityTradability],
  ];

  for (const [key, value] of componentEntries) {
    if (!isNumberBetween(value, 0, 100)) {
      errors.push({
        field: `positionRisk.components.${key}`,
        message: "Position-risk component must be between 0 and 100.",
      });
    }
  }

  if (
    positionRisk.failureLoss !== undefined &&
    !isFiniteNumber(positionRisk.failureLoss)
  ) {
    errors.push({
      field: "positionRisk.failureLoss",
      message: "Failure loss must be a finite number.",
    });
  }

  if (
    positionRisk.probabilityOfCapitalLoss !== undefined &&
    !isNumberBetween(positionRisk.probabilityOfCapitalLoss, 0, 1)
  ) {
    errors.push({
      field: "positionRisk.probabilityOfCapitalLoss",
      message: "Probability of capital loss must be between 0 and 1.",
    });
  }
}

// -----------------------------------------------------------------------------
// Portfolio-context validation
// -----------------------------------------------------------------------------

function validatePortfolioContext(
  portfolio: PortfolioContext,
  errors: ValidationIssue[]
): void {
  if (!isNonEmptyString(portfolio.workspaceId)) {
    errors.push({
      field: "portfolioContext.workspaceId",
      message: "Workspace ID is required.",
    });
  }

  if (
    !isFiniteNumber(portfolio.currentAllocationPercent) ||
    portfolio.currentAllocationPercent < 0
  ) {
    errors.push({
      field: "portfolioContext.currentAllocationPercent",
      message: "Current allocation must be a finite non-negative number.",
    });
  }

  const { idealMin, idealMax, hardMax } = portfolio;

  if (
    idealMin !== undefined &&
    (!isFiniteNumber(idealMin) || idealMin < 0)
  ) {
    errors.push({
      field: "portfolioContext.idealMin",
      message: "idealMin must be a finite non-negative number.",
    });
  }

  if (
    idealMax !== undefined &&
    (!isFiniteNumber(idealMax) || idealMax < 0)
  ) {
    errors.push({
      field: "portfolioContext.idealMax",
      message: "idealMax must be a finite non-negative number.",
    });
  }

  if (
    hardMax !== undefined &&
    (!isFiniteNumber(hardMax) || hardMax < 0)
  ) {
    errors.push({
      field: "portfolioContext.hardMax",
      message: "hardMax must be a finite non-negative number.",
    });
  }

  if (
    idealMin !== undefined &&
    idealMax !== undefined &&
    idealMin > idealMax
  ) {
    errors.push({
      field: "portfolioContext",
      message: "Allocation bands must satisfy idealMin <= idealMax.",
    });
  }

  if (
    idealMax !== undefined &&
    hardMax !== undefined &&
    idealMax > hardMax
  ) {
    errors.push({
      field: "portfolioContext",
      message: "Allocation bands must satisfy idealMax <= hardMax.",
    });
  }

  if (
    idealMin !== undefined &&
    hardMax !== undefined &&
    idealMin > hardMax
  ) {
    errors.push({
      field: "portfolioContext",
      message: "Allocation bands must satisfy idealMin <= hardMax.",
    });
  }
}

// -----------------------------------------------------------------------------
// Complete contract validation
// -----------------------------------------------------------------------------

export function validateMultiSectorInvestmentResult(
  result: MultiSectorInvestmentResult
): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!isNonEmptyString(result.identity.companyId)) {
    errors.push({
      field: "identity.companyId",
      message: "Company ID is required.",
    });
  }

  if (!isNonEmptyString(result.identity.name)) {
    errors.push({
      field: "identity.name",
      message: "Company name is required.",
    });
  }

  if (!isNonEmptyString(result.identity.ticker)) {
    errors.push({
      field: "identity.ticker",
      message: "Ticker is required.",
    });
  }

  if (!isNonEmptyString(result.identity.currency)) {
    errors.push({
      field: "identity.currency",
      message: "Currency is required.",
    });
  }

  if (!isNonEmptyString(result.identity.modelVersion)) {
    errors.push({
      field: "identity.modelVersion",
      message: "Identity model version is required.",
    });
  }

  if (!isNonEmptyString(result.identity.dataAsOf)) {
    errors.push({
      field: "identity.dataAsOf",
      message: "Identity dataAsOf is required.",
    });
  }

  if (!isNonEmptyString(result.provenance.analysisId)) {
    errors.push({
      field: "provenance.analysisId",
      message: "Analysis ID is required.",
    });
  }

  if (!isNonEmptyString(result.provenance.modelVersion)) {
    errors.push({
      field: "provenance.modelVersion",
      message: "Provenance model version is required.",
    });
  }

  if (!isNonEmptyString(result.provenance.createdAt)) {
    errors.push({
      field: "provenance.createdAt",
      message: "Analysis creation timestamp is required.",
    });
  }

  if (!isNonEmptyString(result.provenance.dataAsOf)) {
    errors.push({
      field: "provenance.dataAsOf",
      message: "Provenance dataAsOf is required.",
    });
  }

  if (result.identity.modelVersion !== result.provenance.modelVersion) {
    warnings.push({
      field: "provenance.modelVersion",
      message:
        "Identity and provenance model versions differ. Confirm that this is intentional.",
    });
  }

  if (result.identity.dataAsOf !== result.provenance.dataAsOf) {
    warnings.push({
      field: "provenance.dataAsOf",
      message:
        "Identity and provenance dataAsOf values differ. Confirm that this is intentional.",
    });
  }

  if (
    result.sectorAssessment.sectorQuality !== undefined &&
    !isNumberBetween(result.sectorAssessment.sectorQuality, 0, 100)
  ) {
    errors.push({
      field: "sectorAssessment.sectorQuality",
      message: "Sector quality must be between 0 and 100.",
    });
  }

  if (result.scenarios) {
    validateScenarios(result.scenarios, errors);
  }

  if (result.confidence) {
    validateConfidence(result.confidence, errors);
  }

   if (result.crossAsset) {
    validateCrossAsset(result.crossAsset, errors);
  }

  if (result.positionRisk) {
    validatePositionRisk(result.positionRisk, errors);
  }

  if (result.portfolioContext) {
    validatePortfolioContext(result.portfolioContext, errors);
  }

  if (!result.scenarios && result.crossAsset) {
    warnings.push({
      field: "crossAsset",
      message:
        "Cross-asset opportunity exists without a scenario distribution. Confirm that the valuation source supports this.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}