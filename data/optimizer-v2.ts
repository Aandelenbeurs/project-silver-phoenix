import {
  calculatePortfolioV2,
  type PortfolioV2PositionInput,
  type PortfolioV2Result,
} from "./portfolio-v2";

import {
  getPhoenixCompanyV2,
  phoenixCompaniesV2,
} from "./phoenix-v2";;

import {
  buildPhoenixScenarioRanking,
  type LiveMetalPrices,
} from "./scenario-upside";

import {
  type ExitReviewResult,
} from "./exit-engine";

import {
  evaluateBuyEligibility,
} from "./buy-eligibility";

export type NewMoneyOptimizerInput = {
  /**
   * Huidige aandelenportefeuille.
   *
   * Alleen equities.
   * ETF's en fysiek metaal behandelen
   * we later apart.
   */
  positions: PortfolioV2PositionInput[];

  /**
   * Bedrijven waar Phoenix uit mag kiezen.
   *
   * Dit mogen bestaande holdings zijn,
   * maar ook watchlistaandelen zoals
   * Contango.
   */
  candidateCompanyIds: string[];

  /**
   * Nieuw beschikbaar kapitaal.
   *
   * Bijvoorbeeld:
   * 3000
   */
  newMoneyEur: number;

    liveMetalPrices?: 
    LiveMetalPrices;

  /**
   * Maximaal aantal verschillende
   * kooporders.
   *
   * Default = 3.
   */
  maxPositions?: number;

  /**
   * Minimale praktische order.
   *
   * Voorkomt adviezen zoals:
   * "koop €83 van aandeel X".
   */
  minimumOrderEur?: number;

  exitReviews?: Map<
  string,
  ExitReviewResult
>;
};


export type NewMoneyAllocation = {
  companyId: string;

  amountEur: number;

  allocationBeforePercent: number;
  allocationAfterPercent: number;

  opportunity: number;
  investmentScore: number;

  idealMin: number;
  idealMax: number;
  hardMax: number;

  wasExistingHolding: boolean;
};


export type NewMoneyOptimizerResult = {
  newMoneyEur: number;

  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreImprovement: number | null;

  allocations: NewMoneyAllocation[];

  portfolioBefore: PortfolioV2Result;
  portfolioAfter: PortfolioV2Result;

  moneyInvestedEur: number;
  moneyUnallocatedEur: number;

  isMeaningfulImprovement: boolean;

  explanation: string[];
};

type WorkingPosition = {
  companyId: string;
  marketValueEur: number;
};


const DEFAULT_MAX_POSITIONS = 3;

const DEFAULT_MINIMUM_ORDER_EUR = 500;

/**
 * We testen nieuw geld niet euro voor euro.
 *
 * Dat zou onnodig zwaar zijn en zou
 * schijnprecisie veroorzaken.
 *
 * Phoenix verdeelt kapitaal daarom in
 * praktische blokken.
 */

function determineStepSize(
  newMoneyEur: number,
): number {
  if (newMoneyEur <= 5_000) {
    return 250;
  }

  if (newMoneyEur <= 25_000) {
    return 500;
  }

  return 1_000;
}

function getPortfolioScore(
  portfolio: PortfolioV2Result,
): number | null {
  return portfolio.partialPortfolioScore;
}


function clonePositions(
  positions: PortfolioV2PositionInput[],
): WorkingPosition[] {
  return positions.map(
    (position) => ({
      companyId:
        position.companyId,

      marketValueEur:
        position.marketValueEur,
    }),
  );
}


function addMoneyToCompany({
  positions,
  companyId,
  amountEur,
}: {
  positions: WorkingPosition[];
  companyId: string;
  amountEur: number;
}): WorkingPosition[] {
  const next =
    positions.map(
      (position) => ({
        ...position,
      }),
    );

  const existing =
    next.find(
      (position) =>
        position.companyId ===
        companyId,
    );

  if (existing) {
    existing.marketValueEur +=
      amountEur;

    return next;
  }

  next.push({
    companyId,
    marketValueEur:
      amountEur,
  });

  return next;
}


function getPositionFromPortfolio(
  portfolio: PortfolioV2Result,
  companyId: string,
) {
  return portfolio.positions.find(
    (position) =>
      position.companyId ===
      companyId,
  );
}


