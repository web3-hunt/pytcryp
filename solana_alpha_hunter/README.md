# Solana Alpha Hunter v5.0

Self-improving Solana token intelligence system with:

- Per-token `TokenLifecycleAgent` (24h lifecycle monitoring)
- `TLATrainer` micro-corrections every 30 minutes
- Learner pipeline + daily markdown reporting
- Streamlit dashboard including **TLA Intelligence** tab

## Quick Start

See full deployment steps in [`DEPLOYMENT.md`](DEPLOYMENT.md).

```bash
cd solana_alpha_hunter
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
streamlit run main.py --server.port 8080 --server.headless true
```

## Core Paths

- `agents/token_lifecycle_agent.py`
- `agents/tla_trainer.py`
- `agents/learner_agent.py`
- `domain/prediction_engine.py`
- `domain/daily_report.py`
- `infrastructure/sqlite_store.py`
