from __future__ import annotations

from domain.graph_analysis import analyze_wallet_graph


class WalletClusterAgent:
    def analyze(self, edges: list[tuple[str, str]]) -> dict:
        return analyze_wallet_graph(edges)