/**
 * Controleert of extra geld in deze
 * positie de hardMax zou overschrijden.
 */
function canAddMoney({
  positions,
  companyId,
  amountEur,
}: {
  positions: WorkingPosition[];
  companyId: string;
  amountEur: number;
}): boolean {
  const phoenix =
    getPhoenixCompanyV2(
      companyId,
    );

  if (!phoenix) {
    return false;
  }

  const hardMax =
    phoenix.portfolio.hardMax;

  if (
    hardMax === null ||
    hardMax === undefined
  ) {
    return false;
  }

  const simulated =
    addMoneyToCompany({
      positions,
      companyId,
      amountEur,
    });

  const portfolio =
    calculatePortfolioV2(
      simulated,
    );

  const position =
    getPositionFromPortfolio(
      portfolio,
      companyId,
    );

  if (!position) {
    return false;
  }

  return (
    position.allocationPercent <=
    hardMax
  );
}


/**
 * Een kandidaat moet echte V2-data
 * hebben voordat de optimizer hem
 * überhaupt mag gebruiken.
 */
function isEligibleCandidate(
  companyId: string,
): boolean {
  
  const phoenix =
    getPhoenixCompanyV2(
      companyId,
    );

  if (!phoenix) {
    return false;
  }

  if (
    phoenix.scores.opportunity ===
    null
  ) {
    return false;
  }

  if (
    phoenix.portfolio.hardMax ===
      null ||
    phoenix.portfolio.hardMax ===
      undefined
  ) {
    return false;
  }

  return true;
}


/**
 * Phoenix kiest telkens waar het
 * volgende investeringsblok de grootste
 * verbetering oplevert.
 *
 * Dit is bewust een greedy optimizer.
 *
 * Waarom?
 *
 * - transparant
 * - snel
 * - goed uitlegbaar
 * - geen duizenden onbegrijpelijke
 *   combinaties
 *
 * Later kunnen we hier bovenop een
 * uitgebreidere combinatorial optimizer
 * bouwen.
 */

export function getOptimizerPracticalSettings(
  amountEur: number,
) {
  return {
    maxPositions:
      amountEur <= 5_000
        ? 3
        : amountEur <= 15_000
          ? 4
          : amountEur <= 50_000
            ? 6
            : 10,

    minimumOrderEur: 500,
  };
}

export function getOptimizerCandidateCompanyIds(): string[] {
  return phoenixCompaniesV2.map(
    (company) => company.companyId,
  );
}

