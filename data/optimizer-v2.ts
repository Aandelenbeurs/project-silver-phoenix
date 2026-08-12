import {
  calculatePortfolioV2,
  type PortfolioV2PositionInput,
  type PortfolioV2Result,
} from "./portfolio-v2";

import {
  getPhoenixCompanyV2,
} from "./phoenix-v2";


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
};


export type NewMoneyAllocation = {
  companyId: string;

  amountEur: number;

  allocationBeforePercent: number;
  allocationAfterPercent: number;

  opportunity: number;

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
  if (newMoneyEur <= 1000) {
    return 100;
  }

  if (newMoneyEur <= 5000) {
    return 250;
  }

  if (newMoneyEur <= 15000) {
    return 500;
  }

  if (newMoneyEur <= 50000) {
    return 1000;
  }

  return 2500;
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

    for (
      const companyId of
      candidateCompanyIds
    ) {
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

      if (
        simulatedScore >
        bestScore
      ) {
        bestScore =
          simulatedScore;

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