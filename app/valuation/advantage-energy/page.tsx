import React from "react";
import type { Metadata } from "next";
import { runAdvantageEnergyScenarios, AAV_ILLUSTRATIVE_SCENARIOS } from "../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-scenario-engine";
import { evaluateClaimBackedAdvantageReadiness } from "../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-claim-readiness";

export const metadata: Metadata = {
  title: "Advantage Energy | Phoenix Portfolio",
  description: "AAV scenarioanalyse met gecontroleerde bron- en claimvalidatie.",
};

const names: Record<string, string> = {
  bear: "Bear", base: "Base", bull: "Bull", moonshot: "Moonshot",
};
const money = (value: number) => new Intl.NumberFormat("nl-NL", {
  style: "currency", currency: "CAD", maximumFractionDigits: 2,
}).format(value);
const container = { maxWidth: 1120, margin: "0 auto", padding: "32px 20px" };
const panel = { border: "1px solid #64748b55", borderRadius: 12, padding: 20 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 };

export default function AdvantageEnergyValuationPage() {
  // Server-rendered: never bypass the guarded scenario runner.
  const run = runAdvantageEnergyScenarios();
  const readiness = evaluateClaimBackedAdvantageReadiness();
  const passed = Object.values(readiness.checks).filter(Boolean).length;
  const total = Object.keys(readiness.checks).length;
  return (
    <main style={container}>
      <p style={{ opacity: 0.75 }}>Phoenix Portfolio / Canadian Natural Gas</p>
      <h1>Advantage Energy Ltd. (TSX: AAV)</h1>
      <p>Waarderingsscenario’s met bron- en claimcontroles. Alle bedragen in CAD.</p>

      <section aria-label="Waarderingsstatus" style={{ ...panel, marginBottom: 24 }}>
        <h2>Status: {run.status === "blocked" ? "Geblokkeerd" : "Illustratief"}</h2>
        <p>{passed} van {total} controles geslaagd.</p>
        {run.status === "blocked" ? (
          <p>Geen koerswaardering beschikbaar: vereiste actuele cijfers of bewijsstukken ontbreken.</p>
        ) : (
          <p>De berekeningen zijn uitsluitend illustratief en vormen geen reële waarde of koersdoel.</p>
        )}
      </section>

      <section aria-label="Vier scenario's">
        <h2>Scenariovergelijking</h2>
        <div style={grid}>
          {AAV_ILLUSTRATIVE_SCENARIOS.map((scenario) => {
            const result = run.results.find((item) => item.name === scenario.name);
            return (
              <article key={scenario.name} style={panel}>
                <h3>{names[scenario.name]}</h3>
                <p style={{ fontSize: 26, fontWeight: 700 }}>
                  {result ? money(result.illustrativePerShareCad) : "—"}
                </p>
                <p>{result ? "Illustratieve waarde per aandeel" : "Wacht op geverifieerde invoer"}</p>
                <small>Gasprijs: {money(scenario.gasPriceCadPerMcf)}/Mcf · Horizon: {scenario.forecastYears} jaar</small>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label="Validatiecontroles" style={{ marginTop: 28 }}>
        <h2>Controleoverzicht</h2>
        <div style={grid}>
          {Object.entries(readiness.checks).map(([key, valid]) => (
            <div key={key} style={panel}>
              <strong>{valid ? "✓" : "○"} {key}</strong>
              <p>{valid ? "Geslaagd" : "Nog niet gevalideerd"}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-label="Ontbrekende gegevens" style={{ marginTop: 28 }}>
        <h2>Openstaande vereisten</h2>
        {readiness.errors.length === 0 ? (
          <p>Alle vereisten zijn ingevuld.</p>
        ) : (
          <ul>{readiness.errors.map((error, index) => <li key={index}>{error}</li>)}</ul>
        )}
      </section>

      <section aria-label="Methodologie" style={{ ...panel, marginTop: 28 }}>
        <h2>Methodologie en beperkingen</h2>
        <p>De Bear-, Base-, Bull- en Moonshot-aannames zijn hypothetische stresstests, geen bedrijfsprognoses.</p>
        <p>Het vereenvoudigde model laat onder andere royalties, belastingen, hedges, financieringskosten,
          ontmantelingsverplichtingen, reserve-uitputting en terminale waarde buiten beschouwing.
          De resultaten mogen niet als beleggingsadvies of onderbouwde koersdoelen worden geïnterpreteerd.</p>
        <p>De financiële claims worden gecontroleerd via het AAV-claimregister. Een geslaagde technische
          validatie vervangt geen onafhankelijke controle van de oorspronkelijke bedrijfsdocumenten.</p>
      </section>
    </main>
  );
}
