import type { Metadata } from 'next';
import Link from 'next/link';
import { evaluateAavProjectInvestments } from '../../../../data/multi-sector/sectors/canadian-natural-gas/advantage-energy-project-investments';

export const metadata: Metadata = {
  title: 'Projectgebaseerde investeringsanalyse | Phoenix Portfolio',
  description: 'Hypothetische projecttranches met individuele investeringsdrempels en selectie.',
};
const money = (n: number) => new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1 }).format(n / 1e6);
const price = (n: number | null) => n === null ? 'Buiten bereik' : `C$ ${n.toFixed(2).replace('.', ',')}/Mcf`;
const th = { padding: '12px 10px', borderBottom: '1px solid #64748b55', textAlign: 'right' as const };
const td = { padding: '12px 10px', borderBottom: '1px solid #64748b33', textAlign: 'right' as const };

export default function ProjectInvestmentsPage() {
  const report = evaluateAavProjectInvestments('base');
  return <main style={{ maxWidth: 1150, margin: '0 auto', padding: '32px 20px', color: 'inherit' }}>
    <Link href="/valuation/advantage-energy/engine">← Terug naar de waarderingsmotor</Link>
    <h1>Advantage Energy — Projectgebaseerde investeringsanalyse</h1>
    <p>Hypothetische Base-gasprijs: C$ {report.gasPriceCadPerMcf.toFixed(2).replace('.', ',')}/Mcf. Vijf fictieve projecttranches met verschillende productie-efficiënties.</p>
    <p>Een project wordt geselecteerd wanneer zijn zelfstandige incrementele NPV positief is. De volgorde is gebaseerd op NPV per geïnvesteerde dollar.</p>
    <div style={{ overflowX: 'auto', border: '1px solid #64748b55', borderRadius: 12, padding: 12 }}>
      <table style={{ width: '100%', minWidth: 850, borderCollapse: 'collapse' }}>
        <thead><tr><th style={{ ...th, textAlign: 'left' }}>Project</th><th style={th}>Capex (mln CAD)</th><th style={th}>Efficiëntie</th><th style={th}>Break-even gasprijs</th><th style={th}>NPV (mln CAD)</th><th style={th}>Besluit</th></tr></thead>
        <tbody>{report.projects.map(p => <tr key={p.id}>
          <td style={{ ...td, textAlign: 'left' }}>{p.label}</td>
          <td style={td}>{money(p.capexCad)}</td><td style={td}>{Math.round(p.efficiency * 100)}%</td>
          <td style={td}>{price(p.breakEvenGasPriceCadPerMcf)}</td>
          <td style={td}>{money(p.incrementalNpvCad)}</td>
          <td style={td}>{p.accepted ? 'Selecteren' : 'Afwijzen'}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <section style={{ marginTop: 24, border: '1px solid #64748b55', borderRadius: 12, padding: 20 }}>
      <h2>Indicatieve projectselectie</h2>
      <p>Geselecteerde capex: <strong>C$ {money(report.selectedCapexCad)} mln</strong> · Som zelfstandige NPV: <strong>C$ {money(report.selectedNpvCad)} mln</strong></p>
      <p>Afgewezen capex: C$ {money(report.rejectedCapexCad)} mln</p>
    </section>
    <p style={{ opacity: 0.8, fontSize: 13, marginTop: 20 }}>{report.caveat}</p>
    <p style={{ opacity: 0.8, fontSize: 13 }}>De geverifieerde ondernemingswaardering blijft geblokkeerd; dit is uitsluitend een modeldiagnose.</p>
  </main>;
}
