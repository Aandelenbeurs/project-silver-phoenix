import "server-only";

import YahooFinance from "yahoo-finance2";

import {
  companies,
} from "../data/companies";

import {
  createPriceQuote,
  defaultExchangeRates,
  type ExchangeRates,
  type PriceQuote,
  type SupportedCurrency,
} from "../data/prices";

const CACHE_DURATION_MS = 5 * 60 * 1000;

const yahooFinance = new YahooFinance({
  quoteCombine: {
    debounceTime: 50,
    maxSymbolsPerRequest: 100,
  },
});

type YahooQuote = {
  symbol?: string;
  currency?: string;

  regularMarketPrice?: number;
  regularMarketPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
  regularMarketTime?: Date | string | number;

  marketCap?: number;
  exchange?: string;
  fullExchangeName?: string;
  quoteType?: string;
  shortName?: string;
  longName?: string;
};

export type YahooInstrumentType =
  | "company"
  | "etf"
  | "physical"
  | "currency";

export type YahooInstrument = {
  id: string;
  symbol: string;
  type: YahooInstrumentType;

  /**
   * Alleen gebruiken wanneer Yahoo een onhandige of
   * foutieve valuta teruggeeft voor de gekozen notering.
   */
  currencyOverride?: SupportedCurrency;
};

export type MarketInstrumentResult = {
  id: string;
  symbol: string;
  type: YahooInstrumentType;

  quote: PriceQuote;

  marketCap: number | null;
  exchange: string | null;
  quoteType: string | null;
  displayName: string | null;
};

export type YahooMarketSnapshot = {
  instruments: Record<string, MarketInstrumentResult>;
  exchangeRates: ExchangeRates;

  requestedSymbols: number;
  successfulSymbols: number;
  failedSymbols: number;

  errors: Record<string, string>;

  fetchedAt: string;
  expiresAt: string;
};

type CachedSnapshot = {
  snapshot: YahooMarketSnapshot;
  expiresAtMs: number;
};

const additionalInstruments: YahooInstrument[] = [
  {
    id: "phag",
    symbol: "PHAG.L",
    type: "etf",
    currencyOverride: "USD",
  },
  {
    id: "8psb",
    symbol: "8PSB.DE",
    type: "etf",
    currencyOverride: "EUR",
  },
  {
    id: "slvr",
    symbol: "SLVR.L",
    type: "etf",
    currencyOverride: "USD",
  },
  {
    id: "physical-silver",
    symbol: "SI=F",
    type: "physical",
    currencyOverride: "USD",
  },

  {
  id: "physical-gold",
  symbol: "GC=F",
  type: "physical",
  currencyOverride: "USD",
},
];

const currencyInstruments: YahooInstrument[] = [
  {
    id: "fx-eur-usd",
    symbol: "EURUSD=X",
    type: "currency",
  },
  {
    id: "fx-eur-cad",
    symbol: "EURCAD=X",
    type: "currency",
  },
  {
    id: "fx-eur-aud",
    symbol: "EURAUD=X",
    type: "currency",
  },
  {
    id: "fx-eur-hkd",
    symbol: "EURHKD=X",
    type: "currency",
  },
  {
    id: "fx-eur-gbp",
    symbol: "EURGBP=X",
    type: "currency",
  },
];

let cachedSnapshot: CachedSnapshot | null = null;
let activeRequest: Promise<YahooMarketSnapshot> | null = null;

/**
 * Alle door PSP benodigde Yahoo-instrumenten.
 *
 * Bedrijven zonder yahooSymbol worden niet automatisch
 * opgevraagd en blijven afhankelijk van een handmatige fallback.
 */
export function getYahooInstruments(): YahooInstrument[] {
  const companyInstruments: YahooInstrument[] =
    companies.flatMap((company) => {
      const instruments: YahooInstrument[] = [];

      if (
        typeof company.yahooSymbol === "string" &&
        company.yahooSymbol.trim().length > 0
      ) {
        instruments.push({
          id: company.id,
          symbol: company.yahooSymbol,
          type: "company",
        });
      }

      if (
        typeof company.europeanYahooSymbol === "string" &&
        company.europeanYahooSymbol.trim().length > 0
      ) {
        instruments.push({
          id: `${company.id}-europe`,
          symbol: company.europeanYahooSymbol,
          type: "company",
        });
      }

      return instruments;
    });

  return [
    ...companyInstruments,
    ...additionalInstruments,
    ...currencyInstruments,
  ];
}

