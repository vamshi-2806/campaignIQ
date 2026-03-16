from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import pandas as pd
import os

app = Flask(
    __name__,
    static_folder="../frontend/static",
    template_folder="../frontend/templates"
)
CORS(app)

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "marketing_campaign.csv")
df_cache = None


def load_data():
    global df_cache
    if df_cache is not None:
        return df_cache

    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            "Dataset not found. Please run: python backend/fetch_data.py"
        )

    df = pd.read_csv(DATA_PATH, sep=";")
    df.dropna(subset=["Income"], inplace=True)
    df["TotalSpend"] = (
        df["MntWines"] + df["MntFruits"] + df["MntMeatProducts"] +
        df["MntFishProducts"] + df["MntSweetProducts"] + df["MntGoldProds"]
    )
    df["TotalPurchases"] = (
        df["NumWebPurchases"] + df["NumStorePurchases"] + df["NumCatalogPurchases"]
    )
    df["AnyEngaged"] = (
        df[["AcceptedCmp1","AcceptedCmp2","AcceptedCmp3","AcceptedCmp4","AcceptedCmp5"]].sum(axis=1) > 0
    ).astype(int)
    df_cache = df
    return df


def apply_filters(df, edu=None, kid=None):
    if edu and edu != "All":
        df = df[df["Education"] == edu]
    if kid == "0":
        df = df[df["Kidhome"] == 0]
    elif kid == "1+":
        df = df[df["Kidhome"] > 0]
    return df


# ── Serve frontend ─────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("../frontend/templates", "index.html")


# ── API: KPIs ──────────────────────────────────────────────────────
@app.route("/api/kpis")
def kpis():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    n = len(df)
    responded = int(df["Response"].sum())
    return jsonify({
        "total_customers":  n,
        "responded":        responded,
        "response_rate":    round((responded / n) * 100, 1),
        "avg_income":       round(df["Income"].mean(), 0),
        "avg_spend":        round(df["TotalSpend"].mean(), 0),
    })


# ── API: Campaign acceptance rates ────────────────────────────────
@app.route("/api/campaigns")
def campaigns():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    n = len(df)
    keys = ["AcceptedCmp1","AcceptedCmp2","AcceptedCmp3","AcceptedCmp4","AcceptedCmp5","Response"]
    labels = ["Campaign 1","Campaign 2","Campaign 3","Campaign 4","Campaign 5","Last Campaign"]
    rates = [round((df[k].sum() / n) * 100, 2) for k in keys]
    return jsonify({"labels": labels, "rates": rates})


# ── API: Channel mix ───────────────────────────────────────────────
@app.route("/api/channels")
def channels():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    return jsonify({
        "Web":     int(df["NumWebPurchases"].sum()),
        "Store":   int(df["NumStorePurchases"].sum()),
        "Catalog": int(df["NumCatalogPurchases"].sum()),
    })


# ── API: Funnel ────────────────────────────────────────────────────
@app.route("/api/funnel")
def funnel():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    n = len(df)
    engaged   = int(df["AnyEngaged"].sum())
    purchased = int((df["TotalSpend"] > 0).sum())
    converted = int(df["Response"].sum())
    return jsonify([
        {"label": "Total Customers",         "value": n,         "pct": 100.0},
        {"label": "Engaged (any campaign)",  "value": engaged,   "pct": round((engaged/n)*100,1)},
        {"label": "Made a Purchase",         "value": purchased, "pct": round((purchased/n)*100,1)},
        {"label": "Converted (last cmp)",    "value": converted, "pct": round((converted/n)*100,1)},
    ])


# ── API: Spend by category ─────────────────────────────────────────
@app.route("/api/spend")
def spend():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    cats = {
        "Wines": "MntWines", "Meat": "MntMeatProducts", "Fish": "MntFishProducts",
        "Fruits": "MntFruits", "Sweet": "MntSweetProducts", "Gold": "MntGoldProds"
    }
    return jsonify({k: round(df[v].mean(), 1) for k, v in cats.items()})


# ── API: Response rate by education ───────────────────────────────
@app.route("/api/education")
def education():
    df = load_data()  # always full dataset for this breakdown
    result = (
        df.groupby("Education")["Response"]
        .agg(total="count", responded="sum")
        .assign(rate=lambda x: (x["responded"] / x["total"] * 100).round(1))
        .reset_index()
        .sort_values("Education")
    )
    return jsonify({
        "labels": result["Education"].tolist(),
        "rates":  result["rate"].tolist(),
        "totals": result["total"].tolist(),
    })


# ── API: Income distribution ───────────────────────────────────────
@app.route("/api/income")
def income():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    bins   = [0, 20000, 40000, 60000, 80000, 100000, float("inf")]
    labels = ["<20k", "20-40k", "40-60k", "60-80k", "80-100k", ">100k"]
    counts = pd.cut(df["Income"], bins=bins, labels=labels).value_counts().reindex(labels).fillna(0)
    return jsonify({"labels": labels, "counts": counts.astype(int).tolist()})


# ── API: Top spenders ──────────────────────────────────────────────
@app.route("/api/top-spenders")
def top_spenders():
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    top = df.nlargest(10, "TotalSpend")[["ID", "TotalSpend", "Education", "Income"]].copy()
    return jsonify(top.to_dict(orient="records"))


# ── API: Export CSV ────────────────────────────────────────────────
@app.route("/api/export")
def export():
    from flask import Response
    df = apply_filters(load_data(), request.args.get("edu"), request.args.get("kid"))
    csv_data = df.to_csv(index=False)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=campaigniq_export.csv"}
    )


# ── API: Dataset info ──────────────────────────────────────────────
@app.route("/api/info")
def info():
    df = load_data()
    return jsonify({
        "total_rows":   len(df),
        "columns":      len(df.columns),
        "source":       "Kaggle — Marketing Campaign Dataset",
        "kaggle_url":   "https://www.kaggle.com/datasets/rodsaldanha/arketing-campaign",
        "education_options": sorted(df["Education"].unique().tolist()),
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
