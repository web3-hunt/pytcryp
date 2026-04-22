from __future__ import annotations

import httpx

from config import DEX_TRENDING_URL


class DexTrendsScanner:
    async def run_scan(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=12.0) as client:
            r = await client.get(DEX_TRENDING_URL)
            r.raise_for_status()
            data = r.json()
        return [x for x in data if x.get("chainId") == "solana"][:50]
