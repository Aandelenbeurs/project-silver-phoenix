export interface CanadianGasProducingAssetOptionsInput {
  // DCF of continuing production.
  continueProductionDcfCad: number;

  // Whether production can legally and operationally stop.
  canShutDown: boolean;

  // Present value of unavoidable costs if production stops.
  shutdownObligationsCad: number;
}

export interface CanadianGasProducingAssetOptionsResult {
  continueProductionValueCad: number;
  shutdownValueCad: number | null;

  selectedOption: "continue" | "shutdown";

  // May be negative: represents the selected net economic value.
  selectedNetValueCad: number;

  // Nonnegative asset component for the existing valuation engine.
  producingAssetValueCad: number;

  // Remaining negative component, kept separate.
  residualLiabilityCad: number;
}

export function calculateCanadianGasProducingAssetOptions(
  input: CanadianGasProducingAssetOptionsInput
): CanadianGasProducingAssetOptionsResult {
  const {
    continueProductionDcfCad,
    canShutDown,
    shutdownObligationsCad,
  } = input;

  if (
    !Number.isFinite(continueProductionDcfCad) ||
    !Number.isFinite(shutdownObligationsCad) ||
    shutdownObligationsCad < 0
  ) {
    throw new Error("Invalid producing asset option assumptions");
  }

  const shutdownValueCad = canShutDown
    ? -shutdownObligationsCad
    : null;

  const selectedOption =
    shutdownValueCad !== null &&
    shutdownValueCad > continueProductionDcfCad
      ? "shutdown"
      : "continue";

  const selectedNetValueCad =
    selectedOption === "shutdown"
      ? shutdownValueCad!
      : continueProductionDcfCad;

  return {
    continueProductionValueCad: continueProductionDcfCad,
    shutdownValueCad,
    selectedOption,
    selectedNetValueCad,

    producingAssetValueCad:
      Math.max(0, selectedNetValueCad),

    residualLiabilityCad:
      Math.max(0, -selectedNetValueCad),
  };
}