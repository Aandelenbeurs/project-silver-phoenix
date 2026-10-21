import type { Metadata } from 'next';
import Link from 'next/link';
import { calculateAavInvestmentThresholds } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-investment-threshold';

export const metadata: Metadata = {
  title: 'AAV Investeringsdrempel | Phoenix Portfolio',
  description: 'Hypothetische gasprijs- en productie-efficiëntiedrempels voor incrementele capex.',
};
const money = (v: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(v);
const cell = { borderBottom: '1px solid #64748b55', padding: '12px 14px', textAlign: 'right' as const };
export default function InvestmentThresholdPage() {
  const report = calculateAavInvestmentThresholds('base');
  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 20px' }}>
    <p><Link href="/valuation/advantage-energy/engine">← Terug naar de waarderingsmotor</Link></p>
    <h1>Advantage Energy — Economische investeringsdrempel</h1>
    <p>Welke gasprijs maakt een eenmalige investering waarde-neutraal, bij verschillende aannames over productie-efficiëntie? Referentie: C$ {money(report.referenceGasPriceCadPerMcf)}/Mcf.</p>
    <p>Een efficiëntie van 125% betekent 25% meer nieuwe productiecapaciteit per geïnvesteerde dollar dan in het huidige model. De gasprijsdrempel is de prijs waarbij de <strong>extra</strong> NPV over de volledige modelhorizon nul wordt.</p>
    <div style={{ overflowX: 'auto', border: '1px solid #64748b55', borderRadius: 12, padding: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead><tr><th style={{ ...cell, textAlign: 'left' }}>Productie-efficiëntie</th>{report.capexLevelsCad.map(c => <th key={c} style={cell}>C$ {money(c / 1e6)} mln</th>)}</tr></thead>
        <tbody>{report.efficiencyMultipliers.map(e => <tr key={e}>
          <td style={{ ...cell, textAlign: 'left' }}>{money(e * 100)}%</td>
          {report.capexLevelsCad.map(c => {
            const x = report.cells.find(z => z.efficiencyMultiplier === e && z.capexCad === c)!;
            return <td key={c} style={{ ...cell, fontWeight: e === 1 ? 700 : 400 }}>
              {x.breakEvenGasPriceCadPerMcf === null ? 'Niet gevonden ≤ C$ 30' : `C$ ${money(x.breakEvenGasPriceCadPerMcf)}/Mcf`}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
    <h2>NPV bij de Base-gasprijs</h2>
    <p>Negatieve bedragen betekenen dat de investering in dit hypothetische model waarde vernietigt. Alle bedragen in miljoenen CAD.</p>
    <div style={{ overflowX: 'auto', border: '1px solid #64748b55', borderRadius: 12, padding: 12 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead><tr><th style={{ ...cell, textAlign: 'left' }}>Productie-efficiëntie</th>{report.capexLevelsCad.map(c => <th key={c} style={cell}>C$ {money(c / 1e6)} mln</th>)}</tr></thead>
        <tbody>{report.efficiencyMultipliers.map(e => <tr key={e}><td style={{ ...cell, textAlign: 'left' }}>{money(e * 100)}%</td>{report.capexLevelsCad.map(c => {
          const x = report.cells.find(z => z.efficiencyMultiplier === e && z.capexCad === c)!;
          return <td key={c} style={{ ...cell, fontWeight: e === 1 ? 700 : 400 }}>{money(x.npvAtBaseGasCad / 1e6)} mln</td>;
        })}</tr>)}</tbody>
      </table>
    </div>
    <p style={{ opacity: 0.75, marginTop: 20 }}>{report.note}</p>
    <p><strong>Officiële waardering blijft geblokkeerd.</strong> Dit is uitsluitend een hypothetische gevoeligheidsanalyse.</p>
  </main>;
}
