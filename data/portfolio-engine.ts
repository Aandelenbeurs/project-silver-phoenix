import {
  buildPortfolioPositions,
  type PortfolioPosition,
} from "./portfolio";

import {
  getWorkspaceHoldings,
} from "./workspace-provider";

import {
  getCurrentWorkspace,
} from "./workspace";

import {
  readWorkspaceSettings,
} from "./workspace-data-storage";

import {
  calculateMarketValueEur,
  createPriceQuote,
  type ExchangeRates,
  type PriceQuote,
  type SupportedCurrency,
} from "./prices";

import {
  calculateMetalScenario,
} from "./scenario-engine";

import {
  calculatePortfolioV2,
  type PortfolioV2Result,
} from "./portfolio-v2";

import {
  getYahooMarketSnapshot,
  type YahooMarketSnapshot,
} from "../services/yahoo";

export type PortfolioAdvice =
  | "STERK BIJKOPEN"
  | "BIJKOPEN"
  | "OP DOEL"
  | "NIET BIJKOPEN"
  | "AFBOUWEN"
  | "UITSTAPPEN"
  | "NOG BEOORDELEN"
  | "APART";

export type ValuedPortfolioPosition = PortfolioPosition & {
  currency: SupportedCurrency;
  quote: PriceQuote;

  localPrice: number | null;
  marketValueEur: number | null;

  scenarioApplied: boolean;
  scenarioUpsidePercent: number | null;
  scenarioDriver:
  | "silver"
  | "gold"
  | "silver+gold"
  | null;

  currentAllocation: number | null;
  allocationDifference: number | null;

  advice: PortfolioAdvice;
};

export type PortfolioTotals = {
  totalMarketValueEur: number;

  pricedPositions: number;
  unpricedPositions: number;

  equityValueEur: number;
  etfValueEur: number;
  physicalValueEur: number;

  silverValueEur: number;
  goldValueEur: number;
  mixedValueEur: number;
  separateValueEur: number;
};

export type LivePortfolio = {
  positions: ValuedPortfolioPosition[];
  totals: PortfolioTotals;

  portfolioV2: PortfolioV2Result;

  referenceSilverPriceUsd: number | null;
  referenceGoldPriceUsd: number | null;

  exchangeRates: ExchangeRates;

  fetchedAt: string;
  expiresAt: string;

  requestedSymbols: number;
  successfulSymbols: number;
  failedSymbols: number;

  errors: Record<string, string>;
};

export type ScenarioComparison = {
  liveValueEur: number;
  silver100ValueEur: number;
  silver300ValueEur: number;

  silver100DifferenceEur: number;
  silver300DifferenceEur: number;

  silver100ReturnPercent: number;
  silver300ReturnPercent: number;
};

export type MetalScenarioInput = {
  silverPriceUsd?: number | null;
  goldPriceUsd?: number | null;
};

export type MetalScenarioResult = {
  silverPriceUsd: number | null;
  goldPriceUsd: number | null;

  liveValueEur: number;
  scenarioValueEur: number;
  differenceEur: number;
  returnPercent: number;
  drivers: {
  id: string;
  name: string;
  contributionEur: number;
}[];
};

/**
 * ID waarmee de Yahoo-snapshot een positie koppelt.
 */
export function getPriceId(
  position: PortfolioPosition,
): string {
  if (position.company) {
    return position.company.id;
  }

  switch (position.holding.id) {
    case "holding-phag":
      return "phag";

    case "holding-8psb":
      return "8psb";

    case "holding-slvr":
      return "slvr";

    case "holding-physical-silver":
      return "physical-silver";

    default:
      return position.holding.id;
  }
}

/**
 * Fallbackvaluta wanneer Yahoo geen resultaat teruggeeft.
 */
export function getFallbackCurrency(
  position: PortfolioPosition,
): SupportedCurrency {
  if (position.company) {
    switch (position.company.id) {
      case "walhalla-gold":
      case "new-murchison":
        return "AUD";

      case "vista-gold":
        return "USD";

      case "china-silver":
        return "HKD";

      default:
        return "CAD";
    }
  }

  switch (position.holding.id) {
    case "holding-phag":
    case "holding-slvr":
      return "USD";

    case "holding-8psb":
    case "holding-physical-silver":
      return "EUR";

    default:
      return "EUR";
  }
}

/**
 * Haalt de koers van één positie uit de Yahoo-snapshot.
 */
