"use client";

import {
  useState,
} from "react";

type MetalScenarioResult = {
  silverPriceUsd: number | null;
  goldPriceUsd: number | null;

  liveValueEur: number;
  scenarioValueEur: number;
  differenceEur: number;
  returnPercent: number;
};

function formatEur(
  value: number,
): string {
  return new Intl.NumberFormat(
    "nl-NL",
    {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function formatPercent(
  value: number,
): string {
  return (
    new Intl.NumberFormat(
      "nl-NL",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(value) + "%"
  );
}

export default function MetalScenarioCalculator() {
  const [
    silverPrice,
    setSilverPrice,
  ] = useState("");

  const [
    goldPrice,
    setGoldPrice,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState<MetalScenarioResult | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  function resetScenario() {
    setSilverPrice("");
    setGoldPrice("");
    setResult(null);
    setError(null);
  }

  async function calculateScenario() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/metal-scenario",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            silverPriceUsd:
              silverPrice.trim() === ""
                ? null
                : silverPrice,

            goldPriceUsd:
              goldPrice.trim() === ""
                ? null
                : goldPrice,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ??
            "Scenario kon niet worden berekend.",
        );
      }

      setResult(data);
    } catch (caughtError) {
      setResult(null);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Scenario kon niet worden berekend.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            METAALSCENARIO
          </p>

          <h3>
            Dynamische Silver + Gold calculator
          </h3>

          <p>
            Vul een zilverprijs, goudprijs
            of beide in. Een leeg veld blijft
            op de actuele marktprijs.
          </p>
        </div>
      </div>

      <div className="metal-scenario-form">
        <label className="metal-scenario-field">
          <span>
            Silver price (USD)
          </span>

          <div className="metal-scenario-input-wrap">
            <span className="metal-scenario-currency">
              $
            </span>

            <input
              className="metal-scenario-input"
              type="number"
              min="0"
              step="1"
              placeholder="bijv. 250"
              value={silverPrice}
              onChange={(event) =>
                setSilverPrice(
                  event.target.value,
                )
              }
            />
          </div>
        </label>

        <label className="metal-scenario-field">
          <span>
            Gold price (USD)
          </span>

          <div className="metal-scenario-input-wrap">
            <span className="metal-scenario-currency">
              $
            </span>

            <input
              className="metal-scenario-input"
              type="number"
              min="0"
              step="1"
              placeholder="bijv. 5500"
              value={goldPrice}
              onChange={(event) =>
                setGoldPrice(
                  event.target.value,
                )
              }
            />
          </div>
        </label>

        <div className="metal-scenario-actions">
          <button
            type="button"
            className="primary-button"
            onClick={calculateScenario}
            disabled={loading}
          >
            {loading
              ? "Berekenen..."
              : "Bereken scenario"}
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={resetScenario}
            disabled={loading}
          >
            Reset
          </button>
        </div>
      </div>

      {error && (
        <p className="metal-scenario-error">
          {error}
        </p>
      )}

      {result && (
        <div className="stats-grid metal-scenario-results">
          <div className="stat-card">
            <span className="stat-label">
              Live
            </span>

            <strong>
              {formatEur(
                result.liveValueEur,
              )}
            </strong>

            <small>
              Actuele portefeuillewaarde
            </small>
          </div>

          <div className="stat-card tone-gold">
            <span className="stat-label">
              Scenario
            </span>

            <strong>
              {formatEur(
                result.scenarioValueEur,
              )}
            </strong>

            <small>
              {result.silverPriceUsd !== null
                ? `Silver $${result.silverPriceUsd.toLocaleString(
                    "nl-NL",
                  )}`
                : "Silver actueel"}

              {" · "}

              {result.goldPriceUsd !== null
                ? `Gold $${result.goldPriceUsd.toLocaleString(
                    "nl-NL",
                  )}`
                : "Gold actueel"}
            </small>
          </div>

          <div
            className={
              result.differenceEur >= 0
                ? "stat-card tone-green"
                : "stat-card tone-red"
            }
          >
            <span className="stat-label">
              Verschil vs live
            </span>

            <strong>
              {result.differenceEur >= 0
                ? "+"
                : ""}
              {formatEur(
                result.differenceEur,
              )}
            </strong>

            <small>
              Absolute verandering
            </small>
          </div>

          <div
            className={
              result.returnPercent >= 0
                ? "stat-card tone-green"
                : "stat-card tone-red"
            }
          >
            <span className="stat-label">
              Rendement
            </span>

            <strong>
              {result.returnPercent >= 0
                ? "+"
                : ""}
              {formatPercent(
                result.returnPercent,
              )}
            </strong>

            <small>
              Rendement ten opzichte van live
            </small>
          </div>
        </div>
      )}
    </section>
  );
}