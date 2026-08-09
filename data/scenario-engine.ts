import type {
  Company,
  CompanyStage,
} from "./companies";

export type MetalScenarioResult = {
  isScenarioApplied: boolean;

  referenceSilverPriceUsd: number | null;
  scenarioSilverPriceUsd: number | null;
  silverChangePercent: number;
  silverLeverage: number;

  referenceGoldPriceUsd: number | null;
  scenarioGoldPriceUsd: number | null;
  goldChangePercent: number;
  goldLeverage: number;

  estimatedPriceMultiplier: number;
};

const silverStageLeverage: Record<
  CompanyStage,
  number
> = {
  producer: 1.35,
  developer: 1.8,
  explorer: 2.3,
  hybrid: 1.65,
  "non-miner": 0.6,
};

const goldStageLeverage: Record<
  CompanyStage,
  number
> = {
  producer: 1.25,
  developer: 1.65,
  explorer: 2.1,
  hybrid: 1.5,
  "non-miner": 0.5,
};

function clampExposure(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(
      1,
      value,
    ),
  );
}

function getSilverExposure(
  company: Company,
): number {
  if (
    company.silverExposure !== undefined
  ) {
    return clampExposure(
      company.silverExposure,
    );
  }

  if (company.commodity === "silver") {
    return 1;
  }

  if (company.commodity === "mixed") {
    return 0.5;
  }

  return 0;
}

function getGoldExposure(
  company: Company,
): number {
  if (
    company.goldExposure !== undefined
  ) {
    return clampExposure(
      company.goldExposure,
    );
  }

  if (company.commodity === "gold") {
    return 1;
  }

  if (company.commodity === "mixed") {
    return 0.5;
  }

  return 0;
}

function calculateMetalChange({
  referencePrice,
  scenarioPrice,
}: {
  referencePrice: number | null;
  scenarioPrice: number | null;
}): number | null {
  if (
    referencePrice === null ||
    scenarioPrice === null ||
    referencePrice <= 0
  ) {
    return null;
  }

  return (
    scenarioPrice /
      referencePrice -
    1
  );
}

export function calculateMetalScenario({
  company,

  referenceSilverPriceUsd,
  scenarioSilverPriceUsd,

  referenceGoldPriceUsd,
  scenarioGoldPriceUsd,
}: {
  company: Company;

  referenceSilverPriceUsd: number | null;
  scenarioSilverPriceUsd: number | null;

  referenceGoldPriceUsd: number | null;
  scenarioGoldPriceUsd: number | null;
}): MetalScenarioResult {
  if (company.stage === undefined) {
    return {
      isScenarioApplied: false,

      referenceSilverPriceUsd,
      scenarioSilverPriceUsd,
      silverChangePercent: 0,
      silverLeverage: 0,

      referenceGoldPriceUsd,
      scenarioGoldPriceUsd,
      goldChangePercent: 0,
      goldLeverage: 0,

      estimatedPriceMultiplier: 1,
    };
  }

  const silverChange =
    calculateMetalChange({
      referencePrice:
        referenceSilverPriceUsd,
      scenarioPrice:
        scenarioSilverPriceUsd,
    });

  const goldChange =
    calculateMetalChange({
      referencePrice:
        referenceGoldPriceUsd,
      scenarioPrice:
        scenarioGoldPriceUsd,
    });

  const silverExposure =
    getSilverExposure(company);

  const goldExposure =
    getGoldExposure(company);

  const silverStageMultiplier =
    company.scenarioLeverage ??
    silverStageLeverage[
      company.stage
    ];

  const goldStageMultiplier =
    company.goldScenarioLeverage ??
    goldStageLeverage[
      company.stage
    ];

  const effectiveSilverLeverage =
    silverExposure *
    silverStageMultiplier;

  const effectiveGoldLeverage =
    goldExposure *
    goldStageMultiplier;

  const silverContribution =
    silverChange !== null
      ? silverChange *
        effectiveSilverLeverage
      : 0;

  const goldContribution =
    goldChange !== null
      ? goldChange *
        effectiveGoldLeverage
      : 0;

  const hasSilverScenario =
    silverChange !== null &&
    silverExposure > 0;

  const hasGoldScenario =
    goldChange !== null &&
    goldExposure > 0;

  const estimatedPriceMultiplier =
    Math.max(
      0,
      1 +
        silverContribution +
        goldContribution,
    );

  return {
    isScenarioApplied:
      hasSilverScenario ||
      hasGoldScenario,

    referenceSilverPriceUsd,
    scenarioSilverPriceUsd,

    silverChangePercent:
      silverChange !== null
        ? silverChange * 100
        : 0,

    silverLeverage:
      hasSilverScenario
        ? effectiveSilverLeverage
        : 0,

    referenceGoldPriceUsd,
    scenarioGoldPriceUsd,

    goldChangePercent:
      goldChange !== null
        ? goldChange * 100
        : 0,

    goldLeverage:
      hasGoldScenario
        ? effectiveGoldLeverage
        : 0,

    estimatedPriceMultiplier,
  };
}

/**
 * Backwards-compatible wrapper voor bestaande
 * zilver-scenario-aanroepen.
 *
 * Hierdoor blijft portfolio-engine.ts voorlopig
 * werken terwijl we goud stap voor stap aansluiten.
 */
export function calculateSilverScenario({
  company,
  referenceSilverPriceUsd,
  scenarioSilverPriceUsd,
}: {
  company: Company;
  referenceSilverPriceUsd: number | null;
  scenarioSilverPriceUsd: number | null;
}): MetalScenarioResult {
  return calculateMetalScenario({
    company,

    referenceSilverPriceUsd,
    scenarioSilverPriceUsd,

    referenceGoldPriceUsd: null,
    scenarioGoldPriceUsd: null,
  });
}