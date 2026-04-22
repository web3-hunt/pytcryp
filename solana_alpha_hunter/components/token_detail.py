from __future__ import annotations

import json

import pandas as pd
import plotly.express as px
import streamlit as st

from infrastructure.sqlite_store import SQLiteStore


def render_token_detail(store: SQLiteStore, mint_address: str) -> None:
    reports = [r for r in store.get_recent_tla_reports(200) if r["mint_address"] == mint_address]
    if not reports:
        st.info("No TLA post-mortem found for this mint.")
        return
    tla = reports[0]
    st.subheader("TLA Post-Mortem")
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Peak Gain", f"{float(tla.get('peak_mult') or 0):.1f}x")
    c2.metric("Peak at", f"{float(tla.get('peak_at_minutes') or 0):.0f} min")
    c3.metric("Optimal Entry", str(tla.get("peak_entry_window") or "n/a"))
    entry = max(float(tla.get("optimal_entry_mult") or 1), 1e-9)
    peak = float(tla.get("peak_mult") or 0)
    c4.metric("Optimal Return", f"{(peak / entry):.1f}x")
    st.write(f"**What the algorithm missed:** {tla.get('what_we_missed_text')}")
    st.write(f"**Recommendation to Learner:** {tla.get('what_would_improve')}")
    with st.expander("Edge Cases Detected"):
        st.json(json.loads(tla.get("edge_cases") or "[]"))
    with st.expander("Counterfactual Analysis"):
        st.json(json.loads(tla.get("counterfactual_score") or "{}"))
    with st.expander("TLA Snapshot History"):
        snaps = store.get_tla_snapshots(mint_address)
        if snaps:
            snap_df = pd.DataFrame(snaps)
            fig = px.line(snap_df, x="minutes_since_det", y="price_mult_so_far", title="Price Multiplier Over Time")
            fig.add_hline(y=peak, line_dash="dot", annotation_text=f"Peak {peak:.1f}x")
            st.plotly_chart(fig, use_container_width=True)
