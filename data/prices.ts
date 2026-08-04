export type SupportedCurrency =
  | "EUR"
  | "USD"
  | "CAD"
  | "AUD"
  | "HKD"
  | "GBP";

export type PriceSource =
  | "yahoo"
  | "manual"
  | "physical"
  | "unavailable";

export type PriceQuote = {
  symbol: string;
  currency: SupportedCurrency;

  price: number | null;
  previousClose: number | null;
  dayChange: number | null;
  dayChangePercent: number | null;

  source: PriceSource;
  updatedAt: string | null;
  error?: string;
};

export type ExchangeRates = {
  EUR: 1;
  USD: number;
  CAD: number;
  AUD: number;
  HKD: number;
  GBP: number;
};

/**
 * Alle wisselkoersen betekenen:
 *
 * 1 eenheid vreemde valuta = x euro
 *
 * Voorbeeld:
 * CAD: 0.64
 * betekent:
 * C$1 = €0,64
 */
export const defaultExchangeRates: ExchangeRates = {
  EUR: 1,
  USD: 0.92,
  CAD: 0.64,
  AUD: 0.55,
  HKD: 0.118,
  GBP: 1.16,
};

/**
 * Handmatige fallbackkoersen.
 *
 * Deze worden alleen gebruikt wanneer:
 * - Yahoo Finance het aandeel niet vindt;
 * - een notering tijdelijk is geschorst;
 * - de ticker nog niet correct is gekoppeld;
 * - je bewust zelf een koers wilt gebruiken.
 *
 * Waarden zijn in de lokale beursvaluta.
 */
export const manualPrices: Record<string, number | null> = {
  "alaska-silver": null,
  americore: null,

  phag: null,
  "8psb": null,
  slvr: null,

  "physical-silver": null,
};

/**
 * Tijdelijke opslag voor actuele koersquotes.
 *
 * In Sprint 2.2 wordt deze data automatisch gevuld
 * via de koers-API.
 */
export const priceQuotes: Record<string, PriceQuote> = {};

/**
 * Zet een lokale koers om naar euro.
 */
export function convertPriceToEur(
  price: number,
  currency: SupportedCurrency,
  exchangeRates: ExchangeRates = defaultExchangeRates,
): number {
  return price * exchangeRates[currency];
}

/**
 * Berekent het absolute dagverschil.
 */
export function calculateDayChange(
  price: number | null,
  previousClose: number | null,
): number | null {
  if (
    price === null ||
    previousClose === null
  ) {
    return null;
  }

  return price - previousClose;
}

/**
 * Berekent de procentuele dagverandering.
 */
export function calculateDayChangePercent(
  price: number | null,
  previousClose: number | null,
): number | null {
  if (
    price === null ||
    previousClose === null ||
    previousClose === 0
  ) {
    return null;
  }

  return (
    ((price - previousClose) / previousClose) *
    100
  );
}

/**
 * Maakt een complete koersquote.
 */
export function createPriceQuote({
  symbol,
  currency,
  price,
  previousClose,
  source,
  updatedAt = null,
  error,
}: {
  symbol: string;
  currency: SupportedCurrency;
  price: number | null;
  previousClose: number | null;
  source: PriceSource;
  updatedAt?: string | null;
  error?: string;
}): PriceQuote {
  return {
    symbol,
    currency,
    price,
    previousClose,
    dayChange: calculateDayChange(
      price,
      previousClose,
    ),
    dayChangePercent:
      calculateDayChangePercent(
        price,
        previousClose,
      ),
    source,
    updatedAt,
    error,
  };
}

/**
 * Geeft de bekende koersquote terug.
 */
export function getPriceQuote(
  companyId: string,
): PriceQuote | undefined {
  return priceQuotes[companyId];
}

/**
 * Geeft eerst een automatische koers terug.
 * Wanneer die ontbreekt, gebruikt de functie
 * een eventuele handmatige fallback.
 */
export function getEffectivePrice({
  companyId,
  currency,
}: {
  companyId: string;
  currency: SupportedCurrency;
}): PriceQuote {
  const automaticQuote =
    priceQuotes[companyId];

  if (
    automaticQuote &&
    automaticQuote.price !== null
  ) {
    return automaticQuote;
  }

  const manualPrice =
    manualPrices[companyId];

  if (
    manualPrice !== undefined &&
    manualPrice !== null
  ) {
    return createPriceQuote({
      symbol: companyId,
      currency,
      price: manualPrice,
      previousClose: null,
      source: "manual",
      updatedAt: null,
    });
  }

  return createPriceQuote({
    symbol: companyId,
    currency,
    price: null,
    previousClose: null,
    source: "unavailable",
    updatedAt: null,
    error: "Geen actuele of handmatige koers beschikbaar.",
  });
}

/**
 * Berekent de marktwaarde van een positie
 * in lokale valuta.
 */
export function calculateLocalMarketValue(
  quantity: number,
  localPrice: number | null,
): number | null {
  if (localPrice === null) {
    return null;
  }

  return quantity * localPrice;
}

/**
 * Berekent de marktwaarde van een positie
 * in euro.
 */
export function calculateMarketValueEur({
  quantity,
  localPrice,
  currency,
  exchangeRates = defaultExchangeRates,
}: {
  quantity: number;
  localPrice: number | null;
  currency: SupportedCurrency;
  exchangeRates?: ExchangeRates;
}): number | null {
  const localValue =
    calculateLocalMarketValue(
      quantity,
      localPrice,
    );

  if (localValue === null) {
    return null;
  }

  return convertPriceToEur(
    localValue,
    currency,
    exchangeRates,
  );
}

/**
 * Veilige formatter voor bedragen in euro.
 */
export function formatEur(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Veilige formatter voor lokale koersen.
 */
export function formatLocalPrice(
  value: number | null,
  currency: SupportedCurrency,
): string {
  if (value === null) {
    return "—";
  }

  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Veilige formatter voor percentages.
 */
export function formatPercent(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return `${value.toFixed(2)}%`;
}