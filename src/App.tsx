import { useState, useEffect } from 'react';
import type {
  BaseData,
  RiskScoreData,
  FeatureImportanceData,
  ClusterData,
  AssociationRuleData,
  PressureData,
  TabId,
} from './types';
import {
  loadBase,
  loadRiskScores,
  loadFeatureImportance,
  loadClusters,
  loadAssociationRules,
  loadPressure,
} from './data/loaders';
import { useToggle } from './hooks/useToggle';
import Header from './components/layout/Header';
import NavTabs from './components/layout/NavTabs';
import RiskScorecard from './components/panels/RiskScorecard';
import PressureMap from './components/panels/PressureMap';
import ClusterCards from './components/panels/ClusterCards';
import AssociationRules from './components/panels/AssociationRules';

interface AppData {
  base: BaseData;
  riskScores: RiskScoreData;
  featureImportance: FeatureImportanceData;
  clusters: ClusterData;
  associationRules: AssociationRuleData;
  pressure: PressureData;
}

export default function App() {
  const [data, setData]       = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('risk');
  const [showTrueVacanciesOnly, , setShowTrueVacanciesOnly] = useToggle(false);

  useEffect(() => {
    Promise.all([
      loadBase(),
      loadRiskScores(),
      loadFeatureImportance(),
      loadClusters(),
      loadAssociationRules(),
      loadPressure(),
    ])
      .then(([base, riskScores, featureImportance, clusters, associationRules, pressure]) => {
        setData({ base, riskScores, featureImportance, clusters, associationRules, pressure });
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm">Loading workforce intelligence data…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-800/50 rounded-xl p-8 max-w-md text-center space-y-3">
          <p className="text-red-400 text-lg font-semibold">Failed to load data</p>
          <p className="text-slate-400 text-sm">{error ?? 'Unknown error'}</p>
          <p className="text-slate-500 text-xs">
            Make sure the Python pipeline has been run and JSON files exist in{' '}
            <code className="bg-slate-800 px-1 rounded">public/data/</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header
        summary={data.base.summary}
        scores={data.riskScores.scores}
        showTrueVacanciesOnly={showTrueVacanciesOnly}
        onToggle={setShowTrueVacanciesOnly}
      />
      <NavTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'risk' && (
          <RiskScorecard
            scores={data.riskScores.scores}
            featureImportance={data.featureImportance.features}
            modelPerformance={data.riskScores.model_performance}
            showTrueVacanciesOnly={showTrueVacanciesOnly}
          />
        )}
        {activeTab === 'map' && (
          <PressureMap
            pressure={data.pressure}
            showTrueVacanciesOnly={showTrueVacanciesOnly}
          />
        )}
        {activeTab === 'clusters' && (
          <ClusterCards
            clusters={data.clusters}
            scores={data.riskScores.scores}
            showTrueVacanciesOnly={showTrueVacanciesOnly}
          />
        )}
        {activeTab === 'rules' && (
          <AssociationRules
            rules={data.associationRules}
            showTrueVacanciesOnly={showTrueVacanciesOnly}
          />
        )}
      </main>
    </div>
  );
}
