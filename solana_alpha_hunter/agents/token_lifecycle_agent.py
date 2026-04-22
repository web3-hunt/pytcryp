from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from statistics import median
from typing import Any

import httpx

from config import DEX_TOKENS_URL, TLA_POSTMORTEM_DELAY_H, TLA_REPORTS_DIR, TLA_SNAPSHOT_INTERVAL_MIN
from infrastructure.sqlite_store import SQLiteStore


@dataclass
class TLASnapshot:
    minutes_since_det: float
    current_price_usd: float
    current_mcap: float
    holder_count: int
    volume_1h: float
    volume_cumulative: float
    price_mult_so_far: float
    holder_vel_now: float
    buy_sell_ratio: float
    large_sell_detected: int
    captured_at: datetime = field(default_factory=datetime.utcnow)


class TokenLifecycleAgent:
    def __init__(self, mint: str, detection_data: dict, store: SQLiteStore):
        self.mint = mint
        self.detection_data = detection_data
        self.detection_price = max(float(detection_data.get("price_usd", 0.0)), 1e-12)
        self.store = store
        self.snapshots: list[TLASnapshot] = []
        self.peak_mult = 1.0
        self.peak_at_minutes = 0.0
        self.rug_detected = False
        self.rug_at_minutes: float | None = None
        self.is_alive = True
        self.started_at = datetime.utcnow()

    async def _fetch_dex(self) -> dict[str, Any] | None:
        url = DEX_TOKENS_URL.format(mint_addr=self.mint)
        timeout = httpx.Timeout(12.0, connect=6.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(url)
            if r.status_code == 404:
                return {"delisted": True}
            r.raise_for_status()
            return r.json()

    async def take_snapshot(self):
        minutes = (datetime.utcnow() - self.started_at).total_seconds() / 60.0
        try:
            dex = await self._fetch_dex()
        except Exception:
            dex = None
        if dex is None or dex.get("delisted"):
            snap = TLASnapshot(
                minutes_since_det=minutes,
                current_price_usd=0.0,
                current_mcap=0.0,
                holder_count=0,
                volume_1h=0.0,
                volume_cumulative=0.0,
                price_mult_so_far=0.0,
                holder_vel_now=0.0,
                buy_sell_ratio=0.0,
                large_sell_detected=1,
            )
            self.rug_detected = True
            self.rug_at_minutes = minutes
            self.snapshots.append(snap)
            self._persist_snapshot(snap)
            return

        pair = (dex.get("pairs") or [{}])[0]
        price = float(pair.get("priceUsd") or 0.0)
        mcap = float(pair.get("marketCap") or 0.0)
        vol_1h = float((pair.get("volume") or {}).get("h1") or 0.0)
        txns = pair.get("txns") or {}
        buys = float((txns.get("h1") or {}).get("buys") or 0.0)
        sells = float((txns.get("h1") or {}).get("sells") or 0.0)
        bsr = buys / max(sells, 1.0)
        mult = price / self.detection_price if self.detection_price else 0.0
        if mult > self.peak_mult:
            self.peak_mult = mult
            self.peak_at_minutes = minutes
        if self.peak_mult > 0 and mult <= self.peak_mult * 0.2 and minutes > 15:
            self.rug_detected = True
            self.rug_at_minutes = self.rug_at_minutes or minutes
        snap = TLASnapshot(
            minutes_since_det=minutes,
            current_price_usd=price,
            current_mcap=mcap,
            holder_count=int(self.detection_data.get("holder_count", 0)),
            volume_1h=vol_1h,
            volume_cumulative=sum(s.volume_1h for s in self.snapshots) + vol_1h,
            price_mult_so_far=mult,
            holder_vel_now=0.0,
            buy_sell_ratio=bsr,
            large_sell_detected=1 if sells > buys * 2 else 0,
        )
        self.snapshots.append(snap)
        self._persist_snapshot(snap)

    def _persist_snapshot(self, snap: TLASnapshot) -> None:
        self.store.insert_tla_snapshot(
            {
                "mint_address": self.mint,
                "minutes_since_det": snap.minutes_since_det,
                "current_price_usd": snap.current_price_usd,
                "current_mcap": snap.current_mcap,
                "holder_count": snap.holder_count,
                "volume_1h": snap.volume_1h,
                "volume_cumulative": snap.volume_cumulative,
                "price_mult_so_far": snap.price_mult_so_far,
                "holder_vel_now": snap.holder_vel_now,
                "buy_sell_ratio": snap.buy_sell_ratio,
                "large_sell_detected": snap.large_sell_detected,
            }
        )

    def _edge_cases(self, final_mult_24h: float, optimal_entry_mult: float) -> list[str]:
        edges: list[str] = []
        vols = [s.volume_1h for s in self.snapshots]
        holders = [s.holder_count for s in self.snapshots]
        if vols and median(vols) > 0 and max(vols) > 10 * median(vols) and min(holders or [0]) < 100:
            edges.append("volume_spike_no_holders")
        if self.peak_at_minutes > 720:
            edges.append("late_bloomer")
        if self.rug_at_minutes is not None and self.rug_at_minutes < 30:
            edges.append("instant_rug")
        if self.detection_data.get("dna_label") == "Organic" and self.peak_mult > 20:
            edges.append("organic_explosion")
        if self.detection_data.get("dna_label") == "Cabal" and final_mult_24h > 5:
            edges.append("cabal_profit")
        if self.detection_data.get("composite_score", 0) < 50 and self.peak_mult > 10:
            edges.append("low_score_moonshot")
        bonding = float(self.detection_data.get("bonding_pct", 50))
        if (bonding < 40 or bonding > 60) and final_mult_24h > 5:
            edges.append("bonding_anomaly")
        if optimal_entry_mult < 1:
            edges.append("sybil_exit_early")
        return edges

    async def write_post_mortem(self):
        try:
            if not self.snapshots:
                await self.take_snapshot()
            snaps = self.snapshots
            peak_snap = max(snaps, key=lambda s: s.price_mult_so_far)
            final_snap = snaps[-1]
            first_30 = [s for s in snaps if s.minutes_since_det <= 30] or snaps
            entry_snap = min(first_30, key=lambda s: s.price_mult_so_far)
            our_score = int(self.detection_data.get("composite_score", 0))
            predicted_mult = float(self.detection_data.get("predicted_mult", 1.0))
            final_mult_24h = final_snap.price_mult_so_far
            prediction_error = final_mult_24h - predicted_mult
            was_5x = int(final_mult_24h >= 5.0)
            was_10x = int(final_mult_24h >= 10.0)
            was_missed = int(was_5x and our_score < 65)
            was_false_positive = int(our_score >= 85 and final_mult_24h < 2.0)
            edge_cases = self._edge_cases(final_mult_24h, entry_snap.price_mult_so_far)

            counterfactual = {
                "key_feature": "bonding_pct",
                "actual_value": float(self.detection_data.get("bonding_pct", 0)),
                "median_5x_value": 52.0,
                "score_if_adjusted": min(100, our_score + 12),
                "gain_if_adjusted": round(max(0.0, peak_snap.price_mult_so_far - final_mult_24h), 3),
                "insight": "If bonding was near 52, this token would rank stronger in current scorer.",
            }
            recommendation = (
                "Recommend lowering bonding_pct minimum threshold to 25 when entropy > 4.0."
                if "bonding_anomaly" in edge_cases
                else "No model change suggested - outcome matched prediction."
            )
            what_missed = (
                "buy_sell_ratio and early holder velocity moved before score update."
                if was_missed
                else "No critical miss detected."
            )
            dna_label = self.detection_data.get("dna_label", "Unknown")
            dna_ok = int(
                (dna_label == "Organic" and self.peak_mult > 3)
                or (dna_label == "Bundled" and (self.rug_at_minutes or 10_000) < 240)
                or (dna_label == "Cabal" and (self.rug_at_minutes or 10_000) < 120)
            )

            payload = {
                "mint_address": self.mint,
                "token_name": self.detection_data.get("token_name"),
                "peak_mult": peak_snap.price_mult_so_far,
                "peak_at_minutes": peak_snap.minutes_since_det,
                "final_mult_24h": final_mult_24h,
                "rug_detected": int(self.rug_detected),
                "rug_at_minutes": self.rug_at_minutes,
                "our_score": our_score,
                "our_predicted_mult": predicted_mult,
                "our_prob_5x": float(self.detection_data.get("prob_5x", 0.0)),
                "actual_mult": final_mult_24h,
                "prediction_error": prediction_error,
                "was_5x": was_5x,
                "was_10x": was_10x,
                "was_missed": was_missed,
                "was_false_positive": was_false_positive,
                "peak_entry_window": f"minutes {max(0, int(entry_snap.minutes_since_det)-2)}-{int(entry_snap.minutes_since_det)+2}",
                "optimal_entry_mult": entry_snap.price_mult_so_far,
                "optimal_exit_mult": peak_snap.price_mult_so_far,
                "optimal_hold_minutes": max(0.0, peak_snap.minutes_since_det - entry_snap.minutes_since_det),
                "missed_signal": "bonding_pct threshold too strict" if "bonding_anomaly" in edge_cases else "none",
                "edge_cases": edge_cases,
                "feature_deltas": {"bonding_pct": float(self.detection_data.get("bonding_pct", 0)) - 52.0},
                "strongest_signal": "volume_1h",
                "weakest_signal": "bonding_pct",
                "dna_label_at_det": dna_label,
                "dna_was_correct": dna_ok,
                "counterfactual_score": counterfactual,
                "what_we_missed_text": what_missed,
                "what_would_improve": recommendation,
                "smart_money_was_right": int(self.peak_mult >= 3),
                "sybil_sold_early": int("sybil_exit_early" in edge_cases),
            }
            self.store.insert_tla_report(payload)

            report_json = {
                "mint": self.mint,
                "token_name": self.detection_data.get("token_name"),
                "written_at": datetime.utcnow().isoformat(),
                "outcome": {
                    "peak_mult": payload["peak_mult"],
                    "peak_at_minutes": payload["peak_at_minutes"],
                    "final_mult_24h": payload["final_mult_24h"],
                    "rug_detected": bool(payload["rug_detected"]),
                },
                "our_call": {
                    "score": our_score,
                    "predicted_mult": predicted_mult,
                    "prob_5x": payload["our_prob_5x"],
                    "was_correct": not bool(was_missed or was_false_positive),
                    "prediction_error": prediction_error,
                },
                "optimal_trade": {
                    "entry_window": payload["peak_entry_window"],
                    "entry_mult": payload["optimal_entry_mult"],
                    "exit_mult": payload["optimal_exit_mult"],
                    "hold_minutes": payload["optimal_hold_minutes"],
                    "return_if_optimal": f"{(payload['optimal_exit_mult']/max(payload['optimal_entry_mult'],1e-9)):.1f}x",
                },
                "what_algorithm_missed": what_missed,
                "edge_cases": edge_cases,
                "counterfactual": counterfactual,
                "recommendation_to_learner": recommendation,
                "dna_accuracy": {"label": dna_label, "was_correct": bool(dna_ok)},
                "funding_outcome": {
                    "smart_money_was_right": bool(payload["smart_money_was_right"]),
                    "sybil_sold_early": bool(payload["sybil_sold_early"]),
                },
            }
            Path(TLA_REPORTS_DIR).mkdir(parents=True, exist_ok=True)
            Path(TLA_REPORTS_DIR, f"{self.mint}_postmortem.json").write_text(
                json.dumps(report_json, indent=2), encoding="utf-8"
            )
        except Exception as exc:
            self.store.insert_tla_report(
                {
                    "mint_address": self.mint,
                    "token_name": self.detection_data.get("token_name"),
                    "peak_mult": self.peak_mult,
                    "peak_at_minutes": self.peak_at_minutes,
                    "final_mult_24h": self.snapshots[-1].price_mult_so_far if self.snapshots else 0.0,
                    "rug_detected": int(self.rug_detected),
                    "our_score": int(self.detection_data.get("composite_score", 0)),
                    "our_predicted_mult": float(self.detection_data.get("predicted_mult", 0.0)),
                    "our_prob_5x": float(self.detection_data.get("prob_5x", 0.0)),
                    "actual_mult": self.snapshots[-1].price_mult_so_far if self.snapshots else 0.0,
                    "prediction_error": 0.0,
                    "was_5x": 0,
                    "was_10x": 0,
                    "was_missed": 0,
                    "was_false_positive": 0,
                    "peak_entry_window": "n/a",
                    "optimal_entry_mult": 1.0,
                    "optimal_exit_mult": self.peak_mult,
                    "optimal_hold_minutes": 0.0,
                    "missed_signal": "error",
                    "edge_cases": ["partial_report"],
                    "feature_deltas": {},
                    "strongest_signal": "unknown",
                    "weakest_signal": "unknown",
                    "dna_label_at_det": self.detection_data.get("dna_label", "Unknown"),
                    "dna_was_correct": 0,
                    "counterfactual_score": {"error_note": str(exc)},
                    "what_we_missed_text": f"Partial post-mortem due to error: {exc}",
                    "what_would_improve": "No model change suggested - partial report.",
                    "smart_money_was_right": 0,
                    "sybil_sold_early": 0,
                }
            )
        finally:
            self.is_alive = False

    async def run(self):
        snapshot_interval_s = TLA_SNAPSHOT_INTERVAL_MIN * 60
        deadline = self.started_at + timedelta(hours=TLA_POSTMORTEM_DELAY_H)
        while datetime.utcnow() < deadline and self.is_alive:
            await self.take_snapshot()
            await asyncio.sleep(snapshot_interval_s)
        await self.write_post_mortem()
