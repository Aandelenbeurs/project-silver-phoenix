import AllocationBar from "./AllocationBar";

import {
  PortfolioTotals,
} from "../data/portfolio-engine";

type Props = {
  totals: PortfolioTotals;
};

export default function AllocationPanel({
  totals,
}: Props) {
  const total = totals.totalMarketValueEur;

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            PORTEFEUILLEVERDELING
          </p>

          <h3>Actuele allocatie</h3>

          <p>
            Gebaseerd op de actuele marktwaarde van de
            portefeuille.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gap: "18px",
        }}
      >
        <AllocationBar
          label="Zilver"
          valueEur={totals.silverValueEur}
          totalEur={total}
          detail="Alle zilvermijnbouwbedrijven"
        />

        <AllocationBar
          label="Goud"
          valueEur={totals.goldValueEur}
          totalEur={total}
          detail="Alle goudmijnbouwbedrijven"
        />

        <AllocationBar
          label="Gemengd"
          valueEur={totals.mixedValueEur}
          totalEur={total}
          detail="Goud- en zilverproducenten"
        />

        <AllocationBar
          label="ETF / ETC"
          valueEur={totals.etfValueEur}
          totalEur={total}
          detail="ETF's en ETC's"
        />

        <AllocationBar
          label="Fysiek zilver"
          valueEur={totals.physicalValueEur}
          totalEur={total}
          detail="404 gram"
        />
      </div>
    </section>
  );
}