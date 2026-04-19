import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { RiskScore, FeatureImportance, ModelPerformance } from '../../types';
import RiskBadge from '../shared/RiskBadge';

interface Props {
  scores: RiskScore[];
  featureImportance: FeatureImportance[];
  modelPerformance: ModelPerformance;
  showTrueVacanciesOnly: boolean;
}

type SortCol = 'days_open' | 'risk_probability';
const PAGE_SIZE = 15;

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function RiskScorecard({
  scores,
  featureImportance,
  modelPerformance,
  showTrueVacanciesOnly,
}: Props) {
  const [sortCol, setSortCol]           = useState<SortCol>('risk_probability');
  const [sortDir, setSortDir]           = useState<'asc' | 'desc'>('desc');
  const [filterTier, setFilterTier]     = useState('All');
  const [filterType, setFilterType]     = useState('All');
  const [filterRegion, setFilterRegion] = useState('All');
  const [page, setPage]                 = useState(0);
  const [expandedId, setExpandedId]     = useState<number | null>(null);

  const reqTypes = useMemo(
    () => ['All', ...Array.from(new Set(scores.map((s) => s.req_type))).sort()],
    [scores],
  );
  const regions = useMemo(
    () => ['All', ...Array.from(new Set(scores.map((s) => s.location_region))).sort()],
    [scores],
  );

  const filtered = useMemo(() => {
    let rows = showTrueVacanciesOnly ? scores.filter((s) => !s.is_evergreen) : scores;
    if (filterTier !== 'All')   rows = rows.filter((s) => s.risk_tier === filterTier);
    if (filterType !== 'All')   rows = rows.filter((s) => s.req_type === filterType);
    if (filterRegion !== 'All') rows = rows.filter((s) => s.location_region === filterRegion);
    return [...rows].sort((a, b) => {
      const av = sortCol === 'days_open' ? a.days_open : a.risk_probability;
      const bv = sortCol === 'days_open' ? b.days_open : b.risk_probability;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [scores, showTrueVacanciesOnly, filterTier, filterType, filterRegion, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows   = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
    setPage(0);
  }

  const chartData = featureImportance.slice(0, 8).map((f) => ({
    label: f.label,
    value: parseFloat((f.importance * 100).toFixed(1)),
  }));

  return (
    <div className="flex flex-col xl:flex-row gap-6">
      {/* Left: Table */}
      <div className="flex-1 min-w-0">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: 'Risk Tier', value: filterTier, setter: setFilterTier,
              options: ['All', 'High', 'Medium', 'Low', 'N/A - Pipeline'] },
            { label: 'Req Type', value: filterType, setter: setFilterType, options: reqTypes },
            { label: 'Region',   value: filterRegion, setter: setFilterRegion, options: regions },
          ].map(({ label, value, setter, options }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-slate-400 text-xs">{label}:</span>
              <select
                value={value}
                onChange={(e) => { setter(e.target.value); setPage(0); }}
                className="bg-slate-800 border border-slate-700 text-white text-xs rounded px-2 py-1"
              >
                {options.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <span className="text-slate-500 text-xs self-center ml-auto">
            {filtered.length} requisitions
          </span>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3">Job Title</th>
                <th className="text-left px-4 py-3">Loc</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
                <th
                  className="text-right px-4 py-3 cursor-pointer hover:text-white select-none"
                  onClick={() => handleSort('days_open')}
                >
                  Days {sortCol === 'days_open' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th
                  className="text-right px-4 py-3 cursor-pointer hover:text-white select-none hidden lg:table-cell"
                  onClick={() => handleSort('risk_probability')}
                >
                  Risk Score {sortCol === 'risk_probability' ? (sortDir === 'desc' ? '↓' : '↑') : ''}
                </th>
                <th className="text-center px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-slate-500 py-10">
                    No requisitions match current filters.
                  </td>
                </tr>
              )}
              {pageRows.map((row) => {
                const isExpanded = expandedId === row.id;
                const isHighRisk = row.risk_tier === 'High';
                return (
                  <>
                    <tr
                      key={row.id}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className={`border-b border-slate-800/50 cursor-pointer transition-colors hover:bg-slate-800/50 ${
                        isHighRisk ? 'bg-red-950/20' : ''
                      } ${row.is_evergreen ? 'opacity-70' : ''}`}
                    >
                      <td className="px-4 py-3 text-white">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span title={row.job_requisition}>
                            {truncate(row.job_requisition, 40)}
                          </span>
                          {row.is_evergreen && (
                            <span className="text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded">
                              Evergreen
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{row.primary_location}</td>
                      <td className="px-4 py-3 text-slate-400 capitalize hidden md:table-cell">
                        {row.req_type}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{row.days_open}d</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 bg-slate-700 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.round(row.risk_probability * 100)}%` }}
                            />
                          </div>
                          <span className="text-slate-300 text-xs w-8 text-right">
                            {Math.round(row.risk_probability * 100)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RiskBadge tier={row.risk_tier} />
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${row.id}-exp`} className="bg-slate-800/30">
                        <td colSpan={6} className="px-4 py-2 text-slate-300 text-xs">
                          <strong>Full title:</strong> {row.job_requisition} ·{' '}
                          <strong>Level:</strong> {row.management_level} ·{' '}
                          <strong>Region:</strong> {row.location_region}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 text-xs text-slate-400">
              <span>Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Feature Importance */}
      <div className="xl:w-96 shrink-0">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-white font-semibold mb-1">What Predicts a Long Vacancy?</h3>
          <p className="text-slate-400 text-xs mb-4">Feature importance from Random Forest classifier</p>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={140}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6 }}
                  labelStyle={{ color: '#e2e8f0' }}
                  formatter={(v: number) => [`${v}%`, 'Importance']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
              Run the pipeline to generate feature importance data.
            </div>
          )}

          <p className="text-slate-500 text-xs mt-3 border-t border-slate-800 pt-3">
            Model F1: <span className="text-slate-300">{modelPerformance.mean_f1}</span>
            {' · '}Precision: <span className="text-slate-300">{modelPerformance.mean_precision}</span>
            {' · '}Recall: <span className="text-slate-300">{modelPerformance.mean_recall}</span>
            {' · '}{modelPerformance.cv_folds}-fold CV
          </p>
        </div>
      </div>
    </div>
  );
}
