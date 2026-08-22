import {
  convertPriceToEur,
  type ExchangeRates,
} from "./prices";

export type CostBasisEntry = {
  companyId: string;

  averageCost: number;

  currency:
    | "EUR"
    | "CAD"
    | "USD"
    | "AUD"
    | "HKD";

  source: "PORTFOLIO_PDF";

  isApproximate: boolean;
};

export const costBasisByCompanyId:
  Record<string, CostBasisEntry> = {

  "silver-x": {
    companyId: "silver-x",
    averageCost: 0.1215,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "impact-silver": {
    companyId: "impact-silver",
    averageCost: 0.129632,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver47": {
    companyId: "silver47",
    averageCost: 0.455186,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "alaska-silver": {
    companyId: "alaska-silver",
    averageCost: 0.54,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver-dollar": {
    companyId: "silver-dollar",
    averageCost: 0.277,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "first-andes": {
    companyId: "first-andes",
    averageCost: 0.0531,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver-hammer": {
    companyId: "silver-hammer",
    averageCost: 0.0631,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "tier-one-silver": {
    companyId: "tier-one-silver",
    averageCost: 0.061143,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver-elephant": {
    companyId: "silver-elephant",
    averageCost: 0.1472,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "americore": {
    companyId: "americore",
    averageCost: 0.181781,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "blackrock-silver": {
    companyId: "blackrock-silver",
    averageCost: 0.675204,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "china-silver": {
    companyId: "china-silver",
    averageCost: 0.048,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "defiance-silver": {
    companyId: "defiance-silver",
    averageCost: 0.148764,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "discovery-mining": {
    companyId: "discovery-mining",
    averageCost: 5.6,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver-one": {
    companyId: "silver-one",
    averageCost: 0.227996,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "gr-silver": {
    companyId: "gr-silver",
    averageCost: 0.162264,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "kuya-silver": {
    companyId: "kuya-silver",
    averageCost: 0.428831,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "outcrop-silver": {
    companyId: "outcrop-silver",
    averageCost: 0.176423,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "contango": {
    companyId: "contango",
    averageCost: 39.85,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "abrasilver": {
    companyId: "abrasilver",
    averageCost: 13.76,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "captain-silver": {
    companyId: "captain-silver",
    averageCost: 2.09,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "kootenay-silver": {
    companyId: "kootenay-silver",
    averageCost: 1.35,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "silver-storm": {
    companyId: "silver-storm",
    averageCost: 0.55,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "nord-precious-metals": {
    companyId: "nord-precious-metals",
    averageCost: 0.278,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "argentum-silver": {
    companyId: "argentum-silver",
    averageCost: 0.147632,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "canasil": {
    companyId: "canasil",
    averageCost: 0.049,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "monarca-minerals": {
    companyId: "monarca-minerals",
    averageCost: 0.02,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "southern-silver": {
    companyId: "southern-silver",
    averageCost: 0.143071,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "zacatecas-silver": {
    companyId: "zacatecas-silver",
    averageCost: 0.056,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "excellon": {
    companyId: "excellon",
    averageCost: 0.212,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "americas-gold-silver": {
    companyId: "americas-gold-silver",
    averageCost: 2.0575,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "onyx-gold": {
    companyId: "onyx-gold",
    averageCost: 1.72,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "advanced-gold": {
    companyId: "advanced-gold",
    averageCost: 0.288,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "solstice-gold": {
    companyId: "solstice-gold",
    averageCost: 0.101,
    currency: "CAD",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "cassiar-gold": {
    companyId: "cassiar-gold",
    averageCost: 0.143875,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "great-pacific-gold": {
    companyId: "great-pacific-gold",
    averageCost: 0.263,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "first-mining-gold": {
    companyId: "first-mining-gold",
    averageCost: 0.098991,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "freeman-gold": {
    companyId: "freeman-gold",
    averageCost: 0.0515,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "trx-gold": {
    companyId: "trx-gold",
    averageCost: 0.388,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "golden-goliath": {
    companyId: "golden-goliath",
    averageCost: 0.034,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "vista-gold": {
    companyId: "vista-gold",
    averageCost: 0.621,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "spanish-mountain": {
    companyId: "spanish-mountain",
    averageCost: 0.1401,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "minnova": {
    companyId: "minnova",
    averageCost: 0.216,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },

  "new-murchison": {
    companyId: "new-murchison",
    averageCost: 0.04,
    currency: "EUR",
    source: "PORTFOLIO_PDF",
    isApproximate: true,
  },
};

export function calculateDynamicAverageCostEur({
  companyId,
  currentQuantity,
  transactions,
  exchangeRates,
}: {
  companyId: string;
  currentQuantity: number;

  transactions: {
    holdingId: string;
    type: "buy" | "sell";
    quantity: number;
    price: number | null;
    currency: string | null;
  }[];

  exchangeRates: ExchangeRates;
}): number | null {
  const staticCostBasis =
    costBasisByCompanyId[
      companyId
    ];

  if (!staticCostBasis) {
    return null;
  }

  const holdingId =
    `holding-${companyId}`;

  const relevantTransactions =
    transactions.filter(
      (transaction) =>
        transaction.holdingId ===
        holdingId,
    );

  const netTransactionQuantity =
    relevantTransactions.reduce(
      (total, transaction) =>
        transaction.type === "buy"
          ? total +
            transaction.quantity
          : total -
            transaction.quantity,
      0,
    );

  const originalQuantity =
    currentQuantity -
    netTransactionQuantity;

  if (originalQuantity < 0) {
    return null;
  }

  const originalAverageCostEur =
    convertPriceToEur(
      staticCostBasis.averageCost,
      staticCostBasis.currency,
      exchangeRates,
    );

  let workingQuantity =
    originalQuantity;

  let totalCostEur =
    originalQuantity *
    originalAverageCostEur;

  for (
    const transaction of
    relevantTransactions
  ) {
    if (
      transaction.type === "buy"
    ) {
      if (
        transaction.price === null ||
        transaction.currency === null
      ) {
        continue;
      }

      const purchasePriceEur =
        convertPriceToEur(
          transaction.price,
          transaction.currency as
            | "EUR"
            | "CAD"
            | "USD"
            | "AUD"
            | "HKD"
            | "GBP",
          exchangeRates,
        );

      totalCostEur +=
        transaction.quantity *
        purchasePriceEur;

      workingQuantity +=
        transaction.quantity;

      continue;
    }

    if (
      transaction.type === "sell" &&
      workingQuantity > 0
    ) {
      const averageCostEur =
        totalCostEur /
        workingQuantity;

      totalCostEur -=
        transaction.quantity *
        averageCostEur;

      workingQuantity -=
        transaction.quantity;
    }
  }

  if (workingQuantity <= 0) {
    return null;
  }

  return (
    totalCostEur /
    workingQuantity
  );
}

export function calculateUnrealizedReturnPercent({
  companyId,
  currentPrice,
  currentCurrency,
  exchangeRates,
}: {
  companyId: string;

  currentPrice: number;
  currentCurrency:
    | "EUR"
    | "USD"
    | "CAD"
    | "AUD"
    | "HKD"
    | "GBP";

  exchangeRates: ExchangeRates;
}): number | null {
  const costBasis =
    costBasisByCompanyId[
      companyId
    ];

  if (!costBasis) {
    return null;
  }

  const currentPriceEur =
    convertPriceToEur(
      currentPrice,
      currentCurrency,
      exchangeRates,
    );

  const costBasisEur =
    convertPriceToEur(
      costBasis.averageCost,
      costBasis.currency,
      exchangeRates,
    );

  if (
    costBasisEur <= 0
  ) {
    return null;
  }

  return (
    (
      currentPriceEur -
      costBasisEur
    ) /
    costBasisEur
  ) * 100;
}