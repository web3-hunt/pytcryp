from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from statistics import mean, median
from pathlib import Path

from config import REPORTS_DIR
from infrastructure.sqlite_store import SQLiteStore


def generate_daily_report(store: SQLiteStore) -> str:
    rows = store.get_recent_tla_reports(500)
    today = datetime.utcnow().date().isoformat()
    correct = sum(1 for r in rows if not r.get("was_missed") and not r.get("was_false_positive"))
    missed = sum(int(r.get("was_missed") or 0) for r in rows)
    fps = sum(int(r.get("was_false_positive") or 0) for r in rows)
    edge_counter = Counter()
    for r in rows:
        edge_counter.update(json.loads(r.get("edge_cases") or "[]"))
    top_edge = edge_counter.most_common(1)[0] if edge_counter else ("none", 0)
    optimal_returns = []
    entry_minutes = []
    hold_minutes = []
    for r in rows:
        entry = float(r.get("optimal_entry_mult") or 1.0)
        exit_ = float(r.get("optimal_exit_mult") or 1.0)
        optimal_returns.append(exit_ / max(entry, 1e-9))
        hold_minutes.append(float(r.get("optimal_hold_minutes") or 0.0))
        try:
            mid = int((r.get("peak_entry_window") or "minutes 0-0").split(" ")[1].split("-")[0])
            entry_minutes.append(mid)
        except Exception:
            pass
    roadmap = store.get_tla_recommendation_roadmap()[:5]
    edge_rows = edge_counter.most_common(10)
    lines = [
        f"# Solana Alpha Hunter Daily Report ({today})",
        "",
        "## Section 8: Token Lifecycle Intelligence - From the TLA Crew",
        f"TLA crew filed {len(rows)} post-mortems. Correct calls: {correct}. Missed: {missed}. False positives: {fps}.",
        "",
        "### 8b. Optimal Trade Windows",
        (
            f"Median entry minute: {median(entry_minutes) if entry_minutes else 0:.0f}. "
            f"Median hold: {median(hold_minutes) if hold_minutes else 0:.0f} min. "
            f"Average optimal return: {mean(optimal_returns) if optimal_returns else 0:.1f}x."
        ),
        "",
        "| Token | Entry Window | Hold Time | Return if Optimal | Our Score |",
        "|---|---|---:|---:|---:|",
    ]
    for r in rows[:10]:
        entry = float(r.get("optimal_entry_mult") or 1.0)
        exit_ = float(r.get("optimal_exit_mult") or 1.0)
        lines.append(
            f"| {r.get('token_name') or r.get('mint_address','')[:8]} | {r.get('peak_entry_window') or 'n/a'} | "
            f"{float(r.get('optimal_hold_minutes') or 0):.0f} min | {exit_/max(entry,1e-9):.1f}x | {int(r.get('our_score') or 0)} |"
        )
    lines.extend(
        [
            "",
        "### Edge Cases Logged Today",
        f"Most common edge case: {top_edge[0]} ({top_edge[1]} occurrences).",
        "",
            "| Edge Case | Count |",
            "|---|---:|",
        ]
    )
    for name, count in edge_rows:
        lines.append(f"| {name} | {count} |")
    lines.extend(
        [
            "",
        "### Micro-Insights Applied Today",
        "Bias corrections were applied by TLA Trainer during runtime if triggered.",
        "",
        "## Section 9: System Improvement Roadmap",
        "Top requested improvements come from what_would_improve text frequency in TLA reports.",
            "",
            "| Priority | Improvement | TLA Reports | Est Impact |",
            "|---:|---|---:|---|",
        ]
    )
    for row in roadmap:
        lines.append(
            f"| {row['priority']} | {row['improvement']} | {row['tla_reports']} | {row['est_impact']} |"
        )
    Path(REPORTS_DIR).mkdir(parents=True, exist_ok=True)
    path = Path(REPORTS_DIR) / f"{today}_report.md"
    path.write_text("\n".join(lines), encoding="utf-8")
    return str(path)
