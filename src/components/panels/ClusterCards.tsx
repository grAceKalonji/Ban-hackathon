import { useState } from 'react';
import type { ClusterData, RiskScore, UrgencyLevel } from '../../types';

interface Props {
  clusters: ClusterData;
  scores: RiskScore[];
  showTrueVacanciesOnly: boolean;
}

function urgencyHeaderClass(urgency: UrgencyLevel): string {
  return { critical: 'bg-red-600', high: 'bg-amber-600', medium: 'bg-blue-600' }[urgency];
}

function urgencyBadgeClass(urgency: UrgencyLevel): string {
  const map: Record<UrgencyLevel, string> = {
    critical: 'bg-red-900/60 text-red-200 border-red-700/50',
    high:     'bg-amber-900/60 text-amber-200 border-amber-700/50',
    medium:   'bg-blue-900/60 text-blue-200 border-blue-700/50',
  };
  return `inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${map[urgency]}`;
}

export default function ClusterCards({ clusters, scores, showTrueVacanciesOnly }: Props) {
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);

  const scoreMap: Record<number, RiskScore> = {};
  for (const s of scores) scoreMap[s.id] = s;

  if (clusters.clusters.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center text-slate-500">
        Run the pipeline to generate cluster data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Silhouette callout */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg px-5 py-3">
        <span className="text-slate-400 text-sm">
          Clustering quality (silhouette score):{' '}
          <span className="text-white font-semibold">{clusters.silhouette_score.toFixed(2)}</span>
          {' — '}
          <span className="text-white font-semibold">{clusters.optimal_k}</span>{' '}
          natural bottleneck segments identified
        </span>
      </div>

      {/* Cluster grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {clusters.clusters.map((cluster) => {
          const isExpanded = expandedCluster === cluster.cluster_id;
          const clusterScores = (showTrueVacanciesOnly
            ? cluster.req_ids.map((id) => scoreMap[id]).filter((s) => s && !s.is_evergreen)
            : cluster.req_ids.map((id) => scoreMap[id]).filter(Boolean)) as RiskScore[];

          return (
            <div
              key={cluster.cluster_id}
              className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div className={`px-5 py-3 flex items-center justify-between ${urgencyHeaderClass(cluster.urgency)}`}>
                <h3 className="text-white font-bold text-base leading-tight">{cluster.label}</h3>
                <span className={urgencyBadgeClass(cluster.urgency)}>
                  {cluster.urgency.charAt(0).toUpperCase() + cluster.urgency.slice(1)}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <p className="text-slate-300 text-sm">
                  <span className="text-white font-semibold">{cluster.req_count}</span> requisitions
                  {' · '}Avg{' '}
                  <span className="text-white font-semibold">{Math.round(cluster.avg_days_open)}</span>{' '}
                  days open
                  {' · '}
                  <span className="text-white font-semibold">{Math.round(cluster.slow_to_fill_pct)}%</span>{' '}
                  exceed 90 days
                </p>

                <p className="text-slate-400 text-xs">
                  Primary type:{' '}
                  <span className="text-slate-200 capitalize">{cluster.dominant_req_type}</span>
                  {' · '}Region:{' '}
                  <span className="text-slate-200">{cluster.dominant_region}</span>
                </p>

                {cluster.fixed_term_pct > 20 && (
                  <p className="text-amber-400 text-xs">
                    ⚠ {Math.round(cluster.fixed_term_pct)}% on fixed-term contracts
                  </p>
                )}

                <div className="border-t border-slate-800 pt-3">
                  <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">
                    Recommended Action
                  </p>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {cluster.recommended_action}
                  </p>
                </div>

                <button
                  onClick={() => setExpandedCluster(isExpanded ? null : cluster.cluster_id)}
                  className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                >
                  {isExpanded ? '▲ Hide' : '▼ Show'} requisitions in this cluster ({clusterScores.length})
                </button>

                {isExpanded && (
                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-1">
                    {clusterScores.length === 0 ? (
                      <p className="text-slate-500 text-xs">No requisitions to show.</p>
                    ) : (
                      clusterScores.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="truncate flex-1">{s.job_requisition}</span>
                          <span className="shrink-0 text-slate-500">{s.primary_location}</span>
                          <span className="shrink-0 text-slate-500">{s.days_open}d</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