export function optimizeNewMoneyV2(
  input: NewMoneyOptimizerInput,
): NewMoneyOptimizerResult {
  const newMoneyEur =
    Math.max(
      0,
      input.newMoneyEur,
    );

  const maxPositions =
    input.maxPositions ??
    DEFAULT_MAX_POSITIONS;

  const minimumOrderEur =
    input.minimumOrderEur ??
    DEFAULT_MINIMUM_ORDER_EUR;

  const portfolioBefore =
    calculatePortfolioV2(
      input.positions,
    );

  const scoreBefore =
    getPortfolioScore(
      portfolioBefore,
    );

      const scenarioRanking =
    input.liveMetalPrices
      ? buildPhoenixScenarioRanking({
          livePrices:
            input.liveMetalPrices,
        })
      : [];
      const bestAvailableInvestmentScore =
  scenarioRanking.reduce(
    (best, item) =>
      Math.max(
        best,
        item.investmentScore ?? -Infinity,
      ),
    -Infinity,
  );

const INVESTMENT_SCORE_RANGE = 8;

const minimumEligibleInvestmentScore =
  Number.isFinite(
    bestAvailableInvestmentScore,
  )
    ? bestAvailableInvestmentScore -
      INVESTMENT_SCORE_RANGE
    : -Infinity;

  if (
    newMoneyEur <= 0 ||
    scoreBefore === null
  ) {
    return {
      newMoneyEur,

      scoreBefore,
      scoreAfter:
        scoreBefore,

      scoreImprovement: 0,

      allocations: [],

      portfolioBefore,
      portfolioAfter:
        portfolioBefore,

      moneyInvestedEur: 0,
      moneyUnallocatedEur:
        newMoneyEur,

      isMeaningfulImprovement:
        false,

      explanation: [
        "Geen bruikbaar nieuw investeringsbedrag beschikbaar.",
      ],
    };
  }

  const candidateCompanyIds =
    Array.from(
      new Set(
        input.candidateCompanyIds,
      ),
    ).filter(
      isEligibleCandidate,
    );

  let workingPositions =
    clonePositions(
      input.positions,
    );

  let remainingMoney =
    newMoneyEur;

  const stepSize =
    determineStepSize(
      newMoneyEur,
    );

  const allocations =
    new Map<string, number>();

  /**
   * ----------------------------------
   * FASE 1
   *
   * Verdeel het geld in praktische
   * investeringsblokken.
   * ----------------------------------
   */
  while (remainingMoney > 0) {
    const amountToAllocate =
      Math.min(
        stepSize,
        remainingMoney,
      );

    const currentPortfolio =
      calculatePortfolioV2(
        workingPositions,
      );

    const currentScore =
      getPortfolioScore(
        currentPortfolio,
      );

    if (currentScore === null) {
      break;
    }

   let bestCompanyId:
  | string
  | null = null;

let bestScore =
  currentScore;

let bestInvestmentScore =
  -Infinity;

    for (
      const companyId of
      candidateCompanyIds
    ) {

      const exitReview =
  input.exitReviews?.get(
    companyId,
  ) ?? null;

const scenarioData =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  );

const companyUpsidePercent =
  scenarioData?.rawScenarioPower != null
    ? scenarioData.rawScenarioPower *
      100
    : null;

if (input.exitReviews) {
  const buyEligibility =
    evaluateBuyEligibility({
      companyId,

      investmentScore:
        scenarioData?.investmentScore ??
        null,

      exitStatus:
        exitReview?.status ??
        null,

      exitPressureScore:
        exitReview?.exitPressureScore ??
        null,

      thesisHealth:
        exitReview
          ? (
              exitReview.components.thesisRisk === null
                ? "UNKNOWN"
                : exitReview.components.thesisRisk >= 100
                  ? "BROKEN"
                  : exitReview.components.thesisRisk >= 55
                    ? "WEAKENING"
                    : "INTACT"
            )
          : "UNKNOWN",

      estimatedCompanyUpsidePercent:
        companyUpsidePercent,

      marketHeatScore:
        exitReview?.components.marketHeat ??
        null,
    });

  if (!buyEligibility.eligible) {
    continue;
  }
}

      const alreadySelected =
        allocations.has(
          companyId,
        );

      /**
       * Maximaal bijvoorbeeld drie
       * verschillende koopposities.
       */
      if (
        !alreadySelected &&
        allocations.size >=
          maxPositions
      ) {
        continue;
      }

      if (
        !canAddMoney({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        })
      ) {
        continue;
      }

      const simulatedPositions =
        addMoneyToCompany({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        });

      const simulatedPortfolio =
        calculatePortfolioV2(
          simulatedPositions,
        );

      const simulatedScore =
        getPortfolioScore(
          simulatedPortfolio,
        );

      if (
        simulatedScore === null
      ) {
        continue;
      }

 const investmentScore =
  scenarioData?.investmentScore ??
  getPhoenixCompanyV2(companyId)
    ?.scores.opportunity ??
  0;

if (
  investmentScore <
  minimumEligibleInvestmentScore
) {
  continue;
}

const alreadySelectedInPhase2 =
  allocations.has(
    companyId,
  );

if (
  !alreadySelectedInPhase2 &&
  allocations.size >=
    maxPositions
) {
  continue;
}

/**
 * Portfolio Score is leidend.
 *
 * Investment Score wordt alleen gebruikt
 * als tie-breaker wanneer twee kandidaten
 * vrijwel dezelfde Portfolio Score opleveren.
 */
const scoreImprovement =
  simulatedScore -
  currentScore;

  if (
  newMoneyEur === 10_000 &&
  remainingMoney === 10_000
) {
}

const bestScoreImprovement =
  bestScore -
  currentScore;

const TIE_THRESHOLD = 0.015;

const isBetterPortfolioResult =
  scoreImprovement >
  bestScoreImprovement +
    TIE_THRESHOLD;

const isNearTie =
  Math.abs(
    scoreImprovement -
    bestScoreImprovement,
  ) <= TIE_THRESHOLD;

const winsTieBreaker =
  isNearTie &&
  scoreImprovement >=
    -TIE_THRESHOLD &&
  investmentScore >
    bestInvestmentScore;

if (
  isBetterPortfolioResult ||
  winsTieBreaker
) {
  bestScore =
    simulatedScore;

  bestInvestmentScore =
  investmentScore;

  bestCompanyId =
    companyId;
}
}

    /**
     * Als geen enkel aandeel de score
     * verbetert, stopt Phoenix.
     *
     * We investeren dus niet verplicht
     * geld alleen omdat het beschikbaar
     * is.
     */

    if (!bestCompanyId) {
      break;
    }

    workingPositions =
      addMoneyToCompany({
        positions:
          workingPositions,

        companyId:
          bestCompanyId,

        amountEur:
          amountToAllocate,
      });

    allocations.set(
      bestCompanyId,

      (
        allocations.get(
          bestCompanyId,
        ) ?? 0
      ) + amountToAllocate,
    );

    remainingMoney -=
      amountToAllocate;
  }

    /**
   * ----------------------------------
   * FASE 2
   *
   * TARGET FILLING
   *
   * Alleen serieuze kandidaten die in
   * Fase 1 al geselecteerd zijn worden
   * verder richting idealMax gevuld.
   *
   * We simuleren iedere volgende stap.
   * Alleen wanneer de positie NA de
   * aankoop niet boven idealMax komt,
   * mag de aankoop worden uitgevoerd.
   * ----------------------------------
   */

  while (
    remainingMoney >=
    minimumOrderEur
  ) {
    const currentPortfolio =
      calculatePortfolioV2(
        workingPositions,
      );

    let bestCompanyId:
      | string
      | null = null;

    let bestPriority =
      -Infinity;

    for (
      const companyId of
      candidateCompanyIds
    ) {
      if (!allocations.has(companyId)) {
  continue;
}
const exitReview =
  input.exitReviews?.get(
    companyId,
  ) ?? null;

const scenarioData =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  );

const companyUpsidePercent =
  scenarioData?.rawScenarioPower != null
    ? scenarioData.rawScenarioPower *
      100
    : null;

if (input.exitReviews) {
 const buyEligibility =
  evaluateBuyEligibility({
    companyId,

    investmentScore:
      scenarioData?.investmentScore ??
      null,

    exitStatus:
      exitReview?.status ??
      null,

    exitPressureScore:
      exitReview?.exitPressureScore ??
      null,

    thesisHealth:
      exitReview
        ? (
            exitReview.components.thesisRisk === null
              ? "UNKNOWN"
              : exitReview.components.thesisRisk >= 100
                ? "BROKEN"
                : exitReview.components.thesisRisk >= 55
                  ? "WEAKENING"
                  : "INTACT"
          )
        : null,

    estimatedCompanyUpsidePercent:
      companyUpsidePercent,

    marketHeatScore:
      exitReview?.components.marketHeat ??
      null,
  });

 if (!buyEligibility.eligible) {
  continue;
}
}

      /**
       * Fase 2 mag geen nieuwe namen
       * introduceren.
       */

      const phoenix =
        getPhoenixCompanyV2(
          companyId,
        );

      if (!phoenix) {
        continue;
      }

      const idealMin =
        phoenix.portfolio.idealMin;

      const idealMax =
        phoenix.portfolio.idealMax;

      if (
        idealMin === null ||
        idealMax === null
      ) {
        continue;
      }

      const investmentScore =
        scenarioData
          ?.investmentScore ??
        phoenix.scores
          .opportunity ??
        0;

      /**
       * Zelfde relatieve kwaliteitsfilter
       * als Fase 1.
       */
      if (
        investmentScore <
        minimumEligibleInvestmentScore
      ) {
        continue;
      }

      const position =
        getPositionFromPortfolio(
          currentPortfolio,
          companyId,
        );

      const currentAllocation =
        position
          ?.allocationPercent ??
        0;

      if (
        currentAllocation >=
        idealMax
      ) {
        continue;
      }

      const amountToAllocate =
        Math.min(
          stepSize,
          remainingMoney,
        );

      if (
        !canAddMoney({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        })
      ) {
        continue;
      }

      /**
       * SIMULATIE:
       *
       * Voeg de volgende stap tijdelijk
       * toe en controleer de daadwerkelijke
       * allocatie na de aankoop.
       */
      const simulatedPositions =
        addMoneyToCompany({
          positions:
            workingPositions,

          companyId,

          amountEur:
            amountToAllocate,
        });

      const simulatedPortfolio =
        calculatePortfolioV2(
          simulatedPositions,
        );

      const simulatedPosition =
        getPositionFromPortfolio(
          simulatedPortfolio,
          companyId,
        );

      if (!simulatedPosition) {
        continue;
      }

      /**
       * Geen overshoot van idealMax.
       *
       * Kleine floating-point marge om
       * 7.0000000001% niet foutief af
       * te wijzen.
       */
      if (
        simulatedPosition
          .allocationPercent >
        idealMax + 0.0001
      ) {
        continue;
      }

      /**
       * Onder idealMin krijgt voorrang.
       * Daarna Investment Score en afstand
       * tot de ideale band.
       */
      const belowIdealMin =
        currentAllocation <
        idealMin;

      const distanceToIdealMin =
        Math.max(
          0,
          idealMin -
            currentAllocation,
        );

      const distanceToIdealMax =
        Math.max(
          0,
          idealMax -
            currentAllocation,
        );

      const priority =
        (
          belowIdealMin
            ? 1000
            : 0
        ) +
       investmentScore +
        distanceToIdealMin *
          10 +
        distanceToIdealMax;

      if (
        priority >
        bestPriority
      ) {
        bestPriority =
          priority;

        bestCompanyId =
          companyId;
      }
    }

    /**
     * Alle geselecteerde sterke posities
     * zitten dan praktisch tegen idealMax.
     */
    if (!bestCompanyId) {
      break;
    }

    const amountToAllocate =
      Math.min(
        stepSize,
        remainingMoney,
      );

    workingPositions =
      addMoneyToCompany({
        positions:
          workingPositions,

        companyId:
          bestCompanyId,

        amountEur:
          amountToAllocate,
      });

    allocations.set(
      bestCompanyId,

      (
        allocations.get(
          bestCompanyId,
        ) ?? 0
      ) +
        amountToAllocate,
    );

    remainingMoney -=
      amountToAllocate;
  }

  /**
   * ----------------------------------
   * FASE 3
   *
   * Anti-pietluttigheid.
   *
   * Verwijder kleine losse orders.
   * ----------------------------------
   */

  const meaningfulAllocations =
  Array.from(
    allocations.entries(),
  ).filter(
    ([, amountEur]) =>
      amountEur >=
        minimumOrderEur,
  );

