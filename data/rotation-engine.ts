import {
  optimizeNewMoneyV2,
  type NewMoneyOptimizerResult,
} from "./optimizer-v2";

import {
  calculatePortfolioV2,
  type PortfolioV2PositionInput,
} from "./portfolio-v2";

import {
  getCompanyById,
} from "./companies";

import {
  type LiveMetalPrices,
} from "./scenario-upside";

export type RotationAction =
  | "SELL"
  | "BUY";

export type RotationTrade = {
  companyId: string;
  name: string;

  action: RotationAction;

  amountEur: number;

  currentAllocation: number;
  resultingAllocation: number;

  investmentScore: number;
};

export type RotationSellCandidate = {
  companyId: string;
  name: string;

  marketValueEur: number;
  currentAllocation: number;

  idealMin: number;
  idealMax: number;
  hardMax: number;

  investmentScore: number;

  excessAboveIdealMaxEur: number;
  excessAboveHardMaxEur: number;
};

export type RotationResult = {
  amountRequestedEur: number;

  amountSoldEur: number;
  amountBoughtEur: number;

  sellTrades: RotationTrade[];
  buyTrades: RotationTrade[];

  unallocatedEur: number;

  warnings: string[];
};

export function buildRotationSellCandidates({
  positions,
  investmentScores,
}: {
  positions: PortfolioV2PositionInput[];

  investmentScores: Map<
    string,
    number
  >;
}): RotationSellCandidate[] {
  const portfolio =
    calculatePortfolioV2(
      positions,
    );

  const totalPortfolioValueEur =
    positions.reduce(
      (total, position) =>
        total +
        position.marketValueEur,
      0,
    );

  return portfolio.positions
    .filter(
      (position) =>
        position.idealMax !== null &&
        position.hardMax !== null,
    )
    .map((position) => {
      const company =
        getCompanyById(
          position.companyId,
        );

      const idealMax =
        position.idealMax!;

      const hardMax =
        position.hardMax!;

      const idealMaxValueEur =
        totalPortfolioValueEur *
        (idealMax / 100);

      const hardMaxValueEur =
        totalPortfolioValueEur *
        (hardMax / 100);

      return {
        companyId:
          position.companyId,

        name:
          company?.name ??
          position.companyId,

        marketValueEur:
          position.marketValueEur,

        currentAllocation:
          position.allocationPercent,

        idealMin:
          position.idealMin ?? 0,

        idealMax,

        hardMax,

        investmentScore:
          investmentScores.get(
            position.companyId,
          ) ?? 0,

        excessAboveIdealMaxEur:
          Math.max(
            0,
            position.marketValueEur -
              idealMaxValueEur,
          ),

        excessAboveHardMaxEur:
          Math.max(
            0,
            position.marketValueEur -
              hardMaxValueEur,
          ),
      };
    });
}

export type RankedRotationSellCandidate =
  RotationSellCandidate & {
    sellPriority: number;
    sellReason:
      | "ABOVE_HARD_MAX"
      | "ABOVE_IDEAL_MAX"
      | "WEAK_CAPITAL_USE";
  };

  export type RotationSellPlan =
  RankedRotationSellCandidate & {
    proposedSellAmountEur: number;
  };

 export type RotationSimulationResult = {
  sellPlan: RotationSellPlan[];

  freedCapitalEur: number;

  portfolioAfterSales:
    PortfolioV2PositionInput[];

  buyResult:
    NewMoneyOptimizerResult;

  scoreBeforeRotation: number | null;
  scoreAfterRotation: number | null;
  totalScoreImprovement: number | null;
};

  const MIN_ROTATION_EXCESS_EUR = 1_000;

export function rankRotationSellCandidates(
  candidates: RotationSellCandidate[],
): RankedRotationSellCandidate[] {
  return candidates
    .map((candidate) => {
      if (
        candidate.excessAboveHardMaxEur >=
    MIN_ROTATION_EXCESS_EUR
      ) {
        return {
          ...candidate,

          sellPriority:
            30_000 +
            candidate.excessAboveHardMaxEur +
            (100 -
              candidate.investmentScore) *
              100,

          sellReason:
            "ABOVE_HARD_MAX" as const,
        };
      }

      if (
  candidate.investmentScore < 70
) {
  return {
    ...candidate,

    sellPriority:
      20_000 +
      (70 -
        candidate.investmentScore) *
        100,

    sellReason:
      "WEAK_CAPITAL_USE" as const,
  };
}

      if (
        candidate.excessAboveIdealMaxEur >=
    MIN_ROTATION_EXCESS_EUR
      ) {
        return {
          ...candidate,

          sellPriority:
            10_000 +
            candidate.excessAboveIdealMaxEur +
            (100 -
              candidate.investmentScore) *
              100,

          sellReason:
            "ABOVE_IDEAL_MAX" as const,
        };
      }

      return null;

          return null;
    })
    .filter(
      (
        candidate,
      ): candidate is RankedRotationSellCandidate =>
        candidate !== null,
    )
    .sort(
      (a, b) =>
        b.sellPriority -
        a.sellPriority,
    );
}

