import {
  getPhoenixCompanyV2,
  type PhoenixBucket,
} from "./phoenix-v2";

import {
  getCompanyById,
} from "./companies";

export type PortfolioV2PositionInput = {
  companyId: string;
  marketValueEur: number;
};

export type PortfolioV2PositionResult = {
  companyId: string;

  marketValueEur: number;
  allocationPercent: number;

  opportunity: number | null;

  bucket: PhoenixBucket | null;

  idealMin: number | null;
  idealMax: number | null;
  hardMax: number | null;

  allocationFitScore: number | null;

  isBelowIdeal: boolean;
  isInsideIdeal: boolean;
  isAboveIdeal: boolean;
  isAboveHardMax: boolean;
};

export type PortfolioV2Components = {
  opportunityQuality: number | null;
  allocationEfficiency: number | null;

  capitalEfficiency: number | null;
  positionSizingDiscipline: number | null;
  riskAndConcentration: number | null;
  portfolioBalance: number | null;

  cyclePositioning: number | null;
};

export type PortfolioV2Result = {
  totalMarketValueEur: number;

  scoredMarketValueEur: number;

  dataCoveragePercent: number;

  scoredPositions: number;
  totalPositions: number;

  positions: PortfolioV2PositionResult[];

  components: PortfolioV2Components;

  partialPortfolioScore: number | null;

  portfolioScoreIsReliable: boolean;
};

const FULL_PORTFOLIO_METRIC_MIN_COVERAGE =
  80;

function clampScore(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}

function calculateAllocationPercent({
  marketValueEur,
  totalMarketValueEur,
}: {
  marketValueEur: number;
  totalMarketValueEur: number;
}): number {
  if (totalMarketValueEur <= 0) {
    return 0;
  }

  return (
    marketValueEur /
    totalMarketValueEur
  ) * 100;
}

/**
 * Allocation Fit
 *
 * 100 punten wanneer de positie binnen
 * de ideale band valt.
 *
 * Buiten de band loopt de score
 * geleidelijk terug.
 *
 * Boven hardMax volgt een zwaardere
 * penalty.
 */
export function calculateAllocationFitScore({
  currentAllocation,
  idealMin,
  idealMax,
  hardMax,
}: {
  currentAllocation: number;
  idealMin: number;
  idealMax: number;
  hardMax: number;
}): number {
  if (
    currentAllocation >= idealMin &&
    currentAllocation <= idealMax
  ) {
    return 100;
  }

  if (currentAllocation < idealMin) {
    if (idealMin <= 0) {
      return 100;
    }

    const gap =
      idealMin - currentAllocation;

    const penalty =
      (gap / idealMin) * 40;

    return clampScore(
      100 - penalty,
    );
  }

  if (
    currentAllocation > idealMax &&
    currentAllocation <= hardMax
  ) {
    const availableRange =
      Math.max(
        0.1,
        hardMax - idealMax,
      );

    const excess =
      currentAllocation - idealMax;

    const penalty =
      (excess / availableRange) * 35;

    return clampScore(
      100 - penalty,
    );
  }

  const excessAboveHardMax =
    currentAllocation - hardMax;

  const extraPenalty =
    Math.min(
      35,
      excessAboveHardMax * 6,
    );

  return clampScore(
    55 - extraPenalty,
  );
}

/**
 * Opportunity Quality
 *
 * Mag al bij gedeeltelijke coverage
 * gebruikt worden.
 *
 * Het is immers expliciet de kwaliteit
 * van het gedeelte waarvoor V2-scores
 * beschikbaar zijn.
 */
function calculateOpportunityQuality(
  positions: PortfolioV2PositionResult[],
): number | null {
  const scored =
    positions.filter(
      (position) =>
        position.opportunity !== null,
    );

  const denominator =
    scored.reduce(
      (total, position) =>
        total +
        position.marketValueEur,
      0,
    );

  if (denominator <= 0) {
    return null;
  }

  const numerator =
    scored.reduce(
      (total, position) =>
        total +
        position.marketValueEur *
          (position.opportunity ?? 0),
      0,
    );

  return numerator / denominator;
}

/**
 * Allocation Efficiency
 *
 * Mag ook al bij gedeeltelijke coverage
 * gebruikt worden, maar alleen als
 * beoordeling van de reeds gemigreerde
 * posities.
 */
function calculateAllocationEfficiency(
  positions: PortfolioV2PositionResult[],
): number | null {
  const scored =
    positions.filter(
      (position) =>
        position.allocationFitScore !==
        null,
    );

  const denominator =
    scored.reduce(
      (total, position) =>
        total +
        position.marketValueEur,
      0,
    );

  if (denominator <= 0) {
    return null;
  }

  const numerator =
    scored.reduce(
      (total, position) =>
        total +
        position.marketValueEur *
          (position.allocationFitScore ??
            0),
      0,
    );

  return numerator / denominator;
}

