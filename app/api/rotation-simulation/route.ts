import {
  phoenixCompaniesV2,
} from "../../../data/phoenix-v2";

import {
  NextResponse,
} from "next/server";

import {
  getLivePortfolio,
} from "../../../data/portfolio-engine";

import {
  buildPhoenixScenarioRanking,
} from "../../../data/scenario-upside";

import {
  simulateRotation,
} from "../../../data/rotation-engine";

export async function POST(
  request: Request,
) {
  try {
    const body =
      await request.json();

    const selectedSellCompanyIds =
      Array.isArray(
        body.selectedSellCompanyIds,
      )
        ? body.selectedSellCompanyIds.filter(
            (
              value: unknown,
            ): value is string =>
              typeof value === "string",
          )
        : [];

    const portfolio =
      await getLivePortfolio();

    const liveMetalPrices =
      portfolio.referenceSilverPriceUsd !== null &&
      portfolio.referenceGoldPriceUsd !== null
        ? {
            silverPriceUsd:
              portfolio.referenceSilverPriceUsd,

            goldPriceUsd:
              portfolio.referenceGoldPriceUsd,
          }
        : undefined;

    const scenarioRanking =
      liveMetalPrices
        ? buildPhoenixScenarioRanking({
            livePrices:
              liveMetalPrices,
          })
        : [];

    const optimizerV2Positions =
      portfolio.positions
        .filter(
          (position) =>
            position.isEquity &&
            position.company &&
            position.marketValueEur !== null,
        )
        .map(
          (position) => ({
            companyId:
              position.company!.id,

            marketValueEur:
              position.marketValueEur!,
          }),
        );

    const investmentScores =
      new Map(
        scenarioRanking.map(
          (item) => [
            item.companyId,
            item.investmentScore ?? 0,
          ],
        ),
      );

    const candidateCompanyIds =
  phoenixCompaniesV2.map(
    (company) =>
      company.companyId,
  );

    const simulation =
      simulateRotation({
        positions:
          optimizerV2Positions,

        investmentScores,

        liveMetalPrices,

        maxSellPositions: 4,

        selectedSellCompanyIds,
      });

    return NextResponse.json(
      simulation,
    );
  } catch (error) {
    console.error(
      "Rotation simulation API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Rotatiesimulatie kon niet worden berekend.",
      },
      {
        status: 500,
      },
    );
  }
}