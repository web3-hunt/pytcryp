# Deployment Guide

This guide covers local deployment and Replit deployment for `solana_alpha_hunter`.

## 1) Prerequisites

- Python `3.12.x` (required)
- `pip` and virtualenv
- A Helius API key
- (Optional) Telegram bot token/chat id

## 2) Environment Variables

Set these before running:

- `HELIUS_API_KEY`
- `TELEGRAM_BOT_TOKEN` (optional)
- `TELEGRAM_CHAT_ID` (optional)
- `TEST_MODE` (`false` in production)

PowerShell example:

```powershell
$env:HELIUS_API_KEY="your_key"
$env:TELEGRAM_BOT_TOKEN="your_bot_token"
$env:TELEGRAM_CHAT_ID="your_chat_id"
$env:TEST_MODE="false"
```

## 3) Local Run (Windows/macOS/Linux)

1. Create and activate a Python 3.12 virtual environment.
2. Install dependencies.
3. Start Streamlit.

```bash
cd solana_alpha_hunter
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
streamlit run main.py --server.port 8080 --server.headless true
```

Open `http://localhost:8080`.

## 4) Replit Deployment

This project already includes:

- `.replit`
- `replit.nix`

Steps:

1. Import repo into Replit.
2. Add Secrets:
   - `HELIUS_API_KEY`
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_CHAT_ID` (optional)
   - `TEST_MODE=false`
3. Replit runs:

```bash
streamlit run main.py --server.port 8080 --server.headless true
```

4. Click **Deploy** in Replit to publish.

## 4.1) Railway Deployment (recommended for Streamlit app)

1. Create a new Railway project and connect your GitHub repo.
2. In service settings, set **Root Directory** to:
   - `solana_alpha_hunter`
3. Confirm Railway detects:
   - `railway.json`
   - `nixpacks.toml`
   - `runtime.txt`
4. Add Variables:
   - `HELIUS_API_KEY`
   - `TELEGRAM_BOT_TOKEN` (optional)
   - `TELEGRAM_CHAT_ID` (optional)
   - `TEST_MODE=false`
5. Deploy.

### If build fails again

- Open Railway service → **Deployments** → failed deployment → **View Logs**.
- Check:
  - **Build Logs**: package install / Python version errors.
  - **Runtime Logs**: app start command / Streamlit startup errors.
- Most common fix: wrong Root Directory (must be `solana_alpha_hunter`).

## 5) Validation Checklist

Run from `solana_alpha_hunter/`:

```bash
python -m compileall .
python -c "from agents.token_lifecycle_agent import TokenLifecycleAgent; print('OK')"
python -c "from agents.tla_trainer import TLATrainer; print('OK')"
python -c "from domain.daily_report import generate_daily_report; print('OK')"
python -c "import main; print('OK')"
```

## 6) First-Run Operational Checks

- Confirm `alpha_hunter.db` appears in project root.
- Open **TLA Intelligence** tab.
- Spawn one manual TLA from UI.
- Run **TLA Trainer cycle** in Settings.
- Generate a daily report and verify file under `reports/`.

## 7) Notes

- SQLite runs in WAL mode automatically.
- Scheduler start is guarded by `st.session_state["scheduler_started"]`.
- If native ML wheels fail on a platform, use Python 3.12 and re-install.
- Railway dashboard links:
  - Service logs: Railway project → service → Deployments → latest deployment
  - Live app URL: Railway project → service → Settings / Domains
