import type {
  CanadianGasEconomicSnapshot,
} from "./types";

export interface CanadianGasValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateCanadianGasCompanyData(
  snapshot: CanadianGasEconomicSnapshot
): CanadianGasValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const checkNonNegative = (
    value: number | undefined,
    field: string
  ) => {
    if (
      value !== undefined &&
      (!Number.isFinite(value) || value < 0)
    ) {
      errors.push(`${field} must be finite and non-negative`);
    }
  };

  // Production
  checkNonNegative(
    snapshot.production.gasProductionMmcfPerDay,
    "production.gasProductionMmcfPerDay"
  );

  checkNonNegative(
    snapshot.production.liquidsProductionBblPerDay,
    "production.liquidsProductionBblPerDay"
  );

  // Reserves
  const reserves = snapshot.reportedReserves;

  if (reserves) {
    checkNonNegative(
      reserves.provedGasReservesBcf,
      "reportedReserves.provedGasReservesBcf"
    );

    checkNonNegative(
      reserves.provedPlusProbableGasReservesBcf,
      "reportedReserves.provedPlusProbableGasReservesBcf"
    );

    if (
      reserves.provedGasReservesBcf !== undefined &&
      reserves.provedPlusProbableGasReservesBcf !== undefined &&
      reserves.provedPlusProbableGasReservesBcf <
        reserves.provedGasReservesBcf
    ) {
      errors.push(
        "2P gas reserves cannot be smaller than 1P gas reserves"
      );
    }
  } else {
    warnings.push("No reported gas reserves available");
  }

  // Balance sheet
  checkNonNegative(
    snapshot.balanceSheet.sharesOutstanding,
    "balanceSheet.sharesOutstanding"
  );

  if (
    snapshot.balanceSheet.sharesOutstanding === 0
  ) {
    errors.push("Shares outstanding must be greater than zero");
  }

  if (
    snapshot.balanceSheet.netDebt !== undefined &&
    !Number.isFinite(snapshot.balanceSheet.netDebt)
  ) {
    errors.push("Net debt must be finite");
  }

  // Data sources
  if (!snapshot.sources || snapshot.sources.length === 0) {
    warnings.push("No supporting data sources provided");
  } else {
    const sourceIds = new Set<string>();

    for (const source of snapshot.sources) {
      if (!source.sourceId.trim()) {
        errors.push("Source ID cannot be empty");
      }

      if (sourceIds.has(source.sourceId)) {
        errors.push(`Duplicate source ID: ${source.sourceId}`);
      }

      sourceIds.add(source.sourceId);

      if (!source.title.trim()) {
        errors.push(`Source ${source.sourceId} has no title`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}