export function buildRotationSellPlan(
  candidates: RankedRotationSellCandidate[],
): RotationSellPlan[] {
  return candidates
    .map((candidate) => {
      let proposedSellAmountEur = 0;

      if (
        candidate.sellReason ===
        "ABOVE_HARD_MAX"
      ) {
        proposedSellAmountEur =
          candidate.excessAboveHardMaxEur;
      }

      if (
        candidate.sellReason ===
        "ABOVE_IDEAL_MAX"
      ) {
        proposedSellAmountEur =
          candidate.excessAboveIdealMaxEur;
      }

      if (
        candidate.sellReason ===
        "WEAK_CAPITAL_USE"
      ) {
        proposedSellAmountEur =
          candidate.marketValueEur;
      }

      return {
        ...candidate,

        proposedSellAmountEur:
          Math.min(
            proposedSellAmountEur,
            candidate.marketValueEur,
          ),
      };
    })
    .filter(
      (candidate) =>
        candidate.proposedSellAmountEur > 0,
    );
}

function applySellPlanToPositions({
  positions,
  sellPlan,
}: {
  positions: PortfolioV2PositionInput[];
  sellPlan: RotationSellPlan[];
}): PortfolioV2PositionInput[] {
  const sellByCompanyId =
    new Map(
      sellPlan.map(
        (item) => [
          item.companyId,
          item.proposedSellAmountEur,
        ],
      ),
    );

  return positions
    .map((position) => {
      const sellAmountEur =
        sellByCompanyId.get(
          position.companyId,
        ) ?? 0;

      return {
        ...position,

        marketValueEur:
          Math.max(
            0,
            position.marketValueEur -
              sellAmountEur,
          ),
      };
    })
    .filter(
      (position) =>
        position.marketValueEur > 0.01,
    );
}

export function simulateRotation({
  positions,
  investmentScores,
  candidateCompanyIds,
  liveMetalPrices,
  maxSellPositions = 4,
  selectedSellCompanyIds,
}: {
  positions: PortfolioV2PositionInput[];

  investmentScores:
    Map<string, number>;

  candidateCompanyIds:
    string[];

  liveMetalPrices?:
    LiveMetalPrices;

  maxSellPositions?: number;

  selectedSellCompanyIds?:
    string[];
}): RotationSimulationResult {

    const portfolioBeforeRotation =
  calculatePortfolioV2(
    positions,
  );

const scoreBeforeRotation =
  portfolioBeforeRotation.partialPortfolioScore;

  const sellCandidates =
    buildRotationSellCandidates({
      positions,
      investmentScores,
    });

  const rankedSellCandidates =
    rankRotationSellCandidates(
      sellCandidates,
    );

  const availableSellPlan =
  buildRotationSellPlan(
    rankedSellCandidates,
  ).slice(
    0,
    maxSellPositions,
  );

const sellPlan =
  selectedSellCompanyIds
    ? availableSellPlan.filter(
        (item) =>
          selectedSellCompanyIds.includes(
            item.companyId,
          ),
      )
    : availableSellPlan;

  const freedCapitalEur =
    sellPlan.reduce(
      (total, item) =>
        total +
        item.proposedSellAmountEur,
      0,
    );

  const portfolioAfterSales =
    applySellPlanToPositions({
      positions,
      sellPlan,
    });

  const buyResult =
    optimizeNewMoneyV2({
      positions:
        portfolioAfterSales,

      candidateCompanyIds,

      newMoneyEur:
        freedCapitalEur,

      liveMetalPrices,
    });

    const scoreAfterRotation =
  buyResult.scoreAfter;

const totalScoreImprovement =
  scoreBeforeRotation !== null &&
  scoreAfterRotation !== null
    ? scoreAfterRotation -
      scoreBeforeRotation
    : null;

 return {
  sellPlan,

  freedCapitalEur,

  portfolioAfterSales,

  buyResult,

  scoreBeforeRotation,
  scoreAfterRotation,
  totalScoreImprovement,
};
}

export function getTopRotationSellPlan({
  positions,
  investmentScores,
  limit = 10,
}: {
  positions: PortfolioV2PositionInput[];
  investmentScores: Map<string, number>;
  limit?: number;
}): RotationSellPlan[] {
  const candidates =
    buildRotationSellCandidates({
      positions,
      investmentScores,
    });

  const ranked =
    rankRotationSellCandidates(
      candidates,
    );

  return buildRotationSellPlan(
    ranked,
  ).slice(0, limit);
}

export function getTopRotationSellCandidates({
  positions,
  investmentScores,
  limit = 10,
}: {
  positions: PortfolioV2PositionInput[];
  investmentScores: Map<string, number>;
  limit?: number;
}) {
  const candidates =
    buildRotationSellCandidates({
      positions,
      investmentScores,
    });

  return rankRotationSellCandidates(
    candidates,
  ).slice(0, limit);

}