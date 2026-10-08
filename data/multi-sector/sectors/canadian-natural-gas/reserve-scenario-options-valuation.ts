
import {
  calculateMultiYearEconomicProjection,
} from "./scenario-engine";

import type {
  CanadianGasScenarioValuationResult,
} from "./scenario-engine";

import {
  calculateCanadianGasRemainingAssetBridge,
} from "./remaining-asset-bridge";

import {
  calculateCanadianGasProducingAssetValuationBridge,
} from "./producing-asset-valuation-bridge";

import type {
  CanadianGasReserveScenarioValuationInput,
} from "./reserve-scenario-valuation";

export function calculateCanadianGasReserveScenarioOptionsValuation(
  input: CanadianGasReserveScenarioValuationInput
) {
  if (!input.producingAssetOptions) {
    throw new Error(
      "Explicit producing asset options are required"
    );
  }

  const economicProjection =
    calculateMultiYearEconomicProjection(
      input.valuation.economicProjection
    );

  const reserveBridge =
    calculateCanadianGasRemainingAssetBridge({
      beginningReservesBcf: input.beginningReservesBcf,
      economicProjection,
      remainingAssetDiscountRate:
        input.remainingAssetDiscountRate,
      remainingAssetYears: input.remainingAssetYears,
    });

  const optionsBridge =
    calculateCanadianGasProducingAssetValuationBridge({
      continueProductionDcfCad:
        reserveBridge.remainingAssetValueCad,

      canShutDown:
        input.producingAssetOptions.canShutDown,

      shutdownObligationsCad:
        input.producingAssetOptions.shutdownObligationsCad,

      undevelopedInventoryValueCad:
        input.valuation.undevelopedInventoryValueCad,

      unbookedOptionalityValueCad:
        input.valuation.unbookedOptionalityValueCad,

      otherAssetValueCad:
        input.valuation.otherAssetValueCad,

      netDebtCad:
        economicProjection.endingNetDebtCad,

      dilutedShares:
        economicProjection.endingDilutedShares,

      cumulativeDividendsPerShareCad:
        economicProjection.cumulativeDividendsPerShareCad,
    });

  const { unadjusted, adjustment, options } =
    optionsBridge;

  const valuation: CanadianGasScenarioValuationResult = {
    economicProjection,

    producingAssetValueCad:
      options.producingAssetValueCad,

    undevelopedInventoryValueCad:
      input.valuation.undevelopedInventoryValueCad,

    unbookedOptionalityValueCad:
      input.valuation.unbookedOptionalityValueCad,

    otherAssetValueCad:
      input.valuation.otherAssetValueCad,

    grossAssetValueCad:
      unadjusted.grossAssetValueCad,

    endingNetDebtCad:
      economicProjection.endingNetDebtCad,

    endingDilutedShares:
      economicProjection.endingDilutedShares,

    equityValueCad:
      adjustment.adjustedEquityValueCad,

    equityValuePerShareCad:
      adjustment.adjustedEquityValuePerShareCad,

    cumulativeDividendsPerShareCad:
      economicProjection.cumulativeDividendsPerShareCad,

    totalShareholderValuePerShareCad:
      adjustment.adjustedTotalShareholderValuePerShareCad,
  };

  return {
    valuation,
    remainingReservesBcf:
      reserveBridge.remainingReservesBcf,

    calculatedProducingAssetValueCad:
      reserveBridge.remainingAssetValueCad,

    endingReservesBcf:
      reserveBridge.endingReservesBcf,

    producingAssetOption:
      options.selectedOption,

    negativeAssetAdjustmentCad:
      options.residualLiabilityCad,
  };
}
