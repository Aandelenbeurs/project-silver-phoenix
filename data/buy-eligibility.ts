import {
  type ThesisHealth,
  type ExitStatus,
} from "./exit-engine";

export type BuyEligibilityInput = {
  companyId: string;

  investmentScore:
    | number
    | null;

  exitStatus:
    | ExitStatus
    | null;

  exitPressureScore:
    | number
    | null;

  thesisHealth:
    | ThesisHealth
    | null;

  estimatedCompanyUpsidePercent:
    | number
    | null;

  marketHeatScore:
    | number
    | null;
};

export type BuyEligibilityResult = {
  eligible: boolean;

  requiresReview: boolean;

  penalty: number;

  reason: string | null;
};

export function evaluateBuyEligibility(
  input: BuyEligibilityInput,
): BuyEligibilityResult {
  /**
   * Fundamenteel kapot/verzwakkend:
   * geen nieuw geld.
   */
  if (
    input.thesisHealth === "BROKEN" ||
    input.thesisHealth === "WEAKENING"
  ) {
    return {
      eligible: false,
      requiresReview: false,
      penalty: 0,
      reason:
        "Investment thesis is weakening or broken.",
    };
  }

  /**
   * Phoenix wil positie al afbouwen:
   * geen nieuw geld.
   */
  if (
    input.exitStatus === "TRIM" ||
    input.exitStatus === "SCALE_OUT" ||
    input.exitStatus === "EXIT"
  ) {
    return {
      eligible: false,
      requiresReview: false,
      penalty: 0,
      reason:
        `Phoenix Exit Strategy status is ${input.exitStatus}.`,
    };
  }

  /**
   * Te weinig resterende company-upside:
   * geen nieuwe allocatie.
   */
  if (
    input.estimatedCompanyUpsidePercent != null &&
    input.estimatedCompanyUpsidePercent < 50
  ) {
    return {
      eligible: false,
      requiresReview: false,
      penalty: 0,
      reason:
        "Estimated company upside is below 50%.",
    };
  }

  /**
   * HOLD / WATCH / REVIEW / UNKNOWN:
   * optimizer mag normaal zijn werk doen.
   */
  return {
    eligible: true,
    requiresReview: false,
    penalty: 0,
    reason: null,
  };
}
