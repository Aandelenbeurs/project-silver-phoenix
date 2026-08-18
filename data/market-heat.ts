import {
  getCompanyById,
} from "./companies";

import {
  type LiveMetalPrices,
  type MetalsScenario,
  phoenixBullScenario,
} from "./scenario-upside";

export type MarketHeatLevel =
  | "COOL"
  | "NORMAL"
  | "WARM"
  | "HOT"
  | "EUPHORIC";

export type MarketHeatResult = {
  silverHeatScore: number;
  goldHeatScore: number;

  silverHeatLevel: MarketHeatLevel;
  goldHeatLevel: MarketHeatLevel;

  combinedHeatScore: number;
  combinedHeatLevel: MarketHeatLevel;
};

export type CompanyMarketHeatResult = {
  companyId: string;

  silverExposure: number;
  goldExposure: number;

  marketHeatScore: number | null;
  marketHeatLevel: MarketHeatLevel | null;
};

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}

function determineHeatLevel(
  score: number,
): MarketHeatLevel {
  if (score >= 90) {
    return "EUPHORIC";
  }

  if (score >= 75) {
    return "HOT";
  }

  if (score >= 55) {
    return "WARM";
  }

  if (score >= 30) {
    return "NORMAL";
  }

  return "COOL";
}

/**
 * Meet hoe ver een metaal door het
 * Phoenix bull-scenario heen is.
 *
 * 0% van target  -> lage hitte
 * 50% van target -> ongeveer neutraal
 * 100% target    -> zeer hoge hitte
 *
 * Dit is voorlopig PRICE HEAT.
 * Momentum/sentiment voegen we later
 * als afzonderlijke componenten toe.
 */
function calculatePriceHeat({
  currentPrice,
  targetPrice,
}: {
  currentPrice: number;
  targetPrice: number;
}): number {
  if (
    currentPrice <= 0 ||
    targetPrice <= 0
  ) {
    return 0;
  }

  const progress =
    currentPrice / targetPrice;

  return clampScore(
    progress * 100,
  );
}

export function calculateMarketHeat({
  livePrices,
  scenario = phoenixBullScenario,
}: {
  livePrices: LiveMetalPrices;
  scenario?: MetalsScenario;
}): MarketHeatResult {
  const silverHeatScore =
    calculatePriceHeat({
      currentPrice:
        livePrices.silverPriceUsd,

      targetPrice:
        scenario.silverTargetUsd,
    });

  const goldHeatScore =
    calculatePriceHeat({
      currentPrice:
        livePrices.goldPriceUsd,

      targetPrice:
        scenario.goldTargetUsd,
    });

  /**
   * Voorlopig 50/50.
   *
   * Dit is de algemene precious-metals
   * markt-hitte. Per aandeel wegen we
   * straks silver/gold exposure mee.
   */
  const combinedHeatScore =
    (
      silverHeatScore +
      goldHeatScore
    ) / 2;

  return {
    silverHeatScore,
    goldHeatScore,

    silverHeatLevel:
      determineHeatLevel(
        silverHeatScore,
      ),

    goldHeatLevel:
      determineHeatLevel(
        goldHeatScore,
      ),

    combinedHeatScore,

    combinedHeatLevel:
      determineHeatLevel(
        combinedHeatScore,
      ),
  };
}

export function calculateCompanyMarketHeat({
  companyId,
  livePrices,
  scenario = phoenixBullScenario,
}: {
  companyId: string;
  livePrices: LiveMetalPrices;
  scenario?: MetalsScenario;
}): CompanyMarketHeatResult | null {
  const company =
    getCompanyById(companyId);

  if (!company) {
    return null;
  }

  const marketHeat =
    calculateMarketHeat({
      livePrices,
      scenario,
    });

  const silverExposure =
    company.silverExposure ?? 0;

  const goldExposure =
    company.goldExposure ?? 0;

  const totalExposure =
    silverExposure + goldExposure;

  if (totalExposure <= 0) {
    return {
      companyId,

      silverExposure,
      goldExposure,

      marketHeatScore: null,
      marketHeatLevel: null,
    };
  }

  const marketHeatScore =
    (
      silverExposure *
        marketHeat.silverHeatScore +
      goldExposure *
        marketHeat.goldHeatScore
    ) / totalExposure;

  return {
    companyId,

    silverExposure,
    goldExposure,

    marketHeatScore,

    marketHeatLevel:
      determineHeatLevel(
        marketHeatScore,
      ),
  };
}