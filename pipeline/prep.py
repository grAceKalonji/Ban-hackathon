"""
prep.py — Clean real IDEXX CSV, engineer features, export base.json.
Run from the idexx-hackathon/ project root:
    python pipeline/prep.py
"""

import json, re, sys
from pathlib import Path
import pandas as pd

CSV_PATH = Path("data/Open_Reqs_Mar_2026.csv")
OUT_PATH = Path("public/data/base.json")

REQ_TYPE_RULES = [
    ("clinical",    ["Pathologist","Laboratory Technician","Specimen","Veterinary","Medical","Clinical","Scientist","PCR","Assay"]),
    ("technical",   ["Developer","Engineer","Software","Security","IT","Application","Data","Architect"]),
    ("operational", ["Transportation","Logistics","Production","Specialist","Field","Support","Coordinator"]),
    ("leadership",  ["Director","Manager","VP","Head","Chief","Senior Manager"]),
    ("commercial",  ["Sales","Marketing","Commercial","Account","Consultant"]),
]
MANAGEMENT_ORDINALS = {
    "Core Contributor":1,"Advanced Contributor":2,"Expert Contributor":3,
    "Frontline Leader":4,"Mid-Level Leader":5,"Business Leader":6,
}
REGION_MAP = {
    "US":"North America","CA":"North America","BR":"Latin America",
    "GB":"EMEA","DE":"EMEA","NL":"EMEA","FR":"EMEA","IT":"EMEA","DK":"EMEA",
    "CH":"EMEA","SE":"EMEA","FI":"EMEA","ES":"EMEA","PT":"EMEA","ZA":"EMEA",
    "AU":"APAC","NZ":"APAC","KR":"APAC","TW":"APAC","HK":"APAC","CN":"APAC","PH":"APAC",
}
FIXED_TERM_PATTERNS = ["Fixed Term","Temporary","Intern","Casual","Agency Contractor"]

def parse_days(val):
    m = re.search(r"(\d+)", str(val))
    return float(m.group(1)) if m else None

def classify_req_type(profile):
    p = str(profile).lower()
    for rt, kws in REQ_TYPE_RULES:
        if any(k.lower() in p for k in kws): return rt
    return "other"

def is_fixed_term(sub_type):
    s = str(sub_type)
    return any(pat.lower() in s.lower() for pat in FIXED_TERM_PATTERNS)

df = pd.read_csv(CSV_PATH)
print(f"Raw rows: {len(df)}  |  Columns: {list(df.columns)}")

# Rename to match pipeline expectations
df = df.rename(columns={
    "JOB_REQUISITION":                  "JOB_REQUISITION_NAME",
    "MANAGEMENT_LEVEL_JOB_REQUISITION": "MANAGEMENT_LEVEL",
})

df["DAYS_OPEN"] = df["DAYS_OPEN"].apply(parse_days)
df = df.dropna(subset=["DAYS_OPEN"])
df["DAYS_OPEN"] = df["DAYS_OPEN"].astype(int)

df["is_evergreen"]     = df["NUMBER_OF_OPENINGS_AVAILABLE"] == 0
df["is_true_vacancy"]  = df["NUMBER_OF_OPENINGS_AVAILABLE"] > 0
df["slow_to_fill"]     = df["DAYS_OPEN"] > 90
df["is_fixed_term"]    = df["WORKER_SUB_TYPE"].apply(is_fixed_term)
df["is_international"] = df["PRIMARY_LOCATION"].str.strip() != "US"
df["req_type"]         = df["JOB_PROFILE"].apply(classify_req_type)
df["management_level_ordinal"] = (
    df["MANAGEMENT_LEVEL"].fillna("").str.strip()
    .map(MANAGEMENT_ORDINALS).fillna(0).astype(int)
)
df["location_region"] = df["PRIMARY_LOCATION"].str.strip().map(REGION_MAP).fillna("Other")

all_reqs = []
for idx, row in df.reset_index(drop=True).iterrows():
    all_reqs.append({
        "id": int(idx),
        "job_requisition":          str(row.get("JOB_REQUISITION_NAME","")),
        "worker_sub_type":          str(row.get("WORKER_SUB_TYPE","")),
        "days_open":                int(row["DAYS_OPEN"]),
        "primary_location":         str(row.get("PRIMARY_LOCATION","")),
        "job_profile":              str(row.get("JOB_PROFILE","")),
        "management_level":         str(row.get("MANAGEMENT_LEVEL","")),
        "openings":                 int(row.get("NUMBER_OF_OPENINGS_AVAILABLE",0)),
        "is_evergreen":             bool(row["is_evergreen"]),
        "is_true_vacancy":          bool(row["is_true_vacancy"]),
        "slow_to_fill":             bool(row["slow_to_fill"]),
        "is_fixed_term":            bool(row["is_fixed_term"]),
        "is_international":         bool(row["is_international"]),
        "req_type":                 row["req_type"],
        "management_level_ordinal": int(row["management_level_ordinal"]),
        "location_region":          row["location_region"],
    })

tv = df[df["is_true_vacancy"]]
summary = {
    "total_reqs":         len(df),
    "true_vacancies":     int(df["is_true_vacancy"].sum()),
    "evergreen_reqs":     int(df["is_evergreen"].sum()),
    "slow_to_fill_count": int(tv["slow_to_fill"].sum()),
    "slow_to_fill_pct":   round(tv["slow_to_fill"].mean()*100,1) if len(tv) else 0.0,
    "max_days_open":      int(df["DAYS_OPEN"].max()),
    "median_days_open":   float(df["DAYS_OPEN"].median()),
    "mean_days_open":     round(float(df["DAYS_OPEN"].mean()),1),
    "countries_count":    int(df["PRIMARY_LOCATION"].nunique()),
    "req_type_counts":    {k:int(v) for k,v in df["req_type"].value_counts().to_dict().items()},
}

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
OUT_PATH.write_text(json.dumps({"all_reqs":all_reqs,"summary":summary},indent=2))

print(f"\n── Summary ────────────────────────────────────────────────────")
for k,v in summary.items():
    print(f"  {k}: {v}")
ft = sum(1 for r in all_reqs if r["is_fixed_term"])
print(f"  fixed_term_roles: {ft}")
print(f"\n  Output → {OUT_PATH}\n")
