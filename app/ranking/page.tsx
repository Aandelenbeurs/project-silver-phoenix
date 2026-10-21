import {buildRankingView} from "../../data/ranking-view";
import {DATA_STATUS_LABELS} from "../../data/score-transparency";
import ResearchDecisionNotice from "../../components/ResearchDecisionNotice";
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

    const phoenixRanked = buildRankingView(scenarioRanking);

  return (
    <>
<ResearchDecisionNotice />
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
        Gerangschikt op actuele Investment Score,
  met Opportunity Score en scenario-upside als onderliggende componenten.
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
          <th>Exposure</th>
          <th>Leverage</th>
          <th>Quality</th>
          <th>Growth</th>
          <th>Valuation</th>
          <th>Catalysts</th>
          <th>Risk</th>
          <th>Confidence</th>
          <th>Datakwaliteit</th>
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
  {item.scenarioUpside?.toFixed(1) ?? "—"}
</td>

<td>
  Ag{" "}
  {(item.company?.silverExposure ?? 0).toFixed(2)}
  {" · "}
  Au{" "}
  {(item.company?.goldExposure ?? 0).toFixed(2)}
</td>

<td>
  Ag{" "}
  {(item.company?.scenarioLeverage ?? 1).toFixed(2)}
  {" · "}
  Au{" "}
  {(item.company?.goldScenarioLeverage ?? 1).toFixed(2)}
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

              <td><strong>{DATA_STATUS_LABELS[item.scores.dataStatus]}</strong><small className="cell-subtitle">Interne status; geen bronverificatie</small></td>
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

     </>
);
}