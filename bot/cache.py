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
from config import supabase, get_async_supabase, reset_async_supabase, SUPABASE_SERVICE_ROLE_KEY

logger = logging.getLogger(__name__)


class _RealtimeCloseDetector(logging.Handler):
    """Listens on the 'realtime._async.client' logger for abnormal WebSocket
    closes (code 1006) and signals the watchdog via an asyncio.Event.

    The Supabase realtime-py library does not expose a Python-level callback
    for these closures — it only logs them at ERROR level. This handler
    filters those log records and schedules the Event to be set on the
    bot's asyncio loop (logging handlers can fire from any thread).

    `cache_ref` is a weakref-like direct reference back to the BotCache so
    we can skip log events that fire as a side-effect of our own intentional
    client teardown inside _full_reconnect().
    """

    def __init__(self, event: asyncio.Event, loop: asyncio.AbstractEventLoop, cache_ref):
        super().__init__(level=logging.ERROR)
        self._event = event
        self._loop = loop
        self._cache_ref = cache_ref

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = record.getMessage()
        except Exception:
            return
        if "WebSocket connection closed" not in msg:
            return
        # Skip if we're already in the middle of a deliberate teardown — the
        # close we're seeing is our own doing, not a new failure.
        if getattr(self._cache_ref, "_reconnecting", False):
            return
        # asyncio.Event is not thread-safe; schedule set() on the loop.
        try:
            self._loop.call_soon_threadsafe(self._event.set)
        except RuntimeError:
            # Loop is closed — bot is shutting down, nothing to do.
            pass


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
        # Per-keyword Pushover disabled — keyed by keyword_id (UUID), not text
        # {user_id: set(keyword_id)}
        self.pushover_disabled: dict[str, set[str]] = defaultdict(set)
        self._pushover_disabled_id_map: dict[str, tuple[str, str]] = {}
        # {user_id: {channel_id: {keyword_id: expiry_datetime}}}
        self.active_cooldowns: dict[str, dict[str, dict[str, datetime]]] = defaultdict(
            lambda: defaultdict(dict)
        )
        # Global app settings
        self.app: AppSettings = AppSettings()

        self._lock = asyncio.Lock()
        self._realtime_channels = []

        # Watchdog state — see watchdog() and _full_reconnect().
        # _reconnect_needed is set by _RealtimeCloseDetector when a 1006
        # WebSocket close is detected in the realtime library's logs, and
        # the watchdog task wakes up to do a full client teardown.
        # _reconnecting is a guard that tells the detector to ignore close
        # log lines caused by our own intentional teardown.
        self._reconnect_needed: asyncio.Event = asyncio.Event()
        self._reconnecting: bool = False
        self._watchdog_task: Optional[asyncio.Task] = None
        # Periodic cache resync — safety net for silently-dropped Realtime
        # events. See periodic_resync() for details.
        self._resync_task: Optional[asyncio.Task] = None

    # ── Initial full load ────────────────────────────────────────────────
    #
    # All _load_* methods accept an optional `target` parameter. At startup
    # they load directly into `self` (target is None -> self). During a
    # Realtime reconnect (_reload_atomic), they load into a temporary
    # holder object so the fresh state can be atomically swapped in without
    # on_message ever seeing a partially populated cache.

    async def load_all(self, target: Optional["BotCache"] = None):
        """Load everything from Supabase into RAM.

        Called once at startup (target=None -> loads into self) and also
        by _reload_atomic() during Realtime reconnects (target=tmp holder).
        Note: _load_cooldowns is only called when target is self — cooldowns
        are managed in-memory by the bot and should not be re-loaded on
        reconnect (would wipe in-flight state).
        """
        dst = target if target is not None else self
        loaders = [
            self._load_profiles(dst),
            self._load_keywords(dst),
            self._load_pinger(dst),
            self._load_silently(dst),
            self._load_pushover(dst),
            self._load_webhooks(dst),
            self._load_disabled_keywords(dst),
            self._load_pushover_disabled(dst),
            self._load_app_settings(dst),
        ]
        if target is None:
            loaders.append(self._load_cooldowns(dst))
        await asyncio.gather(*loaders)
        logger.info(
            f"Cache loaded: {sum(len(v) for v in dst.keywords.values())} keywords, "
            f"{len(dst.pinger)} pinger, {len(dst.silently)} silently, "
            f"{len(dst.pushover)} pushover, {len(dst.webhooks)} webhooks, "
            f"{len(dst.discord_id_by_whop)} discord mappings"
        )

    async def _load_profiles(self, target):
        data = (
            supabase.table("profiles")
            .select("id, discord_user_id, username")
            .execute()
            .data
            or []
        )
        target.discord_id_by_whop.clear()
        target.username_by_whop.clear()
        for row in data:
            wid = row["id"]
            if row.get("discord_user_id"):
                target.discord_id_by_whop[wid] = row["discord_user_id"]
            if row.get("username"):
                target.username_by_whop[wid] = row["username"]

    async def _load_keywords(self, target):
        data = supabase.table("keywords").select("*").execute().data or []
        target.keywords.clear()
        for row in data:
            kw = _row_to_keyword(row)
            target.keywords[kw.user_id].append(kw)

    async def _load_pinger(self, target):
        data = supabase.table("pinger_settings").select("*").execute().data or []
        target.pinger = {r["user_id"]: _row_to_pinger(r) for r in data}

    async def _load_silently(self, target):
        data = supabase.table("silently_settings").select("*").execute().data or []
        target.silently = {r["user_id"]: _row_to_silently(r) for r in data}

    async def _load_pushover(self, target):
        data = supabase.table("pushover_settings").select("*").execute().data or []
        target.pushover = {r["user_id"]: _row_to_pushover(r) for r in data}

    async def _load_webhooks(self, target):
        data = supabase.table("webhook_settings").select("*").execute().data or []
        target.webhooks = {r["user_id"]: _row_to_webhook(r) for r in data}

    async def _load_disabled_keywords(self, target):
        data = supabase.table("autostart_disabled_keywords").select("*").execute().data or []
        target.disabled_keywords.clear()
        target._disabled_id_map.clear()
        for row in data:
            uid = row["user_id"]
            kw = row["keyword"]
            rid = row.get("id")
            target.disabled_keywords[uid].add(kw)
            if rid:
                target._disabled_id_map[str(rid)] = (uid, kw)

    async def _load_pushover_disabled(self, target):
        data = supabase.table("pushover_disabled_keywords").select("*").execute().data or []
        target.pushover_disabled.clear()
        target._pushover_disabled_id_map.clear()
        for row in data:
            uid = row["user_id"]
            kid = row["keyword_id"]
            rid = row.get("id")
            target.pushover_disabled[uid].add(kid)
            if rid:
                target._pushover_disabled_id_map[str(rid)] = (uid, kid)

    async def _load_cooldowns(self, target):
        data = supabase.table("active_cooldowns").select("*").execute().data or []
        target.active_cooldowns.clear()
        now = datetime.now(pytz.UTC)
        for row in data:
            expiry = datetime.fromisoformat(row["expires_at"])
            if expiry > now:
                uid = row["user_id"]
                cid = row["channel_id"]
                kid = row["keyword_id"]
                target.active_cooldowns[uid][cid][kid] = expiry

    async def _load_app_settings(self, target):
        data = supabase.table("app_settings").select("key, value").execute().data or []
        # Fresh AppSettings for atomic swap case (so a removed key resets).
        app = AppSettings()
        for row in data:
            key, val = row["key"], row["value"]
            if key == "silently_api_key":
                app.silently_api_key = val or ""
            elif key == "pushover_app_key":
                app.pushover_app_key = val or ""
            elif key == "discord_bot_token":
                app.discord_bot_token = val or ""
            elif key == "guild_id":
                app.guild_id = val or ""
            elif key == "autostart_log_webhook_url":
                app.autostart_log_webhook_url = val or ""
            elif key == "webhook_user_payload_template":
                app.webhook_user_payload_template = val or None
            elif key == "webhook_admin_payload_template":
                app.webhook_admin_payload_template = val or None
        target.app = app

    # ── Supabase Realtime subscriptions ──────────────────────────────────

    async def subscribe(self):
        """Subscribe to Realtime changes on all config tables (async client required).

        Called at startup and also from _full_reconnect() after a 1006. Safe
        to call multiple times: channel list is rebuilt, log detector is only
        attached once.
        """
        async_sb = await get_async_supabase()

        # Attach the 1006 detector to the realtime library logger exactly once.
        # Doing it here (rather than __init__) means we have access to the
        # running asyncio loop, which the log handler needs to schedule
        # event.set() via call_soon_threadsafe.
        rt_logger = logging.getLogger("realtime._async.client")
        if not any(isinstance(h, _RealtimeCloseDetector) for h in rt_logger.handlers):
            try:
                loop = asyncio.get_running_loop()
                rt_logger.addHandler(
                    _RealtimeCloseDetector(self._reconnect_needed, loop, self)
                )
                logger.info("Realtime close-detector attached to library logger")
            except RuntimeError:
                logger.warning("No running loop when attaching close-detector")

        # Reset the channel list — _full_reconnect may have cleared it, but
        # a fresh startup also expects a clean list.
        self._realtime_channels = []

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
            ("pushover_disabled_keywords", self._on_pushover_disabled_change),
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

    # ── Watchdog + atomic reconnect ──────────────────────────────────────

    async def watchdog(self):
        """Wait for a 1006 signal, then force a full Realtime reconnect.

        The detector in _RealtimeCloseDetector sets _reconnect_needed when
        the library logs a WebSocket abnormal close. We react by tearing
        down the entire AsyncClient and rebuilding it — the only thing that
        reliably fixes the silent-event-loss state the library gets into
        after 1006. Discord message handling is not affected.
        """
        logger.info("[Watchdog] Realtime watchdog started")
        while True:
            await self._reconnect_needed.wait()
            self._reconnect_needed.clear()
            logger.error("[Watchdog] 1006 detected — forcing full Realtime reconnect")
            try:
                await self._full_reconnect()
                logger.info("[Watchdog] Realtime reconnect successful")
            except Exception as e:
                logger.error(f"[Watchdog] Reconnect failed: {e}", exc_info=True)
                # Back off briefly, then retry via the same path.
                await asyncio.sleep(5)
                self._reconnect_needed.set()

    async def _full_reconnect(self):
        """Destroy the async client + channels, rebuild everything atomically.

        Discord's on_message keeps reading from the current cache dicts the
        whole time. Only when _reload_atomic() has finished building a full
        fresh snapshot are the dicts swapped in under a lock. Since Python
        dict rebinds are GIL-atomic, readers always see either the old or
        the new snapshot — never a partially populated one.
        """
        # Mark reconnect in progress so _RealtimeCloseDetector ignores the
        # close log that reset_async_supabase() may trigger below, otherwise
        # we could get stuck in a retry loop.
        self._reconnecting = True
        try:
            # Drop channel references — the old socket is dead anyway.
            self._realtime_channels = []
            # Hard-reset the async client (closes the socket and nulls singleton).
            await reset_async_supabase()
            # Build a fresh cache snapshot in a temp holder and atomic-swap.
            await self._reload_atomic()
            # Re-subscribe on the brand new client.
            await self.subscribe()
        finally:
            self._reconnecting = False
            # Drain any event that got set while we were busy — it would
            # just be noise from the teardown we just performed.
            self._reconnect_needed.clear()

    async def _reload_atomic(self):
        """Load a full fresh cache into a temporary holder, then swap.

        The temp holder is a bare BotCache without __init__ side effects —
        we only populate the data fields that get swapped (not the lock,
        channel list, watchdog state, etc.). active_cooldowns is NOT
        reloaded because it tracks in-flight notification state owned by
        the bot process, not the Dashboard.
        """
        tmp = BotCache.__new__(BotCache)
        tmp.keywords = defaultdict(list)
        tmp.pinger = {}
        tmp.silently = {}
        tmp.pushover = {}
        tmp.webhooks = {}
        tmp.discord_id_by_whop = {}
        tmp.username_by_whop = {}
        tmp.disabled_keywords = defaultdict(set)
        tmp._disabled_id_map = {}
        tmp.pushover_disabled = defaultdict(set)
        tmp._pushover_disabled_id_map = {}
        tmp.app = AppSettings()
        # Active cooldowns are owned by this process, not the DB — we keep
        # the live reference and just rebind it on tmp for loader safety.
        tmp.active_cooldowns = self.active_cooldowns

        # Reuse the existing parallel loaders by passing tmp as target.
        await self.load_all(target=tmp)

        # Atomic swap. Python dict assignment is GIL-atomic, so on_message
        # never observes a partial state. The lock only serializes parallel
        # reconnect attempts.
        async with self._lock:
            self.keywords = tmp.keywords
            self.pinger = tmp.pinger
            self.silently = tmp.silently
            self.pushover = tmp.pushover
            self.webhooks = tmp.webhooks
            self.discord_id_by_whop = tmp.discord_id_by_whop
            self.username_by_whop = tmp.username_by_whop
            self.disabled_keywords = tmp.disabled_keywords
            self._disabled_id_map = tmp._disabled_id_map
            self.pushover_disabled = tmp.pushover_disabled
            self._pushover_disabled_id_map = tmp._pushover_disabled_id_map
            self.app = tmp.app
        logger.info("[Watchdog] Cache atomically swapped to fresh state")

    # ── Periodic resync ──────────────────────────────────────────────────
    #
    # Supabase Realtime occasionally drops UPDATE events silently — a single
    # lost event on e.g. pushover_settings is enough to leave the cache stuck
    # with an old priority until the bot restarts or the 1006 watchdog fires.
    # This task runs in the background and re-reads the small per-user
    # settings tables from the DB on a fixed interval, so any drift self-heals
    # within `interval_seconds`. The hot path (on_message) still reads from
    # the in-memory cache — this task only overwrites the same dicts in place.
    async def periodic_resync(self, interval_seconds: int = 60):
        """Safety net against silent Realtime drops: reload small settings
        tables from the DB every `interval_seconds`.

        Only reloads per-user settings that are safe to overwrite in place.
        Does NOT touch `keywords` (large, handled by realtime + reconnect),
        `active_cooldowns` (process-owned), or the disabled_keywords maps
        (which rely on id-reverse lookups that reloading would invalidate).
        """
        logger.info(f"[Resync] Periodic resync started (interval={interval_seconds}s)")
        while True:
            try:
                await asyncio.sleep(interval_seconds)
                async with self._lock:
                    await asyncio.gather(
                        self._load_pinger(self),
                        self._load_silently(self),
                        self._load_pushover(self),
                        self._load_webhooks(self),
                        self._load_app_settings(self),
                    )
                logger.debug("[Resync] Periodic settings reload complete")
            except asyncio.CancelledError:
                logger.info("[Resync] Periodic resync cancelled")
                raise
            except Exception as e:
                logger.error(f"[Resync] Periodic reload failed: {e}", exc_info=True)
                # Don't spin on errors — wait the full interval before retrying.

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
                    asyncio.create_task(self._load_disabled_keywords(self))
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

    def _on_pushover_disabled_change(self, payload):
        try:
            etype, record, old = self._extract(payload)
            if etype == "DELETE":
                old_id = str(old.get("id", "")) if old else ""
                if not old_id:
                    logger.warning("[RT] Pushover disabled keyword DELETE without id in payload — cannot resolve")
                    return
                mapped = self._pushover_disabled_id_map.pop(old_id, None)
                if mapped is None:
                    logger.warning(
                        f"[RT] Pushover disabled keyword DELETE id={old_id} not found in reverse map — "
                        f"cache may be stale, triggering reload"
                    )
                    asyncio.create_task(self._load_pushover_disabled(self))
                    return
                uid, kid = mapped
                self.pushover_disabled[uid].discard(kid)
                logger.info(f"[RT] Pushover disabled keyword removed: {kid} for {uid}")
            elif record:
                uid = record.get("user_id", "")
                kid = record.get("keyword_id", "")
                rid = record.get("id")
                if uid and kid:
                    self.pushover_disabled[uid].add(kid)
                    if rid:
                        self._pushover_disabled_id_map[str(rid)] = (uid, kid)
                    logger.info(f"[RT] Pushover disabled keyword added: {kid} for {uid}")
        except Exception as e:
            logger.error(f"[RT] Error in _on_pushover_disabled_change: {e}")

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
