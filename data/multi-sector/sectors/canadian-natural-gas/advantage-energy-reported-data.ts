// Advantage Energy Ltd. (TSX: AAV)
// Verified reported data — not yet a valuation input.
//
// Production: Q2 2026 quarterly average.
// Net debt: June 30, 2026, attributable to Advantage.
// Reserves: December 31, 2025, gross working interest.
//
// Do not treat quarterly average production as a verified
// beginning-of-forecast production rate.

export const advantageEnergyReportedData = {
  identity: {
    companyId: "advantage-energy",
    companyName: "Advantage Energy Ltd.",
    ticker: "AAV",
    exchange: "TSX",
    currency: "CAD",
  },

  production: {
    period: "2026-Q2",
    gasProductionMmcfPerDay: 347.8,
    liquidsProductionBblPerDay: 12650,
    measurement: "quarterly-average",
  },

  balanceSheet: {
    asOf: "2026-06-30",
    netDebtCad: 560_248_000,
    scope: "Advantage excluding Entropy",
  },

  reserves: {
    asOf: "2025-12-31",
    classification: "gross-working-interest",
        // Historical reserves predate the Wembley disposition.
    // Not yet suitable for post-sale valuation.
    valuationReadiness: "requires-divestiture-adjustment",

    divestitureAdjustment: {
      eventId: "wembley-divestiture-2026",
      provedGasReservesBcf: null,
      provedPlusProbableGasReservesBcf: null,
      sourceVerified: false,
    },
    provedGasReservesBcf: 2486.965,
    provedPlusProbableGasReservesBcf: 3576.418,
  },

    financialsQ2: {
    period: "2026-Q2",
    periodEnd: "2026-06-30",
    currency: "CAD",

    // Weighted-average shares during Q2, not shares at period-end.
    shares: {
      basicWeightedAverage: 167_614_000,
      dilutedWeightedAverage: 179_640_000,
    },

    // Reported Advantage operations, excluding Entropy.
    operatingCostsCadPerBoe: {
      royalties: 3.72,
      operating: 5.78,
      transportation: 4.11,
      generalAndAdministrative: 1.34,
    },

    realizedPricesCad: {
      gasPerMcfExcludingDerivatives: 2.07,
      gasPerMcfIncludingDerivatives: 2.56,
      liquidsPerBblExcludingDerivatives: 113.37,
      liquidsPerBblIncludingDerivatives: 97.12,
    },

    netCapitalExpendituresCad: 88_063_000,

    adjustedFundsFlowCad: 88_797_000,

    freeCashFlowCad: 734_000,
  },

    corporateEvents: [
    {
      eventId: "wembley-divestiture-2026",
      eventType: "asset-sale",
      assetName: "Wembley",
      completionDate: "2026-09-11",

      // To be verified against the official sale announcement.
            // Gross proceeds, before closing adjustments.
      proceedsCad: 316_000_000,

      // H1 2026 average production of the divested assets.
      // Historical contribution, not a Q4 production forecast.
      productionImpactBoePerDay: 5_730,

      // Actual net-debt change not yet verified.
      netDebtImpactCad: null,

            divestedReserves: {
        asOf: "2025-12-31",
        classification: "gross-working-interest",

        provedDevelopedProducingMboe: 11_800,
        provedMboe: 27_900,
        provedPlusProbableMboe: 46_100,

        // Gas-only reserve breakdown not yet verified.
        provedGasReservesBcf: null,
        provedPlusProbableGasReservesBcf: null,

        sourceId: "aav-wembley-announcement-2026",
      },

      divestedReserveValues: {
        valuationDate: "2025-12-31",
        discountRate: 0.10,
        beforeTax: true,

        provedDevelopedProducingCad: 79_800_000,
        provedCad: 194_300_000,
        provedPlusProbableCad: 345_800_000,

        // These are published reserve NPVs,
        // not additional assets to add to the valuation.
        sourceId: "aav-wembley-announcement-2026",
      },

      divestedProduction: {
        period: "2026-H1",
        gasMmcfPerDay: 19.0,
        crudeOilBblPerDay: 1_358,
        nglsBblPerDay: 1_206,
      },

      managementGuidance: {
        issuedAt: "2026-08-26",
        expectedNetDebtCad: 245_000_000,
        expectedNetDebtPeriod: "early-2026-Q4",
        q4ProductionBoePerDayMin: 83_000,
        q4ProductionBoePerDayMax: 84_000,
      },

      // Q2 reported figures precede this transaction.
      affectsHistoricalQ2Figures: false,

            status: "transaction-confirmed-financial-impact-pending",

      notes:
        "The Wembley asset sale occurred after the Q2 reporting period. " +
        "Historical Q2 figures must not be mixed with post-sale assumptions " +
        "without explicit adjustments.",
    },
  ],

  sources: [
    {
      sourceId: "aav-q2-2026",
      title: "Advantage Announces Second Quarter 2026 Results",
      url: "https://www.newswire.ca/news-releases/advantage-announces-second-quarter-2026-results-825111159.html",
      publishedAt: "2026-07-30",
    },
    {
      sourceId: "aav-reserves-2025",
      title: "Advantage Announces 2025 Reserves",
      url: "https://www.advantageog.com/investors/newsreleases/article?id=122766",
      publishedAt: "2026-02-12",
    },
        {
      sourceId: "aav-wembley-announcement-2026",
      title: "Advantage Announces Wembley Disposition and Accelerated Return of Capital",
      url: "https://www.advantageog.com/investors/newsreleases",
      publishedAt: "2026-08-26",
    },
    {
      sourceId: "aav-wembley-closing-2026",
      title: "Advantage Announces Closing of Wembley Disposition",
      url: "https://www.newswire.ca/news-releases/advantage-announces-closing-of-wembley-disposition-801960819.html",
      publishedAt: "2026-09-11",
    },
  ],
} as const;