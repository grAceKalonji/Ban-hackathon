import type { AssociationRuleData } from '../../types';

interface Props {
  rules: AssociationRuleData;
  showTrueVacanciesOnly: boolean;
}

function liftColorClass(lift: number): string {
  if (lift >= 2.0) return 'text-red-400 bg-red-500/10 border-red-500/30';
  if (lift >= 1.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
}

export default function AssociationRules({ rules, showTrueVacanciesOnly }: Props) {
  return (
    <div className="space-y-4">
      {/* Explanation card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <p className="text-slate-300 text-sm leading-relaxed">
          Association rules reveal which{' '}
          <strong className="text-white">combinations of factors</strong> consistently predict
          hiring delays. Each rule below was found in the data — not assumed.{' '}
          <strong className="text-white">Confidence</strong> tells you how often the pattern
          holds. <strong className="text-white">Lift</strong> tells you how much more likely a
          delay is compared to chance. Higher lift = stronger signal.
        </p>
        {!showTrueVacanciesOnly && (
          <p className="text-slate-500 text-xs mt-3 border-t border-slate-800 pt-3">
            Rules calculated on true vacancies only. Toggle has no effect on rule content.
          </p>
        )}
      </div>

      {/* Rule cards */}
      {rules.rules.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-10 text-center text-slate-500">
          No association rules found. Run the pipeline to generate rules.
        </div>
      ) : (
        rules.rules.map((rule) => (
          <div
            key={rule.rule_id}
            className="bg-slate-900 border border-slate-800 rounded-lg p-5 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-150"
          >
            <div className="flex items-start gap-4">
              {/* Confidence */}
              <div className="shrink-0 text-center w-16">
                <span className="text-3xl font-bold text-blue-400">{rule.confidence_pct}%</span>
                <p className="text-slate-500 text-xs mt-0.5">confidence</p>
              </div>

              {/* Rule text */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-base leading-snug font-medium">
                  {rule.plain_english}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rule.antecedent_labels.map((label) => (
                    <span
                      key={label}
                      className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Found in {(rule.support * 100).toFixed(1)}% of requisitions
                </p>
              </div>

              {/* Lift badge */}
              <div className="shrink-0">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold border ${liftColorClass(rule.lift)}`}
                >
                  Lift {rule.lift_rounded}×
                </span>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Summary */}
      {rules.rules.length > 0 && (
        <div className="text-slate-500 text-xs text-center py-2 space-y-1">
          <p>
            Analysis examined{' '}
            <span className="text-slate-400">{rules.total_rules_found}</span> candidate rules ·
            Showing top <span className="text-slate-400">{rules.rules_displayed}</span> by lift
          </p>
          <p>Rules predict slow-to-fill (&gt;90 days) outcomes only — not candidate quality</p>
        </div>
      )}
    </div>
  );
}
