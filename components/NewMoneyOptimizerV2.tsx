"use client";

import {
  useState,
} from "react";

import {
  optimizeNewMoneyV2,
  type NewMoneyOptimizerResult,
} from "../data/optimizer-v2";

import type {
  PortfolioV2PositionInput,
} from "../data/portfolio-v2";

import {
  phoenixCompaniesV2,
} from "../data/phoenix-v2";


type Props = {
  positions: PortfolioV2PositionInput[];

  liveMetalPrices: {
    silverPriceUsd: number;
    goldPriceUsd: number;
  } | null;
};


function formatEur(
  value: number,
): string {
  return new Intl.NumberFormat(
    "nl-NL",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  ).format(value);
}


function formatPercent(
  value: number,
): string {
  return new Intl.NumberFormat(
    "nl-NL",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value) + "%";
}


function formatScore(
  value: number | null,
): string {
  if (value === null) {
    return "—";
  }

  return value.toFixed(2);
}


export default function NewMoneyOptimizerV2({
  positions,
  liveMetalPrices,
}: Props) {

  const [
    amount,
    setAmount,
  ] = useState("3000");

  const [
    result,
    setResult,
  ] = useState<NewMoneyOptimizerResult | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );


  function calculate() {
    setError(null);

    const parsedAmount =
      Number(amount);

    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0
    ) {
      setResult(null);

      setError(
        "Vul een geldig investeringsbedrag in.",
      );

      return;
    }

    const candidateCompanyIds =
      phoenixCompaniesV2.map(
        (company) =>
          company.companyId,
      );

    const optimizerResult =
      optimizeNewMoneyV2({
        positions,

        candidateCompanyIds,

        newMoneyEur:
          parsedAmount,

          liveMetalPrices:
          liveMetalPrices ?? undefined,


        maxPositions:
  parsedAmount <= 5000
    ? 3
    : parsedAmount <= 15000
      ? 4
      : parsedAmount <= 50000
        ? 6
        : 10,

        minimumOrderEur: 500,
      });

    setResult(
      optimizerResult,
    );
  }


  function reset() {
    setAmount("3000");
    setResult(null);
    setError(null);
  }


  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            NEW MONEY OPTIMIZER V2
          </p>

          <h3>
            Optimaliseer nieuw kapitaal
          </h3>

          <p>
            Phoenix verdeelt nieuw geld over
            bestaande holdings en goedgekeurde
            watchlistkandidaten om de Portfolio
            Score praktisch te verbeteren.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(220px, 320px) auto",
          gap: "16px",
          alignItems: "end",
        }}
      >
        <label>
          <span
            style={{
              display: "block",
              marginBottom: "6px",
            }}
          >
            Nieuw investeringsbedrag (€)
          </span>

          <input
            type="number"
            min="0"
            step="250"
            value={amount}
            onChange={(event) =>
              setAmount(
                event.target.value,
              )
            }
            style={{
              width: "100%",
              padding: "10px 12px",
            }}
          />
        </label>

        <div
          style={{
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            type="button"
            className="primary-button"
            onClick={calculate}
          >
            Optimaliseer
          </button>

          <button
            type="button"
            onClick={reset}
            style={{
              padding: "10px 16px",
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <p
          style={{
            marginTop: "16px",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <>
          <div
            className="stats-grid"
            style={{
              marginTop: "24px",
            }}
          >
            <div className="stat-card">
              <span>
                Portfolio Score vóór
              </span>

              <strong>
                {formatScore(
                  result.scoreBefore,
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Portfolio Score na
              </span>

              <strong>
                {formatScore(
                  result.scoreAfter,
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Verbetering
              </span>

              <strong>
                {result.scoreImprovement !== null &&
                result.scoreImprovement >= 0
                  ? "+"
                  : ""}
                {formatScore(
                  result.scoreImprovement,
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Geïnvesteerd
              </span>

              <strong>
                {formatEur(
                  result.moneyInvestedEur,
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Niet toegewezen
              </span>

              <strong>
                {formatEur(
                  result.moneyUnallocatedEur,
                )}
              </strong>
            </div>

            <div className="stat-card">
              <span>
                Beoordeling
              </span>

              <strong>
                {result.isMeaningfulImprovement
                  ? "Betekenisvol"
                  : "Beperkt"}
              </strong>
            </div>
          </div>

          <div
            className="compact-table-wrap"
            style={{
              marginTop: "24px",
            }}
          >
            <table className="data-table wide-table">
              <thead>
                <tr>
                  <th>Bedrijf</th>
                  <th>Bedrag</th>
                  <th>Opportunity</th>
                  <th>Voor</th>
                  <th>Na</th>
                  <th>Ideal</th>
                  <th>Hard max</th>
                  <th>Type</th>
                </tr>
              </thead>

              <tbody>
                {result.allocations.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      Phoenix vond geen praktische
                      nieuwe allocatie.
                    </td>
                  </tr>
                ) : (
                  result.allocations.map(
                    (allocation) => (
                      <tr
                        key={
                          allocation.companyId
                        }
                      >
                        <td>
                          <strong>
                            {
                              allocation.companyId
                            }
                          </strong>
                        </td>

                        <td>
                          {formatEur(
                            allocation.amountEur,
                          )}
                        </td>

                        <td>
                          {allocation.opportunity.toFixed(
                            1,
                          )}
                        </td>

                        <td>
                          {formatPercent(
                            allocation.allocationBeforePercent,
                          )}
                        </td>

                        <td>
                          {formatPercent(
                            allocation.allocationAfterPercent,
                          )}
                        </td>

                        <td>
                          {allocation.idealMin.toFixed(
                            1,
                          )}
                          % –{" "}
                          {allocation.idealMax.toFixed(
                            1,
                          )}
                          %
                        </td>

                        <td>
                          {allocation.hardMax.toFixed(
                            1,
                          )}
                          %
                        </td>

                        <td>
                          {allocation.wasExistingHolding
                            ? "Bestaand"
                            : "Watchlist"}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>

          {result.explanation.length > 0 && (
            <div
              style={{
                marginTop: "20px",
              }}
            >
              {result.explanation.map(
                (line) => (
                  <p key={line}>
                    {line}
                  </p>
                ),
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}