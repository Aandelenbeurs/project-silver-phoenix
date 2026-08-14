export type PortfolioAdviceV2 =
  | "STERK BIJKOPEN"
  | "BIJKOPEN"
  | "OP DOEL"
  | "NIET BIJKOPEN"
  | "AFBOUWEN"
  | "NOG BEOORDELEN";

export function determinePortfolioAdviceV2({
  currentAllocation,
  idealMin,
  idealMax,
  hardMax,
  investmentScore,
}: {
  currentAllocation: number | null;
  idealMin: number | null;
  idealMax: number | null;
  hardMax: number | null;
  investmentScore: number | null;
}): PortfolioAdviceV2 {
  if (
    currentAllocation === null ||
    idealMin === null ||
    idealMax === null ||
    hardMax === null ||
    investmentScore === null
  ) {
    return "NOG BEOORDELEN";
  }

  if (currentAllocation > hardMax) {
    return "AFBOUWEN";
  }

  if (currentAllocation > idealMax) {
    return "NIET BIJKOPEN";
  }

  if (
    currentAllocation >= idealMin &&
    currentAllocation <= idealMax
  ) {
    return "OP DOEL";
  }

  if (investmentScore >= 90) {
    return "STERK BIJKOPEN";
  }

  if (investmentScore >= 85) {
    return "BIJKOPEN";
  }

  return "NIET BIJKOPEN";
}