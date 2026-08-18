import {
  type PortfolioV2PositionResult,
} from "./portfolio-v2";

export type ExitStatus =
  | "REVIEW"
  | "HOLD"
  | "WATCH"
  | "TRIM"
  | "SCALE_OUT"
  | "EXIT";

export type ThesisHealth =
  | "UNKNOWN"
  | "INTACT"
  | "WEAKENING"
  | "BROKEN";

export type MarketHeatLevel =
  | "COLD"
  | "NORMAL"
  | "WARM"
  | "HOT"
  | "EXTREME";

export type ExitPressureComponents = {
  thesisRisk: number | null;
  investmentDeterioration: number | null;
  remainingUpsideRisk: number | null;
  marketHeat: number | null;
  valuationOverextension: number | null;
  positionProfitRisk: number | null;
};

export type ExitReviewInput = {
  companyId: string;

  investmentScore: number | null;
  previousInvestmentScore: number | null;

  opportunityScore: number | null;

  thesisHealth: ThesisHealth;

  marketHeatScore: number | null;

  remainingUpsidePercent: number | null;

  currentAllocationPercent: number | null;
  idealMax: number | null;
  hardMax: number | null;

  unrealizedReturnPercent: number | null;
};

export type ExitReviewSupplement = {
  investmentScore: number | null;
  previousInvestmentScore: number | null;

  thesisHealth: ThesisHealth;

  marketHeatScore: number | null;

  remainingUpsidePercent: number | null;

  unrealizedReturnPercent: number | null;
};

export type ExitReviewResult = {
  companyId: string;

  exitPressureScore: number | null;
  status: ExitStatus;

    dataCoveragePercent: number;
  scoreIsReliable: boolean;

  components: ExitPressureComponents;

  reasons: string[];

  reviewRequired: boolean;
};

export function buildExitReviewInput({
  position,
  supplement,
}: {
  position: PortfolioV2PositionResult;
  supplement: ExitReviewSupplement;
}): ExitReviewInput {
  return {
    companyId:
      position.companyId,

    investmentScore:
      supplement.investmentScore,

    previousInvestmentScore:
      supplement.previousInvestmentScore,

    opportunityScore:
      position.opportunity,

    thesisHealth:
      supplement.thesisHealth,

    marketHeatScore:
      supplement.marketHeatScore,

    remainingUpsidePercent:
      supplement.remainingUpsidePercent,

    currentAllocationPercent:
      position.allocationPercent,

    idealMax:
      position.idealMax,

    hardMax:
      position.hardMax,

    unrealizedReturnPercent:
      supplement.unrealizedReturnPercent,
  };
}

export type PortfolioExitReviewItem = {
  position: PortfolioV2PositionResult;
  input: ExitReviewInput;
  result: ExitReviewResult;
};

export function reviewPortfolioExits({
  positions,
  supplements,
}: {
  positions: PortfolioV2PositionResult[];

  supplements: Map<
    string,
    ExitReviewSupplement
  >;
}): PortfolioExitReviewItem[] {
  return positions.map(
    (position) => {
      const supplement =
        supplements.get(
          position.companyId,
        ) ?? {
          investmentScore: null,
          previousInvestmentScore: null,

          thesisHealth:
            "UNKNOWN" as ThesisHealth,

          marketHeatScore: null,

          remainingUpsidePercent: null,

          unrealizedReturnPercent: null,
        };

      const input =
        buildExitReviewInput({
          position,
          supplement,
        });

      const result =
        calculateExitPressure(
          input,
        );

      return {
        position,
        input,
        result,
      };
    },
  );
}

function clampExitPressure(
  value: number,
): number {
  return Math.max(
    0,
    Math.min(100, value),
  );
}