/**
 * Capital Efficiency
 *
 * Deze metric heeft vrijwel de hele
 * portefeuille nodig.
 *
 * Onder 80% V2 value coverage geven we
 * daarom bewust null terug.
 */
function calculateCapitalEfficiency({
  positions,
  dataCoveragePercent,
}: {
  positions: PortfolioV2PositionResult[];
  dataCoveragePercent: number;
}): number | null {
  if (
    dataCoveragePercent <
    FULL_PORTFOLIO_METRIC_MIN_COVERAGE
  ) {
    return null;
  }

  const total =
    positions.reduce(
      (sum, position) =>
        sum + position.marketValueEur,
      0,
    );

  if (total <= 0) {
    return null;
  }

  const microPositionValue =
    positions
      .filter(
        (position) =>
          position.allocationPercent <
          0.5,
      )
      .reduce(
        (sum, position) =>
          sum +
          position.marketValueEur,
        0,
      );

  const microShare =
    microPositionValue / total;

  return clampScore(
    100 - microShare * 100,
  );
}

/**
 * Position Sizing Discipline
 *
 * Dit kan wel gedeeltelijk worden
 * berekend, omdat hardMax per individuele
 * gemigreerde positie bekend is.
 */
function calculatePositionSizingDiscipline(
  positions: PortfolioV2PositionResult[],
): number | null {
  const scored =
    positions.filter(
      (position) =>
        position.hardMax !== null,
    );

  if (scored.length === 0) {
    return null;
  }

  let penalty = 0;

  for (const position of scored) {
    if (
      position.isAboveHardMax &&
      position.hardMax !== null
    ) {
      const excess =
        position.allocationPercent -
        position.hardMax;

      penalty +=
        6 + excess * 3;
    } else if (
      position.isAboveIdeal
    ) {
      penalty += 1.5;
    }
  }

  return clampScore(
    100 - penalty,
  );
}

/**
 * Risk & Concentration
 *
 * Vereist voldoende coverage van de
 * totale portefeuille.
 */
function calculateRiskAndConcentration({
  positions,
  dataCoveragePercent,
}: {
  positions: PortfolioV2PositionResult[];
  dataCoveragePercent: number;
}): number | null {
  if (
    dataCoveragePercent <
    FULL_PORTFOLIO_METRIC_MIN_COVERAGE
  ) {
    return null;
  }

  if (positions.length === 0) {
    return null;
  }

  let penalty = 0;

  for (const position of positions) {
    if (
      position.allocationPercent > 12
    ) {
      penalty +=
        (
          position.allocationPercent -
          12
        ) * 3;
    }

    if (position.isAboveHardMax) {
      penalty += 6;
    }
  }

  return clampScore(
    100 - penalty,
  );
}

/**
 * Portfolio Balance
 *
 * Vereist voldoende coverage omdat een
 * kleine selectie anders ten onrechte
 * perfect gebalanceerd kan lijken.
 */