function getSnapshotQuote({
  position,
  snapshot,
}: {
  position: PortfolioPosition;
  snapshot: YahooMarketSnapshot;
}): PriceQuote {
  const priceId = getPriceId(position);

  const result =
    snapshot.instruments[priceId];

  if (result) {
    return result.quote;
  }

  return createPriceQuote({
    symbol:
      position.company?.yahooSymbol ??
      position.ticker ??
      priceId,

    currency:
      getFallbackCurrency(position),

    price: null,
    previousClose: null,

    source: "unavailable",
    updatedAt: null,

    error:
      "Geen marktdata gevonden voor deze positie.",
  });
}

function getReferenceSilverPriceUsd(
  snapshot: YahooMarketSnapshot,
): number | null {
  const silverInstrument =
    snapshot.instruments[
      "physical-silver"
    ];

  if (!silverInstrument) {
    return null;
  }

  const price =
    silverInstrument.quote.price;

  if (
    price === null ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  return price;
}

function getReferenceGoldPriceUsd(
  snapshot: YahooMarketSnapshot,
): number | null {
  const goldInstrument =
    snapshot.instruments[
      "physical-gold"
    ];

  if (!goldInstrument) {
    return null;
  }

  const price =
    goldInstrument.quote.price;

  if (
    price === null ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return null;
  }

  return price;
}

/**
 * Bepaalt het portefeuilleadvies.
 *
 * Allocaties en verschillen zijn procentpunten.
 */
export function determinePortfolioAdvice({
  position,
  currentAllocation,
}: {
  position: PortfolioPosition;
  currentAllocation: number | null;
}): PortfolioAdvice {
  if (!position.isEquity) {
    return "APART";
  }

  if (
    position.status === "review" ||
    !position.hasValidScore
  ) {
    return "NOG BEOORDELEN";
  }

  if (position.status === "exit") {
    return "UITSTAPPEN";
  }

  if (currentAllocation === null) {
    return "NOG BEOORDELEN";
  }

  const target =
    position.targetAllocation;

  const maximum =
    position.maximumAllocation;

  const difference =
    target - currentAllocation;

  if (
    maximum > 0 &&
    currentAllocation > maximum
  ) {
    return "AFBOUWEN";
  }

  if (
    target === 0 &&
    currentAllocation > 0
  ) {
    return "UITSTAPPEN";
  }

  if (difference >= 2) {
    return "STERK BIJKOPEN";
  }

  if (difference >= 0.5) {
    return "BIJKOPEN";
  }

  if (difference <= -2) {
    return "AFBOUWEN";
  }

  if (difference < -0.5) {
    return "NIET BIJKOPEN";
  }

  return "OP DOEL";
}

export function determinePortfolioAdviceV2({
  currentAllocation,
  idealMin,
  idealMax,
  hardMax,
  investmentScore,
}: {
  currentAllocation: number | null;
  idealMin: number | null;
  idealMax: number | null;
  hardMax: number | null;
  investmentScore: number | null;
}): PortfolioAdvice {
  /**
   * Geen bruikbare allocatie- of
   * Phoenix-data beschikbaar.
   */
  if (
    currentAllocation === null ||
    idealMin === null ||
    idealMax === null ||
    hardMax === null ||
    investmentScore === null
  ) {
    return "NOG BEOORDELEN";
  }

  /**
   * Absolute risicogrens.
   */
  if (
    currentAllocation >
    hardMax
  ) {
    return "AFBOUWEN";
  }

  /**
   * Boven de ideale band, maar nog
   * onder hard max.
   *
   * Geen nieuwe aankopen.
   */
  if (
    currentAllocation >
    idealMax
  ) {
    return "NIET BIJKOPEN";
  }

  /**
   * Binnen de ideale band.
   */
  if (
    currentAllocation >=
      idealMin &&
    currentAllocation <=
      idealMax
  ) {
    return "OP DOEL";
  }

  /**
   * Onder idealMin:
   * Investment Score bepaalt hoe
   * aantrekkelijk bijkopen is.
   */
  if (
    investmentScore >= 90
  ) {
    return "STERK BIJKOPEN";
  }

  if (
    investmentScore >= 85
  ) {
    return "BIJKOPEN";
  }

  /**
   * Onder idealMin, maar onvoldoende
   * aantrekkelijk om actief bij te kopen.
   */
  return "NIET BIJKOPEN";
}

/**
 * Eerste berekeningsronde:
 * live koers en marktwaarde per positie.
 */
function valuePositions({
  positions,
  snapshot,
  silverPriceUsd = null,
  goldPriceUsd = null,
}: {
  positions: PortfolioPosition[];
  snapshot: YahooMarketSnapshot;
  silverPriceUsd?: number | null;
  goldPriceUsd?: number | null;
}): Omit<
  ValuedPortfolioPosition,
  | "currentAllocation"
  | "allocationDifference"
  | "advice"
>[] {
  const referenceSilverPriceUsd =
    getReferenceSilverPriceUsd(
      snapshot,
    );

  const referenceGoldPriceUsd =
    getReferenceGoldPriceUsd(
      snapshot,
    );

  return positions.map((position) => {
    const quote = getSnapshotQuote({
      position,
      snapshot,
    });

    const currency = quote.currency;

    let localPrice = quote.price;
    let scenarioApplied = false;

let scenarioUpsidePercent:
  number | null = null;

let scenarioDriver:
  | "silver"
  | "gold"
  | "silver+gold"
  | null = null;

    /**
     * Fysiek zilver.
     */
    if (
      position.holding.id ===
      "holding-physical-silver"
    ) {
      const silverPricePerOunce =
        silverPriceUsd ??
        quote.price;

      localPrice =
        silverPricePerOunce !== null
          ? silverPricePerOunce /
            31.1034768
          : null;
          if (
  silverPriceUsd !== null &&
  referenceSilverPriceUsd !== null &&
  referenceSilverPriceUsd > 0
) {
  scenarioApplied = true;

  scenarioUpsidePercent =
    (
      silverPriceUsd /
        referenceSilverPriceUsd -
      1
    ) * 100;

  scenarioDriver = "silver";
}
    }

/**
 * Zilver ETF / ETC scenario.
 *
 * PHAG en 8PSB volgen fysiek zilver 1-op-1.
 * SLVR is een silver miners ETF en krijgt
 * een conservatieve leverage van 1.5x.
 */
if (
  silverPriceUsd !== null &&
  referenceSilverPriceUsd !== null &&
  referenceSilverPriceUsd > 0 &&
  quote.price !== null
) {
  let silverLeverage: number | null = null;

  switch (position.holding.id) {
    case "holding-phag":
    case "holding-8psb":
      silverLeverage = 1;
      break;

    case "holding-slvr":
      silverLeverage = 1.5;
      break;
  }

  if (silverLeverage !== null) {
    const silverChange =
      silverPriceUsd /
        referenceSilverPriceUsd -
      1;

    const multiplier =
      Math.max(
        0,
        1 +
          silverChange *
            silverLeverage,
      );

    localPrice =
      quote.price * multiplier;

    scenarioApplied = true;

    scenarioUpsidePercent =
      (multiplier - 1) * 100;

    scenarioDriver = "silver";
  }
}


    /**
     * Gecombineerde Silver + Gold
     * Scenario Engine voor bedrijven.
     */
    if (
      position.company &&
      quote.price !== null &&
      (
        silverPriceUsd !== null ||
        goldPriceUsd !== null
      )
    ) {
      const scenario =
        calculateMetalScenario({
          company: position.company,

          referenceSilverPriceUsd,
          scenarioSilverPriceUsd:
            silverPriceUsd,

          referenceGoldPriceUsd,
          scenarioGoldPriceUsd:
            goldPriceUsd,
        });

      if (scenario.isScenarioApplied) {
  localPrice =
    quote.price *
    scenario.estimatedPriceMultiplier;

  scenarioApplied = true;

  scenarioUpsidePercent =
    (
      scenario.estimatedPriceMultiplier -
      1
    ) * 100;

  const hasSilverDriver =
    scenario.silverLeverage > 0;

  const hasGoldDriver =
    scenario.goldLeverage > 0;

  scenarioDriver =
    hasSilverDriver &&
    hasGoldDriver
      ? "silver+gold"
      : hasSilverDriver
        ? "silver"
        : hasGoldDriver
          ? "gold"
          : null;
 }
  }

    const marketValueEur =
      calculateMarketValueEur({
        quantity: position.quantity,
        localPrice,
        currency,
        exchangeRates:
          snapshot.exchangeRates,
      });

    return {
  ...position,
  currency,
  quote,
  localPrice,
  marketValueEur,

  scenarioApplied,
  scenarioUpsidePercent,
  scenarioDriver,
};
  });
}

/**
 * Totale waarde van alle geprijsde posities.
 */
function calculateTotalMarketValue(
  positions: {
    marketValueEur: number | null;
  }[],
): number {
  return positions.reduce(
    (total, position) =>
      total +
      (position.marketValueEur ?? 0),
    0,
  );
}

/**
 * Bouwt de volledige portefeuille
 * op basis van één Yahoo-snapshot.
 */
export function buildValuedPortfolio({
  positions,
  snapshot,
  silverPriceUsd = null,
  goldPriceUsd = null,
}: {
  positions: PortfolioPosition[];
  snapshot: YahooMarketSnapshot;
  silverPriceUsd?: number | null;
  goldPriceUsd?: number | null;
}): ValuedPortfolioPosition[] {
  const initialPositions =
    valuePositions({
      positions,
      snapshot,
      silverPriceUsd,
      goldPriceUsd,
    });

  const totalMarketValueEur =
    calculateTotalMarketValue(
      initialPositions,
    );

  return initialPositions.map(
    (position) => {
      const currentAllocation =
        position.marketValueEur !== null &&
        totalMarketValueEur > 0
          ? (
              position.marketValueEur /
              totalMarketValueEur
            ) * 100
          : null;

      const allocationDifference =
        currentAllocation !== null &&
        position.isEquity
          ? position.targetAllocation -
            currentAllocation
          : null;

      const advice =
        determinePortfolioAdvice({
          position,
          currentAllocation,
        });

      return {
        ...position,

        currentAllocation,
        allocationDifference,

        advice,
      };
    },
  );
}

/**
 * Berekent alle portefeuilletotalen.
 */
export function calculatePortfolioTotals(
  positions: ValuedPortfolioPosition[],
): PortfolioTotals {
  const totals: PortfolioTotals = {
    totalMarketValueEur: 0,

    pricedPositions: 0,
    unpricedPositions: 0,

    equityValueEur: 0,
    etfValueEur: 0,
    physicalValueEur: 0,

    silverValueEur: 0,
    goldValueEur: 0,
    mixedValueEur: 0,
    separateValueEur: 0,
  };

  for (const position of positions) {
    const value =
      position.marketValueEur;

    if (value === null) {
      totals.unpricedPositions += 1;
      continue;
    }

    totals.pricedPositions += 1;

    totals.totalMarketValueEur +=
      value;

    if (
      position.holding.type ===
      "equity"
    ) {
      totals.equityValueEur += value;
    } else if (
      position.holding.type === "etf"
    ) {
      totals.etfValueEur += value;
    } else {
      totals.physicalValueEur += value;
    }

    const commodity =
      position.company?.commodity;

    if (commodity === "silver") {
      totals.silverValueEur += value;
    } else if (
      commodity === "gold"
    ) {
      totals.goldValueEur += value;
    } else if (
      commodity === "mixed"
    ) {
      totals.mixedValueEur += value;
    } else {
      totals.separateValueEur += value;
    }
  }

  return totals;
}

/**
 * Centrale live-portefeuillefunctie.
 *
 * Pagina's roepen voortaan deze functie aan:
 *
 * const portfolio = await getLivePortfolio();
 */
export async function getLivePortfolio({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<LivePortfolio> {
  const currentWorkspace =
  await getCurrentWorkspace();

const [
  snapshot,
  workspaceHoldings,
  workspaceSettings,
] = await Promise.all([
  getYahooMarketSnapshot({
    forceRefresh,
  }),
  currentWorkspace.type === "scenario"
  ? getWorkspaceHoldings("live")
  : getWorkspaceHoldings(),
  readWorkspaceSettings(
    currentWorkspace.id,
  ),
]);

  const portfolioPositions =
    buildPortfolioPositions(
      workspaceHoldings,
    );

  const positions =
  buildValuedPortfolio({
    positions: portfolioPositions,
    snapshot,
    silverPriceUsd:
      workspaceSettings.silverPriceUsd,
    goldPriceUsd:
      workspaceSettings.goldPriceUsd,
  });

  const totals =
  calculatePortfolioTotals(
    positions,
  );

const portfolioV2 =
  calculatePortfolioV2(
    positions
      .filter(
        (position) =>
          position.isEquity &&
          position.company &&
          position.marketValueEur !== null,
      )
      .map((position) => ({
        companyId:
          position.company!.id,

        marketValueEur:
          position.marketValueEur!,
      })),
  );
const referenceSilverPriceUsd =
  getReferenceSilverPriceUsd(
    snapshot,
  );

const referenceGoldPriceUsd =
  getReferenceGoldPriceUsd(
    snapshot,
  );

  return {
    positions,
    totals,

    portfolioV2,

    referenceSilverPriceUsd,
referenceGoldPriceUsd,

    exchangeRates:
      snapshot.exchangeRates,

    fetchedAt:
      snapshot.fetchedAt,

    expiresAt:
      snapshot.expiresAt,

    requestedSymbols:
      snapshot.requestedSymbols,

    successfulSymbols:
      snapshot.successfulSymbols,

    failedSymbols:
      snapshot.failedSymbols,

    errors:
      snapshot.errors,
  };
}

export async function getMetalScenario({
  silverPriceUsd = null,
  goldPriceUsd = null,
  forceRefresh = false,
}: MetalScenarioInput & {
  forceRefresh?: boolean;
} = {}): Promise<MetalScenarioResult> {
  const [snapshot, liveHoldings] =
    await Promise.all([
      getYahooMarketSnapshot({
        forceRefresh,
      }),
      getWorkspaceHoldings("live"),
    ]);

  const portfolioPositions =
    buildPortfolioPositions(
      liveHoldings,
    );

  const livePositions =
    buildValuedPortfolio({
      positions: portfolioPositions,
      snapshot,
    });

  const scenarioPositions =
    buildValuedPortfolio({
      positions: portfolioPositions,
      snapshot,
      silverPriceUsd,
      goldPriceUsd,
    });

  const liveValueEur =
    calculatePortfolioTotals(
      livePositions,
    ).totalMarketValueEur;

  const scenarioValueEur =
    calculatePortfolioTotals(
      scenarioPositions,
    ).totalMarketValueEur;

  const differenceEur =
    scenarioValueEur - liveValueEur;

  const returnPercent =
    liveValueEur > 0
      ? (differenceEur / liveValueEur) * 100
      : 0;

      const drivers =
  scenarioPositions
    .map((scenarioPosition) => {
      const livePosition =
        livePositions.find(
          (position) =>
            position.holding.id ===
            scenarioPosition.holding.id,
        );

      if (
        !livePosition ||
        livePosition.marketValueEur === null ||
        scenarioPosition.marketValueEur === null
      ) {
        return null;
      }

      const contributionEur =
        scenarioPosition.marketValueEur -
        livePosition.marketValueEur;

      if (
        Math.abs(contributionEur) <
        0.01
      ) {
        return null;
      }

      return {
        id:
          scenarioPosition.holding.id,

        name:
          scenarioPosition.name,

        contributionEur,
      };
    })
    .filter(
      (
        item,
      ): item is {
        id: string;
        name: string;
        contributionEur: number;
      } => item !== null,
    )
    .sort(
      (a, b) =>
        Math.abs(b.contributionEur) -
        Math.abs(a.contributionEur),
    )
    .slice(0, 5);

  return {
    silverPriceUsd,
    goldPriceUsd,
    liveValueEur,
    scenarioValueEur,
    differenceEur,
    returnPercent,
    drivers,
  };
}

export async function getScenarioComparison({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<ScenarioComparison> {
  const [snapshot, liveHoldings] =
    await Promise.all([
      getYahooMarketSnapshot({
        forceRefresh,
      }),
      getWorkspaceHoldings("live"),
    ]);

  const portfolioPositions =
    buildPortfolioPositions(
      liveHoldings,
    );

  const livePositions =
    buildValuedPortfolio({
      positions: portfolioPositions,
      snapshot,
    });

  const silver100Positions =
    buildValuedPortfolio({
      positions: portfolioPositions,
      snapshot,
      silverPriceUsd: 100,
    });

  const silver300Positions =
    buildValuedPortfolio({
      positions: portfolioPositions,
      snapshot,
      silverPriceUsd: 300,
    });

  const liveValueEur =
    calculatePortfolioTotals(
      livePositions,
    ).totalMarketValueEur;

  const silver100ValueEur =
    calculatePortfolioTotals(
      silver100Positions,
    ).totalMarketValueEur;

  const silver300ValueEur =
    calculatePortfolioTotals(
      silver300Positions,
    ).totalMarketValueEur;

  const silver100DifferenceEur =
    silver100ValueEur -
    liveValueEur;

  const silver300DifferenceEur =
    silver300ValueEur -
    liveValueEur;

  const silver100ReturnPercent =
    liveValueEur > 0
      ? (
          silver100DifferenceEur /
          liveValueEur
        ) * 100
      : 0;

  const silver300ReturnPercent =
    liveValueEur > 0
      ? (
          silver300DifferenceEur /
          liveValueEur
        ) * 100
      : 0;

  return {
    liveValueEur,
    silver100ValueEur,
    silver300ValueEur,

    silver100DifferenceEur,
    silver300DifferenceEur,

    silver100ReturnPercent,
    silver300ReturnPercent,
  };
}