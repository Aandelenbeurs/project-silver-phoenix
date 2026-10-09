import React from "react";
import type { Metadata } from "next";
import {
  runAdvantageEnergyScenarios,
  AAV_ILLUSTRATIVE_SCENARIOS,
} from "../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine";
import { evaluateClaimBackedAdvantageReadiness } from "../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-claim-readiness";
import {
  AAV_RESEARCH_INPUTS,
  calculateAavResearchValuation,
} from "../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-research-valuation";

export const metadata: Metadata = {
  title: "Advantage Energy | Phoenix Portfolio",
  description: "Researchscenario's en gecontroleerde AAV-waardering.",
};

const labels: Record<string, string> = {
  bear: "Bear", base: "Base", bull: "Bull", moonshot: "Moonshot",
};
const cad = (n: number, digits = 2) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "CAD", maximumFractionDigits: digits,
  minimumFractionDigits: digits,
}).format(n);
const number = (n: number) => new Intl.NumberFormat("nl-NL").format(n);
const panel: React.CSSProperties = {
  border: "1px solid #64748b55", borderRadius: 12, padding: 20,
};
const grid: React.CSSProperties = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16,
};

export default function AdvantageEnergyValuationPage() {
  const verified = runAdvantageEnergyScenarios();
  const readiness = evaluateClaimBackedAdvantageReadiness();
  const research = calculateAavResearchValuation();
  const passed = Object.values(readiness.checks).filter(Boolean).length;
  const total = Object.keys(readiness.checks).length;

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 8px" }}>
      <p style={{ opacity: 0.75 }}>Phoenix Portfolio / Canadian Natural Gas</p>
      <h1>Advantage Energy Ltd. (TSX: AAV)</h1>
      <p>Onderzoekswaarderingen en afzonderlijke verificatiecontroles. Bedragen in CAD.</p>

      <section aria-label="Research Valuation" style={{ marginTop: 28 }}>
        <h2>Research Valuation — voorlopig</h2>
        <p>
          Vereenvoudigde vijfjaars-DCF met managementverwachtingen en onderzoeksaanames.
          Dit zijn <strong>geen koersdoelen of geverifieerde fair values</strong>.
        </p>
        <div style={grid}>
          {research.map((result) => {
            const scenario = AAV_ILLUSTRATIVE_SCENARIOS.find(s => s.name === result.name);
            return (
              <article key={result.name} style={panel}>
                <h3>{labels[result.name]}</h3>
                <p style={{ fontSize: 28, fontWeight: 700, margin: "12px 0" }}>
                  {cad(result.perShareCad)}
                </p>
                <p style={{ opacity: 0.8, fontSize: 13 }}>
                  {result.equityValueCad < 0
                    ? "Negatieve model-equity; geen negatieve beurskoers"
                    : "Illustratieve modelwaarde per proxy-aandeel"}
                </p>
                <small>
                  Gas {scenario ? cad(scenario.gasPriceCadPerMcf) : "—"}/Mcf ·
                  {scenario?.forecastYears ?? 5} jaar · EV {cad(result.enterpriseValueCad / 1_000_000, 1)} mln
                </small>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Research aannames" style={{ ...panel, marginTop: 24 }}>
        <h2>Gebruikte researchaannames</h2>
        <div style={grid}>
          <p><strong>Productie</strong><br />{number(AAV_RESEARCH_INPUTS.productionBoePerDay)} boe/d (Q4-guidance-midden)</p>
          <p><strong>Gas-aandeel</strong><br />{Math.round(AAV_RESEARCH_INPUTS.gasEnergyShare * 100)}% (proxy)</p>
          <p><strong>Nettoschuld</strong><br />{cad(AAV_RESEARCH_INPUTS.netDebtCad / 1_000_000, 0)} mln (verwachting)</p>
          <p><strong>Aandelen</strong><br />{number(AAV_RESEARCH_INPUTS.shareCountProxy)} (Q2-proxy)</p>
          <p><strong>Royalties</strong><br />{Math.round(AAV_RESEARCH_INPUTS.royaltyRate * 100)}% (aanname)</p>
          <p><strong>G&amp;A</strong><br />{cad(AAV_RESEARCH_INPUTS.gaCadPerBoe)}/boe (guidance)</p>
        </div>
        <p style={{ fontSize: 13, opacity: 0.8 }}>
          Peildatum {AAV_RESEARCH_INPUTS.asOf}. Het model bevat geen belastingen, hedges,
          financieringskosten, ontmantelingsverplichtingen, terminale waarde of expliciete reservebeperking.
          De vijfjaars-DCF is daarom geen volledige bedrijfswaardering.
        </p>
        <p style={{ fontSize: 13 }}>
          Bronnen: <a href={AAV_RESEARCH_INPUTS.sources.disposition} target="_blank" rel="noreferrer">Wembley-afronding</a>
          {" · "}<a href={AAV_RESEARCH_INPUTS.sources.guidance} target="_blank" rel="noreferrer">Bedrijfsverwachtingen</a>
          {" · "}<a href={AAV_RESEARCH_INPUTS.sources.q2} target="_blank" rel="noreferrer">Q2 2026</a>
        </p>
      </section>

      <section aria-label="Verified Valuation" style={{ ...panel, marginTop: 28 }}>
        <h2>Verified Valuation — {verified.status === "blocked" ? "Geblokkeerd" : "Illustratief"}</h2>
        <p>{passed} van {total} controles geslaagd.</p>
        <p>{verified.status === "blocked"
          ? "Geen geverifieerde koerswaardering: actuele gegevens of bewijsstukken ontbreken."
          : "Geverifieerde invoer beschikbaar; uitkomsten blijven illustratief."}</p>
        <div style={grid}>
          {AAV_ILLUSTRATIVE_SCENARIOS.map(s => {
            const result = verified.results.find(r => r.name === s.name);
            return (
              <article key={s.name} style={panel}>
                <h3>{labels[s.name]}</h3>
                <p style={{ fontSize: 24, fontWeight: 700 }}>
                  {result ? cad(result.illustrativePerShareCad) : "—"}
                </p>
                <small>{result ? "Illustratieve berekening" : "Wacht op geverifieerde invoer"}</small>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Validatiecontroles" style={{ marginTop: 28 }}>
        <h2>Controleoverzicht</h2>
        <details>
          <summary>Toon {total} controles ({total - passed} openstaand)</summary>
          <ul>{Object.entries(readiness.checks).map(([key, valid]) => (
            <li key={key}>{valid ? "✓" : "○"} {key}: {valid ? "geslaagd" : "niet gevalideerd"}</li>
          ))}</ul>
        </details>
        <details style={{ marginTop: 16 }}>
          <summary>Toon ontbrekende bewijsstukken en fouten</summary>
          <ul>{readiness.errors.map((error, i) => <li key={i}>{error}</li>)}</ul>
        </details>
      </section>
    </div>
  );
}
