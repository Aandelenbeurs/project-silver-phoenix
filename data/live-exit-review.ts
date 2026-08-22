import {
  getCompanyById,
} from "./companies";

import {
  calculateDynamicAverageCostEur,
  calculateUnrealizedReturnPercent,
} from "./cost-basis";

import {
  getExitActionSuggestion,
  reviewPortfolioExits,
  type ExitReviewSupplement,
} from "./exit-engine";

import {
  calculateCompanyCombinedMarketHeat,
  calculateHistoricalHeat,
  combineMetalMarketHeat,
} from "./market-heat";

import {
  calculateInvestmentDeteriorationAssessment,
  readReviewStore,
} from "./review-store";

import {
  buildPhoenixScenarioRanking,
  calculateScenarioUpside,
} from "./scenario-upside";

import {
  getYahooHistoricalSeries,
} from "../services/yahoo";

import {
  type LivePortfolio,
} from "./portfolio-engine";

import {
  buildExitRotationInstructions,
} from "./exit-rotation-bridge";

import {
  readWorkspaceTransactions,
} from "./workspace-data-storage";

import {
  convertPriceToEur,
} from "./prices";

export async function buildLiveExitReview({
  portfolio,
}: {
  portfolio: LivePortfolio;
}) {
  const portfolioV2 =
    portfolio.portfolioV2;

  const liveMetalPrices =
    portfolio.referenceSilverPriceUsd !== null &&
    portfolio.referenceGoldPriceUsd !== null
      ? {
          silverPriceUsd:
            portfolio.referenceSilverPriceUsd,

          goldPriceUsd:
            portfolio.referenceGoldPriceUsd,
        }
      : null;

  const scenarioRanking =
    liveMetalPrices
      ? buildPhoenixScenarioRanking({
          livePrices:
            liveMetalPrices,
        })
      : [];

  const investmentScores =
    new Map(
      scenarioRanking.map(
        (item) => [
          item.companyId,
          item.investmentScore ?? 0,
        ],
      ),
    );

  const [
  silverHistory,
  goldHistory,
  reviewStore,
  workspaceTransactions,
] = await Promise.all([
  getYahooHistoricalSeries({
    symbol: "SI=F",
  }),

  getYahooHistoricalSeries({
    symbol: "GC=F",
  }),

  readReviewStore(),

  readWorkspaceTransactions(
    portfolio.workspaceId,
  ),
]);

  const silverTechnicalHeat =
    calculateHistoricalHeat(
      silverHistory.points,
    );

  const goldTechnicalHeat =
    calculateHistoricalHeat(
      goldHistory.points,
    );

  const silverMarketHeat =
    liveMetalPrices !== null &&
    silverTechnicalHeat?.technicalHeatScore !== null &&
    silverTechnicalHeat !== null
      ? combineMetalMarketHeat({
          priceHeatScore:
            (
              liveMetalPrices.silverPriceUsd /
              300
            ) * 100,

          technicalHeatScore:
            silverTechnicalHeat.technicalHeatScore,
        })
      : null;

  const goldMarketHeat =
    liveMetalPrices !== null &&
    goldTechnicalHeat?.technicalHeatScore !== null &&
    goldTechnicalHeat !== null
      ? combineMetalMarketHeat({
          priceHeatScore:
            (
              liveMetalPrices.goldPriceUsd /
              7000
            ) * 100,

          technicalHeatScore:
            goldTechnicalHeat.technicalHeatScore,
        })
      : null;

  function getLatestStoredReview(
    companyId: string,
  ) {
    const reviews =
      [...reviewStore.reviews].sort(
        (a, b) =>
          b.reviewDate.localeCompare(
            a.reviewDate,
          ),
      );

    for (const review of reviews) {
      const companyReview =
        review.companies[
          companyId
        ];

      if (companyReview) {
        return companyReview;
      }
    }

    return null;
  }

  const exitSupplementEntries =
    await Promise.all(
      portfolioV2.positions.map(
        async (position) => {
          const marketHeat =
            silverMarketHeat !== null &&
            goldMarketHeat !== null
              ? calculateCompanyCombinedMarketHeat({
                  companyId:
                    position.companyId,

                  silverMarketHeat,

                  goldMarketHeat,
                })
              : null;

          const scenarioUpside =
            liveMetalPrices
              ? calculateScenarioUpside({
                  companyId:
                    position.companyId,

                  livePrices:
                    liveMetalPrices,
                })
              : null;

          const company =
            getCompanyById(
              position.companyId,
            );

          const silverExposure =
            company?.silverExposure ?? 0;

          const goldExposure =
            company?.goldExposure ?? 0;

          const totalExposure =
            silverExposure +
            goldExposure;

          const remainingUpsidePercent =
            scenarioUpside !== null &&
            totalExposure > 0
              ? (
                  (
                    silverExposure *
                      scenarioUpside.silverRemainingUpside +
                    goldExposure *
                      scenarioUpside.goldRemainingUpside
                  ) /
                  totalExposure
                ) * 100
              : null;

              const estimatedCompanyUpsidePercent =
  scenarioUpside !== null
    ? scenarioUpside.rawScenarioPower *
      100
    : null;

          const portfolioPosition =
            portfolio.positions.find(
              (item) =>
                item.company?.id ===
                position.companyId,
            );

          const dynamicAverageCostEur =
  portfolioPosition
    ? calculateDynamicAverageCostEur({
        companyId:
          position.companyId,

        currentQuantity:
          portfolioPosition.quantity,

        transactions:
          workspaceTransactions,

        exchangeRates:
          portfolio.exchangeRates,
      })
    : null;

const unrealizedReturnPercent =
  portfolioPosition?.localPrice !== null &&
  portfolioPosition?.localPrice !== undefined
    ? (
        dynamicAverageCostEur !== null &&
        dynamicAverageCostEur > 0
          ? (
              (
                convertPriceToEur(
                  portfolioPosition.localPrice,
                  portfolioPosition.currency,
                  portfolio.exchangeRates,
                ) -
                dynamicAverageCostEur
              ) /
              dynamicAverageCostEur
            ) * 100
          : calculateUnrealizedReturnPercent({
              companyId:
                position.companyId,

              currentPrice:
                portfolioPosition.localPrice,

              currentCurrency:
                portfolioPosition.currency,

              exchangeRates:
                portfolio.exchangeRates,
            })
      )
    : null;

          const latestStoredReview =
            getLatestStoredReview(
              position.companyId,
            );

          const thesisHealth =
            latestStoredReview?.thesisHealth ??
            "UNKNOWN";

          const previousInvestmentScore =
            latestStoredReview?.investmentScore ??
            null;

         const currentInvestmentScore =
  investmentScores.get(
    position.companyId,
  ) ?? null;

const deteriorationAssessment =
  await calculateInvestmentDeteriorationAssessment({
    companyId:
      position.companyId,

    currentInvestmentScore,
  });

          return [
            position.companyId,
            {
             investmentScore:
             currentInvestmentScore,

              previousInvestmentScore,

              investmentDeteriorationScore:
                deteriorationAssessment.pressureScore,

                latestInvestmentDecline:
  deteriorationAssessment.latestDecline,

totalInvestmentDecline:
  deteriorationAssessment.totalDecline,

consecutiveInvestmentDeclines:
  deteriorationAssessment.consecutiveDeclines,

              thesisHealth,

              marketHeatScore:
                marketHeat?.marketHeatScore ??
                null,

              remainingUpsidePercent,

              estimatedCompanyUpsidePercent,

              scenarioUpsideScore:
  scenarioUpside?.scenarioUpsideScore ??
  null,

              unrealizedReturnPercent,
            },
          ] as const;
        },
      ),
    );

  const exitSupplements =
    new Map<
      string,
      ExitReviewSupplement
    >(
      exitSupplementEntries,
    );

  const portfolioExitReviews =
    reviewPortfolioExits({
      positions:
        portfolioV2.positions,

      supplements:
        exitSupplements,
    });

    const portfolioExitReviewsWithActions =
  portfolioExitReviews.map(
    (item) => ({
      ...item,

      actionSuggestion:
        getExitActionSuggestion({
          input:
            item.input,

          result:
            item.result,
        }),
    }),
  );

const exitActions =
  new Map(
    portfolioExitReviewsWithActions.map(
      (item) => [
        item.position.companyId,
        item.actionSuggestion,
      ],
    ),
  );

const exitRotationInstructions =
  buildExitRotationInstructions({
    positions:
      portfolioV2.positions,

    actions:
      exitActions,
  });

  return {
    portfolioExitReviews:
  portfolioExitReviewsWithActions,

  exitRotationInstructions,
    silverMarketHeat,
    goldMarketHeat,

    scenarioRanking,
    investmentScores,

    liveMetalPrices,
  };
}