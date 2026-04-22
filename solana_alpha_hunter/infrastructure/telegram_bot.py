from __future__ import annotations

from telegram import Bot

from config import Secrets


class TelegramAlerter:
    def __init__(self, secrets: Secrets):
        self.bot = Bot(token=secrets.telegram_bot_token) if secrets.telegram_bot_token else None
        self.chat_id = secrets.telegram_chat_id

    async def send(self, message: str) -> None:
        if not self.bot or not self.chat_id:
            return
        await self.bot.send_message(chat_id=self.chat_id, text=message[:4096])
