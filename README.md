# CampaignIQ — Customer Campaign Analytics Dashboard

A full-stack analytics dashboard built with **Python (Flask)** backend and vanilla JS + Chart.js frontend.
Uses the real **Kaggle Marketing Campaign dataset** (2,240 customers, UCI ML Repository).

---

## Project Structure

```
campaigniq/
├── backend/
│   ├── app.py            # Flask API server (all /api/* routes)
│   ├── fetch_data.py     # Downloads dataset (Kaggle API or direct URL)
│   └── data/             # Created automatically — stores the CSV
├── frontend/
│   ├── templates/
│   │   └── index.html    # Main dashboard page
│   └── static/
│       ├── css/style.css
│       └── js/main.js    # Fetches from Flask API, renders all charts
├── requirements.txt
└── README.md
```

---

## Setup & Run

### 1. Clone / open the project folder

```bash
cd campaigniq
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Mac / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Download the dataset

```bash
python backend/fetch_data.py
```

This script tries two methods in order:

**Method A — Kaggle API** (optional, gets the official file):
- Sign in at [kaggle.com](https://kaggle.com) → Account → Create API Token
- Place the downloaded `kaggle.json` in `~/.kaggle/kaggle.json`
- Re-run `python backend/fetch_data.py`

**Method B — Direct GitHub mirror** (automatic fallback, no login needed):
- Downloads automatically if Kaggle credentials are not set up
- Same dataset, same columns

### 5. Start the Flask server

```bash
python backend/app.py
```

### 6. Open the dashboard

```
http://localhost:5000
```

---

## API Endpoints

All endpoints accept optional query params: `?edu=Graduation&kid=0`

| Endpoint | Description |
|---|---|
| `GET /api/kpis` | Total customers, response rate, avg income, avg spend |
| `GET /api/campaigns` | Acceptance % for each of 6 campaigns |
| `GET /api/channels` | Web / Store / Catalog purchase counts |
| `GET /api/funnel` | Conversion funnel stages with % |
| `GET /api/spend` | Avg spend per product category |
| `GET /api/education` | Response rate broken down by education level |
| `GET /api/income` | Customer count per income band |
| `GET /api/top-spenders` | Top 10 highest-spending customers |
| `GET /api/export` | Download filtered data as CSV |
| `GET /api/info` | Dataset metadata |

---

## Dataset

**Source:** [Kaggle — Marketing Campaign](https://www.kaggle.com/datasets/rodsaldanha/arketing-campaign)  
**Origin:** UCI Machine Learning Repository  
**Records:** 2,240 customers  
**Key columns:** `Income`, `Education`, `AcceptedCmp1–5`, `Response`, `MntWines`, `MntMeat`, `NumWebPurchases`, `NumStorePurchases`, etc.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask, Pandas |
| Frontend | HTML, CSS, Vanilla JS, Chart.js |
| Data | Kaggle Marketing Campaign CSV |
| API | REST JSON endpoints |

---
