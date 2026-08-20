import {
  type PortfolioV2PositionInput,
} from "./portfolio-v2";

import {
  type ExitActionSuggestion,
} from "./exit-engine";

export type ExitRotationInstruction = {
  companyId: string;

  action:
    ExitActionSuggestion["action"];

  driver:
    ExitActionSuggestion["driver"];

  currentValueEur: number;

  sellPercent: number;

  sellAmountEur: number;

  capitalAction:
    ExitActionSuggestion["capitalAction"];

  canExitWithoutReplacement: boolean;
};

export function buildExitRotationInstructions({
  positions,
  actions,
}: {
  positions:
    PortfolioV2PositionInput[];

  actions:
    Map<
      string,
      ExitActionSuggestion
    >;
}): ExitRotationInstruction[] {
  return positions
    .map((position) => {
      const action =
        actions.get(
          position.companyId,
        );

      if (!action) {
        return null;
      }

      /**
       * HOLD, WATCH en REVIEW maken
       * geen direct verkoopkapitaal vrij.
       */
      if (
        action.targetSellPercent <= 0
      ) {
        return null;
      }

      const sellPercent =
        Math.max(
          0,
          Math.min(
            100,
            action.targetSellPercent,
          ),
        );

      const sellAmountEur =
        position.marketValueEur *
        (sellPercent / 100);

      if (sellAmountEur <= 0) {
        return null;
      }

      return {
        companyId:
          position.companyId,

        action:
          action.action,

        driver:
          action.driver,

        currentValueEur:
          position.marketValueEur,

        sellPercent,

        sellAmountEur,

        capitalAction:
          action.capitalAction,

        canExitWithoutReplacement:
          action.canExitWithoutReplacement,
      };
    })
    .filter(
      (
        item,
      ): item is ExitRotationInstruction =>
        item !== null,
    )
    .sort(
      (a, b) =>
        b.sellAmountEur -
        a.sellAmountEur,
    );
}