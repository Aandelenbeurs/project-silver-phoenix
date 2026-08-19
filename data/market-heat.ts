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

export type HistoricalPricePoint = {
  date: string;
  close: number;
};

export type HistoricalHeatResult = {
  currentPrice: number;

  return20DayPercent: number | null;
  return50DayPercent: number | null;

  movingAverage50: number | null;
  movingAverage200: number | null;

  extension50Percent: number | null;
  extension200Percent: number | null;

  momentumHeatScore: number | null;
  extensionHeatScore: number | null;

  technicalHeatScore: number | null;
};

export type MetalMarketHeatResult = {
  priceHeatScore: number;
  technicalHeatScore: number;

  marketHeatScore: number;
  marketHeatLevel: MarketHeatLevel;
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

function calculateAverage(
  values: number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0,
    ) / values.length
  );
}

function calculateReturnPercent({
  current,
  previous,
}: {
  current: number;
  previous: number;
}): number | null {
  if (previous <= 0) {
    return null;
  }

  return (
    (
      current -
      previous
    ) /
    previous
  ) * 100;
}

/**
 * Zet momentum om naar Heat.
 *
 * Negatief momentum = weinig hitte.
 * Sterk positief momentum = hoge hitte.
 *
 * 20%+ in ongeveer één handelsmaand
 * wordt bewust als zeer heet gezien.
 */
function calculateMomentumHeat({
  return20,
  return50,
}: {
  return20: number;
  return50: number;
}): number {
  const heat20 =
    clampScore(
      30 +
        return20 * 3,
    );

  const heat50 =
    clampScore(
      30 +
        return50 * 1.5,
    );

  return (
    heat20 * 0.55 +
    heat50 * 0.45
  );
}

/**
 * Meet hoe ver de actuele koers boven
 * zijn langere trend ligt.
 */
function calculateExtensionHeat({
  extension50,
  extension200,
}: {
  extension50: number;
  extension200: number;
}): number {
  const heat50 =
    clampScore(
      30 +
        extension50 * 2.5,
    );

  const heat200 =
    clampScore(
      25 +
        extension200 * 1.5,
    );

  return (
    heat50 * 0.55 +
    heat200 * 0.45
  );
}

export function calculateHistoricalHeat(
  points: HistoricalPricePoint[],
): HistoricalHeatResult | null {
  const validPoints =
    points.filter(
      (point) =>
        Number.isFinite(
          point.close,
        ) &&
        point.close > 0,
    );

  if (validPoints.length < 200) {
    return null;
  }

  const closes =
    validPoints.map(
      (point) =>
        point.close,
    );

  const currentPrice =
    closes[
      closes.length - 1
    ];

  const price20DaysAgo =
    closes.length >= 21
      ? closes[
          closes.length - 21
        ]
      : null;

  const price50DaysAgo =
    closes.length >= 51
      ? closes[
          closes.length - 51
        ]
      : null;

  const movingAverage50 =
    calculateAverage(
      closes.slice(-50),
    );

  const movingAverage200 =
    calculateAverage(
      closes.slice(-200),
    );

  const return20DayPercent =
    price20DaysAgo !== null
      ? calculateReturnPercent({
          current:
            currentPrice,

          previous:
            price20DaysAgo,
        })
      : null;

  const return50DayPercent =
    price50DaysAgo !== null
      ? calculateReturnPercent({
          current:
            currentPrice,

          previous:
            price50DaysAgo,
        })
      : null;

  const extension50Percent =
    movingAverage50 !== null
      ? calculateReturnPercent({
          current:
            currentPrice,

          previous:
            movingAverage50,
        })
      : null;

  const extension200Percent =
    movingAverage200 !== null
      ? calculateReturnPercent({
          current:
            currentPrice,

          previous:
            movingAverage200,
        })
      : null;

  const momentumHeatScore =
    return20DayPercent !== null &&
    return50DayPercent !== null
      ? calculateMomentumHeat({
          return20:
            return20DayPercent,

          return50:
            return50DayPercent,
        })
      : null;

  const extensionHeatScore =
    extension50Percent !== null &&
    extension200Percent !== null
      ? calculateExtensionHeat({
          extension50:
            extension50Percent,

          extension200:
            extension200Percent,
        })
      : null;

  const technicalHeatScore =
    momentumHeatScore !== null &&
    extensionHeatScore !== null
      ? (
          momentumHeatScore *
            0.55 +
          extensionHeatScore *
            0.45
        )
      : null;

  return {
    currentPrice,

    return20DayPercent,
    return50DayPercent,

    movingAverage50,
    movingAverage200,

    extension50Percent,
    extension200Percent,

    momentumHeatScore,
    extensionHeatScore,

    technicalHeatScore,
  };
}

export function combineMetalMarketHeat({
  priceHeatScore,
  technicalHeatScore,
}: {
  priceHeatScore: number;
  technicalHeatScore: number;
}): MetalMarketHeatResult {
  /**
   * Price Heat is vooral cycle maturity:
   * hoe ver zijn we richting ons bull-scenario?
   *
   * Technical Heat meet daadwerkelijke
   * oververhitting/momentum.
   *
   * Daarom krijgt Technical Heat voorlopig
   * het grootste gewicht.
   */
  const marketHeatScore =
    priceHeatScore * 0.25 +
    technicalHeatScore * 0.75;

  return {
    priceHeatScore,
    technicalHeatScore,

    marketHeatScore,

    marketHeatLevel:
      determineHeatLevel(
        marketHeatScore,
      ),
  };
}

export function calculateCompanyCombinedMarketHeat({
  companyId,
  silverMarketHeat,
  goldMarketHeat,
}: {
  companyId: string;

  silverMarketHeat: MetalMarketHeatResult;
  goldMarketHeat: MetalMarketHeatResult;
}): CompanyMarketHeatResult | null {
  const company =
    getCompanyById(
      companyId,
    );

  if (!company) {
    return null;
  }

  const silverExposure =
    company.silverExposure ?? 0;

  const goldExposure =
    company.goldExposure ?? 0;

  const totalExposure =
    silverExposure +
    goldExposure;

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
        silverMarketHeat.marketHeatScore +
      goldExposure *
        goldMarketHeat.marketHeatScore
    ) /
    totalExposure;

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