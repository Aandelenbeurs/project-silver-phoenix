import SelectionBadge, {
  selectionGroup,
} from "../../components/SelectionBadge";

import {
  rankedCompanies,
} from "../../data/portfolio";

import {
  phoenixCompaniesV2,
} from "../../data/phoenix-v2";

import {
  getCompanyById,
} from "../../data/companies";

import {
  getLivePortfolio,
} from "../../data/portfolio-engine";

import {
  buildPhoenixScenarioRanking,
} from "../../data/scenario-upside";

export default async function RankingPage() {
  
  const portfolio =
  await getLivePortfolio();

const liveSilverPrice =
  portfolio.referenceSilverPriceUsd;

const liveGoldPrice =
  portfolio.referenceGoldPriceUsd;

  const scenarioRanking =
  liveSilverPrice !== null &&
  liveGoldPrice !== null
    ? buildPhoenixScenarioRanking({
        livePrices: {
          silverPriceUsd:
            liveSilverPrice,

          goldPriceUsd:
            liveGoldPrice,
        },
      })
    : [];
    const ranked = rankedCompanies;

    const phoenixRanked =
    phoenixCompaniesV2
      .map((phoenix) => {
        const company =
          getCompanyById(
            phoenix.companyId,
          );

          const scenario =
  scenarioRanking.find(
    (item) =>
      item.companyId ===
      phoenix.companyId,
  );
  
    return {
  ...phoenix,
  company,

  scenarioUpside:
    scenario?.scenarioUpside ?? null,

  investmentScore:
    scenario?.investmentScore ??
    phoenix.scores.opportunity,
};
      })
      .sort(
  (a, b) =>
    (b.investmentScore ?? -1) -
    (a.investmentScore ?? -1),
);

  return (
    <>
<section className="panel">
  <div className="panel-heading">
    <div>
      <p className="eyebrow">
        PHOENIX OPPORTUNITY RANKING
      </p>

      <h2>
        Phoenix V2 Opportunity Ranking
      </h2>

      <p>
        Gerangschikt op actuele Opportunity Score:
        kwaliteit, groei, leverage, waardering,
        catalysts en actuele risk penalty.
      </p>
    </div>
  </div>

  <div className="compact-table-wrap">
    <table className="data-table wide-table">
      <thead>
        <tr>
          <th>Rang</th>
          <th>Bedrijf</th>
          <th>Investment Score</th>
          <th>Opportunity</th>
          <th>Scenario Upside</th>
          <th>Quality</th>
          <th>Growth</th>
          <th>Valuation</th>
          <th>Catalysts</th>
          <th>Risk</th>
          <th>Confidence</th>
          <th>Bucket</th>
        </tr>
      </thead>

      <tbody>
        {phoenixRanked.map(
          (item, index) => (
            <tr key={item.companyId}>
              <td className="rank-cell">
                #{index + 1}
              </td>

              <td>
                <strong>
                  {item.company?.name ??
                    item.companyId}
                </strong>

                <small className="cell-subtitle">
                  {item.company?.commodity ??
                    "onbekend"}
                </small>
              </td>

              <td className="score-cell">
  {item.investmentScore !== null
    ? item.investmentScore.toFixed(1)
    : "—"}
</td>

              <td className="score-cell">
                {item.scores.opportunity !== null
                  ? item.scores.opportunity.toFixed(
                      1,
                    )
                  : "—"}
              </td>

             <td>
  {scenarioRanking.find(
    (scenarioItem) =>
      scenarioItem.companyId === item.companyId,
  )?.scenarioUpside?.toFixed(1) ?? "—"}
</td>

              <td>
                {item.scores.quality !== null
                  ? item.scores.quality.toFixed(
                      0,
                    )
                  : "—"}
              </td>

              <td>
                {item.scores.growth !== null
                  ? item.scores.growth.toFixed(
                      0,
                    )
                  : "—"}
              </td>

              <td>
                {item.scores.valuation !== null
                  ? item.scores.valuation.toFixed(
                      0,
                    )
                  : "—"}
              </td>

              <td>
                {item.scores.catalysts !== null
                  ? item.scores.catalysts.toFixed(
                      0,
                    )
                  : "—"}
              </td>

              <td>
                -{item.scores.riskPenalty}
              </td>

              <td>
                {item.scores.confidence}
              </td>

              <td>
                {item.portfolio.bucket}
              </td>
            </tr>
          ),
        )}
      </tbody>
    </table>
  </div>
</section>

    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            ULTIMATE MASTER RANKING v3.0
          </p>

          <h2>Definitieve vergelijkingslijst</h2>

          <p>
            Gerangschikt op assetkwaliteit, leverage,
            financieringsrisico, jurisdictie en portefeuillebelang.
          </p>
        </div>
      </div>

      <div className="compact-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Rang</th>
              <th>Bedrijf</th>
              <th>Score</th>
              <th>Tier</th>
              <th>Doel</th>
              <th>Maximum</th>
              <th>Selectiegroep</th>
            </tr>
          </thead>

          <tbody>
            {ranked.map((company) => (
              <tr key={company.id}>
                <td className="rank-cell">
                  #{company.rank}
                </td>

                <td>
                  <strong>{company.name}</strong>

                  <small className="cell-subtitle">
                    {company.commodity}
                  </small>
                </td>

                <td className="score-cell">
                  {company.masterScore?.toFixed(1)}
                </td>

                <td>{company.tier}</td>

                <td>
                  {company.targetAllocation.toFixed(1)}%
                </td>

                <td>
                  {company.maximumAllocation.toFixed(1)}%
                </td>

                <td>
                  <SelectionBadge
                    group={selectionGroup(
                      company.masterScore ?? undefined,
                      company.commodity,
                    )}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
     </>
);
}