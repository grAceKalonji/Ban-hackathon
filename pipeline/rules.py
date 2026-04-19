import json, sys
from pathlib import Path
import pandas as pd

try:
    from mlxtend.frequent_patterns import apriori, association_rules
    from mlxtend.preprocessing import TransactionEncoder
except ImportError:
    print("Install mlxtend: pip install mlxtend"); sys.exit(1)

BASE_PATH  = Path("public/data/base.json")
RULES_PATH = Path("public/data/association_rules.json")

ITEM_LABELS = {
    "type_clinical":"Clinical Role","type_technical":"Technical Role",
    "type_operational":"Operational Role","type_leadership":"Leadership Role",
    "type_commercial":"Commercial Role","type_other":"Other Role Type",
    "region_North America":"North America Location","region_EMEA":"EMEA Location",
    "region_APAC":"Asia-Pacific Location","region_Latin America":"Latin America Location",
    "region_Other":"Other Region","level_Core Contributor":"Core Contributor Level",
    "level_Advanced Contributor":"Advanced Contributor Level",
    "level_Expert Contributor":"Expert Contributor Level",
    "level_Frontline Leader":"Frontline Leader Level",
    "level_Mid-Level Leader":"Mid-Level Leader Level",
    "level_Business Leader":"Business Leader Level",
    "fixed_term":"Fixed-Term Contract","international":"International Location",
    "slow_to_fill":"Slow to Fill (>90 days)",
}

def build_transactions(df):
    txns = []
    for _, row in df.iterrows():
        items = [f"type_{row['req_type']}", f"region_{row['location_region']}",
                 f"level_{str(row['management_level']).strip()}"]
        if row["is_fixed_term"]: items.append("fixed_term")
        if row["is_international"]: items.append("international")
        if row["slow_to_fill"]: items.append("slow_to_fill")
        txns.append(items)
    return txns

def plain_english(ants, confidence, lift):
    labels = [ITEM_LABELS.get(a,a) for a in ants]
    return f"When {' AND '.join(labels)}, hiring exceeds 90 days in {confidence*100:.0f}% of cases (lift: {lift:.2f})"

data = json.loads(BASE_PATH.read_text())
df = pd.DataFrame(data["all_reqs"])
df = df[df["is_true_vacancy"]].copy().reset_index(drop=True)

txns = build_transactions(df)
te = TransactionEncoder()
te_arr = te.fit_transform(txns)
te_df = pd.DataFrame(te_arr, columns=te.columns_)

freq = apriori(te_df, min_support=0.05, use_colnames=True)
print(f"Frequent itemsets: {len(freq)}")

if freq.empty:
    RULES_PATH.write_text(json.dumps({"rules":[],"total_rules_found":0,"rules_displayed":0},indent=2))
    sys.exit(0)

rules = association_rules(freq, metric="confidence", min_threshold=0.60)
total = len(rules)
rules = rules[rules["consequents"].apply(lambda x: x==frozenset({"slow_to_fill"}))]
rules = rules[rules["lift"]>=1.2]
rules = rules.sort_values("lift",ascending=False).head(10).reset_index(drop=True)

rules_out = []
for i, row in rules.iterrows():
    ants = sorted(list(row["antecedents"]))
    conf = float(row["confidence"])
    lift_val = float(row["lift"])
    sup = float(row["support"])
    ant_labels = [ITEM_LABELS.get(a,a) for a in ants]
    rules_out.append({
        "rule_id":i,"antecedents":ants,"support":round(sup,4),
        "confidence":round(conf,4),"lift":round(lift_val,4),
        "plain_english":plain_english(ants,conf,lift_val),
        "antecedent_labels":ant_labels,"confidence_pct":int(round(conf*100)),
        "lift_rounded":round(lift_val,2),
    })
    print(f"Rule {i+1}: {' AND '.join(ant_labels)} → conf={conf*100:.0f}% lift={lift_val:.2f}")

RULES_PATH.write_text(json.dumps({"rules":rules_out,"total_rules_found":total,"rules_displayed":len(rules_out)},indent=2))
print(f"Written → {RULES_PATH}")
