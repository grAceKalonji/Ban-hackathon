"""
cluster.py — K-Means clustering on true vacancies, data-driven labels.
Run from the idexx-hackathon/ project root:
    python pipeline/cluster.py
"""

import json, sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer

BASE_PATH    = Path("public/data/base.json")
CLUSTER_PATH = Path("public/data/clusters.json")

def assign_label(stats):
    """Return (label, recommended_action) based on actual cluster characteristics."""
    dom   = stats["dominant_req_type"]
    reg   = stats["dominant_region"]
    ft    = stats["fixed_term_pct"]
    intl  = stats["intl_pct"]
    slow  = stats["slow_to_fill_pct"]
    avg   = stats["avg_days_open"]

    # Priority-ordered rules — first match wins
    if dom == "leadership":
        return (
            "Leadership Friction",
            "Start succession planning earlier; expand geographic search radius; executive search partners",
        )
    if dom == "clinical" and avg > 70:
        return (
            "Specialist Bottleneck — Clinical",
            "Build long-term talent pipelines; broaden qualification criteria; targeted specialist outreach",
        )
    if dom == "clinical" and intl > 40:
        return (
            "International Clinical Pipeline",
            "Localise clinical job descriptions; partner with regional veterinary schools; expand remote eligibility",
        )
    if ft >= 40 and intl >= 60:
        return (
            "International Fixed-Term Surge",
            "Audit why international roles default to fixed-term; assess conversion rates; improve onboarding to retain talent",
        )
    if ft >= 25:
        return (
            "Fixed-Term Workaround Signal",
            "Investigate why permanent seats are chronically unfillable; review compensation competitiveness",
        )
    if dom == "technical":
        return (
            "Technical Talent Bottleneck",
            "Broaden sourcing beyond traditional tech hubs; strengthen employer brand in engineering communities; referral programmes",
        )
    if dom == "operational" and intl >= 60:
        return (
            "International Operational Backlog",
            "Standardise screening across regions; launch continuous hiring funnel; improve process efficiency internationally",
        )
    if dom == "commercial" and intl >= 60:
        return (
            "International Small-Market Pressure",
            "Add regional recruiting capacity; evaluate remote-work options; localize sourcing strategy",
        )
    if slow >= 25:
        return (
            "High-Friction Vacancy Cluster",
            "Review job requirements for unrealistic criteria; benchmark compensation; improve offer process speed",
        )
    return (
        "Active Hiring Backlog",
        "Review pipeline health; set hiring-velocity targets; improve job-posting quality",
    )

def urgency(slow_pct):
    if slow_pct >= 30: return "critical"
    if slow_pct >= 20: return "high"
    return "medium"

# ── Load data ────────────────────────────────────────────────────────────────
data   = json.loads(BASE_PATH.read_text())
df_all = pd.DataFrame(data["all_reqs"])
df     = df_all[df_all["is_true_vacancy"]].copy().reset_index(drop=True)
print(f"True vacancies: {len(df)}")

# ── Build feature matrix ─────────────────────────────────────────────────────
cat_cols = ["req_type"]
num_cols = ["days_open","openings","management_level_ordinal","is_fixed_term","is_international"]

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
preprocessor = ColumnTransformer(transformers=[("cat",ohe,cat_cols)], remainder="passthrough")
X_raw = df[cat_cols+num_cols].copy()
X_raw["is_fixed_term"]    = X_raw["is_fixed_term"].astype(int)
X_raw["is_international"] = X_raw["is_international"].astype(int)
X_enc    = preprocessor.fit_transform(X_raw)
X_scaled = StandardScaler().fit_transform(X_enc)

# ── Select optimal k ─────────────────────────────────────────────────────────
print("  Testing k = 3, 4, 5, 6 …")
best_k, best_score, best_km = 4, -1.0, None
for k in range(3, 7):
    km  = KMeans(n_clusters=k, random_state=42, n_init=20)
    lbl = km.fit_predict(X_scaled)
    sil = silhouette_score(X_scaled, lbl)
    print(f"    k={k}  silhouette={sil:.4f}")
    if sil > best_score:
        best_k, best_score, best_km = k, sil, km

print(f"  Selected k={best_k}  silhouette={best_score:.4f}")
df["cluster"] = best_km.labels_

# ── Per-cluster stats & labels ───────────────────────────────────────────────
clusters_out = []
print("\n── Cluster Statistics ────────────────────────────────────────────")

for cid in sorted(df["cluster"].unique()):
    grp      = df[df["cluster"] == cid]
    avg_days = float(grp["days_open"].mean())
    med_days = float(grp["days_open"].median())
    tot_open = int(grp["openings"].sum())
    req_cnt  = int(len(grp))
    dom_type = str(grp["req_type"].mode().iloc[0])
    dom_reg  = str(grp["location_region"].mode().iloc[0])
    ft_pct   = float(grp["is_fixed_term"].mean() * 100)
    intl_pct = float(grp["is_international"].mean() * 100)
    stf_pct  = float(grp["slow_to_fill"].mean() * 100)
    req_ids  = [int(i) for i in grp["id"].tolist()]

    stats = {
        "dominant_req_type": dom_type,
        "dominant_region":   dom_reg,
        "avg_days_open":     avg_days,
        "fixed_term_pct":    ft_pct,
        "intl_pct":          intl_pct,
        "slow_to_fill_pct":  stf_pct,
    }
    label, action = assign_label(stats)

    print(f"\n  Cluster {cid} → {label}")
    print(f"    reqs={req_cnt}  avg_days={avg_days:.0f}  slow={stf_pct:.0f}%  "
          f"fixed_term={ft_pct:.0f}%  intl={intl_pct:.0f}%")
    print(f"    dom_type={dom_type}  dom_region={dom_reg}")

    clusters_out.append({
        "cluster_id":         int(cid),
        "label":              label,
        "urgency":            urgency(stf_pct),
        "req_count":          req_cnt,
        "avg_days_open":      round(avg_days, 1),
        "median_days_open":   med_days,
        "total_openings":     tot_open,
        "slow_to_fill_pct":   round(stf_pct, 1),
        "dominant_req_type":  dom_type,
        "dominant_region":    dom_reg,
        "fixed_term_pct":     round(ft_pct, 1),
        "recommended_action": action,
        "req_ids":            req_ids,
    })

CLUSTER_PATH.write_text(json.dumps({
    "optimal_k":        best_k,
    "silhouette_score": round(best_score, 4),
    "clusters":         clusters_out,
}, indent=2))

print(f"\n  Output → {CLUSTER_PATH}\n")
