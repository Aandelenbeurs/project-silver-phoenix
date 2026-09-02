export type PhoenixConfidence =
  | "high"
  | "medium"
  | "low";

export type PhoenixDataStatus =
  | "complete"
  | "valuation-stale"
  | "research-needed"
  | "review";

export type PhoenixBucket =
  | "core"
  | "growth"
  | "optionality"
  | "special";

export type PhoenixLeverageScores = {
  silver?: number;
  gold?: number;
  copper?: number;
};

export type PhoenixScoresV2 = {
  quality: number | null;
  growth: number | null;

  leverage: PhoenixLeverageScores;

  valuation: number | null;
  catalysts: number | null;

  riskPenalty: number;

  opportunity: number | null;

  confidence: PhoenixConfidence;
  dataStatus: PhoenixDataStatus;
};

export type PhoenixPortfolioV2 = {
  bucket: PhoenixBucket;

  idealMin: number | null;
  idealMax: number | null;

  hardMax: number | null;
};

export type PhoenixCompanyV2 = {
  companyId: string;

  scores: PhoenixScoresV2;

  portfolio: PhoenixPortfolioV2;
};

type OpportunityInput = {
  quality: number;
  growth: number;
  leverage: number;
  valuation: number;
  catalysts: number;
  riskPenalty: number;
};

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}

/**
 * Phoenix Opportunity Score v2
 *
 * Raw Opportunity:
 * - Quality: 30%
 * - Growth: 25%
 * - Commodity Leverage: 15%
 * - Valuation: 20%
 * - Catalysts: 10%
 *
 * Daarna wordt de actuele Risk Penalty
 * afgetrokken.
 */
export function calculateOpportunityScore({
  quality,
  growth,
  leverage,
  valuation,
  catalysts,
  riskPenalty,
}: OpportunityInput): number {
  const rawOpportunity =
    quality * 0.3 +
    growth * 0.25 +
    leverage * 0.15 +
    valuation * 0.2 +
    catalysts * 0.1;

  return clampScore(
    rawOpportunity - riskPenalty,
  );
}

/**
 * Commodity leverage voor de huidige
 * hoofdthesis van een bedrijf.
 *
 * Voor nu gebruiken we:
 * - silver wanneer aanwezig;
 * - anders gold;
 * - anders copper;
 *
 * Later kan dit dynamischer worden op basis
 * van portefeuille- en commodity-scenario.
 */
export function getPrimaryLeverageScore(
  leverage: PhoenixLeverageScores,
): number | null {
  if (
    typeof leverage.silver === "number"
  ) {
    return leverage.silver;
  }

  if (
    typeof leverage.gold === "number"
  ) {
    return leverage.gold;
  }

  if (
    typeof leverage.copper === "number"
  ) {
    return leverage.copper;
  }

  return null;
}

/**
 * Berekent Opportunity wanneer alle
 * noodzakelijke data aanwezig zijn.
 */
export function calculateCompanyOpportunity(
  scores: Omit<
    PhoenixScoresV2,
    "opportunity"
  >,
): number | null {
  if (
    scores.quality === null ||
    scores.growth === null ||
    scores.valuation === null ||
    scores.catalysts === null
  ) {
    return null;
  }

  const leverage =
    getPrimaryLeverageScore(
      scores.leverage,
    );

  if (leverage === null) {
    return null;
  }

  return calculateOpportunityScore({
    quality: scores.quality,
    growth: scores.growth,
    leverage,
    valuation: scores.valuation,
    catalysts: scores.catalysts,
    riskPenalty:
      scores.riskPenalty,
  });
}

function createPhoenixCompany({
  companyId,
  quality,
  growth,
  leverage,
  valuation,
  catalysts,
  riskPenalty,
  confidence,
  dataStatus,
  bucket,
  idealMin,
  idealMax,
  hardMax,
}: {
  companyId: string;

  quality: number | null;
  growth: number | null;

  leverage: PhoenixLeverageScores;

  valuation: number | null;
  catalysts: number | null;

  riskPenalty: number;

  confidence: PhoenixConfidence;
  dataStatus: PhoenixDataStatus;

  bucket: PhoenixBucket;

  idealMin: number | null;
  idealMax: number | null;
  hardMax: number | null;
}): PhoenixCompanyV2 {
  const baseScores = {
    quality,
    growth,
    leverage,
    valuation,
    catalysts,
    riskPenalty,
    confidence,
    dataStatus,
  };

  const opportunity =
    calculateCompanyOpportunity(
      baseScores,
    );

  return {
    companyId,

    scores: {
      ...baseScores,
      opportunity,
    },

    portfolio: {
      bucket,
      idealMin,
      idealMax,
      hardMax,
    },
  };
}

