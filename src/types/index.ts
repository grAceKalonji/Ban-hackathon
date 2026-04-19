export interface BaseReq {
  id: number;
  job_requisition: string;
  worker_sub_type: string;
  days_open: number;
  primary_location: string;
  job_profile: string;
  management_level: string;
  openings: number;
  is_evergreen: boolean;
  is_true_vacancy: boolean;
  slow_to_fill: boolean;
  is_fixed_term: boolean;
  is_international: boolean;
  req_type: 'clinical' | 'technical' | 'operational' | 'leadership' | 'commercial' | 'other';
  management_level_ordinal: number;
  location_region: string;
}

export interface BaseSummary {
  total_reqs: number;
  true_vacancies: number;
  evergreen_reqs: number;
  slow_to_fill_count: number;
  slow_to_fill_pct: number;
  max_days_open: number;
  median_days_open: number;
  mean_days_open: number;
  countries_count: number;
  req_type_counts: Record<string, number>;
}

export interface BaseData {
  all_reqs: BaseReq[];
  summary: BaseSummary;
}

export type RiskTier = 'High' | 'Medium' | 'Low' | 'N/A - Pipeline';

export interface RiskScore {
  id: number;
  job_requisition: string;
  risk_probability: number;
  risk_tier: RiskTier;
  days_open: number;
  primary_location: string;
  req_type: string;
  management_level: string;
  is_evergreen: boolean;
  location_region: string;
}

export interface ModelPerformance {
  mean_f1: number;
  mean_precision: number;
  mean_recall: number;
  cv_folds: number;
}

export interface RiskScoreData {
  scores: RiskScore[];
  model_performance: ModelPerformance;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  label: string;
}

export interface FeatureImportanceData {
  features: FeatureImportance[];
}

export type UrgencyLevel = 'critical' | 'high' | 'medium';

export interface Cluster {
  cluster_id: number;
  label: string;
  urgency: UrgencyLevel;
  req_count: number;
  avg_days_open: number;
  median_days_open: number;
  total_openings: number;
  slow_to_fill_pct: number;
  dominant_req_type: string;
  dominant_region: string;
  fixed_term_pct: number;
  recommended_action: string;
  req_ids: number[];
}

export interface ClusterData {
  optimal_k: number;
  silhouette_score: number;
  clusters: Cluster[];
}

export interface AssociationRule {
  rule_id: number;
  antecedents: string[];
  support: number;
  confidence: number;
  lift: number;
  plain_english: string;
  antecedent_labels: string[];
  confidence_pct: number;
  lift_rounded: number;
}

export interface AssociationRuleData {
  rules: AssociationRule[];
  total_rules_found: number;
  rules_displayed: number;
}

export type PressureTier = 'Critical' | 'High' | 'Medium' | 'Low';

export interface CountryPressure {
  iso_code: string;
  country_name: string;
  req_count: number;
  total_openings: number;
  median_days_open: number;
  slow_to_fill_count: number;
  raw_pressure: number;
  normalized_pressure: number;
  pressure_score: number;
  pressure_tier: PressureTier;
}

export interface PressureData {
  countries: CountryPressure[];
  global_summary: {
    highest_pressure_country: string;
    total_countries: number;
    critical_count: number;
    high_count: number;
  };
}

export type TabId = 'risk' | 'map' | 'clusters' | 'rules';
