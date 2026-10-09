
export type EvidenceKind =
  | "reported"
  | "guidance"
  | "analyst-assumption";

export interface Evidence<T> {
  value: T;
  kind: EvidenceKind;
  asOf: string;
  sourceId: string;
}

export interface AdvantageValuationInput {
  companyId: "advantage-energy";

  postSaleGasProductionMmcfPerDay?: Evidence<number>;
  postSaleLiquidsProductionBblPerDay?: Evidence<number>;

  postSaleNetDebtCad?: Evidence<number>;
  currentFullyDilutedShares?: Evidence<number>;

  adjustedProvedGasReservesBcf?: Evidence<number>;
  adjustedProvedPlusProbableGasReservesBcf?: Evidence<number>;

  forwardEconomics?: {
    declineRate: Evidence<number>;
    annualCapitalExpenditureCad: Evidence<number>;
    operatingCostCadPerMcfe: Evidence<number>;
    transportationCostCadPerMcfe: Evidence<number>;
    gasPriceCadPerMcf: Evidence<number>;
    liquidsPriceCadPerBbl: Evidence<number>;
  };
}

export const advantageValuationInput: AdvantageValuationInput = {
  companyId: "advantage-energy",

  // Intentionally empty:
  // Q2 historical figures are not post-sale actuals.
  // Management guidance is not a reported actual.
  // Missing reserve adjustments must not be estimated
  // from Mboe without the correct gas/liquids split.
};
