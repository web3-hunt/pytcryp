from __future__ import annotations


class WatchdogAgent:
    async def handle_event(self, event: dict) -> dict | None:
        if "params" not in event:
            return None
        return {"mint_address": "unknown", "event": event}