export function calculateExitPressure(
  input: ExitReviewInput,
): ExitReviewResult {
  const components: ExitPressureComponents = {
    thesisRisk: null,
    investmentDeterioration: null,
    remainingUpsideRisk: null,
    marketHeat: null,
    valuationOverextension: null,
    positionProfitRisk: null,
  };

  const reasons: string[] = [];

  /**
   * 1. THESIS RISK
   *
   * Een echte thesis break moet zwaar wegen.
   * Dit staat los van koersbewegingen.
   */
  if (
  input.thesisHealth === "UNKNOWN"
) {
  components.thesisRisk = null;
} else if (
  input.thesisHealth === "INTACT"
) {
  components.thesisRisk = 0;
} else if (
  input.thesisHealth === "WEAKENING"
) {
  components.thesisRisk = 55;

  reasons.push(
    "De investment thesis vertoont tekenen van verzwakking.",
  );
} else {
  components.thesisRisk = 100;

  reasons.push(
    "De investment thesis is gebroken.",
  );
}

  /**
   * 2. INVESTMENT DETERIORATION
   *
   * We kijken bewust naar verandering,
   * niet alleen naar de huidige score.
   */
  if (
    input.investmentScore !== null &&
    input.previousInvestmentScore !== null
  ) {
    const deterioration =
      input.previousInvestmentScore -
      input.investmentScore;

    components.investmentDeterioration =
      clampExitPressure(
        Math.max(
          0,
          deterioration * 8,
        ),
      );

    if (deterioration >= 5) {
      reasons.push(
        `Investment Score is ${deterioration.toFixed(
          1,
        )} punten gedaald sinds de vorige review.`,
      );
    }
  }

  /**
   * 3. REMAINING UPSIDE
   *
   * Veel resterende upside = weinig exitdruk.
   * Nauwelijks resterende upside = hoge exitdruk.
   */
  if (
    input.remainingUpsidePercent !== null
  ) {
    const upside =
      input.remainingUpsidePercent;

    if (upside >= 50) {
      components.remainingUpsideRisk = 0;
    } else if (upside >= 25) {
      components.remainingUpsideRisk = 25;
    } else if (upside >= 10) {
      components.remainingUpsideRisk = 55;
    } else if (upside >= 0) {
      components.remainingUpsideRisk = 80;
    } else {
      components.remainingUpsideRisk = 100;
    }

    if (upside < 10) {
      reasons.push(
        "Er resteert nog maar beperkte scenario-upside.",
      );
    }
  }

  /**
   * 4. MARKET HEAT
   *
   * Input is zelf al 0–100.
   */
  if (input.marketHeatScore !== null) {
    components.marketHeat =
      clampExitPressure(
        input.marketHeatScore,
      );

    if (input.marketHeatScore >= 80) {
      reasons.push(
        "De markt bevindt zich in een zeer hete of euforische fase.",
      );
    }
  }

  /**
   * 5. VALUATION / OVEREXTENSION
   *
   * Voor V1 gebruiken we Opportunity als
   * eenvoudige proxy. Later krijgt dit een
   * eigen valuation-model.
   */
  if (input.opportunityScore !== null) {
    components.valuationOverextension =
      clampExitPressure(
        100 - input.opportunityScore,
      );
  }

  /**
   * 6. POSITION / PROFIT RISK
   *
   * Winst alleen is nooit een exitreden.
   * Grote winst verhoogt alleen de druk
   * wanneer andere signalen aanwezig zijn.
   */
  if (
    input.unrealizedReturnPercent !== null
  ) {
    const profit =
      input.unrealizedReturnPercent;

    if (profit < 50) {
      components.positionProfitRisk = 0;
    } else if (profit < 100) {
      components.positionProfitRisk = 15;
    } else if (profit < 200) {
      components.positionProfitRisk = 30;
    } else {
      components.positionProfitRisk = 45;
    }
  }

  const weightedComponents = [
    {
      value: components.thesisRisk,
      weight: 25,
    },
    {
      value:
        components.investmentDeterioration,
      weight: 15,
    },
    {
      value:
        components.remainingUpsideRisk,
      weight: 20,
    },
    {
      value: components.marketHeat,
      weight: 20,
    },
    {
      value:
        components.valuationOverextension,
      weight: 10,
    },
    {
      value:
        components.positionProfitRisk,
      weight: 10,
    },
  ];

  const available =
    weightedComponents.filter(
      (
        component,
      ): component is {
        value: number;
        weight: number;
      } => component.value !== null,
    );

  const totalWeight =
    available.reduce(
      (total, component) =>
        total + component.weight,
      0,
    );

    const maximumWeight =
  weightedComponents.reduce(
    (total, component) =>
      total + component.weight,
    0,
  );

const dataCoveragePercent =
  maximumWeight > 0
    ? (totalWeight / maximumWeight) *
      100
    : 0;

const scoreIsReliable =
  dataCoveragePercent >= 70;

  const exitPressureScore =
    totalWeight > 0
      ? available.reduce(
          (total, component) =>
            total +
            component.value *
              component.weight,
          0,
        ) / totalWeight
      : null;

let status: ExitStatus = "HOLD";

/**
 * ------------------------------------
 * EXIT STATUS
 * ------------------------------------
 *
 * Eerst bepalen we de status vanuit
 * de totale Exit Pressure.
 */

if (exitPressureScore !== null) {
  if (exitPressureScore >= 80) {
    status = "EXIT";
  } else if (
    exitPressureScore >= 65
  ) {
    status = "SCALE_OUT";
  } else if (
    exitPressureScore >= 50
  ) {
    status = "TRIM";
  } else if (
    exitPressureScore >= 35
  ) {
    status = "WATCH";
  }
}

/**
 * ------------------------------------
 * SAFETY OVERRIDES
 * ------------------------------------
 */

/**
 * Een gebroken thesis betekent altijd
 * volledige exit, ongeacht coverage.
 */
if (input.thesisHealth === "BROKEN") {
  status = "EXIT";
}

/**
 * Bij onvoldoende data geven we nog
 * geen definitief exitadvies.
 *
 * Een expliciet gebroken thesis blijft
 * de enige uitzondering.
 */
if (
  !scoreIsReliable &&
  input.thesisHealth !== "BROKEN"
) {
  status = "REVIEW";
}

/**
 * Bij voldoende coverage gelden deze
 * extra veiligheidsregels.
 */
if (scoreIsReliable) {
  if (
    input.thesisHealth === "WEAKENING" &&
    status === "HOLD"
  ) {
    status = "WATCH";
  }

  if (
    input.marketHeatScore !== null &&
    input.marketHeatScore >= 90 &&
    status === "HOLD"
  ) {
    status = "WATCH";
  }
}

  return {
    companyId: input.companyId,

    exitPressureScore,
    status,
      dataCoveragePercent,
  scoreIsReliable,

    components,
    reasons,

    reviewRequired:
      input.thesisHealth !== "INTACT" ||
      (
        exitPressureScore !== null &&
        exitPressureScore >= 35
      ),
  };
}

