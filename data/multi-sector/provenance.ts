import type {
  AnalysisProvenance,
  ManualOverride,
} from "./types";

// -----------------------------------------------------------------------------
// Analysis ID
// -----------------------------------------------------------------------------

function createAnalysisId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return [
    "analysis",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");
}

// -----------------------------------------------------------------------------
// Provenance creation
// -----------------------------------------------------------------------------

export interface CreateProvenanceInput {
  modelVersion: string;

  /**
   * ISO date or timestamp representing the information cutoff.
   */
  dataAsOf: string;

  sourceSnapshot?: string;
  assumptionSetVersion?: string;
  commodityScenarioVersion?: string;

  manualOverrides?: ManualOverride[];

  /**
   * Primarily useful for importing historical analyses or deterministic tests.
   * Normally Phoenix should generate these automatically.
   */
  analysisId?: string;
  createdAt?: string;
}

export function createAnalysisProvenance(
  input: CreateProvenanceInput
): AnalysisProvenance {
  return {
    analysisId: input.analysisId ?? createAnalysisId(),
    modelVersion: input.modelVersion,
    createdAt: input.createdAt ?? new Date().toISOString(),
    dataAsOf: input.dataAsOf,

    sourceSnapshot: input.sourceSnapshot,
    assumptionSetVersion: input.assumptionSetVersion,
    commodityScenarioVersion: input.commodityScenarioVersion,

    manualOverrides:
      input.manualOverrides && input.manualOverrides.length > 0
        ? [...input.manualOverrides]
        : undefined,
  };
}

// -----------------------------------------------------------------------------
// Manual overrides
// -----------------------------------------------------------------------------

export interface CreateManualOverrideInput {
  field: string;

  originalValue?: unknown;
  overrideValue: unknown;

  reason: string;

  source?: ManualOverride["source"];

  /**
   * Optional so historical overrides can preserve their original timestamp.
   */
  date?: string;
}

export function createManualOverride(
  input: CreateManualOverrideInput
): ManualOverride {
  return {
    field: input.field,
    originalValue: input.originalValue,
    overrideValue: input.overrideValue,
    reason: input.reason,
    date: input.date ?? new Date().toISOString(),
    source: input.source ?? "user",
  };
}

export function addManualOverride(
  provenance: AnalysisProvenance,
  override: ManualOverride
): AnalysisProvenance {
  return {
    ...provenance,
    manualOverrides: [
      ...(provenance.manualOverrides ?? []),
      override,
    ],
  };
}