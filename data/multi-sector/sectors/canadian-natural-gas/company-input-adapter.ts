import type {
  CanadianGasEconomicSnapshot,
} from "./types";

import type {
  CanadianGasMultiYearEconomicInput,
} from "./scenario-engine";

import {
  validateCanadianGasCompanyData,
} from "./company-data-validation";

export type CanadianGasBeginningPosition =
  Pick<
    CanadianGasMultiYearEconomicInput,
    | "beginningGasProductionMmcfPerDay"
    | "beginningLiquidsProductionBblPerDay"
    | "beginningNetDebtCad"
    | "beginningDilutedShares"
  >;

export function adaptCanadianGasBeginningPosition(
  snapshot: CanadianGasEconomicSnapshot
): CanadianGasBeginningPosition {
  const validation =
    validateCanadianGasCompanyData(snapshot);

  if (!validation.valid) {
    throw new Error(
      `Invalid company data: ${validation.errors.join("; ")}`
    );
  }

  if (snapshot.identity.currency !== "CAD") {
    throw new Error(
      "Company input adapter currently requires CAD reporting currency"
    );
  }

  const netDebt = snapshot.balanceSheet.netDebt;
    const shares =
    snapshot.balanceSheet.dilutedSharesOutstanding;

  if (
    netDebt === undefined ||
    !Number.isFinite(netDebt)
  ) {
    throw new Error(
      "Verified beginning net debt is required"
    );
  }

  if (
    shares === undefined ||
    !Number.isFinite(shares) ||
    shares <= 0
  ) {
    throw new Error(
      "Verified beginning diluted shares are required"
    );
  }

  return {
    beginningGasProductionMmcfPerDay:
      snapshot.production.gasProductionMmcfPerDay,

    beginningLiquidsProductionBblPerDay:
      snapshot.production.liquidsProductionBblPerDay,

    beginningNetDebtCad: netDebt,
    beginningDilutedShares: shares,
  };
}