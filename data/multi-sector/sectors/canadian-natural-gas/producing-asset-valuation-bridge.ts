
import {
  calculateShareholderValue,
} from "./economics";

import {
  calculateCanadianGasProducingAssetOptions,
} from "./producing-asset-options";

import {
  calculateCanadianGasAssetValuationAdjustment,
} from "./asset-valuation-adjustment";

export interface CanadianGasProducingAssetValuationBridgeInput {
  continueProductionDcfCad: number;
  canShutDown: boolean;
  shutdownObligationsCad: number;

  undevelopedInventoryValueCad: number;
  unbookedOptionalityValueCad: number;
  otherAssetValueCad: number;

  netDebtCad: number;
  dilutedShares: number;
  cumulativeDividendsPerShareCad: number;
}

export function calculateCanadianGasProducingAssetValuationBridge(
  input: CanadianGasProducingAssetValuationBridgeInput
) {
  const options = calculateCanadianGasProducingAssetOptions({
    continueProductionDcfCad:
      input.continueProductionDcfCad,

    canShutDown:
      input.canShutDown,

    shutdownObligationsCad:
      input.shutdownObligationsCad,
  });

    const unadjusted = calculateShareholderValue({
    producingAssetValueCad:
      options.producingAssetValueCad,

    undevelopedInventoryValueCad:
      input.undevelopedInventoryValueCad,

    unbookedOptionalityValueCad:
      input.unbookedOptionalityValueCad,

    otherAssetValueCad:
      input.otherAssetValueCad,

    netDebtCad:
      input.netDebtCad,

    dilutedShares:
      input.dilutedShares,

    cumulativeDividendsPerShareCad:
      input.cumulativeDividendsPerShareCad,
  });

  const adjustment =
    calculateCanadianGasAssetValuationAdjustment({
      producingAssetValueCad:
        options.producingAssetValueCad,

      residualLiabilityCad:
        options.residualLiabilityCad,

      unadjustedEquityValueCad:
        unadjusted.equityValueCad,

      dilutedShares:
        input.dilutedShares,

      cumulativeDividendsPerShareCad:
        input.cumulativeDividendsPerShareCad,
    });

  return {
    options,
    unadjusted,
    adjustment,
  };
}