/**
 * Yahoo gebruikt voor sommige Londense noteringen "GBp":
 * Britse pence in plaats van Britse ponden.
 *
 * £1 = 100 GBp, dus de koers moet door 100.
 */
function normalizeCurrency({
  yahooCurrency,
  currencyOverride,
}: {
  yahooCurrency?: string;
  currencyOverride?: SupportedCurrency;
}): {
  currency: SupportedCurrency;
  priceMultiplier: number;
} {
  if (currencyOverride) {
    return {
      currency: currencyOverride,
      priceMultiplier: 1,
    };
  }

  const normalized =
    yahooCurrency?.trim().toUpperCase();

  if (normalized === "GBP") {
    return {
      currency: "GBP",
      priceMultiplier: 1,
    };
  }

  if (
    normalized === "GBPENCE" ||
    normalized === "GBX" ||
    normalized === "GBP."
  ) {
    return {
      currency: "GBP",
      priceMultiplier: 0.01,
    };
  }

  if (normalized === "USD") {
    return {
      currency: "USD",
      priceMultiplier: 1,
    };
  }

  if (normalized === "CAD") {
    return {
      currency: "CAD",
      priceMultiplier: 1,
    };
  }

  if (normalized === "AUD") {
    return {
      currency: "AUD",
      priceMultiplier: 1,
    };
  }

  if (normalized === "HKD") {
    return {
      currency: "HKD",
      priceMultiplier: 1,
    };
  }

  return {
    currency: "EUR",
    priceMultiplier: 1,
  };
}

function normalizeDate(
  value: Date | string | number | undefined,
): string | null {
  if (value === undefined) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function safeNumber(
  value: unknown,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value)
    ? value
    : null;
}

function createUnavailableResult(
  instrument: YahooInstrument,
  error: string,
): MarketInstrumentResult {
  const currency =
    instrument.currencyOverride ?? "EUR";

  return {
    id: instrument.id,
    symbol: instrument.symbol,
    type: instrument.type,

    quote: createPriceQuote({
      symbol: instrument.symbol,
      currency,
      price: null,
      previousClose: null,
      source: "unavailable",
      updatedAt: null,
      error,
    }),

    marketCap: null,
    exchange: null,
    quoteType: null,
    displayName: null,
  };
}

function mapYahooQuote({
  instrument,
  yahooQuote,
}: {
  instrument: YahooInstrument;
  yahooQuote: YahooQuote;
}): MarketInstrumentResult {
  const {
    currency,
    priceMultiplier,
  } = normalizeCurrency({
    yahooCurrency: yahooQuote.currency,
    currencyOverride:
      instrument.currencyOverride,
  });

  const rawPrice = safeNumber(
    yahooQuote.regularMarketPrice,
  );

  const rawPreviousClose = safeNumber(
    yahooQuote.regularMarketPreviousClose,
  );

  const price =
    rawPrice === null
      ? null
      : rawPrice * priceMultiplier;

  const previousClose =
    rawPreviousClose === null
      ? null
      : rawPreviousClose * priceMultiplier;

  const updatedAt = normalizeDate(
    yahooQuote.regularMarketTime,
  );

  return {
    id: instrument.id,
    symbol: instrument.symbol,
    type: instrument.type,

    quote: createPriceQuote({
      symbol: instrument.symbol,
      currency,
      price,
      previousClose,
      source:
        price === null
          ? "unavailable"
          : instrument.type === "physical"
            ? "physical"
            : "yahoo",
      updatedAt,
      error:
        price === null
          ? "Yahoo retourneerde geen geldige marktprijs."
          : undefined,
    }),

    marketCap: safeNumber(
      yahooQuote.marketCap,
    ),

    exchange:
      yahooQuote.fullExchangeName ??
      yahooQuote.exchange ??
      null,

    quoteType:
      yahooQuote.quoteType ?? null,

    displayName:
      yahooQuote.longName ??
      yahooQuote.shortName ??
      null,
  };
}

/**
 * Zet de Yahoo-resultaten altijd om naar een object
 * met het symbool als sleutel.
 */
function normalizeQuoteResponse(
  response:
    | YahooQuote[]
    | Record<string, YahooQuote>,
): Record<string, YahooQuote> {
  if (Array.isArray(response)) {
    return Object.fromEntries(
      response
        .filter(
          (
            quote,
          ): quote is YahooQuote & {
            symbol: string;
          } =>
            typeof quote.symbol === "string",
        )
        .map((quote) => [
          quote.symbol,
          quote,
        ]),
    );
  }

  return response;
}

