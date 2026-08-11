import { NextResponse } from "next/server";

import {
  getMetalScenario,
} from "../../../data/portfolio-engine";

export async function POST(
  request: Request,
) {
  try {
    const body = await request.json();

    const silverPriceUsd =
      body.silverPriceUsd === null ||
      body.silverPriceUsd === "" ||
      body.silverPriceUsd === undefined
        ? null
        : Number(body.silverPriceUsd);

    const goldPriceUsd =
      body.goldPriceUsd === null ||
      body.goldPriceUsd === "" ||
      body.goldPriceUsd === undefined
        ? null
        : Number(body.goldPriceUsd);

    if (
      silverPriceUsd !== null &&
      (
        !Number.isFinite(silverPriceUsd) ||
        silverPriceUsd <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ongeldige zilverprijs.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      goldPriceUsd !== null &&
      (
        !Number.isFinite(goldPriceUsd) ||
        goldPriceUsd <= 0
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Ongeldige goudprijs.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      silverPriceUsd === null &&
      goldPriceUsd === null
    ) {
      return NextResponse.json(
        {
          error:
            "Vul minimaal een zilver- of goudprijs in.",
        },
        {
          status: 400,
        },
      );
    }

    const scenario =
      await getMetalScenario({
        silverPriceUsd,
        goldPriceUsd,
      });

    return NextResponse.json(
      scenario,
    );
  } catch (error) {
    console.error(
      "Metal scenario API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Scenario kon niet worden berekend.",
      },
      {
        status: 500,
      },
    );
  }
}