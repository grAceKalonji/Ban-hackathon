import json, sys
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline

BASE_PATH = Path("public/data/base.json")
RISK_PATH = Path("public/data/risk_scores.json")
FI_PATH   = Path("public/data/feature_importance.json")

FEATURE_LABELS = {
    "req_type_clinical":"Clinical Role Type","req_type_technical":"Technical Role Type",
    "req_type_operational":"Operational Role Type","req_type_leadership":"Leadership Role Type",
    "req_type_commercial":"Commercial Role Type","req_type_other":"Other Role Type",
    "location_region_North America":"North America Region","location_region_EMEA":"EMEA Region",
    "location_region_APAC":"APAC Region","location_region_Latin America":"Latin America Region",
    "location_region_Other":"Other Region","management_level_ordinal":"Management Level",
    "is_fixed_term":"Fixed-Term Contract","is_international":"International Location",
    "openings":"Number of Openings",
}

def risk_tier(prob):
    if prob >= 0.65: return "High"
    if prob >= 0.35: return "Medium"
    return "Low"

data = json.loads(BASE_PATH.read_text())
df_all = pd.DataFrame(data["all_reqs"])
df_tv = df_all[df_all["is_true_vacancy"]].copy().reset_index(drop=True)
print(f"True vacancies: {len(df_tv)}")

cat_features = ["req_type","location_region"]
num_features = ["management_level_ordinal","is_fixed_term","is_international","openings"]

X_tv = df_tv[cat_features+num_features].copy()
X_tv["is_fixed_term"] = X_tv["is_fixed_term"].astype(int)
X_tv["is_international"] = X_tv["is_international"].astype(int)
y_tv = df_tv["slow_to_fill"].astype(int)

ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
preprocessor = ColumnTransformer(transformers=[("cat",ohe,cat_features)], remainder="passthrough")
rf = RandomForestClassifier(n_estimators=200,max_depth=6,random_state=42,class_weight="balanced")
pipe = Pipeline([("prep",preprocessor),("clf",rf)])

cv = StratifiedKFold(n_splits=5,shuffle=True,random_state=42)
cvr = cross_validate(pipe,X_tv,y_tv,cv=cv,scoring=["f1","precision","recall"])
mean_f1 = round(float(cvr["test_f1"].mean()),3)
mean_prec = round(float(cvr["test_precision"].mean()),3)
mean_rec = round(float(cvr["test_recall"].mean()),3)
print(f"CV F1:{mean_f1} Prec:{mean_prec} Rec:{mean_rec}")

pipe.fit(X_tv,y_tv)

ohe_fit = pipe.named_steps["prep"].named_transformers_["cat"]
cat_names = list(ohe_fit.get_feature_names_out(cat_features))
all_names = cat_names + num_features
importances = pipe.named_steps["clf"].feature_importances_
fi_pairs = sorted(zip(all_names,importances),key=lambda x:x[1],reverse=True)
features_out = [{"feature":n,"importance":round(float(i),4),"label":FEATURE_LABELS.get(n,n)} for n,i in fi_pairs]

X_all = df_all[cat_features+num_features].copy()
X_all["is_fixed_term"] = X_all["is_fixed_term"].astype(int)
X_all["is_international"] = X_all["is_international"].astype(int)
probs = pipe.predict_proba(X_all)[:,1]

scores_out = []
for i, row in df_all.iterrows():
    prob = float(probs[i])
    scores_out.append({
        "id":int(row["id"]),"job_requisition":str(row["job_requisition"]),
        "risk_probability":round(prob,4),
        "risk_tier":"N/A - Pipeline" if row["is_evergreen"] else risk_tier(prob),
        "days_open":int(row["days_open"]),"primary_location":str(row["primary_location"]),
        "req_type":str(row["req_type"]),"management_level":str(row["management_level"]),
        "is_evergreen":bool(row["is_evergreen"]),"location_region":str(row["location_region"]),
    })

RISK_PATH.write_text(json.dumps({"scores":scores_out,"model_performance":{"mean_f1":mean_f1,"mean_precision":mean_prec,"mean_recall":mean_rec,"cv_folds":5}},indent=2))
FI_PATH.write_text(json.dumps({"features":features_out},indent=2))
print(f"Written risk_scores.json + feature_importance.json")
