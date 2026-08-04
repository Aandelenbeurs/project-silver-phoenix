export type SelectionGroup = 'Kernpositie' | 'Behouden' | 'Afbouwen' | 'Uitstappen / watchlist' | 'Apart';

export function selectionGroup(score?: number, category?: string): SelectionGroup {
  if (category === 'ETF' || category === 'Fysiek') return 'Apart';
  if ((score ?? 0) >= 95) return 'Kernpositie';
  if ((score ?? 0) >= 90) return 'Behouden';
  if ((score ?? 0) >= 84) return 'Afbouwen';
  return 'Uitstappen / watchlist';
}

export default function SelectionBadge({ group }: { group: SelectionGroup }) {
  const cls =
    group === 'Kernpositie' ? 'badge-core' :
    group === 'Behouden' ? 'badge-keep' :
    group === 'Afbouwen' ? 'badge-reduce' :
    group === 'Apart' ? 'badge-apart' : 'badge-exit';
  return <span className={`selection-badge ${cls}`}>{group}</span>;
}
