from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import networkx as nx
from community import community_louvain

from config import GRAPH_NODE_CAP


def analyze_wallet_graph(edges: list[tuple[str, str]]) -> dict[str, float]:
    trimmed = edges[: GRAPH_NODE_CAP * 3]
    g = nx.Graph()
    g.add_edges_from(trimmed)
    if g.number_of_nodes() == 0:
        return {"sm_centrality": 0.0, "cluster_mod": 0.0}
    with ThreadPoolExecutor(max_workers=4) as pool:
        centrality_future = pool.submit(nx.degree_centrality, g)
        part_future = pool.submit(community_louvain.best_partition, g)
        centrality = centrality_future.result()
        partition = part_future.result()
    mod = community_louvain.modularity(partition, g) if g.number_of_edges() > 0 else 0.0
    return {"sm_centrality": max(centrality.values()), "cluster_mod": float(mod)}
