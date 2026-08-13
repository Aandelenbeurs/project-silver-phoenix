import StatCard from "../../components/StatCard";
import NewMoneyOptimizerV2 from "../../components/NewMoneyOptimizerV2";

import SelectionBadge, {
  type SelectionGroup,
} from "../../components/SelectionBadge";

import {
  corePositions,
  keepPositions,
  reducePositions,
  exitPositions,
  reviewPositions,
  equityPositions,
  type PortfolioPosition,
} from "../../data/portfolio";

import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

function sortByRank(
  positions: PortfolioPosition[],
): PortfolioPosition[] {
  return [...positions].sort((a, b) => {
    if (a.rank === null && b.rank === null) {
      return a.name.localeCompare(b.name);
    }

    if (a.rank === null) {
      return 1;
    }

    if (b.rank === null) {
      return -1;
    }

    return a.rank - b.rank;
  });
}

function statusToSelectionGroup(
  position: PortfolioPosition,
): SelectionGroup {
  if (position.status === "core") {
    return "Kernpositie";
  }

  if (position.status === "keep") {
    return "Behouden";
  }

  if (position.status === "reduce") {
    return "Afbouwen";
  }

  if (position.status === "review") {
    return "Nog beoordelen";
  }

  return "Uitstappen / watchlist";
}

function PositionRow({
  position,
}: {
  position: PortfolioPosition;
}) {
  const group = statusToSelectionGroup(position);

  return (
    <div className="company-row">
      <div>
        <strong>
          {position.rank !== null
            ? `#${position.rank} `
            : ""}
          {position.name}
        </strong>

        <small>
          {position.masterScore !== null
            ? `Score ${position.masterScore.toFixed(1)}`
            : "Nog geen Master Score"}

          {position.isEquity
            ? ` · doel ${position.targetAllocation.toFixed(1)}%`
            : ""}
        </small>
      </div>

      <SelectionBadge group={group} />
    </div>
  );
}

export default async function OptimizerPage() {
  const portfolio =
  await getLivePortfolio();

  const liveMetalPrices =
  portfolio.referenceSilverPriceUsd !== null &&
  portfolio.referenceGoldPriceUsd !== null
    ? {
        silverPriceUsd:
          portfolio.referenceSilverPriceUsd,

        goldPriceUsd:
          portfolio.referenceGoldPriceUsd,
      }
    : null;

  const portfolioV2 =
  portfolio.portfolioV2;

const optimizerV2Positions =
  portfolio.positions
    .filter(
      (position) =>
        position.isEquity &&
        position.company &&
        position.marketValueEur !== null,
    )
    .map((position) => ({
      companyId:
        position.company!.id,

      marketValueEur:
        position.marketValueEur!,
    }));
  const core = sortByRank(corePositions);
  const keep = sortByRank(keepPositions);
  const reduce = sortByRank(reducePositions);
  const exit = sortByRank(exitPositions);
  const review = sortByRank(reviewPositions);

  const targetPortfolio = [...core, ...keep];

  return (
  <>
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            PHOENIX PORTFOLIO
          </p>

          <h3>
            Portfolio Score
          </h3>

          <p>
            Actuele portefeuille-analyse op basis van Phoenix V2.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Portfolio Score"
          value={
            portfolioV2.partialPortfolioScore !== null
              ? portfolioV2.partialPortfolioScore.toFixed(1)
              : "—"
          }
          detail="Phoenix V2"
          tone="green"
        />

        <StatCard
          label="Opportunity Quality"
          value={
            portfolioV2.components.opportunityQuality !== null
              ? portfolioV2.components.opportunityQuality.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Allocation Efficiency"
          value={
            portfolioV2.components.allocationEfficiency !== null
              ? portfolioV2.components.allocationEfficiency.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Position Sizing"
          value={
            portfolioV2.components.positionSizingDiscipline !== null
              ? portfolioV2.components.positionSizingDiscipline.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Risk & Concentration"
          value={
            portfolioV2.components.riskAndConcentration !== null
              ? portfolioV2.components.riskAndConcentration.toFixed(1)
              : "—"
          }
        />

        <StatCard
          label="Portfolio Balance"
          value={
            portfolioV2.components.portfolioBalance !== null
              ? portfolioV2.components.portfolioBalance.toFixed(1)
              : "—"
          }
        />
      </div>
    </section>

    <NewMoneyOptimizerV2
  positions={optimizerV2Positions}
  liveMetalPrices={liveMetalPrices}
/>

      <section className="stats-grid">
        <StatCard
          label="Huidige aandelenposities"
          value={equityPositions.length}
        />

        <StatCard
          label="Doelportefeuille"
          value="20–25"
          tone="gold"
        />

        <StatCard
          label="Kern + behouden"
          value={targetPortfolio.length}
          tone="green"
        />

        <StatCard
          label="Afbouwen / uitstappen"
          value={reduce.length + exit.length}
          tone="red"
        />

        <StatCard
          label="Nog beoordelen"
          value={review.length}
          tone="gold"
        />
      </section>

      <section className="content-grid two-columns optimizer-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                DOELPORTEFEUILLE
              </p>

              <h3>Kernposities en behouden</h3>

              <p>
                Dit zijn de bedrijven die volgens de huidige
                Master Ranking onderdeel mogen blijven van de
                uiteindelijke portefeuille.
              </p>
            </div>
          </div>

          <div className="company-list">
            {targetPortfolio.map((position) => (
              <PositionRow
                key={position.id}
                position={position}
              />
            ))}
          </div>
        </article>

        <div className="stacked-panels">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">AFBOUWEN</p>

                <h3>Klein houden of reduceren</h3>

                <p>
                  Deze bedrijven hebben nog potentieel, maar
                  krijgen geen grote doelallocatie.
                </p>
              </div>
            </div>

            <div className="company-list compact">
              {reduce.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                />
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">UITSTAPPEN</p>

                <h3>Watchlist / verkoopkandidaten</h3>

                <p>
                  Deze posities voegen volgens de huidige
                  beoordeling te weinig toe tegenover sterkere
                  alternatieven.
                </p>
              </div>
            </div>

            <div className="company-list compact">
              {exit.map((position) => (
                <PositionRow
                  key={position.id}
                  position={position}
                />
              ))}
            </div>
          </article>

          {review.length > 0 && (
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">
                    NOG BEOORDELEN
                  </p>

                  <h3>Geen automatisch advies</h3>

                  <p>
                    Een ontbrekende score leidt nooit automatisch
                    tot een verkoopadvies.
                  </p>
                </div>
              </div>

              <div className="company-list compact">
                {review.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                  />
                ))}
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}