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
from realtime import RealtimeSubscribeStates

from models import (
    Keyword, PingerSettings, SilentlySettings,
    PushoverSettings, WebhookSettings, AppSettings,
)
from config import supabase, get_async_supabase, SUPABASE_SERVICE_ROLE_KEY

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
        # {whop_user_id: discord_user_id_str}
        # Needed because DB rows are keyed by Whop user_id but Discord APIs
        # (guild.get_member, fetch_user, user.send) need a numeric Discord id.
        self.discord_id_by_whop: dict[str, str] = {}
        # {whop_user_id: username} — used by admin log webhook for readable user display
        self.username_by_whop: dict[str, str] = {}
        # {user_id: set(keyword_text)}
        self.disabled_keywords: dict[str, set[str]] = defaultdict(set)
        # Reverse lookup for Realtime DELETE events on `autostart_disabled_keywords`.
        # Supabase Realtime only includes the PK (id) in DELETE payloads, even with
        # REPLICA IDENTITY FULL, so we maintain a row_id -> (user_id, keyword) map
        # so that deletes can resolve back to the set entry.
        # {row_id: (user_id, keyword)}
        self._disabled_id_map: dict[str, tuple[str, str]] = {}
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
            self._load_profiles(),
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
            f"{len(self.pushover)} pushover, {len(self.webhooks)} webhooks, "
            f"{len(self.discord_id_by_whop)} discord mappings"
        )

    async def _load_profiles(self):
        data = (
            supabase.table("profiles")
            .select("id, discord_user_id, username")
            .execute()
            .data
            or []
        )
        self.discord_id_by_whop.clear()
        self.username_by_whop.clear()
        for row in data:
            wid = row["id"]
            if row.get("discord_user_id"):
                self.discord_id_by_whop[wid] = row["discord_user_id"]
            if row.get("username"):
                self.username_by_whop[wid] = row["username"]

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
        self._disabled_id_map.clear()
        for row in data:
            uid = row["user_id"]
            kw = row["keyword"]
            rid = row.get("id")
            self.disabled_keywords[uid].add(kw)
            if rid:
                self._disabled_id_map[str(rid)] = (uid, kw)

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
            elif key == "autostart_log_webhook_url":
                self.app.autostart_log_webhook_url = val or ""
            elif key == "webhook_user_payload_template":
                self.app.webhook_user_payload_template = val or None
            elif key == "webhook_admin_payload_template":
                self.app.webhook_admin_payload_template = val or None

    # ── Supabase Realtime subscriptions ──────────────────────────────────

    async def subscribe(self):
        """Subscribe to Realtime changes on all config tables (async client required)."""
        async_sb = await get_async_supabase()

        # CRITICAL: explicitly set service_role token on the Realtime WebSocket,
        # otherwise Supabase may silently filter events even with permissive RLS.
        try:
            await async_sb.realtime.set_auth(SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Realtime auth set to service_role")
        except Exception as e:
            logger.warning(f"Realtime set_auth failed (non-fatal): {e}")

        tables = [
            ("profiles", self._on_profile_change),
            ("keywords", self._on_keywords_change),
            ("pinger_settings", self._on_pinger_change),
            ("silently_settings", self._on_silently_change),
            ("pushover_settings", self._on_pushover_change),
            ("webhook_settings", self._on_webhooks_change),
            ("autostart_disabled_keywords", self._on_disabled_kw_change),
            ("app_settings", self._on_app_settings_change),
        ]
        for table, callback in tables:
            channel = async_sb.channel(f"cache_{table}")
            channel.on_postgres_changes(
                event="*",
                schema="public",
                table=table,
                callback=callback,
            )

            # Capture `table` in closure for the status callback
            def _make_status_cb(tname: str):
                def _on_status(status, err):
                    if status == RealtimeSubscribeStates.SUBSCRIBED:
                        logger.info(f"[RT] {tname}: SUBSCRIBED (receiving events)")
                    elif status == RealtimeSubscribeStates.CHANNEL_ERROR:
                        logger.error(f"[RT] {tname}: CHANNEL_ERROR — {err}")
                    elif status == RealtimeSubscribeStates.TIMED_OUT:
                        logger.error(f"[RT] {tname}: TIMED_OUT — server did not respond")
                    elif status == RealtimeSubscribeStates.CLOSED:
                        logger.warning(f"[RT] {tname}: CLOSED — channel disconnected")
                return _on_status

            await channel.subscribe(_make_status_cb(table))
            self._realtime_channels.append(channel)
            logger.info(f"Subscribed to Realtime: {table}")

    # ── Payload helper ───────────────────────────────────────────────────
    # Supabase Realtime v2 delivers payloads as:
    #   { 'data': { 'type': 'INSERT'|'UPDATE'|'DELETE',
    #               'record': {...}, 'old_record': {...},
    #               'schema': 'public', 'table': '...' },
    #     'ids': [...] }
    # `type` arrives as a RealtimePostgresChangesListenEvent enum, not a string.
    @staticmethod
    def _extract(payload):
        data = payload.get("data") or {}
        etype = data.get("type", "")
        if hasattr(etype, "value"):
            etype = etype.value
        etype = str(etype).upper()
        record = data.get("record") or {}
        old_record = data.get("old_record") or {}
        return etype, record, old_record

    def _on_profile_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("id"):
                self.discord_id_by_whop.pop(old["id"], None)
                self.username_by_whop.pop(old["id"], None)
                logger.info(f"[RT] Profile deleted: {old['id']}")
            elif record and "id" in record:
                whop_id = record["id"]
                discord_id = record.get("discord_user_id")
                username = record.get("username")
                if discord_id:
                    self.discord_id_by_whop[whop_id] = discord_id
                    logger.info(f"[RT] Profile mapping: {whop_id} -> discord:{discord_id}")
                else:
                    if self.discord_id_by_whop.pop(whop_id, None) is not None:
                        logger.info(f"[RT] Profile mapping cleared: {whop_id}")
                if username:
                    self.username_by_whop[whop_id] = username
                else:
                    self.username_by_whop.pop(whop_id, None)
        except Exception as e:
            logger.error(f"[RT] Error in _on_profile_change: {e}")

    def _on_keywords_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("id"):
                for uid in list(self.keywords):
                    self.keywords[uid] = [k for k in self.keywords[uid] if k.id != old["id"]]
                logger.info(f"[RT] Keyword deleted: {old.get('id')}")
            elif record:
                kw = _row_to_keyword(record)
                if kw.user_id in self.keywords:
                    self.keywords[kw.user_id] = [
                        k for k in self.keywords[kw.user_id] if k.id != kw.id
                    ]
                self.keywords[kw.user_id].append(kw)
                logger.info(f"[RT] Keyword upserted: {kw.keyword} for {kw.user_id}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_keywords_change: {e}")

    def _on_pinger_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("user_id"):
                self.pinger.pop(old["user_id"], None)
                logger.info(f"[RT] Pinger deleted: {old['user_id']}")
            elif record and "user_id" in record:
                self.pinger[record["user_id"]] = _row_to_pinger(record)
                logger.info(f"[RT] Pinger updated: {record['user_id']}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_pinger_change: {e}")

    def _on_silently_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("user_id"):
                self.silently.pop(old["user_id"], None)
                logger.info(f"[RT] Silently deleted: {old['user_id']}")
            elif record and "user_id" in record:
                self.silently[record["user_id"]] = _row_to_silently(record)
                logger.info(f"[RT] Silently updated: {record['user_id']}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_silently_change: {e}")

    def _on_pushover_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("user_id"):
                self.pushover.pop(old["user_id"], None)
                logger.info(f"[RT] Pushover deleted: {old['user_id']}")
            elif record and "user_id" in record:
                self.pushover[record["user_id"]] = _row_to_pushover(record)
                logger.info(f"[RT] Pushover updated: {record['user_id']}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_pushover_change: {e}")

    def _on_webhooks_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE" and old.get("user_id"):
                self.webhooks.pop(old["user_id"], None)
                logger.info(f"[RT] Webhook deleted: {old['user_id']}")
            elif record and "user_id" in record:
                self.webhooks[record["user_id"]] = _row_to_webhook(record)
                logger.info(f"[RT] Webhook updated: {record['user_id']}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_webhooks_change: {e}")

    def _on_disabled_kw_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            # Supabase Realtime DELETE payloads only contain the PK (id), not
            # user_id/keyword — even with REPLICA IDENTITY FULL, the Realtime
            # pipeline strips non-PK columns server-side. So we maintain an
            # id -> (user_id, keyword) reverse map populated on INSERT and
            # startup, and resolve the DELETE via that map.
            if etype == "DELETE":
                old_id = str(old.get("id", "")) if old else ""
                if not old_id:
                    logger.warning("[RT] Disabled keyword DELETE without id in payload — cannot resolve")
                    return
                mapped = self._disabled_id_map.pop(old_id, None)
                if mapped is None:
                    logger.warning(
                        f"[RT] Disabled keyword DELETE id={old_id} not found in reverse map — "
                        f"cache may be stale, triggering reload"
                    )
                    # Best-effort resync: reload from DB on next tick
                    asyncio.create_task(self._load_disabled_keywords())
                    return
                uid, kw = mapped
                self.disabled_keywords[uid].discard(kw)
                logger.info(f"[RT] Disabled keyword removed: {kw} for {uid}")
            elif record:
                uid = record.get("user_id", "")
                kw = record.get("keyword", "")
                rid = record.get("id")
                if uid and kw:
                    self.disabled_keywords[uid].add(kw)
                    if rid:
                        self._disabled_id_map[str(rid)] = (uid, kw)
                    logger.info(f"[RT] Disabled keyword added: {kw} for {uid}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_disabled_kw_change: {e}")

    def _on_app_settings_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if record:
                key, val = record.get("key", ""), record.get("value", "") or ""
                if key == "silently_api_key":
                    self.app.silently_api_key = val
                elif key == "pushover_app_key":
                    self.app.pushover_app_key = val
                elif key == "guild_id":
                    self.app.guild_id = val
                elif key == "autostart_log_webhook_url":
                    self.app.autostart_log_webhook_url = val
                elif key == "webhook_user_payload_template":
                    self.app.webhook_user_payload_template = val or None
                elif key == "webhook_admin_payload_template":
                    self.app.webhook_admin_payload_template = val or None
                logger.info(f"[RT] App setting updated: {key}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_app_settings_change: {e}")

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
        channel_ids=row.get("channel_ids"),
        category_ids=row.get("category_ids"),
        max_price=float(row["max_price"]) if row.get("max_price") is not None else None,
        min_stock=int(row["min_stock"]) if row.get("min_stock") is not None else None,
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
