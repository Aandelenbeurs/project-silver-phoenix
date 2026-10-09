import type { Evidence } from "./advantage-energy-valuation-input";
import { advantageClaims, type AdvantageClaim, type ClaimUnit } from "./advantage-energy-claims";
import { advantageSources, type AdvantageSource } from "./advantage-energy-sources";

export interface ClaimCheck { valid: boolean; errors: string[] }
export interface ClaimRequest { metric: string; unit: ClaimUnit; evidence: Evidence<number> & { claimId?: string }; }
export function validateAdvantageClaim(
  request: ClaimRequest,
  claims: readonly AdvantageClaim[] = advantageClaims,
  sources: readonly AdvantageSource[] = advantageSources
): ClaimCheck {
  const errors: string[] = [];
  const { metric, unit, evidence } = request;
  if (!evidence.claimId) return { valid:false, errors:["Missing claimId"] };
  const matches = claims.filter(c => c.claimId === evidence.claimId);
  if (matches.length !== 1) return { valid:false, errors:["Claim ID missing or duplicated"] };
  const claim = matches[0];
  if (claim.status !== "reviewed") errors.push("Claim not reviewed");
  if (claim.metric !== metric) errors.push("Metric mismatch");
  if (claim.unit !== unit) errors.push("Unit mismatch");
  if (!Number.isFinite(evidence.value) || evidence.value !== claim.value) errors.push("Value mismatch");
  if (evidence.asOf !== claim.asOf) errors.push("Period mismatch");
  if (evidence.kind !== claim.kind) errors.push("Evidence kind mismatch");
  if (evidence.sourceId !== claim.sourceId) errors.push("Source mismatch");
  if (!claim.locator.trim() || !claim.scope.trim()) errors.push("Missing locator or scope");
  const sourceMatches = sources.filter(s => s.sourceId === claim.sourceId);
  if (sourceMatches.length !== 1) errors.push("Claim source missing or duplicated");
  return {valid: errors.length === 0, errors};
}