/**
 * Haalt alle symbolen in één batch op.
 *
 * Met circa 50 symbolen blijven we onder de standaardlimiet
 * van 100 symbolen per Yahoo-request.
 */

async function fetchSingleChartQuote(
  symbol: string,
): Promise<YahooQuote> {
  const chart =
    (await yahooFinance.chart(
      symbol,
      {
        period1: new Date(
          Date.now() -
            7 *
              24 *
              60 *
              60 *
              1000,
        ),
      },
      {
        validateResult: false,
      },
    )) as {
      meta: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        currency?: string;
        regularMarketTime?:
          | Date
          | string
          | number;
        exchangeName?: string;
        instrumentType?: string;
        shortName?: string;
      };
      quotes: Array<{
  close?: number;
}>;
    };

  const meta = chart.meta;

  const regularMarketPrice =
    safeNumber(
      meta.regularMarketPrice,
    );

  const previousQuote =
  chart.quotes.length >= 2
    ? chart.quotes[
        chart.quotes.length - 2
      ]
    : null;

const previousClose =
  safeNumber(
    previousQuote?.close ??
      meta.chartPreviousClose,
  );

  return {
    symbol,

    currency:
      typeof meta.currency === "string"
        ? meta.currency
        : undefined,

    regularMarketPrice:
      regularMarketPrice ?? undefined,

    regularMarketPreviousClose:
      previousClose ?? undefined,

    regularMarketChange:
      regularMarketPrice !== null &&
      previousClose !== null
        ? regularMarketPrice -
          previousClose
        : undefined,

    regularMarketChangePercent:
      regularMarketPrice !== null &&
      previousClose !== null &&
      previousClose !== 0
        ? ((regularMarketPrice -
            previousClose) /
            previousClose) *
          100
        : undefined,

    regularMarketTime:
      meta.regularMarketTime,

    exchange:
      typeof meta.exchangeName ===
      "string"
        ? meta.exchangeName
        : undefined,

    quoteType:
      typeof meta.instrumentType ===
      "string"
        ? meta.instrumentType
        : undefined,

    shortName:
      typeof meta.shortName ===
      "string"
        ? meta.shortName
        : undefined,
  };
}

  async function fetchBatchQuotes(
  symbols: string[],
): Promise<Record<string, YahooQuote>> {
  if (symbols.length === 0) {
    return {};
  }

  const firstAttempt =
    await Promise.allSettled(
      symbols.map((symbol) =>
        fetchSingleChartQuote(symbol),
      ),
    );

  const quotes: Record<
    string,
    YahooQuote
  > = {};

  const failedSymbols: string[] = [];

  firstAttempt.forEach(
    (result, index) => {
      const symbol = symbols[index];

      if (result.status === "fulfilled") {
        quotes[symbol] = result.value;
      } else {
        failedSymbols.push(symbol);
      }
    },
  );

  /**
   * Eén retry voor symbolen die bij de
   * eerste parallelle fetch mislukten.
   */
  if (failedSymbols.length > 0) {
    const retry =
      await Promise.allSettled(
        failedSymbols.map((symbol) =>
          fetchSingleChartQuote(symbol),
        ),
      );

    retry.forEach(
      (result, index) => {
        if (result.status !== "fulfilled") {
          return;
        }

        const symbol =
          failedSymbols[index];

        quotes[symbol] = result.value;
      },
    );
  }

  if (Object.keys(quotes).length === 0) {
    throw new Error(
      "Alle Yahoo chart-aanvragen zijn mislukt.",
    );
  }

  return quotes;
}

/**
 * Fallback wanneer de volledige batchaanvraag mislukt.
 *
 * Kleine batches voorkomen dat één problematisch symbool
 * alle overige resultaten blokkeert.
 */