const discardedMoneyEur =
  Array.from(
    allocations.entries(),
  )
    .filter(
      ([, amountEur]) =>
        amountEur <
        minimumOrderEur,
    )
    .reduce(
      (total, [, amountEur]) =>
        total + amountEur,
      0,
    );

    let moneyToRedistribute =
  discardedMoneyEur;

while (
  moneyToRedistribute >=
  minimumOrderEur
) {
  let bestCompanyId:
    | string
    | null = null;

  let bestScore =
    -Infinity;

  for (
    const [
      companyId,
    ] of meaningfulAllocations
  ) {
    const testPositions =
      clonePositions(
        input.positions,
      );

    let rebuiltPositions =
      testPositions;

      for (
  const [
    existingCompanyId,
    existingAmountEur,
  ] of meaningfulAllocations
) {
  rebuiltPositions =
    addMoneyToCompany({
      positions:
        rebuiltPositions,

      companyId:
        existingCompanyId,

      amountEur:
        existingAmountEur,
    });
}

    if (
      !canAddMoney({
        positions:
          rebuiltPositions,

        companyId,

        amountEur:
          minimumOrderEur,
      })
    ) {
      continue;
    }

    const simulatedPositions =
      addMoneyToCompany({
        positions:
          rebuiltPositions,

        companyId,

        amountEur:
          minimumOrderEur,
      });

    const simulatedPortfolio =
      calculatePortfolioV2(
        simulatedPositions,
      );

    const simulatedScore =
      getPortfolioScore(
        simulatedPortfolio,
      );

    if (
      simulatedScore !== null &&
      simulatedScore >
        bestScore
    ) {
      bestScore =
        simulatedScore;

      bestCompanyId =
        companyId;
    }
  }

  if (!bestCompanyId) {
    break;
  }

  const existingIndex =
    meaningfulAllocations.findIndex(
      ([companyId]) =>
        companyId ===
        bestCompanyId,
    );

  if (existingIndex === -1) {
    break;
  }

  meaningfulAllocations[
    existingIndex
  ][1] +=
    minimumOrderEur;

  moneyToRedistribute -=
    minimumOrderEur;
}

  /**
   * We bouwen de portefeuille opnieuw
   * op zonder eventuele kleine orders.
   */
  workingPositions =
    clonePositions(
      input.positions,
    );

  let moneyInvestedEur = 0;

