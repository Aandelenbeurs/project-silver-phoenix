import {
  buildPortfolioPositions,
  type PortfolioPosition,
} from "./portfolio";

import {
  getWorkspaceHoldings,
} from "./workspace-provider";import {
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

  currentAllocation: number | null;
  allocationDifference: number | null;

  advice: PortfolioAdvice;
  priorityScore: number;
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

  buyQueue: ValuedPortfolioPosition[];
  sellQueue: ValuedPortfolioPosition[];

  exchangeRates: ExchangeRates;

  fetchedAt: string;
  expiresAt: string;

  requestedSymbols: number;
  successfulSymbols: number;
  failedSymbols: number;

  errors: Record<string, string>;
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

/**
 * Phoenix Priority Score.
 *
 * Hogere Master Score en grotere onderweging
 * leveren een hogere koopprioriteit op.
 */
export function calculatePriorityScore({
  position,
  currentAllocation,
}: {
  position: PortfolioPosition;
  currentAllocation: number | null;
}): number {
  if (
    !position.isEquity ||
    !position.hasValidScore ||
    position.masterScore === null ||
    currentAllocation === null ||
    position.targetAllocation <=
      currentAllocation
  ) {
    return 0;
  }

  const underweight =
    position.targetAllocation -
    currentAllocation;

  return (
    position.masterScore *
    underweight
  );
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
  | "priorityScore"
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

      const priorityScore =
        calculatePriorityScore({
          position,
          currentAllocation,
        });

      return {
        ...position,

        currentAllocation,
        allocationDifference,

        advice,
        priorityScore,
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
 * Hoogste koopprioriteit eerst.
 */
export function getBuyQueue(
  positions: ValuedPortfolioPosition[],
): ValuedPortfolioPosition[] {
  return [...positions]
    .filter(
      (position) =>
        position.priorityScore > 0 &&
        (
          position.advice ===
            "STERK BIJKOPEN" ||
          position.advice ===
            "BIJKOPEN"
        ),
    )
    .sort(
      (a, b) =>
        b.priorityScore -
        a.priorityScore,
    );
}

/**
 * Verkoop- en afbouwkandidaten.
 */
export function getSellQueue(
  positions: ValuedPortfolioPosition[],
): ValuedPortfolioPosition[] {
  return [...positions]
    .filter(
      (position) =>
        position.advice ===
          "AFBOUWEN" ||
        position.advice ===
          "UITSTAPPEN",
    )
    .sort((a, b) => {
      if (
        a.advice === "UITSTAPPEN" &&
        b.advice !== "UITSTAPPEN"
      ) {
        return -1;
      }

      if (
        b.advice === "UITSTAPPEN" &&
        a.advice !== "UITSTAPPEN"
      ) {
        return 1;
      }

      return (
        (a.allocationDifference ?? 0) -
        (b.allocationDifference ?? 0)
      );
    });
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
  getWorkspaceHoldings(),
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

  const buyQueue =
    getBuyQueue(positions);

  const sellQueue =
    getSellQueue(positions);

  return {
    positions,
    totals,

    buyQueue,
    sellQueue,

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