async function fetchQuotesWithFallback(
  symbols: string[],
): Promise<{
  quotes: Record<string, YahooQuote>;
  batchErrors: string[];
}> {
  try {
    const quotes =
      await fetchBatchQuotes(symbols);

    return {
      quotes,
      batchErrors: [],
    };
  } catch (error) {
    const chunkSize = 15;

    const chunks: string[][] = [];

    for (
      let index = 0;
      index < symbols.length;
      index += chunkSize
    ) {
      chunks.push(
        symbols.slice(
          index,
          index + chunkSize,
        ),
      );
    }

    const settled =
      await Promise.allSettled(
        chunks.map((chunk) =>
          fetchBatchQuotes(chunk),
        ),
      );

    const quotes: Record<
      string,
      YahooQuote
    > = {};

    const batchErrors: string[] = [];

    settled.forEach(
      (result, index) => {
        if (result.status === "fulfilled") {
          Object.assign(
            quotes,
            result.value,
          );

          return;
        }

        const chunk =
          chunks[index];

        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);

        batchErrors.push(
          `${chunk.join(", ")}: ${reason}`,
        );
      },
    );

    return {
      quotes,
      batchErrors: [
        `Volledige batch mislukt: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
        ...batchErrors,
      ],
    };
  }
}

function inverseRate(
  value: number | null,
  fallback: number,
): number {
  if (
    value === null ||
    value <= 0 ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return 1 / value;
}

/**
 * Yahoo retourneert EURUSD=X als:
 *
 * €1 = x USD
 *
 * PSP gebruikt:
 *
 * $1 = x EUR
 *
 * Daarom nemen we voor alle valutaparen de inverse.
 */
function buildExchangeRates(
  results: Record<
    string,
    MarketInstrumentResult
  >,
): ExchangeRates {
  return {
    EUR: 1,

    USD: inverseRate(
      results["fx-eur-usd"]
        ?.quote.price ?? null,
      defaultExchangeRates.USD,
    ),

    CAD: inverseRate(
      results["fx-eur-cad"]
        ?.quote.price ?? null,
      defaultExchangeRates.CAD,
    ),

    AUD: inverseRate(
      results["fx-eur-aud"]
        ?.quote.price ?? null,
      defaultExchangeRates.AUD,
    ),

    HKD: inverseRate(
      results["fx-eur-hkd"]
        ?.quote.price ?? null,
      defaultExchangeRates.HKD,
    ),

    GBP: inverseRate(
      results["fx-eur-gbp"]
        ?.quote.price ?? null,
      defaultExchangeRates.GBP,
    ),
  };
}

function shouldUseEuropeanQuote(): boolean {
  const now =
    new Date();

  const amsterdamParts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "Europe/Amsterdam",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).formatToParts(now);

  const torontoParts =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone:
          "America/Toronto",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).formatToParts(now);

  function getPart(
    parts: Intl.DateTimeFormatPart[],
    type:
      | "weekday"
      | "hour"
      | "minute",
  ): string {
    return (
      parts.find(
        (part) =>
          part.type === type,
      )?.value ?? ""
    );
  }

  const amsterdamWeekday =
    getPart(
      amsterdamParts,
      "weekday",
    );

  const torontoWeekday =
    getPart(
      torontoParts,
      "weekday",
    );

  const weekdays =
    new Set([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
    ]);

  if (
    !weekdays.has(
      amsterdamWeekday,
    ) ||
    !weekdays.has(
      torontoWeekday,
    )
  ) {
    return false;
  }

  const amsterdamMinutes =
    Number(
      getPart(
        amsterdamParts,
        "hour",
      ),
    ) *
      60 +
    Number(
      getPart(
        amsterdamParts,
        "minute",
      ),
    );

  const torontoMinutes =
    Number(
      getPart(
        torontoParts,
        "hour",
      ),
    ) *
      60 +
    Number(
      getPart(
        torontoParts,
        "minute",
      ),
    );

  const europeanStart =
    8 * 60;

  const northAmericanOpen =
    9 * 60 + 30;

  return (
    amsterdamMinutes >=
      europeanStart &&
    torontoMinutes <
      northAmericanOpen
  );
}

async function createYahooSnapshot(): Promise<YahooMarketSnapshot> {
  const instruments =
    getYahooInstruments();

  const symbols = [
    ...new Set(
      instruments.map(
        (instrument) =>
          instrument.symbol,
      ),
    ),
  ];

  const {
    quotes,
    batchErrors,
  } = await fetchQuotesWithFallback(
    symbols,
  );

  const instrumentResults: Record<
    string,
    MarketInstrumentResult
  > = {};

  const errors: Record<
    string,
    string
  > = {};

  for (const instrument of instruments) {
    const yahooQuote =
      quotes[instrument.symbol];

    if (!yahooQuote) {
      const error =
        "Yahoo retourneerde geen resultaat voor dit symbool.";

      instrumentResults[instrument.id] =
        createUnavailableResult(
          instrument,
          error,
        );

      errors[instrument.id] = error;

      continue;
    }

    const result = mapYahooQuote({
      instrument,
      yahooQuote,
    });

    instrumentResults[instrument.id] =
      result;

    if (result.quote.price === null) {
      errors[instrument.id] =
        result.quote.error ??
        "Geen geldige koers beschikbaar.";
    }
  }

  if (shouldUseEuropeanQuote()) {
  for (const company of companies) {
    if (
      typeof company.europeanYahooSymbol !== "string" ||
      company.europeanYahooSymbol.trim().length === 0
    ) {
      continue;
    }

    const europeanId =
      `${company.id}-europe`;

    const europeanResult =
      instrumentResults[europeanId];

    if (
      !europeanResult ||
      europeanResult.quote.price === null
    ) {
      continue;
    }

    instrumentResults[company.id] = {
      ...europeanResult,
      id: company.id,
    };
  }
}

  batchErrors.forEach(
    (error, index) => {
      errors[`batch-${index + 1}`] =
        error;
    },
  );

  const fetchedAtDate = new Date();

  const expiresAtDate = new Date(
    fetchedAtDate.getTime() +
      CACHE_DURATION_MS,
  );

  const successfulSymbols =
    instruments.filter(
      (instrument) =>
        instrumentResults[instrument.id]
          ?.quote.price !== null,
    ).length;

  return {
    instruments: instrumentResults,

    exchangeRates:
      buildExchangeRates(
        instrumentResults,
      ),

    requestedSymbols:
      instruments.length,

    successfulSymbols,

    failedSymbols:
      instruments.length -
      successfulSymbols,

    errors,

    fetchedAt:
      fetchedAtDate.toISOString(),

    expiresAt:
      expiresAtDate.toISOString(),
  };
}

/**
 * Centrale functie voor marktdata.
 *
 * - gebruikt vijf minuten cache;
 * - deelt één lopend verzoek tussen gelijktijdige pagina-aanvragen;
 * - forceRefresh=true negeert de bestaande cache.
 */
export async function getYahooMarketSnapshot({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<YahooMarketSnapshot> {
  const now = Date.now();

  if (
    !forceRefresh &&
    cachedSnapshot &&
    cachedSnapshot.expiresAtMs > now
  ) {
    return cachedSnapshot.snapshot;
  }

  if (!forceRefresh && activeRequest) {
    return activeRequest;
  }

  activeRequest =
    createYahooSnapshot();

  try {
    const snapshot =
      await activeRequest;

    cachedSnapshot = {
      snapshot,
      expiresAtMs:
        Date.parse(snapshot.expiresAt),
    };

    return snapshot;
  } finally {
    activeRequest = null;
  }
}

/**
 * Verwijdert de lokale servercache.
 */
export function clearYahooCache(): void {
  cachedSnapshot = null;
}

/**
 * Haalt één resultaat uit de gecachete snapshot.
 */
export async function getYahooInstrument(
  instrumentId: string,
): Promise<
  MarketInstrumentResult | undefined
> {
  const snapshot =
    await getYahooMarketSnapshot();

  return snapshot.instruments[
    instrumentId
  ];
}

export type YahooHistoricalPoint = {
  date: string;
  close: number;
};

export type YahooHistoricalSeries = {
  symbol: string;
  points: YahooHistoricalPoint[];
};

export async function getYahooHistoricalSeries({
  symbol,
  days = 365,
}: {
  symbol: string;
  days?: number;
}): Promise<YahooHistoricalSeries> {
  const period1 =
    new Date(
      Date.now() -
        days *
          24 *
          60 *
          60 *
          1000,
    );

  const chart =
    (await yahooFinance.chart(
      symbol,
      {
        period1,
        interval: "1d",
      },
      {
        validateResult: false,
      },
    )) as {
      quotes: Array<{
        date?: Date | string | number;
        close?: number;
      }>;
    };

  const points =
    chart.quotes
      .map((quote) => {
        const close =
          safeNumber(
            quote.close,
          );

        const date =
          quote.date !== undefined
            ? normalizeDate(
                quote.date,
              )
            : null;

        if (
          close === null ||
          date === null
        ) {
          return null;
        }

        return {
          date,
          close,
        };
      })
      .filter(
        (
          point,
        ): point is YahooHistoricalPoint =>
          point !== null,
      );

  return {
    symbol,
    points,
  };
}