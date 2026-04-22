from __future__ import annotations

import json
from contextlib import contextmanager
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from config import DB_PATH


DDL_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS launches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT UNIQUE NOT NULL,
        token_name TEXT, token_symbol TEXT, program_source TEXT, creator_wallet TEXT,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        detected_mcap REAL, current_mcap REAL, gain_pct REAL, ath_gain_pct REAL,
        bonding_curve_pct REAL, holder_count INTEGER, holder_grade TEXT,
        dna_label TEXT, dna_confidence REAL, dna_breakdown TEXT,
        composite_score INTEGER, predicted_mult REAL, prob_5x REAL, status TEXT,
        narrative TEXT, gmgn_link TEXT, dextools_link TEXT, birdeye_link TEXT,
        label_realized REAL, label_set_at TIMESTAMP, last_rescanned TIMESTAMP,
        tla_active INTEGER DEFAULT 1, tla_completed INTEGER DEFAULT 0,
        hour_of_detection INTEGER, day_of_week INTEGER, market_session INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS feature_vectors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        snapshot_type TEXT, gini REAL, nakamoto REAL, entropy REAL, holder_count INTEGER,
        holder_vel_1h REAL, holder_accel REAL, volume_24h REAL, volume_vel REAL,
        bundle_fire REAL, sm_centrality REAL, cluster_mod REAL, wallet_age_score REAL,
        bonding_pct REAL, lp_burn INTEGER, mint_disabled INTEGER, freeze_disabled INTEGER,
        jupiter_verified INTEGER, creator_launches INTEGER, time_since_det REAL,
        detected_mcap REAL, real_buy_pct REAL, bayesian_score REAL,
        hour_of_detection INTEGER, day_of_week INTEGER, market_session INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS training_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, feature_id INTEGER, realized_gain REAL NOT NULL,
        label_source TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tla_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        minutes_since_det REAL, current_price_usd REAL, current_mcap REAL,
        holder_count INTEGER, volume_1h REAL, volume_cumulative REAL,
        price_mult_so_far REAL, holder_vel_now REAL, buy_sell_ratio REAL,
        large_sell_detected INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tla_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, token_name TEXT, written_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        peak_mult REAL, peak_at_minutes REAL, final_mult_24h REAL, rug_detected INTEGER, rug_at_minutes REAL,
        our_score INTEGER, our_predicted_mult REAL, our_prob_5x REAL, actual_mult REAL, prediction_error REAL,
        was_5x INTEGER, was_10x INTEGER, was_missed INTEGER, was_false_positive INTEGER,
        peak_entry_window TEXT, optimal_entry_mult REAL, optimal_exit_mult REAL, optimal_hold_minutes REAL,
        missed_signal TEXT, edge_cases TEXT, feature_deltas TEXT, strongest_signal TEXT, weakest_signal TEXT,
        dna_label_at_det TEXT, dna_was_correct INTEGER, counterfactual_score TEXT, what_we_missed_text TEXT,
        what_would_improve TEXT, smart_money_was_right INTEGER, sybil_sold_early INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS learner_journal (
        id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL,
        total_detections INTEGER, strong_alpha_count INTEGER, watch_count INTEGER, skip_count INTEGER,
        labeled_count INTEGER, tla_reports_read INTEGER, precision_5x REAL, brier_score REAL, mae_multiplier REAL,
        training_rows INTEGER, top_feature TEXT, pattern_learned TEXT, best_call_mint TEXT, best_call_mult REAL,
        worst_miss_mint TEXT, worst_miss_note TEXT, edge_cases_noted TEXT, model_version_id INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS hall_of_fame (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, token_name TEXT, token_symbol TEXT, detected_at TIMESTAMP,
        detected_mcap REAL, peak_mcap REAL, peak_mult REAL, peak_at TIMESTAMP,
        composite_score_at_detection INTEGER, predicted_mult REAL, prob_5x REAL, dna_label TEXT,
        gmgn_link TEXT, inducted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS dextrends_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mint_address TEXT NOT NULL, token_name TEXT, token_symbol TEXT, pair_address TEXT,
        source TEXT, trending_rank INTEGER, scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dna_label TEXT, dna_confidence REAL, dna_breakdown TEXT, composite_score INTEGER,
        predicted_mult REAL, prob_5x REAL, funding_summary TEXT, gmgn_link TEXT,
        dextools_link TEXT, already_detected INTEGER DEFAULT 0, narrative TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS wallet_funding (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wallet_address TEXT NOT NULL, mint_address TEXT NOT NULL, funding_wallet TEXT,
        funding_type TEXT, funding_slot INTEGER, funding_amount_sol REAL, wallet_age_days INTEGER,
        is_smart_money INTEGER DEFAULT 0, analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS watchlist (
        mint_address TEXT PRIMARY KEY, added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_rescan TIMESTAMP, raw_score INTEGER, decayed_score REAL, rescan_count INTEGER DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS model_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT, trained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        training_rows INTEGER, precision_5x REAL, brier_score REAL, mae_mult REAL, backend TEXT, model_path TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tla_trainer_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT, generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        insight_type TEXT, feature TEXT, direction TEXT, magnitude REAL, reason TEXT, source_mints TEXT,
        applied INTEGER DEFAULT 0
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tla_trainer_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT, processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reports_processed INTEGER, insights_generated INTEGER
    )
    """,
]


class SQLiteStore:
    def __init__(self, db_path: str = DB_PATH) -> None:
        self.engine: Engine = create_engine(f"sqlite:///{db_path}", future=True)
        self._init_db()

    def _init_db(self) -> None:
        with self.engine.begin() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL"))
            conn.execute(text("PRAGMA synchronous=NORMAL"))
            for ddl in DDL_STATEMENTS:
                conn.execute(text(ddl))

    @contextmanager
    def tx(self):
        with self.engine.begin() as conn:
            yield conn

    def insert_tla_snapshot(self, payload: dict[str, Any]) -> None:
        cols = ", ".join(payload.keys())
        vals = ", ".join(f":{k}" for k in payload.keys())
        with self.tx() as conn:
            conn.execute(text(f"INSERT INTO tla_snapshots ({cols}) VALUES ({vals})"), payload)

    def insert_tla_report(self, payload: dict[str, Any]) -> None:
        data = payload.copy()
        for key in ("edge_cases", "feature_deltas", "counterfactual_score"):
            if key in data and not isinstance(data[key], str):
                data[key] = json.dumps(data[key], default=str)
        cols = ", ".join(data.keys())
        vals = ", ".join(f":{k}" for k in data.keys())
        with self.tx() as conn:
            conn.execute(text(f"INSERT INTO tla_reports ({cols}) VALUES ({vals})"), data)
            conn.execute(
                text("UPDATE launches SET tla_completed=1, tla_active=0 WHERE mint_address=:mint"),
                {"mint": payload["mint_address"]},
            )

    def get_recent_tla_reports(self, limit: int = 100) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(
                text("SELECT * FROM tla_reports ORDER BY written_at DESC LIMIT :n"), {"n": limit}
            ).mappings()
            return [dict(r) for r in rows]

    def get_unprocessed_tla_reports(self) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT * FROM tla_reports
                    WHERE written_at > COALESCE((SELECT MAX(processed_at) FROM tla_trainer_log), '1970-01-01')
                    ORDER BY written_at ASC
                    """
                )
            ).mappings()
            return [dict(r) for r in rows]

    def insert_tla_insights(self, insights: Iterable[dict[str, Any]]) -> None:
        with self.tx() as conn:
            for ins in insights:
                conn.execute(
                    text(
                        """
                        INSERT INTO tla_trainer_insights
                        (insight_type, feature, direction, magnitude, reason, source_mints, applied)
                        VALUES (:insight_type,:feature,:direction,:magnitude,:reason,:source_mints,0)
                        """
                    ),
                    {
                        **ins,
                        "source_mints": json.dumps(ins.get("source_mints", [])),
                    },
                )

    def get_unapplied_insights(self) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(
                text("SELECT * FROM tla_trainer_insights WHERE applied=0 ORDER BY generated_at ASC")
            ).mappings()
            return [dict(r) for r in rows]

    def mark_insights_applied(self, ids: list[int]) -> None:
        if not ids:
            return
        with self.tx() as conn:
            conn.execute(
                text(f"UPDATE tla_trainer_insights SET applied=1 WHERE id IN ({','.join(str(i) for i in ids)})")
            )

    def add_tla_trainer_log(self, processed: int, insights: int) -> None:
        with self.tx() as conn:
            conn.execute(
                text(
                    "INSERT INTO tla_trainer_log (reports_processed, insights_generated) VALUES (:p,:i)"
                ),
                {"p": processed, "i": insights},
            )

    def get_tla_snapshots(self, mint: str) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(
                text(
                    "SELECT * FROM tla_snapshots WHERE mint_address=:mint ORDER BY minutes_since_det ASC"
                ),
                {"mint": mint},
            ).mappings()
            return [dict(r) for r in rows]

    def insert_learner_journal(self, payload: dict[str, Any]) -> None:
        if "edge_cases_noted" in payload and not isinstance(payload["edge_cases_noted"], str):
            payload["edge_cases_noted"] = json.dumps(payload["edge_cases_noted"])
        cols = ", ".join(payload.keys())
        vals = ", ".join(f":{k}" for k in payload.keys())
        with self.tx() as conn:
            conn.execute(text(f"INSERT INTO learner_journal ({cols}) VALUES ({vals})"), payload)

    def add_watchlist(self, mint: str, raw_score: int, decayed_score: float) -> None:
        with self.tx() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO watchlist (mint_address, raw_score, decayed_score)
                    VALUES (:mint,:raw,:decayed)
                    ON CONFLICT(mint_address) DO UPDATE SET
                        raw_score=excluded.raw_score,
                        decayed_score=excluded.decayed_score,
                        last_rescan=CURRENT_TIMESTAMP,
                        rescan_count=watchlist.rescan_count+1
                    """
                ),
                {"mint": mint, "raw": raw_score, "decayed": decayed_score},
            )

    def get_watchlist(self) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(text("SELECT * FROM watchlist ORDER BY decayed_score DESC")).mappings()
            return [dict(r) for r in rows]

    def get_tla_edge_case_counts(self) -> list[dict[str, Any]]:
        counts: dict[str, int] = {}
        for report in self.get_recent_tla_reports(5000):
            for edge in json.loads(report.get("edge_cases") or "[]"):
                counts[edge] = counts.get(edge, 0) + 1
        return [{"edge_case": k, "count": v} for k, v in sorted(counts.items(), key=lambda i: i[1], reverse=True)]

    def get_tla_recommendation_roadmap(self) -> list[dict[str, Any]]:
        with self.tx() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT what_would_improve recommendation, COUNT(*) cnt
                    FROM tla_reports
                    WHERE what_would_improve IS NOT NULL AND what_would_improve != ''
                    GROUP BY what_would_improve
                    ORDER BY cnt DESC
                    LIMIT 20
                    """
                )
            ).mappings()
            roadmap = []
            for i, row in enumerate(rows, start=1):
                roadmap.append(
                    {
                        "priority": i,
                        "improvement": row["recommendation"],
                        "tla_reports": row["cnt"],
                        "est_impact": f"+{max(1, row['cnt']//2)} alpha/day",
                        "status": "Pending",
                    }
                )
            return roadmap

    def utcnow(self) -> str:
        return datetime.utcnow().isoformat()
