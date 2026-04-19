import type { BaseSummary, RiskScore } from '../../types';
import StatCard from '../shared/StatCard';
import Toggle from '../shared/Toggle';

interface Props {
  summary: BaseSummary;
  scores: RiskScore[];
  showTrueVacanciesOnly: boolean;
  onToggle: (val: boolean) => void;
}

export default function Header({ summary, scores, showTrueVacanciesOnly, onToggle }: Props) {
  const visibleScores = showTrueVacanciesOnly
    ? scores.filter((s) => !s.is_evergreen)
    : scores;

  const highRisk = visibleScores.filter((s) => s.risk_tier === 'High').length;
  const avgDays = visibleScores.length
    ? Math.round(visibleScores.reduce((acc, s) => acc + s.days_open, 0) / visibleScores.length)
    : 0;
  const countries = new Set(visibleScores.map((s) => s.primary_location)).size;

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              When Hiring Stalls, Patients Wait
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              IDEXX Laboratories · Workforce Intelligence System
            </p>
          </div>
          <Toggle
            checked={showTrueVacanciesOnly}
            onChange={onToggle}
            labelOff="All 216 Requisitions"
            labelOn={`True Vacancies Only (${summary.true_vacancies})`}
          />
        </div>

        {showTrueVacanciesOnly && (
          <div className="mt-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-3 py-1.5">
            Evergreen pipeline reqs excluded — showing real vacancies only
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <StatCard
            label="Total Requisitions"
            value={visibleScores.length}
            sublabel={showTrueVacanciesOnly ? 'true vacancies' : 'all reqs'}
          />
          <StatCard
            label="High-Risk Vacancies"
            value={highRisk}
            sublabel="risk score ≥ 65%"
            accentColor="text-red-400"
          />
          <StatCard
            label="Avg Days Open"
            value={avgDays}
            sublabel="across active reqs"
            accentColor="text-amber-400"
          />
          <StatCard
            label="Countries Affected"
            value={countries}
            sublabel="with open requisitions"
            accentColor="text-emerald-400"
          />
        </div>
      </div>
    </header>
  );
}