function calculatePortfolioBalance({
  positions,
  dataCoveragePercent,
}: {
  positions: PortfolioV2PositionResult[];
  dataCoveragePercent: number;
}): number | null {
  if (
    dataCoveragePercent <
    FULL_PORTFOLIO_METRIC_MIN_COVERAGE
  ) {
    return null;
  }

  const scored =
    positions.filter(
      (position) =>
        position.bucket !== null,
    );

  const total =
    scored.reduce(
      (sum, position) =>
        sum + position.marketValueEur,
      0,
    );

  if (total <= 0) {
    return null;
  }

  /**
   * ------------------------------------
   * 1. BUCKET BALANCE
   * ------------------------------------
   *
   * Strategic target:
   *
   * Core        45%
   * Growth      35%
   * Optionality 15%
   * Special      5%
   *
   * Dit zijn GEEN harde portfolio targets.
   * Ze dienen alleen om structurele balans
   * te meten.
   */

  const bucketValue = {
    core: 0,
    growth: 0,
    optionality: 0,
    special: 0,
  };

  for (const position of scored) {
    if (position.bucket === null) {
      continue;
    }

    bucketValue[
      position.bucket
    ] += position.marketValueEur;
  }

  const corePercent =
    (bucketValue.core / total) *
    100;

  const growthPercent =
    (bucketValue.growth / total) *
    100;

  const optionalityPercent =
    (
      bucketValue.optionality /
      total
    ) * 100;

  const specialPercent =
    (
      bucketValue.special /
      total
    ) * 100;

  let bucketScore = 100;

  /**
   * Kleine afwijkingen zijn niet erg.
   * Optionality en Special worden iets
   * zwaarder gewogen omdat daar het
   * risicoprofiel sneller verandert.
   */
  bucketScore -=
    Math.abs(
      corePercent - 45,
    ) * 0.4;

  bucketScore -=
    Math.abs(
      growthPercent - 35,
    ) * 0.4;

  bucketScore -=
    Math.abs(
      optionalityPercent - 15,
    ) * 0.7;

  bucketScore -=
    Math.abs(
      specialPercent - 5,
    ) * 0.8;

  /**
   * Extra penalty bij structureel
   * extreme verdelingen.
   */
  if (corePercent < 25) {
    bucketScore -=
      (25 - corePercent) * 1.2;
  }

  if (growthPercent > 55) {
    bucketScore -=
      (growthPercent - 55) * 1.0;
  }

  if (optionalityPercent > 25) {
    bucketScore -=
      (
        optionalityPercent -
        25
      ) * 1.5;
  }

  if (specialPercent > 12) {
    bucketScore -=
      (
        specialPercent -
        12
      ) * 2;
  }

  bucketScore =
    clampScore(bucketScore);

  /**
   * ------------------------------------
   * 2. COMMODITY BALANCE
   * ------------------------------------
   *
   * Phoenix is bewust precious-metals
   * gericht.
   *
   * Daarom gebruiken we géén klassieke
   * diversificatie-aanname.
   *
   * Strategic centre:
   *
   * Silver 60%
   * Gold   25%
   * Mixed  15%
   *
   * Dit past bij de huidige Silver Phoenix
   * thesis, maar laat genoeg goudexposure
   * toe.
   */

  let silverValue = 0;
  let goldValue = 0;
  let mixedValue = 0;

  for (const position of scored) {
    const company =
      getCompanyById(
        position.companyId,
      );

    if (!company) {
      continue;
    }

    if (
      company.commodity === "silver"
    ) {
      silverValue +=
        position.marketValueEur;
    } else if (
      company.commodity === "gold"
    ) {
      goldValue +=
        position.marketValueEur;
    } else if (
      company.commodity === "mixed"
    ) {
      mixedValue +=
        position.marketValueEur;
    }
  }

  const commodityTotal =
    silverValue +
    goldValue +
    mixedValue;

  let commodityScore = 100;

  if (commodityTotal > 0) {
    const silverPercent =
      (
        silverValue /
        commodityTotal
      ) * 100;

    const goldPercent =
      (
        goldValue /
        commodityTotal
      ) * 100;

    const mixedPercent =
      (
        mixedValue /
        commodityTotal
      ) * 100;

    commodityScore -=
      Math.abs(
        silverPercent - 60,
      ) * 0.25;

    commodityScore -=
      Math.abs(
        goldPercent - 25,
      ) * 0.25;

    commodityScore -=
      Math.abs(
        mixedPercent - 15,
      ) * 0.2;

    /**
     * Extreme commodity concentration
     * krijgt extra penalty.
     */
    if (silverPercent > 80) {
      commodityScore -=
        (
          silverPercent -
          80
        ) * 1.5;
    }

    if (goldPercent > 50) {
      commodityScore -=
        (
          goldPercent -
          50
        ) * 1.25;
    }

    if (mixedPercent > 35) {
      commodityScore -=
        (
          mixedPercent -
          35
        ) * 1.25;
    }
  }

  commodityScore =
    clampScore(commodityScore);

  /**
   * ------------------------------------
   * PORTFOLIO BALANCE SCORE
   * ------------------------------------
   *
   * Bucket structure is momenteel
   * belangrijker dan commodity mix.
   *
   * Later voegen we hier ook toe:
   *
   * - producer/developer/explorer
   * - jurisdiction
   * - single-asset concentration
   * - commodity sub-sector
   */
  return (
    bucketScore * 0.65 +
    commodityScore * 0.35
  );
}

/**
 * Cycle Positioning
 *
 * Nog steeds placeholder.
 *
 * Deze 70 betekent nog geen actuele
 * beoordeling van zilver of goud.
 */
function calculateCyclePositioning():
  number {
  return 70;
}

/**
 * Partial Portfolio Score.
 *
 * Zolang niet alle componenten voldoende
 * betrouwbaar zijn, berekenen we alleen
 * met de componenten die beschikbaar zijn.
 *
 * De gewichten worden dan automatisch
 * opnieuw genormaliseerd.
 */
