import json, sys
from pathlib import Path
import pandas as pd

BASE_PATH     = Path("public/data/base.json")
PRESSURE_PATH = Path("public/data/pressure.json")

LABOR_FORCE = {
    "US":167,"CA":20,"GB":34,"DE":45,"NL":9,"AU":14,"NZ":2.8,
    "FR":30,"IT":25,"KR":28,"BR":107,"ZA":22,"DK":3,"CH":5,"SE":5.5,
    "FI":2.7,"ES":23,"PT":5,"TW":12,"HK":3.9,"PH":48,"CN":780,
}
COUNTRY_NAMES = {
    "US":"United States","CA":"Canada","GB":"United Kingdom","DE":"Germany",
    "NL":"Netherlands","AU":"Australia","NZ":"New Zealand","FR":"France",
    "IT":"Italy","KR":"South Korea","BR":"Brazil","ZA":"South Africa",
    "DK":"Denmark","CH":"Switzerland","SE":"Sweden","FI":"Finland",
    "ES":"Spain","PT":"Portugal","TW":"Taiwan","HK":"Hong Kong",
    "PH":"Philippines","CN":"China",
}
DEFAULT_LABOR = 10.0

def pressure_tier(score):
    if score >= 70: return "Critical"
    if score >= 40: return "High"
    if score >= 20: return "Medium"
    return "Low"

data   = json.loads(BASE_PATH.read_text())
df_all = pd.DataFrame(data["all_reqs"])
df     = df_all[df_all["is_true_vacancy"]].copy()
print(f"True vacancies: {len(df)}")

records = []
for iso, grp in df.groupby("primary_location"):
    iso = str(iso).strip()
    total_openings   = int(grp["openings"].sum())
    req_count        = int(len(grp))
    median_days_open = float(grp["days_open"].median())
    slow_count       = int(grp["slow_to_fill"].sum())
    raw_pressure     = total_openings * median_days_open
    labor            = LABOR_FORCE.get(iso, DEFAULT_LABOR)
    norm_pressure    = raw_pressure / labor
    records.append({
        "iso_code":           iso,
        "country_name":       COUNTRY_NAMES.get(iso, iso),
        "req_count":          req_count,
        "total_openings":     total_openings,
        "median_days_open":   round(median_days_open, 1),
        "slow_to_fill_count": slow_count,
        "raw_pressure":       round(raw_pressure, 2),
        "normalized_pressure":round(norm_pressure, 4),
    })

cdf = pd.DataFrame(records)
p_min, p_max = cdf["normalized_pressure"].min(), cdf["normalized_pressure"].max()
if p_max == p_min:
    cdf["pressure_score"] = 50.0
else:
    cdf["pressure_score"] = ((cdf["normalized_pressure"]-p_min)/(p_max-p_min)*100).round(2)
cdf["pressure_tier"] = cdf["pressure_score"].apply(pressure_tier)
cdf = cdf.sort_values("pressure_score", ascending=False).reset_index(drop=True)

countries_out = []
for _, row in cdf.iterrows():
    countries_out.append({
        "iso_code":            row["iso_code"],
        "country_name":        row["country_name"],
        "req_count":           int(row["req_count"]),
        "total_openings":      int(row["total_openings"]),
        "median_days_open":    float(row["median_days_open"]),
        "slow_to_fill_count":  int(row["slow_to_fill_count"]),
        "raw_pressure":        float(row["raw_pressure"]),
        "normalized_pressure": float(row["normalized_pressure"]),
        "pressure_score":      float(row["pressure_score"]),
        "pressure_tier":       row["pressure_tier"],
    })

highest      = cdf.iloc[0]["iso_code"]
critical_cnt = int((cdf["pressure_tier"]=="Critical").sum())
high_cnt     = int((cdf["pressure_tier"]=="High").sum())

PRESSURE_PATH.write_text(json.dumps({
    "countries": countries_out,
    "global_summary": {
        "highest_pressure_country": highest,
        "total_countries":          len(countries_out),
        "critical_count":           critical_cnt,
        "high_count":               high_cnt,
    }
}, indent=2))

print(f"\n{'ISO':<6} {'Country':<22} {'Score':>7} {'Tier'}")
for row in countries_out:
    print(f"{row['iso_code']:<6} {row['country_name']:<22} {row['pressure_score']:>7.1f} {row['pressure_tier']}")
print(f"\nHighest: {highest} | Critical: {critical_cnt} | High: {high_cnt}")
print(f"Written → {PRESSURE_PATH}")
