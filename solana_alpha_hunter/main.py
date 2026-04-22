from __future__ import annotations

import asyncio
import json

import pandas as pd
import plotly.express as px
import streamlit as st
from streamlit_autorefresh import st_autorefresh

from agents.learner_agent import LearnerAgent
from agents.supervisor import live_status_rows, spawn_tla
from agents.tla_trainer import TLATrainer
from domain.prediction_engine import PredictionEngine
from infrastructure.scheduler import build_scheduler
from infrastructure.sqlite_store import SQLiteStore

st.set_page_config(page_title="Solana Alpha Hunter v5.0", layout="wide")

if "scheduler_started" not in st.session_state:
    st.session_state.scheduler_started = False
if "store" not in st.session_state:
    st.session_state.store = SQLiteStore()
if "engine" not in st.session_state:
    st.session_state.engine = PredictionEngine()
if "learner" not in st.session_state:
    st.session_state.learner = LearnerAgent(st.session_state.store)
if "tla_trainer" not in st.session_state:
    st.session_state.tla_trainer = TLATrainer()
if "scheduler" not in st.session_state:
    st.session_state.scheduler = build_scheduler()

store: SQLiteStore = st.session_state.store
engine: PredictionEngine = st.session_state.engine
learner: LearnerAgent = st.session_state.learner
tla_trainer: TLATrainer = st.session_state.tla_trainer
scheduler = st.session_state.scheduler

if not st.session_state.scheduler_started:
    def _run_coro(coro):
        try:
            asyncio.run(coro)
        except RuntimeError:
            loop = asyncio.new_event_loop()
            loop.run_until_complete(coro)
            loop.close()

    scheduler.add_job(lambda: _run_coro(learner.run_momentum_rescan()), "interval", minutes=5, id="momentum")
    scheduler.add_job(lambda: _run_coro(learner.check_retrain_trigger()), "interval", minutes=60, id="retrain")
    scheduler.add_job(
        lambda: _run_coro(tla_trainer.run_cycle(store, engine, learner)), "interval", minutes=30, id="tla_trainer"
    )
    scheduler.add_job(lambda: _run_coro(learner.generate_daily_report()), "cron", hour=0, minute=0, id="report")
    scheduler.start()
    st.session_state.scheduler_started = True

st_autorefresh(interval=60_000, key="refresh")
st.title("Solana Alpha Hunter v5.0")

tabs = st.tabs(
    [
        "Hall of Fame",
        "DexTrends",
        "Live Feed",
        "Watchlist",
        "Predictions",
        "TLA Intelligence",
        "Performance",
        "Daily Report",
        "Settings",
    ]
)

with tabs[5]:
    st.subheader("Token Lifecycle Intelligence")
    c1, c2, c3, c4 = st.columns(4)
    recent_reports = store.get_recent_tla_reports(200)
    status_rows = live_status_rows()
    c1.metric("Active TLAs", len(status_rows))
    c2.metric("Post-mortems filed", len(recent_reports))
    c3.metric("Micro-insights applied", len(store.get_unapplied_insights()))
    correct = sum(1 for r in recent_reports if not r.get("was_missed") and not r.get("was_false_positive"))
    c4.metric("Correct calls", f"{(correct / max(len(recent_reports), 1)):.0%}")

    st.markdown("### Spawn TLA (manual)")
    mint = st.text_input("Mint address", value="")
    token_name = st.text_input("Token name", value="ManualToken")
    if st.button("Spawn TLA"):
        payload = {
            "token_name": token_name,
            "price_usd": 1e-6,
            "holder_count": 20,
            "bonding_pct": 30.0,
            "dna_label": "Organic",
            "composite_score": 70,
            "predicted_mult": 4.0,
            "prob_5x": 0.42,
        }
        asyncio.run(spawn_tla(mint, payload, store))
        st.success(f"TLA spawned for {mint}")

    st.markdown("### Live TLA Status")
    st.dataframe(pd.DataFrame(status_rows), use_container_width=True, hide_index=True)

    st.markdown("### Recent Post-Mortems")
    rep_df = pd.DataFrame(recent_reports)
    st.dataframe(rep_df, use_container_width=True, hide_index=True)
    if not rep_df.empty and "edge_cases" in rep_df.columns:
        edges = []
        for raw in rep_df["edge_cases"].dropna().tolist():
            try:
                edges.extend(json.loads(raw))
            except Exception:
                pass
        if edges:
            edge_df = pd.DataFrame(pd.Series(edges).value_counts()).reset_index()
            edge_df.columns = ["edge_case", "count"]
            st.plotly_chart(px.bar(edge_df, x="edge_case", y="count"), use_container_width=True)
    if not rep_df.empty and {"peak_at_minutes", "peak_mult", "our_score"}.issubset(rep_df.columns):
        st.plotly_chart(
            px.scatter(rep_df, x="peak_at_minutes", y="peak_mult", color="our_score", hover_data=["mint_address"]),
            use_container_width=True,
        )
    st.markdown("### Algorithm Improvement Roadmap")
    roadmap_df = pd.DataFrame(store.get_tla_recommendation_roadmap())
    st.dataframe(roadmap_df, use_container_width=True, hide_index=True)

with tabs[3]:
    st.subheader("Watchlist")
    st.dataframe(pd.DataFrame(store.get_watchlist()), use_container_width=True, hide_index=True)

with tabs[6]:
    st.subheader("Performance")
    edge_df = pd.DataFrame(store.get_tla_edge_case_counts())
    if not edge_df.empty:
        st.plotly_chart(px.bar(edge_df, x="edge_case", y="count"), use_container_width=True)
    else:
        st.info("No edge case data yet.")

with tabs[7]:
    st.subheader("Daily Report")
    if st.button("Generate report now"):
        path = asyncio.run(learner.generate_daily_report())
        st.success(f"Report generated: {path}")

with tabs[8]:
    st.subheader("Settings")
    if st.button("Run TLA Trainer cycle"):
        result = asyncio.run(tla_trainer.run_cycle(store, engine, learner))
        st.write(result)
