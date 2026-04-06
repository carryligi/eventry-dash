"""
In-memory cache with Supabase Realtime subscriptions.
All settings are loaded at startup, then kept in sync via Realtime events.
on_message reads from RAM only — zero DB latency.
"""

import asyncio
import logging
from collections import defaultdict
from datetime import datetime
from typing import Optional

import pytz

from models import (
    Keyword, PingerSettings, SilentlySettings,
    PushoverSettings, WebhookSettings, AppSettings,
)
from config import supabase

logger = logging.getLogger(__name__)


class BotCache:
    def __init__(self):
        # {user_id: [Keyword, ...]}
        self.keywords: dict[str, list[Keyword]] = defaultdict(list)
        # {user_id: PingerSettings}
        self.pinger: dict[str, PingerSettings] = {}
        # {user_id: SilentlySettings}
        self.silently: dict[str, SilentlySettings] = {}
        # {user_id: PushoverSettings}
        self.pushover: dict[str, PushoverSettings] = {}
        # {user_id: WebhookSettings}
        self.webhooks: dict[str, WebhookSettings] = {}
        # {user_id: set(keyword_text)}
        self.disabled_keywords: dict[str, set[str]] = defaultdict(set)
        # {user_id: {channel_id: {keyword_id: expiry_datetime}}}
        self.active_cooldowns: dict[str, dict[str, dict[str, datetime]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        # Global app settings
        self.app: AppSettings = AppSettings()

        self._lock = asyncio.Lock()
        self._realtime_channels = []

    # ── Initial full load ────────────────────────────────────────────────

    async def load_all(self):
        """Load everything from Supabase into RAM. Called once at startup."""
        await asyncio.gather(
            self._load_keywords(),
            self._load_pinger(),
            self._load_silently(),
            self._load_pushover(),
            self._load_webhooks(),
            self._load_disabled_keywords(),
            self._load_cooldowns(),
            self._load_app_settings(),
        )
        logger.info(
            f"Cache loaded: {sum(len(v) for v in self.keywords.values())} keywords, "
            f"{len(self.pinger)} pinger, {len(self.silently)} silently, "
            f"{len(self.pushover)} pushover, {len(self.webhooks)} webhooks"
        )

    async def _load_keywords(self):
        data = supabase.table("keywords").select("*").execute().data or []
        self.keywords.clear()
        for row in data:
            kw = _row_to_keyword(row)
            self.keywords[kw.user_id].append(kw)

    async def _load_pinger(self):
        data = supabase.table("pinger_settings").select("*").execute().data or []
        self.pinger = {r["user_id"]: _row_to_pinger(r) for r in data}

    async def _load_silently(self):
        data = supabase.table("silently_settings").select("*").execute().data or []
        self.silently = {r["user_id"]: _row_to_silently(r) for r in data}

    async def _load_pushover(self):
        data = supabase.table("pushover_settings").select("*").execute().data or []
        self.pushover = {r["user_id"]: _row_to_pushover(r) for r in data}

    async def _load_webhooks(self):
        data = supabase.table("webhook_settings").select("*").execute().data or []
        self.webhooks = {r["user_id"]: _row_to_webhook(r) for r in data}

    async def _load_disabled_keywords(self):
        data = supabase.table("autostart_disabled_keywords").select("*").execute().data or []
        self.disabled_keywords.clear()
        for row in data:
            self.disabled_keywords[row["user_id"]].add(row["keyword"])

    async def _load_cooldowns(self):
        data = supabase.table("active_cooldowns").select("*").execute().data or []
        self.active_cooldowns.clear()
        now = datetime.now(pytz.UTC)
        for row in data:
            expiry = datetime.fromisoformat(row["expires_at"])
            if expiry > now:
                uid = row["user_id"]
                cid = row["channel_id"]
                kid = row["keyword_id"]
                self.active_cooldowns[uid][cid][kid] = expiry

    async def _load_app_settings(self):
        data = supabase.table("app_settings").select("key, value").execute().data or []
        for row in data:
            key, val = row["key"], row["value"]
            if key == "silently_api_key":
                self.app.silently_api_key = val
            elif key == "pushover_app_key":
                self.app.pushover_app_key = val
            elif key == "discord_bot_token":
                self.app.discord_bot_token = val
            elif key == "guild_id":
                self.app.guild_id = val

    # ── Supabase Realtime subscriptions ──────────────────────────────────

    def subscribe(self):
        """Subscribe to Realtime changes on all config tables."""
        tables = [
            ("keywords", self._on_keywords_change),
            ("pinger_settings", self._on_pinger_change),
            ("silently_settings", self._on_silently_change),
            ("pushover_settings", self._on_pushover_change),
            ("webhook_settings", self._on_webhooks_change),
            ("autostart_disabled_keywords", self._on_disabled_kw_change),
            ("app_settings", self._on_app_settings_change),
        ]
        for table, callback in tables:
            channel = (
                supabase.channel(f"cache_{table}")
                .on_postgres_changes(
                    event="*",
                    schema="public",
                    table=table,
                    callback=callback,
                )
                .subscribe()
            )
            self._realtime_channels.append(channel)
            logger.info(f"Subscribed to Realtime: {table}")

    def _on_keywords_change(self, payload):
        event = payload.get("eventType") or payload.get("type", "")
        record = payload.get("new") or payload.get("record", {})
        old = payload.get("old", {})

        if event == "DELETE" and old.get("id"):
            for uid, kws in self.keywords.items():
                self.keywords[uid] = [k for k in kws if k.id != old["id"]]
            logger.info(f"[RT] Keyword deleted: {old.get('id')}")
        elif record:
            kw = _row_to_keyword(record)
            # Remove old version if exists
            if kw.user_id in self.keywords:
                self.keywords[kw.user_id] = [
                    k for k in self.keywords[kw.user_id] if k.id != kw.id
                ]
            self.keywords[kw.user_id].append(kw)
            logger.info(f"[RT] Keyword upserted: {kw.keyword} for {kw.user_id}")

    def _on_pinger_change(self, payload):
        record = payload.get("new") or payload.get("record", {})
        if record and "user_id" in record:
            self.pinger[record["user_id"]] = _row_to_pinger(record)
            logger.info(f"[RT] Pinger updated: {record['user_id']}")

    def _on_silently_change(self, payload):
        record = payload.get("new") or payload.get("record", {})
        if record and "user_id" in record:
            self.silently[record["user_id"]] = _row_to_silently(record)
            logger.info(f"[RT] Silently updated: {record['user_id']}")

    def _on_pushover_change(self, payload):
        record = payload.get("new") or payload.get("record", {})
        if record and "user_id" in record:
            self.pushover[record["user_id"]] = _row_to_pushover(record)
            logger.info(f"[RT] Pushover updated: {record['user_id']}")

    def _on_webhooks_change(self, payload):
        record = payload.get("new") or payload.get("record", {})
        if record and "user_id" in record:
            self.webhooks[record["user_id"]] = _row_to_webhook(record)
            logger.info(f"[RT] Webhook updated: {record['user_id']}")

    def _on_disabled_kw_change(self, payload):
        event = payload.get("eventType") or payload.get("type", "")
        record = payload.get("new") or payload.get("record", {})
        old = payload.get("old", {})

        if event == "DELETE" and old:
            uid = old.get("user_id", "")
            kw = old.get("keyword", "")
            self.disabled_keywords[uid].discard(kw)
            logger.info(f"[RT] Disabled keyword removed: {kw} for {uid}")
        elif record:
            uid = record["user_id"]
            kw = record["keyword"]
            self.disabled_keywords[uid].add(kw)
            logger.info(f"[RT] Disabled keyword added: {kw} for {uid}")

    def _on_app_settings_change(self, payload):
        record = payload.get("new") or payload.get("record", {})
        if record:
            key, val = record.get("key", ""), record.get("value", "")
            if key == "silently_api_key":
                self.app.silently_api_key = val
            elif key == "pushover_app_key":
                self.app.pushover_app_key = val
            elif key == "guild_id":
                self.app.guild_id = val
            logger.info(f"[RT] App setting updated: {key}")

    # ── Cooldown helpers ─────────────────────────────────────────────────

    def is_on_cooldown(self, user_id: str, channel_id: str, keyword_id: str) -> bool:
        expiry = self.active_cooldowns.get(user_id, {}).get(channel_id, {}).get(keyword_id)
        if expiry is None:
            return False
        if datetime.now(pytz.UTC) >= expiry:
            # Expired — clean up
            del self.active_cooldowns[user_id][channel_id][keyword_id]
            if not self.active_cooldowns[user_id][channel_id]:
                del self.active_cooldowns[user_id][channel_id]
            if not self.active_cooldowns[user_id]:
                del self.active_cooldowns[user_id]
            return False
        return True

    def set_cooldown(self, user_id: str, channel_id: str, keyword_id: str, expiry: datetime):
        self.active_cooldowns[user_id][channel_id][keyword_id] = expiry

    def cleanup_expired(self):
        now = datetime.now(pytz.UTC)
        empty_users = []
        for uid in list(self.active_cooldowns):
            empty_channels = []
            for cid in list(self.active_cooldowns[uid]):
                expired = [
                    kid for kid, exp in self.active_cooldowns[uid][cid].items()
                    if now >= exp
                ]
                for kid in expired:
                    del self.active_cooldowns[uid][cid][kid]
                if not self.active_cooldowns[uid][cid]:
                    empty_channels.append(cid)
            for cid in empty_channels:
                del self.active_cooldowns[uid][cid]
            if not self.active_cooldowns[uid]:
                empty_users.append(uid)
        for uid in empty_users:
            del self.active_cooldowns[uid]


# ── Row → Model helpers ─────────────────────────────────────────────────

def _row_to_keyword(row: dict) -> Keyword:
    return Keyword(
        id=row["id"],
        user_id=row["user_id"],
        keyword=row["keyword"],
        internal_name=row.get("internal_name"),
        restriction_type=row.get("restriction_type", "global"),
        channel_ids=row.get("channel_ids"),
        category_id=row.get("category_id"),
        max_price=float(row["max_price"]) if row.get("max_price") is not None else None,
    )


def _row_to_pinger(row: dict) -> PingerSettings:
    return PingerSettings(
        user_id=row["user_id"],
        is_active=row.get("is_active", False),
        cooldown_minutes=row.get("cooldown_minutes", 0),
    )


def _row_to_silently(row: dict) -> SilentlySettings:
    return SilentlySettings(
        user_id=row["user_id"],
        user_key=row.get("user_key", ""),
        is_active=row.get("is_active", False),
        min_stock=row.get("min_stock", 0),
        schedule_start=row.get("schedule_start"),
        schedule_end=row.get("schedule_end"),
    )


def _row_to_pushover(row: dict) -> PushoverSettings:
    return PushoverSettings(
        user_id=row["user_id"],
        user_key=row.get("user_key", ""),
        priority=row.get("priority", 0),
    )


def _row_to_webhook(row: dict) -> WebhookSettings:
    return WebhookSettings(
        user_id=row["user_id"],
        webhook_url=row.get("webhook_url", ""),
        is_active=row.get("is_active", False),
    )
