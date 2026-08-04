type Props = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: 'neutral' | 'gold' | 'green' | 'red';
};

export default function StatCard({ label, value, detail, tone = 'neutral' }: Props) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}
