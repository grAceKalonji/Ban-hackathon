import type {
  BaseData,
  RiskScoreData,
  FeatureImportanceData,
  ClusterData,
  AssociationRuleData,
  PressureData,
} from '../types';

const BASE_PATH = '/data';

async function load<T>(filename: string): Promise<T> {
  const res = await fetch(`${BASE_PATH}/${filename}`);
  if (!res.ok) throw new Error(`Failed to load ${filename}: ${res.status}`);
  return res.json() as Promise<T>;
}

export const loadBase              = () => load<BaseData>('base.json');
export const loadRiskScores        = () => load<RiskScoreData>('risk_scores.json');
export const loadFeatureImportance = () => load<FeatureImportanceData>('feature_importance.json');
export const loadClusters          = () => load<ClusterData>('clusters.json');
export const loadAssociationRules  = () => load<AssociationRuleData>('association_rules.json');
export const loadPressure          = () => load<PressureData>('pressure.json');
