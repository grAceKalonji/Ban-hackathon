import type { RiskTier } from '../../types';

interface Props {
  tier: RiskTier | string;
}

const STYLES: Record<string, string> = {
  High:             'bg-red-500/20 text-red-400 border border-red-500/30',
  Medium:           'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  Low:              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  'N/A - Pipeline': 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
};

export default function RiskBadge({ tier }: Props) {
  const styles = STYLES[tier] ?? STYLES['N/A - Pipeline'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>
      {tier}
    </span>
  );
}
