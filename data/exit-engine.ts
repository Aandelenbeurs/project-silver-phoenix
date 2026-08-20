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
  investmentDeteriorationScore?: number | null;
  opportunityScore: number | null;

  thesisHealth: ThesisHealth;

  marketHeatScore: number | null;

  remainingUpsidePercent: number | null;
  estimatedCompanyUpsidePercent?: number | null;
  scenarioUpsideScore?: number | null;

  currentAllocationPercent: number | null;
  idealMax: number | null;
  hardMax: number | null;

  unrealizedReturnPercent: number | null;

  latestInvestmentDecline?: number | null;
totalInvestmentDecline?: number | null;
consecutiveInvestmentDeclines?: number | null;
};

export type ExitReviewSupplement = {
  investmentScore: number | null;
  previousInvestmentScore: number | null;
  investmentDeteriorationScore?: number | null;
  thesisHealth: ThesisHealth;

  marketHeatScore: number | null;

  remainingUpsidePercent: number | null;
  estimatedCompanyUpsidePercent?: number | null;
  scenarioUpsideScore?: number | null;

  unrealizedReturnPercent: number | null;

  latestInvestmentDecline?: number | null;
totalInvestmentDecline?: number | null;
consecutiveInvestmentDeclines?: number | null;
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

      investmentDeteriorationScore:
        supplement.investmentDeteriorationScore,

        latestInvestmentDecline:
  supplement.latestInvestmentDecline,

totalInvestmentDecline:
  supplement.totalInvestmentDecline,

consecutiveInvestmentDeclines:
  supplement.consecutiveInvestmentDeclines,

    opportunityScore:
      position.opportunity,

    thesisHealth:
      supplement.thesisHealth,

    marketHeatScore:
      supplement.marketHeatScore,

    remainingUpsidePercent:
      supplement.remainingUpsidePercent,

      estimatedCompanyUpsidePercent:
       supplement.estimatedCompanyUpsidePercent,

      scenarioUpsideScore:
       supplement.scenarioUpsideScore,

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
 * Deze score wordt buiten de Exit Engine
 * berekend op basis van reviewhistorie.
 */
if (
  input.investmentDeteriorationScore != null
) {
  components.investmentDeterioration =
    clampExitPressure(
      input.investmentDeteriorationScore,
    );
}

/**
 * 3. COMPANY UPSIDE RISK
 *
 * We gebruiken hier de geschatte
 * bedrijfsspecifieke resterende upside.
 *
 * Veel upside = weinig exitdruk.
 * Weinig upside = hoge exitdruk.
 */
if (
  input.estimatedCompanyUpsidePercent != null
) {
  const upside =
    Math.max(
      0,
      input.estimatedCompanyUpsidePercent,
    );

  /**
   * Continue curve:
   *
   *   0% upside   -> risk 100
   *  25% upside   -> risk ~78
   *  50% upside   -> risk ~61
   * 100% upside   -> risk ~37
   * 200% upside   -> risk ~14
   * 400% upside   -> risk ~2
   *
   * Geen harde buckets, zodat kleine
   * verschillen tussen bedrijven behouden
   * blijven.
   */
  components.remainingUpsideRisk =
    clampExitPressure(
      100 *
        Math.exp(
          -upside / 100,
        ),
    );

  if (upside < 50) {
    reasons.push(
      "De resterende bedrijfsspecifieke scenario-upside is beperkt.",
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
 * Zonder expliciete thesisreview geven
 * we nooit een definitief exitadvies.
 *
 * Automatische marktdata mag een ontbrekende
 * fundamentele beoordeling niet vervangen.
 */
if (
  input.thesisHealth === "UNKNOWN"
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

export type ExitCapitalAction =
  | "KEEP_POSITION"
  | "SEEK_REPLACEMENT"
  | "ALLOW_CASH";

export type ExitActionSuggestion = {
  action: ExitStatus;

  driver: ExitActionDriver;

  targetSellPercent: number;

  minSellPercent: number;
  maxSellPercent: number;

  /**
   * Wat moet er gebeuren met het kapitaal
   * dat door de exitactie vrijkomt?
   */
  capitalAction: ExitCapitalAction;

  /**
   * Mag Phoenix de verkoopactie uitvoeren
   * wanneer er geen betere vervanger bestaat?
   */
  canExitWithoutReplacement: boolean;

  explanation: string;
};

export type BuyEligibilityResult = {
  eligible: boolean;

  reason:
    | "ELIGIBLE"
    | "REVIEW_REQUIRED"
    | "EXIT_PRESSURE"
    | "INSUFFICIENT_UPSIDE";
};

export function evaluateBuyEligibility({
  exitReview,
  remainingUpsidePercent,
}: {
  exitReview: ExitReviewResult | null;
  remainingUpsidePercent: number | null;
}): BuyEligibilityResult {
  /**
   * Zonder betrouwbare exit review
   * geen nieuw kapitaal toevoegen.
   */
  if (
    !exitReview ||
    exitReview.status === "REVIEW"
  ) {
    return {
      eligible: false,
      reason: "REVIEW_REQUIRED",
    };
  }

  /**
   * Geen nieuw geld toevoegen aan een
   * positie die Phoenix al wil afbouwen.
   */
  if (
    exitReview.status === "TRIM" ||
    exitReview.status === "SCALE_OUT" ||
    exitReview.status === "EXIT"
  ) {
    return {
      eligible: false,
      reason: "EXIT_PRESSURE",
    };
  }

  /**
   * Ook bij HOLD/WATCH moet er voldoende
   * resterende upside zijn om nieuw geld
   * te rechtvaardigen.
   *
   * Voorlopige grens: minimaal 30%.
   */
  if (
    remainingUpsidePercent === null ||
    remainingUpsidePercent < 30
  ) {
    return {
      eligible: false,
      reason: "INSUFFICIENT_UPSIDE",
    };
  }

  return {
    eligible: true,
    reason: "ELIGIBLE",
  };
}

export type ExitActionDriver =
  | "THESIS"
  | "DETERIORATION"
  | "UPSIDE"
  | "MARKET_HEAT"
  | "VALUATION"
  | "PROFIT_PROTECTION"
  | "COMBINED"
  | "NONE";

  export function getDominantExitDriver({
  input,
  result,
}: {
  input: ExitReviewInput;
  result: ExitReviewResult;
}): ExitActionDriver {
  const components =
    result.components;

  /**
   * Een gebroken of verzwakkende thesis
   * heeft altijd fundamentele prioriteit.
   */
  if (
    input.thesisHealth === "BROKEN" ||
    input.thesisHealth === "WEAKENING"
  ) {
    return "THESIS";
  }

  const availableDrivers = [
    {
      driver:
        "DETERIORATION" as const,
      score:
        components.investmentDeterioration,
    },
    {
      driver: "UPSIDE" as const,
      score:
        components.remainingUpsideRisk,
    },
    {
      driver:
        "MARKET_HEAT" as const,
      score:
        components.marketHeat,
    },
    {
      driver:
        "VALUATION" as const,
      score:
        components.valuationOverextension,
    },
    {
      driver:
        "PROFIT_PROTECTION" as const,
      score:
        components.positionProfitRisk,
    },
  ].filter(
    (
      item,
    ): item is {
      driver:
        | "DETERIORATION"
        | "UPSIDE"
        | "MARKET_HEAT"
        | "VALUATION"
        | "PROFIT_PROTECTION";
      score: number;
    } => item.score !== null,
  );

  if (availableDrivers.length === 0) {
    return "NONE";
  }

  const strongDrivers =
    availableDrivers.filter(
      (item) => item.score >= 65,
    );

  /**
   * Meerdere duidelijke exitsignalen
   * tegelijk vormen een gecombineerd
   * exitargument.
   */
  if (strongDrivers.length >= 2) {
    return "COMBINED";
  }

  const dominant =
    [...availableDrivers].sort(
      (a, b) =>
        b.score - a.score,
    )[0];

  if (!dominant) {
    return "NONE";
  }

  return dominant.driver;
}

function applyDriverAdjustment({
  basePercent,
  driver,
}: {
  basePercent: number;
  driver: ExitActionDriver;
}): number {
  const multiplier =
    driver === "THESIS"
      ? 1.25
      : driver === "DETERIORATION"
        ? 1.15
        : driver === "COMBINED"
          ? 1.2
          : driver === "MARKET_HEAT"
            ? 0.9
            : driver === "PROFIT_PROTECTION"
              ? 0.9
              : 1;

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        basePercent * multiplier,
      ),
    ),
  );
}

export function getExitActionSuggestion({
  input,
  result,
}: {
  input: ExitReviewInput;
  result: ExitReviewResult;
}): ExitActionSuggestion {
  const driver =
  getDominantExitDriver({
    input,
    result,
  });
  /**
   * Geen betrouwbare beoordeling =
   * nog geen verkoopactie voorstellen.
   */

  function getDriverExplanation(): string {
  switch (driver) {
    case "THESIS":
      return "De investment thesis is de belangrijkste reden voor de verhoogde exitdruk.";

    case "DETERIORATION":
      return "De Investment Score verslechtert en vormt het belangrijkste exitsignaal.";

    case "UPSIDE":
      return "De resterende bedrijfsspecifieke scenario-upside is het belangrijkste exitsignaal.";

    case "MARKET_HEAT":
      return "De huidige marktfase en oververhitting vormen het belangrijkste exitsignaal.";

    case "VALUATION":
      return "De waardering ten opzichte van de resterende opportunity vormt het belangrijkste exitsignaal.";

    case "PROFIT_PROTECTION":
      return "De omvang van de opgebouwde winst verhoogt de noodzaak om risico te beschermen.";

    case "COMBINED":
      return "Meerdere sterke exitsignalen lopen tegelijk op.";

    default:
      return "Er is momenteel geen dominant exitsignaal.";
  }
}

  if (result.status === "REVIEW") {
    return {
      action: "REVIEW",

      driver,

      targetSellPercent: 0,

      minSellPercent: 0,
      maxSellPercent: 0,

      capitalAction:
    "KEEP_POSITION",

  canExitWithoutReplacement:
    false,

      explanation:
        "Eerst de ontbrekende reviewdata aanvullen voordat een verkoopactie wordt voorgesteld.",
    };
  }

  

  /**
   * Thesis break is de sterkste override.
   *
   * Een gebroken investment thesis betekent
   * dat de oorspronkelijke reden om de positie
   * te bezitten niet meer geldig is.
   */
  if (
    input.thesisHealth === "BROKEN"
  ) {
    return {
      action: "EXIT",

      driver,

      targetSellPercent: 100,

      minSellPercent: 100,
      maxSellPercent: 100,

      capitalAction:
  "ALLOW_CASH",

canExitWithoutReplacement:
  true,

      explanation:
        "De investment thesis is gebroken. Phoenix adviseert volledige exit.",
    };
  }

  if (result.status === "HOLD") {
    return {
      action: "HOLD",

      driver,

      targetSellPercent: 0,

      minSellPercent: 0,
      maxSellPercent: 0,

      capitalAction:
  "KEEP_POSITION",

canExitWithoutReplacement:
  false,

      explanation:
        "De huidige exit pressure geeft geen aanleiding om de positie af te bouwen.",
    };
  }

  if (result.status === "WATCH") {
    return {
      action: "WATCH",

      driver,

      targetSellPercent: 0,

      minSellPercent: 0,
      maxSellPercent: 0,

      capitalAction:
  "KEEP_POSITION",

canExitWithoutReplacement:
  false,

      explanation:
          getDriverExplanation() +  
          "De exit pressure loopt op, maar is nog onvoldoende voor een directe verkoopactie.",
    };
  }

  if (result.status === "TRIM") {
  const pressure =
    result.exitPressureScore ?? 50;

  /**
   * Binnen TRIM loopt het verkoopadvies
   * geleidelijk van 10% naar 20%.
   *
   * 50 pressure = 10%
   * 57 pressure = 15%
   * 64 pressure = 20%
   */
  const normalizedPressure =
    Math.max(
      50,
      Math.min(
        64,
        pressure,
      ),
    );

 const baseSellPercent =
  Math.round(
    10 +
      (
        normalizedPressure -
        50
      ) *
        (10 / 14),
  );

const targetSellPercent =
  applyDriverAdjustment({
    basePercent:
      baseSellPercent,

    driver,
  });

  return {
    action: "TRIM",

    driver,

    targetSellPercent,

    minSellPercent: 10,
    maxSellPercent: 20,

    capitalAction:
  "SEEK_REPLACEMENT",

canExitWithoutReplacement:
  false,

    explanation:
  getDriverExplanation() + 
  " Een beperkte winstname of risicoreductie is gerechtvaardigd, maar het grootste deel van de positie blijft behouden.",
  };
}

  if (
    result.status === "SCALE_OUT"
  ) {
    const pressure =
      result.exitPressureScore ?? 65;

    /**
     * Binnen SCALE_OUT loopt het advies
     * geleidelijk op.
     *
     * 65 pressure ≈ 30%
     * 79 pressure ≈ 50%
     */
    const normalizedPressure =
  Math.max(
    65,
    Math.min(
      79,
      pressure,
    ),
  );

const baseSellPercent =
  Math.round(
    25 +
      (
        normalizedPressure -
        65
      ) *
        (25 / 14),
  );

const targetSellPercent =
  applyDriverAdjustment({
    basePercent:
      baseSellPercent,

    driver,
  });

    return {
      action: "SCALE_OUT",

      driver,

      targetSellPercent,

      minSellPercent: 25,
      maxSellPercent: 50,

      capitalAction:
  "SEEK_REPLACEMENT",

canExitWithoutReplacement:
  true,

      explanation:
          getDriverExplanation() + 
          "Meerdere exitsignalen zijn sterk genoeg om de positie gefaseerd aanzienlijk af te bouwen.",
    };
  }

  /**
   * EXIT zonder thesis break.
   *
   * Hier bepaalt de hoogte van de totale
   * Exit Pressure hoe agressief Phoenix
   * wil afbouwen.
   */
const pressure =
  result.exitPressureScore ?? 80;

/**
 * EXIT 80–89:
 *
 * geleidelijk van 60% naar 85%.
 */
if (pressure < 90) {
  const normalizedPressure =
    Math.max(
      80,
      Math.min(
        89,
        pressure,
      ),
    );

const baseSellPercent =
  Math.round(
    60 +
      (
        normalizedPressure -
        80
      ) *
        (25 / 9),
  );

const targetSellPercent =
  applyDriverAdjustment({
    basePercent:
      baseSellPercent,

    driver,
  });

  return {
    action: "EXIT",

    driver,

    targetSellPercent,

    minSellPercent: 60,
    maxSellPercent: 85,

    capitalAction:
  "ALLOW_CASH",

canExitWithoutReplacement:
  true,

    explanation:
       getDriverExplanation() +  
       "De gecombineerde exit pressure is zeer hoog. Phoenix adviseert het grootste deel van de positie af te bouwen.",
  };
}

/**
 * EXIT 90–100:
 *
 * geleidelijk van 90% naar 100%.
 */
const normalizedPressure =
  Math.max(
    90,
    Math.min(
      100,
      pressure,
    ),
  );

const targetSellPercent =
  Math.round(
    90 +
      (
        normalizedPressure -
        90
      ),
);

return {
  action: "EXIT",

  driver,

  targetSellPercent,

  minSellPercent: 90,
  maxSellPercent: 100,

  capitalAction:
  "ALLOW_CASH",

canExitWithoutReplacement:
  true,

  explanation:
    targetSellPercent >= 100
      ? "De gecombineerde exit pressure is extreem hoog. Phoenix adviseert volledige exit."
      : "De gecombineerde exit pressure is extreem hoog. Phoenix adviseert vrijwel volledige exit.",
};
};