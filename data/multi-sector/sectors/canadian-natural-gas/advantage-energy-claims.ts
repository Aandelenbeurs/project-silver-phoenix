/** Reviewed claims are transcriptions, NOT an audit of the issuer. */
export type ClaimUnit = "MMcf/d" | "bbl/d" | "CAD" | "shares" | "Bcf" | "CAD/Mcfe" | "CAD/Mcf" | "CAD/bbl" | "ratio";
export type ClaimKind = "reported" | "guidance" | "analyst-assumption";
export type ClaimStatus = "reviewed" | "pending";
export interface AdvantageClaim {
  claimId: string;
  metric: string;
  value: number;
  unit: ClaimUnit;
  asOf: string;
  kind: ClaimKind;
  sourceId: string;
  locator: string;
  status: ClaimStatus;
  scope: string;
}
/** Values and units checked against the uploaded Advantage Q2 2026 report. */
export const advantageClaims: readonly AdvantageClaim[] = [
  {claimId:"aav-q2-gas",metric:"historicalGasProduction",value:347.770,unit:"MMcf/d",asOf:"2026-06-30",kind:"reported",sourceId:"aav-q2-2026",locator:"Q2 report, operating highlights: natural gas 347,770 Mcf/d; divided by 1,000",status:"reviewed",scope:"Advantage Q2 quarterly average"},
  {claimId:"aav-q2-liquids",metric:"historicalLiquidsProduction",value:12650,unit:"bbl/d",asOf:"2026-06-30",kind:"reported",sourceId:"aav-q2-2026",locator:"Q2 report, operating highlights: liquids 12,650 bbl/d",status:"reviewed",scope:"Advantage Q2 quarterly average"},
  {claimId:"aav-q2-debt",metric:"historicalNetDebt",value:560248000,unit:"CAD",asOf:"2026-06-30",kind:"reported",sourceId:"aav-q2-2026",locator:"Q2 report, financial highlights: net debt 560,248 (CAD thousands)",status:"reviewed",scope:"Advantage excluding Entropy; non-IFRS"},
  {claimId:"aav-q2-diluted-wa",metric:"historicalDilutedWeightedAverageShares",value:179640000,unit:"shares",asOf:"2026-06-30",kind:"reported",sourceId:"aav-q2-2026",locator:"Q2 report, diluted weighted average shares 179,640 (thousands)",status:"reviewed",scope:"Q2 weighted average; NOT current fully diluted shares"},
];
export function findAdvantageClaim(id: string, claims: readonly AdvantageClaim[] = advantageClaims) {
  return claims.find(c => c.claimId === id);
}
