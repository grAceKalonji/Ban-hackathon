interface Props {
  label: string;
  value: string | number;
  sublabel?: string;
  accentColor?: string;
}

export default function StatCard({ label, value, sublabel, accentColor = 'text-blue-400' }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 flex flex-col gap-1">
      <span className="text-slate-400 text-xs uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${accentColor}`}>{value}</span>
      {sublabel && <span className="text-slate-500 text-xs">{sublabel}</span>}
    </div>
  );
}