export const exitEngineTestCases = {
  healthyPosition: calculateExitPressure({
    companyId: "TEST_HEALTHY",

    investmentScore: 90,
    previousInvestmentScore: 91,

    opportunityScore: 88,

    thesisHealth: "INTACT",

    marketHeatScore: 35,

    remainingUpsidePercent: 75,

    currentAllocationPercent: 5,
    idealMax: 6,
    hardMax: 8,

    unrealizedReturnPercent: 40,
  }),

  hotWinner: calculateExitPressure({
    companyId: "TEST_HOT_WINNER",

    investmentScore: 88,
    previousInvestmentScore: 90,

    opportunityScore: 55,

    thesisHealth: "INTACT",

    marketHeatScore: 90,

    remainingUpsidePercent: 15,

    currentAllocationPercent: 8,
    idealMax: 6,
    hardMax: 8,

    unrealizedReturnPercent: 180,
  }),

  weakeningThesis: calculateExitPressure({
    companyId: "TEST_WEAKENING",

    investmentScore: 68,
    previousInvestmentScore: 82,

    opportunityScore: 52,

    thesisHealth: "WEAKENING",

    marketHeatScore: 65,

    remainingUpsidePercent: 20,

    currentAllocationPercent: 6,
    idealMax: 6,
    hardMax: 8,

    unrealizedReturnPercent: 70,
  }),

  brokenThesis: calculateExitPressure({
    companyId: "TEST_BROKEN",

    investmentScore: 60,
    previousInvestmentScore: 85,

    opportunityScore: 45,

    thesisHealth: "BROKEN",

    marketHeatScore: 30,

    remainingUpsidePercent: 60,

    currentAllocationPercent: 4,
    idealMax: 6,
    hardMax: 8,

    unrealizedReturnPercent: -15,
  }),
};