function calculatePartialPortfolioScore(
  components: PortfolioV2Components,
): number | null {
  const weightedComponents = [
    {
      value:
        components.opportunityQuality,
      weight: 45,
    },
    {
      value:
        components.allocationEfficiency,
      weight: 15,
    },
    {
      value:
        components.capitalEfficiency,
      weight: 5,
    },
    {
      value:
        components.positionSizingDiscipline,
      weight: 5,
    },
    {
      value:
        components.riskAndConcentration,
      weight: 15,
    },
    {
      value:
        components.portfolioBalance,
      weight: 10,
    },
    {
      value:
        components.cyclePositioning,
      weight: 5,
    },
  ];

  const available =
    weightedComponents.filter(
      (
        component,
      ): component is {
        value: number;
        weight: number;
      } =>
        component.value !== null,
    );

  const totalWeight =
    available.reduce(
      (total, component) =>
        total + component.weight,
      0,
    );

  if (totalWeight <= 0) {
    return null;
  }

  const weightedTotal =
    available.reduce(
      (total, component) =>
        total +
        component.value *
          component.weight,
      0,
    );

  return (
    weightedTotal / totalWeight
  );
}

/**
 * Bouwt Portfolio v2 op basis van
 * actuele marktwaarden.
 */
export function calculatePortfolioV2(
  inputPositions: PortfolioV2PositionInput[],
): PortfolioV2Result {
  const totalMarketValueEur =
    inputPositions.reduce(
      (total, position) =>
        total +
        Math.max(
          0,
          position.marketValueEur,
        ),
      0,
    );

  const positions =
    inputPositions.map(
      (
        position,
      ): PortfolioV2PositionResult => {
        const phoenix =
          getPhoenixCompanyV2(
            position.companyId,
          );

        const allocationPercent =
          calculateAllocationPercent({
            marketValueEur:
              position.marketValueEur,
            totalMarketValueEur,
          });

        const opportunity =
          phoenix?.scores.opportunity ??
          null;

        const bucket =
          phoenix?.portfolio.bucket ??
          null;

        const idealMin =
          phoenix?.portfolio.idealMin ??
          null;

        const idealMax =
          phoenix?.portfolio.idealMax ??
          null;

        const hardMax =
          phoenix?.portfolio.hardMax ??
          null;

        const allocationFitScore =
          idealMin !== null &&
          idealMax !== null &&
          hardMax !== null
            ? calculateAllocationFitScore({
                currentAllocation:
                  allocationPercent,
                idealMin,
                idealMax,
                hardMax,
              })
            : null;

        const isBelowIdeal =
          idealMin !== null
            ? allocationPercent <
              idealMin
            : false;

        const isInsideIdeal =
          idealMin !== null &&
          idealMax !== null
            ? allocationPercent >=
                idealMin &&
              allocationPercent <=
                idealMax
            : false;

        const isAboveIdeal =
          idealMax !== null
            ? allocationPercent >
              idealMax
            : false;

        const isAboveHardMax =
          hardMax !== null
            ? allocationPercent >
              hardMax
            : false;

        return {
          companyId:
            position.companyId,

          marketValueEur:
            position.marketValueEur,

          allocationPercent,

          opportunity,

          bucket,

          idealMin,
          idealMax,
          hardMax,

          allocationFitScore,

          isBelowIdeal,
          isInsideIdeal,
          isAboveIdeal,
          isAboveHardMax,
        };
      },
    );

  const scoredPositions =
    positions.filter(
      (position) =>
        position.opportunity !== null,
    );

  const scoredMarketValueEur =
    scoredPositions.reduce(
      (total, position) =>
        total +
        position.marketValueEur,
      0,
    );

  const dataCoveragePercent =
    totalMarketValueEur > 0
      ? (
          scoredMarketValueEur /
          totalMarketValueEur
        ) * 100
      : 0;

  const portfolioScoreIsReliable =
    dataCoveragePercent >=
    FULL_PORTFOLIO_METRIC_MIN_COVERAGE;

  const components: PortfolioV2Components =
    {
      opportunityQuality:
        calculateOpportunityQuality(
          positions,
        ),

      allocationEfficiency:
        calculateAllocationEfficiency(
          positions,
        ),

      capitalEfficiency:
        calculateCapitalEfficiency({
          positions,
          dataCoveragePercent,
        }),

      positionSizingDiscipline:
        calculatePositionSizingDiscipline(
          positions,
        ),

      riskAndConcentration:
        calculateRiskAndConcentration({
          positions,
          dataCoveragePercent,
        }),

      portfolioBalance:
        calculatePortfolioBalance({
          positions,
          dataCoveragePercent,
        }),

      cyclePositioning:
        calculateCyclePositioning(),
    };

  const partialPortfolioScore =
    calculatePartialPortfolioScore(
      components,
    );

  return {
    totalMarketValueEur,

    scoredMarketValueEur,

    dataCoveragePercent,

    scoredPositions:
      scoredPositions.length,

    totalPositions:
      positions.length,

    positions,

    components,

    partialPortfolioScore,

    portfolioScoreIsReliable,
  };
}