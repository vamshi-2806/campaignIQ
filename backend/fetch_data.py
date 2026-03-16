"""
fetch_data.py — Downloads the Marketing Campaign dataset.

Two methods (tried in order):
  1. Kaggle API  — requires ~/.kaggle/kaggle.json  (free account)
  2. Direct URL  — raw GitHub mirror of the same dataset (no login needed)

Run once before starting the app:
    python backend/fetch_data.py
"""

import os
import sys
import urllib.request

DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "marketing_campaign.csv")

GITHUB_URL = (
    "https://raw.githubusercontent.com/"
    "amankharwal/Website-data/master/marketing_campaign.csv"
)

KAGGLE_DATASET = "rodsaldanha/arketing-campaign"
KAGGLE_FILE    = "marketing_campaign.csv"


def already_exists():
    if os.path.exists(DATA_FILE):
        size_kb = os.path.getsize(DATA_FILE) // 1024
        print(f"  Dataset already present ({size_kb} KB) — skipping download.")
        print(f"  Delete {DATA_FILE} and re-run to force a fresh download.")
        return True
    return False


def try_kaggle():
    """Download via Kaggle API if credentials exist."""
    try:
        from kaggle.api.kaggle_api_extended import KaggleApiClient
        import kaggle  # noqa: F401
    except ImportError:
        print("  [kaggle] kaggle package not installed — skipping.")
        return False
    except OSError as e:
        print(f"  [kaggle] Credentials not found ({e}) — skipping.")
        return False

    cred_path = os.path.expanduser("~/.kaggle/kaggle.json")
    if not os.path.exists(cred_path):
        print("  [kaggle] ~/.kaggle/kaggle.json not found — skipping.")
        print("  To use Kaggle API: sign in at kaggle.com → Account → Create API Token")
        return False

    try:
        import kaggle
        kaggle.api.authenticate()
        print(f"  [kaggle] Downloading {KAGGLE_DATASET} ...")
        kaggle.api.dataset_download_file(
            KAGGLE_DATASET,
            file_name=KAGGLE_FILE,
            path=DATA_DIR,
            force=True,
            quiet=False,
        )
        # Kaggle sometimes zips the file
        zip_path = DATA_FILE + ".zip"
        if os.path.exists(zip_path):
            import zipfile
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(DATA_DIR)
            os.remove(zip_path)

        if os.path.exists(DATA_FILE):
            print(f"  [kaggle] Saved to {DATA_FILE}")
            return True

    except Exception as e:
        print(f"  [kaggle] Failed: {e}")

    return False


def try_github():
    """Direct download from GitHub mirror (no login required)."""
    print(f"  [github] Downloading from {GITHUB_URL} ...")
    try:
        req = urllib.request.Request(
            GITHUB_URL,
            headers={"User-Agent": "Mozilla/5.0"}
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()

        with open(DATA_FILE, "wb") as f:
            f.write(data)

        size_kb = len(data) // 1024
        print(f"  [github] Saved to {DATA_FILE} ({size_kb} KB)")
        return True

    except Exception as e:
        print(f"  [github] Failed: {e}")
        return False


def validate():
    """Quick sanity check on the downloaded file."""
    import csv
    with open(DATA_FILE, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    required = ["ID", "Income", "Education", "Response",
                "AcceptedCmp1", "MntWines", "NumWebPurchases"]
    headers = list(rows[0].keys()) if rows else []
    missing = [c for c in required if c not in headers]

    if missing:
        print(f"  [validate] WARNING — missing columns: {missing}")
        print(f"  [validate] Found columns: {headers[:10]}...")
        return False

    print(f"  [validate] {len(rows)} rows, {len(headers)} columns — looks good.")
    return True


def main():
    print("\n=== CampaignIQ — Dataset Fetcher ===\n")

    os.makedirs(DATA_DIR, exist_ok=True)

    if already_exists():
        validate()
        print("\nReady. Start the app with:  python backend/app.py\n")
        return

    success = try_kaggle() or try_github()

    if not success:
        print("\n  Both download methods failed.")
        print("  Please manually download the dataset from:")
        print(f"    https://www.kaggle.com/datasets/{KAGGLE_DATASET}")
        print(f"  and place 'marketing_campaign.csv' in:  {DATA_DIR}/\n")
        sys.exit(1)

    if validate():
        print("\nDataset ready. Start the app with:  python backend/app.py\n")
    else:
        print("\nFile downloaded but validation failed — check the file manually.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
