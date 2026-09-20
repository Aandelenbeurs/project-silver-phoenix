import type {
  PhoenixCompanyV2,
  PhoenixConfidence,
  PhoenixDataStatus,
} from "../../phoenix-v2";

import type {
  Company,
  CompanyStage,
} from "../../companies";

import type {
  BusinessModel,
  ConfidenceLevel,
  DataStatus,
  MultiSectorInvestmentResult,
} from "../types";

import {
  createAnalysisProvenance,
} from "../provenance";

// -----------------------------------------------------------------------------
// Legacy Precious Metals Adapter
// -----------------------------------------------------------------------------
//
// Purpose:
// Translate reliable existing Phoenix V2 precious-metals data into the
// Multi-Sector contract without changing the existing Phoenix V2 engine.
//
// IMPORTANT:
// - This is a one-way adapter.
// - Legacy Opportunity Score is NOT Cross-Asset Opportunity.
// - Legacy masterScore / tier / status are intentionally ignored.
// - No economic scenario values are invented.
// - No Position Risk Capacity is invented.
// - Portfolio allocation bands may be preserved, but workspace-specific
//   allocation/advice are not created here.
// -----------------------------------------------------------------------------

export const PRECIOUS_METALS_LEGACY_MODEL_VERSION =
  "PreciousMetals-v2-legacy";

// -----------------------------------------------------------------------------
// Mapping helpers
// -----------------------------------------------------------------------------

function mapBusinessModel(
  stage?: CompanyStage
): BusinessModel {
  switch (stage) {
    case "producer":
      return "producer";

    case "developer":
      return "developer";

    case "explorer":
      return "explorer";

    case "hybrid":
      return "producer-developer";

    case "non-miner":
    default:
      return "other";
  }
}

function mapConfidence(
  confidence: PhoenixConfidence
): ConfidenceLevel {
  switch (confidence) {
    case "high":
      return "high";

    case "medium":
      return "medium";

    case "low":
      return "low";
  }
}

function mapDataStatus(
  status: PhoenixDataStatus
): DataStatus {
  switch (status) {
    case "complete":
      return "complete";

    case "valuation-stale":
      return "stale";

    case "research-needed":
      return "insufficient";

    case "review":
      return "partial";
  }
}

// -----------------------------------------------------------------------------
// Adapter input
// -----------------------------------------------------------------------------

export interface PreciousMetalsLegacyAdapterInput {
  company: Company;
  phoenix: PhoenixCompanyV2;

  /**
   * Currency of the primary valuation / market-price representation.
   *
   * Phoenix V2 does not currently own this field, so the caller must provide
   * it explicitly rather than the adapter guessing from ticker or exchange.
   */
  currency: string;

  /**
   * ISO date or timestamp representing the information cutoff.
   */
  dataAsOf: string;

  sourceSnapshot?: string;
}

// -----------------------------------------------------------------------------
// Adapter
// -----------------------------------------------------------------------------

export function adaptPreciousMetalsLegacy(
  input: PreciousMetalsLegacyAdapterInput
): MultiSectorInvestmentResult {
  const {
    company,
    phoenix,
    currency,
    dataAsOf,
    sourceSnapshot,
  } = input;

  if (company.id !== phoenix.companyId) {
    throw new Error(
      `Precious Metals adapter company mismatch: "${company.id}" !== "${phoenix.companyId}".`
    );
  }

  const provenance = createAnalysisProvenance({
    modelVersion: PRECIOUS_METALS_LEGACY_MODEL_VERSION,
    dataAsOf,
    sourceSnapshot,
  });

  return {
    identity: {
      companyId: company.id,
      name: company.name,
      ticker: company.ticker,

      currency,

      sector: "precious-metals",
      businessModel: mapBusinessModel(company.stage),

      valueCaptureMode: "Legacy Phoenix V2 precious-metals model",

      modelVersion: PRECIOUS_METALS_LEGACY_MODEL_VERSION,
      dataAsOf,
    },

    sectorAssessment: {
      /**
       * Phoenix V2 Quality is semantically close enough to preserve as
       * sector-specific quality.
       *
       * Opportunity is deliberately NOT mapped here because it combines
       * quality, growth, leverage, valuation, catalysts and risk penalty.
       */
      sectorQuality:
        phoenix.scores.quality ?? undefined,

      strengths: [],
      weaknesses: [],
    },

    confidence: {
     /**
 * Legacy Phoenix confidence has only three levels and does not contain
 * the five Multi-Sector Confidence Engine components.
 *
 * We preserve the legacy confidence level, but deliberately leave the
 * new component scores and valuationConfidenceScore unavailable.
 * Unknown data must remain unknown during migration.
 */
      components: {},

valuationConfidence:
  mapConfidence(phoenix.scores.confidence),

      timingConfidence:
        mapConfidence(phoenix.scores.confidence),

      dataStatus:
        mapDataStatus(phoenix.scores.dataStatus),

      dataStatusDetails: [
        {
          key: "legacy-phoenix-v2",
          status:
            mapDataStatus(phoenix.scores.dataStatus),
          note:
            "Legacy adapter: Multi-Sector confidence components are not yet economically modelled.",
        },
      ],
    },

    /**
     * Intentionally absent:
     *
     * scenarios
     * crossAsset
     * positionRisk
     * portfolioContext
     *
     * Phoenix V2 does not yet provide enough information to populate these
     * according to the new Multi-Sector economic definitions.
     */

    provenance,
  };
}