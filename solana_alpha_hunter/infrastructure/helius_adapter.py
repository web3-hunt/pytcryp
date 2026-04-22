from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

import websockets

from config import HELIUS_RECONNECT_BASE, HELIUS_RECONNECT_MAX, HELIUS_WS_URL


class HeliusAdapter:
    def __init__(self, helius_api_key: str):
        self.ws_url = HELIUS_WS_URL.replace("{KEY}", helius_api_key)

    async def events(self) -> AsyncIterator[dict]:
        backoff = HELIUS_RECONNECT_BASE
        while True:
            try:
                async with websockets.connect(self.ws_url) as ws:
                    await ws.send(
                        json.dumps(
                            {
                                "jsonrpc": "2.0",
                                "id": 1,
                                "method": "logsSubscribe",
                                "params": ["all", {"commitment": "confirmed"}],
                            }
                        )
                    )
                    backoff = HELIUS_RECONNECT_BASE
                    while True:
                        payload = await ws.recv()
                        yield json.loads(payload)
            except Exception:
                await asyncio.sleep(backoff)
                backoff = min(HELIUS_RECONNECT_MAX, backoff * 2)
