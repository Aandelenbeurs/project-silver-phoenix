"use client";

import {
  useMemo,
  useState,
} from "react";

type RotationSellOption = {
  companyId: string;
  name: string;
  sellReason: string;
  proposedSellAmountEur: number;
};

type RotationSimulatorProps = {
  sellOptions: RotationSellOption[];
  initialSimulation: RotationSimulationResponse;
};

type RotationSimulationResponse = {
  freedCapitalEur: number;

  scoreBeforeRotation: number | null;
  scoreAfterRotation: number | null;
  totalScoreImprovement: number | null;

  sellPlan: {
    companyId: string;
    name: string;
    sellReason: string;
    proposedSellAmountEur: number;
  }[];

   recommendation:
    | "AANBEVOLEN"
    | "OPTIONEEL"
    | "NIET ZINVOL";

  improvementPer1000Eur:
    number | null;

  buyResult: {
    allocations: {
      companyId: string;
      amountEur: number;
      investmentScore: number;
    }[];

    moneyUnallocatedEur: number;
};
};

export default function RotationSimulator({
  sellOptions,
  initialSimulation,
}: RotationSimulatorProps) {

  const [selectedCompanyIds, setSelectedCompanyIds] =
    useState<string[]>(
      sellOptions.map(
        (item) => item.companyId,
      ),
    );

   const [simulation, setSimulation] =
  useState<RotationSimulationResponse | null>(
    initialSimulation,
  );

const [loading, setLoading] =
  useState(false);

const [error, setError] =
  useState<string | null>(null);

  function toggleCompany(
  companyId: string,
) {
  setSelectedCompanyIds(
    (current) => {
      const next =
        current.includes(companyId)
          ? current.filter(
              (id) =>
                id !== companyId,
            )
          : [
              ...current,
              companyId,
            ];

      void runSimulation(next);

      return next;
    },
  );
}

  async function runSimulation(
  selectedIds: string[],
) {
  setLoading(true);
  setError(null);

  try {
    const response =
      await fetch(
        "/api/rotation-simulation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            selectedSellCompanyIds:
              selectedIds,
          }),
        },
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ??
          "Rotatiesimulatie mislukt.",
      );
    }

    setSimulation(data);
  } catch (caughtError) {
    setSimulation(null);

    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "Rotatiesimulatie mislukt.",
    );
  } finally {
    setLoading(false);
  }
}

  const selectedCapitalEur =
    useMemo(
      () =>
        sellOptions
          .filter(
            (item) =>
              selectedCompanyIds.includes(
                item.companyId,
              ),
          )
          .reduce(
            (total, item) =>
              total +
              item.proposedSellAmountEur,
            0,
          ),
      [
        sellOptions,
        selectedCompanyIds,
      ],
    );
return (
  <div>
    {loading && (
      <p
        style={{
          marginBottom: "12px",
        }}
      >
        Rotatie opnieuw berekenen...
      </p>
    )}

    {error && (
      <p
        className="metal-scenario-error"
        style={{
          marginBottom: "12px",
        }}
      >
        {error}
      </p>
    )}

    {simulation && (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">
              Vrijgemaakt kapitaal
            </span>

            <strong>
              €{selectedCapitalEur.toLocaleString(
                "nl-NL",
                {
                  maximumFractionDigits: 0,
                },
              )}
            </strong>
          </div>

          <div className="stat-card">
            <span className="stat-label">
              Huidige score
            </span>

            <strong>
              {simulation.scoreBeforeRotation !== null
                ? simulation.scoreBeforeRotation.toFixed(2)
                : "—"}
            </strong>
          </div>

          <div className="stat-card tone-green">
            <span className="stat-label">
              Score na rotatie
            </span>

            <strong>
              {simulation.scoreAfterRotation !== null
                ? simulation.scoreAfterRotation.toFixed(2)
                : "—"}
            </strong>
          </div>

          <div
            className={
              simulation.totalScoreImprovement !== null &&
              simulation.totalScoreImprovement > 0
                ? "stat-card tone-green"
                : "stat-card tone-red"
            }
          >
            <span className="stat-label">
              Totale verbetering
            </span>

            <strong>
              {simulation.totalScoreImprovement !== null
                ? `${simulation.totalScoreImprovement >= 0 ? "+" : ""}${simulation.totalScoreImprovement.toFixed(2)}`
                : "—"}
            </strong>
          </div>
        </div>

<div
  className={
    simulation.recommendation ===
    "AANBEVOLEN"
      ? "stat-card tone-green"
      : simulation.recommendation ===
          "OPTIONEEL"
        ? "stat-card tone-gold"
        : "stat-card tone-red"
  }
>
  <span className="stat-label">
    Advies
  </span>

  <strong>
    {simulation.recommendation}
  </strong>

  <small>
    {typeof simulation.improvementPer1000Eur === "number"
  ? `${simulation.improvementPer1000Eur.toFixed(
      2,
    )} scorepunt per €1.000`
  : "—"}
  </small>
</div>

        <div
          className="content-grid two-columns"
          style={{
            marginTop: "20px",
          }}
        >
          <article>
            <p className="eyebrow">
              VERKOPEN
            </p>

            <div className="company-list compact">
              {sellOptions.map(
                (item) => {
                  const selected =
                    selectedCompanyIds.includes(
                      item.companyId,
                    );

                  return (
                    <div
                      className="company-row"
                      key={item.companyId}
                    >
                      <div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              toggleCompany(
                                item.companyId,
                              )
                            }
                            disabled={loading}
                          />

                          <strong>
                            {item.name}
                          </strong>
                        </label>

                        <small>
                          {item.sellReason}
                        </small>
                      </div>

                      <strong>
                        {selected ? "−" : ""}
                        €{item.proposedSellAmountEur.toLocaleString(
                          "nl-NL",
                          {
                            maximumFractionDigits: 0,
                          },
                        )}
                      </strong>
                    </div>
                  );
                },
              )}
            </div>
          </article>

          <article>
            <p className="eyebrow">
              KOPEN
            </p>

            <div className="company-list compact">
              {simulation.buyResult.allocations.length === 0 ? (
                <p>
                  Geen aantrekkelijke herallocatie gevonden.
                </p>
              ) : (
                simulation.buyResult.allocations.map(
                  (item) => (
                    <div
                      className="company-row"
                      key={item.companyId}
                    >
                      <div>
                        <strong>
                          {item.companyId}
                        </strong>

                        <small>
                          Investment{" "}
                          {item.investmentScore.toFixed(1)}
                        </small>
                      </div>

                      <strong>
                        +€{item.amountEur.toLocaleString(
                          "nl-NL",
                          {
                            maximumFractionDigits: 0,
                          },
                        )}
                      </strong>
                    </div>
                  ),
                )
              )}
            </div>

            {simulation.buyResult.moneyUnallocatedEur > 0 && (
              <p
                style={{
                  marginTop: "16px",
                }}
              >
                Ongealloceerd:{" "}
                <strong>
                  €{simulation.buyResult.moneyUnallocatedEur.toLocaleString(
                    "nl-NL",
                    {
                      maximumFractionDigits: 0,
                    },
                  )}
                </strong>
              </p>
            )}
          </article>
        </div>
      </>
    )}
  </div>
  
);
}