for (
  const [
    companyId,
    amountEur,
  ] of meaningfulAllocations
) {
  workingPositions =
    addMoneyToCompany({
      positions:
        workingPositions,

      companyId,
      amountEur,
    });

  moneyInvestedEur +=
    amountEur;
}

  const portfolioAfter =
    calculatePortfolioV2(
      workingPositions,
    );

  const scoreAfter =
    getPortfolioScore(
      portfolioAfter,
    );

  const scoreImprovement =
    scoreBefore !== null &&
    scoreAfter !== null
      ? scoreAfter -
        scoreBefore
      : null;

  /**
   * Voorlopige practical threshold.
   *
   * Minder dan +0,10 Portfolio Score
   * noemen we nog geen betekenisvolle
   * verbetering.
   *
   * Deze threshold gaan we later
   * uitgebreid kalibreren.
   */
  const isMeaningfulImprovement =
    scoreImprovement !== null &&
    scoreImprovement >= 0.1;

  const resultAllocations:
    NewMoneyAllocation[] =
    meaningfulAllocations
      .map(
        ([
          companyId,
          amountEur,
        ]) => {
          const before =
            getPositionFromPortfolio(
              portfolioBefore,
              companyId,
            );

          const after =
            getPositionFromPortfolio(
              portfolioAfter,
              companyId,
            );

          const phoenix =
            getPhoenixCompanyV2(
              companyId,
            );

          if (
            !after ||
            !phoenix
          ) {
            return null;
          }

          const opportunity =
            phoenix.scores
              .opportunity;

          if (
            opportunity === null
          ) {
            return null;
          }

          return {
            companyId,

            amountEur,

            allocationBeforePercent:
              before
                ?.allocationPercent ??
              0,

            allocationAfterPercent:
              after.allocationPercent,

            opportunity,
            investmentScore:
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      companyId,
  )?.investmentScore ??
  opportunity,

            idealMin:
              phoenix.portfolio
                .idealMin,

            idealMax:
              phoenix.portfolio
                .idealMax,

            hardMax:
              phoenix.portfolio
                .hardMax,

            wasExistingHolding:
              before !== undefined,

          };
        },
      )
      .filter(
        (
          allocation,
        ): allocation is NewMoneyAllocation =>
          allocation !== null,
      )
      .sort(
        (a, b) =>
          b.amountEur -
          a.amountEur,
      );

  const moneyUnallocatedEur =
    Math.max(
      0,
      newMoneyEur -
        moneyInvestedEur,
    );

  const explanation: string[] =
    [];

  if (
    resultAllocations.length ===
    0
  ) {
    explanation.push(
      "Phoenix vond geen praktische investering die de Portfolio Score voldoende verbetert.",
    );
  } else {
    explanation.push(
      `${resultAllocations.length} positie(s) geselecteerd voor nieuw kapitaal.`,
    );

    if (
      moneyUnallocatedEur > 0
    ) {
      explanation.push(
        `€${moneyUnallocatedEur.toFixed(
          0,
        )} blijft voorlopig ongealloceerd omdat Phoenix geen voldoende aantrekkelijke praktische bestemming vond.`,
      );
    }

    if (
      isMeaningfulImprovement
    ) {
      explanation.push(
        "De voorgestelde allocatie levert een betekenisvolle verbetering van de Portfolio Score op.",
      );
    } else {
      explanation.push(
        "De berekende verbetering is klein; Phoenix zou deze transactie daarom niet als sterke aanbeveling behandelen.",
      );
    }
  }

  return {
    newMoneyEur,

    scoreBefore,
    scoreAfter,
    scoreImprovement,

    allocations:
      resultAllocations,

    portfolioBefore,
    portfolioAfter,

    moneyInvestedEur,
    moneyUnallocatedEur,

    isMeaningfulImprovement,

    explanation,
  };
}