/**
 * Eerste Phoenix v2 kalibratiegroep.
 *
 * Dit zijn nog geen definitieve live
 * recommendations.
 *
 * De scores zijn bedoeld om het nieuwe
 * model technisch te testen en later
 * systematisch verder te kalibreren.
 */
export const phoenixCompaniesV2: PhoenixCompanyV2[] =
  [
    createPhoenixCompany({
      companyId:
        "discovery-mining",

      quality: 96,
      growth: 94,

      leverage: {
        silver: 92,
        gold: 82,
      },

      valuation: 80,
      catalysts: 88,

      riskPenalty: 3,

      confidence: "high",
      dataStatus:
        "valuation-stale",

      bucket: "core",

      idealMin: 6,
      idealMax: 9,
      hardMax: 10,
    }),

    createPhoenixCompany({
      companyId:
        "silver-x",

      quality: 89,
      growth: 98,

      leverage: {
        silver: 99,
        gold: 55,
      },

      valuation: 82,
      catalysts: 92,

      riskPenalty: 7,

      confidence: "high",
      dataStatus:
        "valuation-stale",

      bucket: "growth",

      idealMin: 4,
      idealMax: 7,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "abrasilver",

      quality: 92,
      growth: 91,

      leverage: {
        silver: 94,
        gold: 70,
      },

      valuation: 68,
      catalysts: 90,

      riskPenalty: 5,

      confidence: "high",
      dataStatus:
        "valuation-stale",

      bucket: "core",

      idealMin: 5,
      idealMax: 8,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "kootenay-silver",

      quality: 89,
      growth: 95,

      leverage: {
        silver: 98,
        gold: 30,
      },

      valuation: 94,
      catalysts: 91,

      riskPenalty: 5,

      confidence: "high",
      dataStatus:
        "valuation-stale",

      bucket: "growth",

      idealMin: 5,
      idealMax: 8,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "vista-gold",

      quality: 96,
      growth: 83,

      leverage: {
        gold: 94,
      },

      valuation: 90,
      catalysts: 85,

      riskPenalty: 4,

      confidence: "high",
      dataStatus:
        "valuation-stale",

      bucket: "core",

      idealMin: 4,
      idealMax: 6,
      hardMax: 6,
    }),

    createPhoenixCompany({
      companyId:
        "first-andes",

      quality: 73,
      growth: 88,

      leverage: {
        silver: 99,
        gold: 30,
      },

      valuation: 94,
      catalysts: 90,

      riskPenalty: 8,

      confidence: "medium",
      dataStatus:
        "valuation-stale",

      bucket:
        "optionality",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 1.5,
    }),

        createPhoenixCompany({
      companyId:
        "impact-silver",

      quality: 91,
      growth: 91,

      leverage: {
        silver: 97,
        gold: 45,
      },

      valuation: 78,
      catalysts: 90,

      riskPenalty: 5,

      confidence: "high",
      dataStatus:
        "complete",

      bucket: "core",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "kuya-silver",

      quality: 87,
      growth: 97,

      leverage: {
        silver: 99,
        gold: 45,
      },

      valuation: 76,
      catalysts: 96,

      riskPenalty: 7,

      confidence: "high",
      dataStatus:
        "complete",

      bucket: "growth",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "southern-silver",

      quality: 91,
      growth: 92,

      leverage: {
        silver: 94,
        gold: 55,
      },

      valuation: 86,
      catalysts: 90,

      riskPenalty: 6,

      confidence: "high",
      dataStatus:
        "complete",

      bucket: "growth",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "first-mining-gold",

      quality: 94,
      growth: 94,

      leverage: {
        gold: 98,
      },

      valuation: 84,
      catalysts: 97,

      riskPenalty: 5,

      confidence: "high",
      dataStatus:
        "complete",

      bucket: "core",

      idealMin: 5,
      idealMax: 8,
      hardMax: 10,
    }),

    createPhoenixCompany({
      companyId:
        "zacatecas-silver",

      quality: 82,
      growth: 91,

      leverage: {
        silver: 85,
        gold: 92,
      },

      valuation: 88,
      catalysts: 91,

      riskPenalty: 8,

      confidence: "medium",
      dataStatus:
        "complete",

      bucket: "growth",

      idealMin: 2,
      idealMax: 4,
      hardMax: 6,
    }),

    createPhoenixCompany({
      companyId:
        "silver47",

      quality: 84,
      growth: 96,

      leverage: {
        silver: 98,
        gold: 55,
      },

      valuation: 79,
      catalysts: 95,

      riskPenalty: 8,

      confidence: "medium",
      dataStatus:
        "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

        createPhoenixCompany({
      companyId:
        "gr-silver",

      quality: 86,
      growth: 95,

      leverage: {
        silver: 98,
        gold: 45,
      },

      valuation: 86,
      catalysts: 96,

      riskPenalty: 7,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "alaska-silver",

      quality: 88,
      growth: 94,

      leverage: {
        silver: 94,
        gold: 89,
      },

      valuation: 84,
      catalysts: 94,

      riskPenalty: 6,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "freeman-gold",

      quality: 93,
      growth: 92,

      leverage: {
        gold: 96,
      },

      valuation: 89,
      catalysts: 94,

      riskPenalty: 4,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 4,
      idealMax: 7,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "tier-one-silver",

      quality: 80,
      growth: 98,

      leverage: {
        silver: 99,
        gold: 72,
        copper: 55,
      },

      valuation: 82,
      catalysts: 98,

      riskPenalty: 9,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 1,
      idealMax: 3,
      hardMax: 4,
    }),

    createPhoenixCompany({
      companyId:
        "americore",

      quality: 74,
      growth: 95,

      leverage: {
        silver: 98,
        gold: 25,
      },

      valuation: 88,
      catalysts: 94,

      riskPenalty: 11,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 2,
      hardMax: 3,
    }),

    createPhoenixCompany({
      companyId:
        "cassiar-gold",

      quality: 90,
      growth: 94,

      leverage: {
        gold: 95,
      },

      valuation: 88,
      catalysts: 95,

      riskPenalty: 5,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 7,
    }),

        createPhoenixCompany({
      companyId:
        "outcrop-silver",

      quality: 88,
      growth: 96,

      leverage: {
        silver: 99,
        gold: 58,
      },

      valuation: 83,
      catalysts: 96,

      riskPenalty: 6,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "defiance-silver",

      quality: 86,
      growth: 95,

      leverage: {
        silver: 99,
        gold: 40,
      },

      valuation: 88,
      catalysts: 97,

      riskPenalty: 7,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 2,
      idealMax: 5,
      hardMax: 7,
    }),

    createPhoenixCompany({
      companyId:
        "trx-gold",

      quality: 92,
      growth: 97,

      leverage: {
        gold: 96,
      },

      valuation: 80,
      catalysts: 95,

      riskPenalty: 4,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "great-pacific-gold",

      quality: 82,
      growth: 98,

      leverage: {
        gold: 95,
        silver: 35,
        copper: 55,
      },

      valuation: 80,
      catalysts: 98,

      riskPenalty: 9,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 1,
      idealMax: 3,
      hardMax: 4,
    }),

    createPhoenixCompany({
      companyId:
        "spanish-mountain",

      quality: 93,
      growth: 94,

      leverage: {
        gold: 95,
      },

      valuation: 86,
      catalysts: 96,

      riskPenalty: 5,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "americas-gold-silver",

      quality: 91,
      growth: 95,

      leverage: {
        silver: 98,
        gold: 35,
      },

      valuation: 77,
      catalysts: 94,

      riskPenalty: 6,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

        createPhoenixCompany({
      companyId:
        "excellon",

      quality: 87,
      growth: 94,

      leverage: {
        silver: 94,
        gold: 75,
      },

      valuation: 85,
      catalysts: 92,

      riskPenalty: 7,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "silver-one",

      quality: 92,
      growth: 94,

      leverage: {
        silver: 98,
        gold: 65,
      },

      valuation: 84,
      catalysts: 97,

      riskPenalty: 5,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "golden-goliath",

      quality: 68,
      growth: 92,

      leverage: {
        gold: 96,
      },

      valuation: 90,
      catalysts: 90,

      riskPenalty: 14,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 2.5,
    }),

    createPhoenixCompany({
      companyId:
        "silver-dollar",

      quality: 80,
      growth: 95,

      leverage: {
        silver: 98,
        gold: 55,
        copper: 60,
      },

      valuation: 86,
      catalysts: 94,

      riskPenalty: 9,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 1,
      idealMax: 3,
      hardMax: 4,
    }),

    createPhoenixCompany({
      companyId:
        "argentum-silver",

      quality: 65,
      growth: 86,

      leverage: {
        silver: 96,
      },

      valuation: 88,
      catalysts: 80,

      riskPenalty: 14,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 2.5,
    }),

    createPhoenixCompany({
      companyId:
        "minnova",

      quality: 73,
      growth: 88,

      leverage: {
        gold: 94,
      },

      valuation: 91,
      catalysts: 83,

      riskPenalty: 12,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 2.5,
    }),

        createPhoenixCompany({
      companyId:
        "onyx-gold",

      quality: 82,
      growth: 98,

      leverage: {
        gold: 96,
      },

      valuation: 82,
      catalysts: 96,

      riskPenalty: 8,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 1.5,
      idealMax: 4,
      hardMax: 5,
    }),

    createPhoenixCompany({
      companyId:
        "advanced-gold",

      quality: 67,
      growth: 94,

      leverage: {
        silver: 94,
        gold: 80,
        copper: 80,
      },

      valuation: 88,
      catalysts: 94,

      riskPenalty: 12,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.25,
      idealMax: 1,
      hardMax: 1.5,
    }),

    createPhoenixCompany({
      companyId:
        "solstice-gold",

      quality: 77,
      growth: 96,

      leverage: {
        gold: 97,
      },

      valuation: 86,
      catalysts: 96,

      riskPenalty: 9,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 2,
      hardMax: 3,
    }),

    createPhoenixCompany({
      companyId:
        "walhalla-gold",

      quality: 75,
      growth: 96,

      leverage: {
        gold: 99,
      },

      valuation: 85,
      catalysts: 90,

      riskPenalty: 11,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 2,
      hardMax: 3,
    }),

    createPhoenixCompany({
      companyId:
        "new-murchison",

      quality: 88,
      growth: 94,

      leverage: {
        gold: 94,
      },

      valuation: 82,
      catalysts: 90,

      riskPenalty: 5,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 2,
      idealMax: 5,
      hardMax: 7,
    }),

    createPhoenixCompany({
      companyId:
        "silver-hammer",

      quality: 75,
      growth: 97,

      leverage: {
        silver: 99,
        gold: 35,
        copper: 45,
      },

      valuation: 83,
      catalysts: 98,

      riskPenalty: 10,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 2,
      hardMax: 3,
    }),

    createPhoenixCompany({
      companyId:
        "silver-elephant",

      quality: 74,
      growth: 91,

      leverage: {
        silver: 94,
        gold: 30,
      },

      valuation: 85,
      catalysts: 92,

      riskPenalty: 13,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "special",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 2.5,
    }),

    createPhoenixCompany({
      companyId:
        "blackrock-silver",

      quality: 94,
      growth: 93,

      leverage: {
        silver: 97,
        gold: 60,
      },

      valuation: 84,
      catalysts: 96,

      riskPenalty: 4,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

    createPhoenixCompany({
      companyId:
        "china-silver",

      quality: 78,
      growth: 72,

      leverage: {
        silver: 60,
      },

      valuation: 75,
      catalysts: 60,

      riskPenalty: 8,

      confidence: "high",
      dataStatus: "complete",

      bucket: "special",

      idealMin: 0,
      idealMax: 1,
      hardMax: 1.5,
    }),

    createPhoenixCompany({
      companyId:
        "captain-silver",

      quality: 87,
      growth: 98,

      leverage: {
        silver: 99,
        gold: 55,
      },

      valuation: 80,
      catalysts: 98,

      riskPenalty: 7,

      confidence: "high",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 2,
      idealMax: 5,
      hardMax: 7,
    }),

    createPhoenixCompany({
      companyId:
        "silver-storm",

      quality: 88,
      growth: 98,

      leverage: {
        silver: 97,
        gold: 40,
      },

      valuation: 80,
      catalysts: 98,

      riskPenalty: 7,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 3,
      idealMax: 6,
      hardMax: 8,
    }),

    createPhoenixCompany({
      companyId:
        "nord-precious-metals",

      quality: 80,
      growth: 96,

      leverage: {
        silver: 97,
        gold: 45,
        copper: 35,
      },

      valuation: 84,
      catalysts: 96,

      riskPenalty: 9,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "growth",

      idealMin: 1,
      idealMax: 3.5,
      hardMax: 5,
    }),

    createPhoenixCompany({
      companyId:
        "canasil",

      quality: 72,
      growth: 91,

      leverage: {
        silver: 96,
        gold: 55,
        copper: 45,
      },

      valuation: 89,
      catalysts: 88,

      riskPenalty: 10,

      confidence: "medium",
      dataStatus: "complete",

      bucket: "optionality",

      idealMin: 0.5,
      idealMax: 1.5,
      hardMax: 2.5,
    }),

    createPhoenixCompany({
      companyId:
        "monarca-minerals",

      quality: 45,
      growth: 40,

      leverage: {
        silver: 90,
        gold: 45,
      },

      valuation: 70,
      catalysts: 20,

      riskPenalty: 25,

      confidence: "low",
      dataStatus: "review",

      bucket: "special",

      idealMin: 0,
      idealMax: 0,
      hardMax: 0.5,
    }),

        createPhoenixCompany({
      companyId:
        "contango",

      quality: 93,
      growth: 96,

      leverage: {
        silver: 25,
        gold: 97,
      },

      valuation: 83,
      catalysts: 94,

      riskPenalty: 4,

      confidence: "high",
      dataStatus: "complete",

      bucket: "core",

      idealMin: 4,
      idealMax: 7,
      hardMax: 9,
    }),

        createPhoenixCompany({
  companyId:
    "vizsla-silver",

  quality: 94,
  growth: 91,

  leverage: {
    silver: 88,
    gold: 78,
  },

  valuation: 75,
  catalysts: 95,

  riskPenalty: 4,

  confidence: "high",
  dataStatus: "complete",

  bucket: "core",

  idealMin: 3,
  idealMax: 5,
  hardMax: 7,
}),

createPhoenixCompany({
  companyId:
    "g-mining-ventures",

  quality: 97,
  growth: 96,

  leverage: {
    silver: 0,
    gold: 82,
  },

  valuation: 68,
  catalysts: 96,

  riskPenalty: 3,

  confidence: "high",
  dataStatus: "complete",

  bucket: "optionality",

  idealMin: 3,
  idealMax: 5,
  hardMax: 7,
}),

createPhoenixCompany({
  companyId:
    "aya-gold-silver",

  quality: 94,
  growth: 96,

  leverage: {
    silver: 91,
    gold: 55,
  },

  valuation: 74,
  catalysts: 97,

  riskPenalty: 5,

  confidence: "high",
  dataStatus: "complete",

  bucket: "core",

  idealMin: 3,
  idealMax: 5,
  hardMax: 7,
}),

createPhoenixCompany({
  companyId:
    "artemis-gold",

  quality: 98,
  growth: 97,

  leverage: {
    silver: 0,
    gold: 88,
  },

  valuation: 78,
  catalysts: 97,

  riskPenalty: 3,

  confidence: "high",
  dataStatus: "complete",

  bucket: "core",

  idealMin: 4,
  idealMax: 7,
  hardMax: 9,
}),

createPhoenixCompany({
  companyId:
    "sitka-gold",

  quality: 89,
  growth: 98,

  leverage: {
    silver: 0,
    gold: 96,
  },

  valuation: 86,
  catalysts: 98,

  riskPenalty: 7,

  confidence: "high",
  dataStatus: "complete",

  bucket: "growth",

  idealMin: 2,
  idealMax: 5,
  hardMax: 7,
}),

createPhoenixCompany({
  companyId:
    "snowline-gold",

  quality: 96,
  growth: 95,

  leverage: {
    silver: 0,
    gold: 92,
  },

  valuation: 72,
  catalysts: 96,

  riskPenalty: 4,

  confidence: "high",
  dataStatus: "complete",

  bucket: "optionality",

  idealMin: 3,
  idealMax: 5,
  hardMax: 7,
}),
  ];

export const phoenixCompanyV2ById =
  new Map(
    phoenixCompaniesV2.map(
      (company) => [
        company.companyId,
        company,
      ],
    ),
  );

export function getPhoenixCompanyV2(
  companyId: string,
): PhoenixCompanyV2 | undefined {
  return phoenixCompanyV2ById.get(
    companyId,
  );
}