"use client";

import {
  useState,
} from "react";

type ExitPositionRowProps = {
  companyId: string;

  status: string;

  coverage: number;

  thesisHealth: string;

  exitPressureScore:
    | number
    | null;

  reasons: string[];

  remainingUpsidePercent:
  | number
  | null;

  estimatedCompanyUpsidePercent:
  | number
  | null;

  latestInvestmentDecline:
  | number
  | null;

totalInvestmentDecline:
  | number
  | null;

consecutiveInvestmentDeclines:
  | number
  | null;

  unrealizedReturnPercent:
  | number
  | null;

  marketHeatScore:
  | number
  | null;

opportunityScore:
  | number
  | null;

  components: {
    thesisRisk:
      | number
      | null;

    investmentDeterioration:
      | number
      | null;

    remainingUpsideRisk:
      | number
      | null;

    marketHeat:
      | number
      | null;

    valuationOverextension:
      | number
      | null;

    positionProfitRisk:
      | number
      | null;
};
      action: string;

targetSellPercent: number;

minSellPercent: number;
maxSellPercent: number;

actionExplanation: string;
  
};

export default function ExitPositionRow({
  companyId,
  status,
  coverage,
  thesisHealth,
  exitPressureScore,
  reasons,
  remainingUpsidePercent,
  estimatedCompanyUpsidePercent,
  latestInvestmentDecline,
totalInvestmentDecline,
consecutiveInvestmentDeclines,
  unrealizedReturnPercent,
  marketHeatScore,
  opportunityScore,
  action,
targetSellPercent,
minSellPercent,
maxSellPercent,
actionExplanation,
  components,
}: ExitPositionRowProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const componentItems = [
    {
  label: "Thesis Risk",
  value:
    components.thesisRisk,
  detail:
    thesisHealth === "UNKNOWN"
      ? "No thesis review"
      : thesisHealth === "INTACT"
        ? "Thesis intact"
        : thesisHealth === "WEAKENING"
          ? "Thesis weakening"
          : "Thesis broken",
},
{
  label: "Deterioration",
  value:
    components.investmentDeterioration,
  detail:
    components.investmentDeterioration === null
      ? "No review history"
      : latestInvestmentDecline != null &&
          latestInvestmentDecline > 0
        ? `Latest -${latestInvestmentDecline.toFixed(
            1,
          )} pts${
            totalInvestmentDecline != null &&
            totalInvestmentDecline >
              latestInvestmentDecline
              ? ` · Total -${totalInvestmentDecline.toFixed(
                  1,
                )} pts`
              : ""
          }${
            consecutiveInvestmentDeclines != null &&
            consecutiveInvestmentDeclines > 1
              ? ` · ${consecutiveInvestmentDeclines} declines`
              : ""
          }`
        : "No deterioration",
},
    {
  label: "Upside Risk",
  value:
    components.remainingUpsideRisk,
  detail:
  estimatedCompanyUpsidePercent != null
    ? `Est. company upside +${estimatedCompanyUpsidePercent.toFixed(0)}%`
    : null,
},
    {
  label: "Market Heat",
  value:
    components.marketHeat,
  detail:
    marketHeatScore != null
      ? marketHeatScore >= 80
        ? "HOT"
        : marketHeatScore >= 60
          ? "WARM"
          : marketHeatScore >= 40
            ? "NORMAL"
            : "COOL"
      : null,
},
   {
  label: "Valuation",
  value:
    components.valuationOverextension,
  detail:
    opportunityScore != null
      ? `Opportunity ${opportunityScore.toFixed(1)}`
      : null,
},
    {
  label: "Profit Risk",
  value:
    components.positionProfitRisk,
  detail:
    unrealizedReturnPercent != null
      ? `${unrealizedReturnPercent >= 0 ? "+" : ""}${unrealizedReturnPercent.toFixed(0)}% unrealized`
      : null,
},
  ];

  return (
    <div
      style={{
        borderBottom:
          "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) => !current,
          )
        }
        style={{
          width: "100%",
          border: "none",
          background: "transparent",
          padding: "18px 4px",
          cursor: "pointer",
          color: "inherit",
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
  "minmax(220px, 1fr) 150px 110px 36px",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div>
            <strong>
              {companyId}
            </strong>

            <small
              style={{
                display: "block",
                marginTop: "4px",
              }}
            >
              {status}
              {" · "}
              Coverage{" "}
              {coverage.toFixed(0)}
              %
              {" · "}
              Thesis{" "}
              {thesisHealth}
            </small>
          </div>
<div
  style={{
    textAlign: "right",
  }}
>
  <small
    style={{
      display: "block",
      opacity: 0.55,
    }}
  >
    Action
  </small>

  <strong>
    {action === "TRIM" ||
    action === "SCALE_OUT" ||
    action === "EXIT"
      ? `${action} ${targetSellPercent}%`
      : action}
  </strong>
</div>
          <strong
            style={{
              textAlign: "right",
            }}
          >
            {exitPressureScore !==
            null
              ? exitPressureScore.toFixed(
                  1,
                )
              : "—"}
          </strong>

          <strong
            style={{
              textAlign: "center",
            }}
          >
            {isOpen ? "−" : "+"}
          </strong>
        </div>
      </button>

      {isOpen && (
        <div
          style={{
            padding:
              "0 4px 20px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(6, minmax(120px, 1fr))",
              gap: "10px",
            }}
          >
            {componentItems.map(
              (component) => (
                <div
                  className="stat-card"
                  key={
                    component.label
                  }
                >
                  <span className="stat-label">
                    {component.label}
                  </span>

                  <strong>
                    {component.value !==
                    null
                      ? component.value.toFixed(
                          1,
                        )
                      : "—"}
                  </strong>

                  {component.detail && (
  <small
    style={{
      marginTop: "4px",
      display: "block",
      opacity: 0.65,
    }}
  >
    {component.detail}
  </small>
)}

                </div>
              ),
            )}
          </div>

<div
  style={{
    marginTop: "14px",
    padding: "12px 14px",
    border:
      "1px solid rgba(255,255,255,0.08)",
    borderRadius: "8px",
  }}
>
  <small
    style={{
      display: "block",
      opacity: 0.55,
      marginBottom: "4px",
    }}
  >
    PHOENIX ACTION
  </small>

  <strong>
    {action}
    {targetSellPercent > 0
      ? ` · target ${targetSellPercent}%`
      : ""}
  </strong>

  {targetSellPercent > 0 && (
    <small
      style={{
        display: "block",
        marginTop: "4px",
      }}
    >
      Richtlijn: {minSellPercent}%–{maxSellPercent}%
    </small>
  )}

  <small
    style={{
      display: "block",
      marginTop: "6px",
      opacity: 0.75,
    }}
  >
    {actionExplanation}
  </small>
</div>

          {reasons.length > 0 && (
            <div
              style={{
                marginTop: "14px",
              }}
            >
              <small>
                <strong>
                  Phoenix:
                </strong>{" "}
                {reasons.join(
                  " · ",
                )}
              </small>
            </div>
          )}
        </div>
      )}
    </div>
  );
}