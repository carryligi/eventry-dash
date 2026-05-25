"""
Core keyword matching and trigger orchestration.
Port of the original on_message logic — reads exclusively from BotCache (RAM).
"""

import asyncio
import logging
import re
from collections import defaultdict
from datetime import datetime, timedelta, time as dtime, timezone

import discord
import pytz

from cache import BotCache
from config import GUILD_ID, supabase, BOT_ROLE
from services import pushover, silently, webhooks
from services.supabase_db import write_notification_log, write_cooldown

logger = logging.getLogger(__name__)

# Concurrency limiter for Discord user fetches
FETCH_SEMAPHORE = asyncio.Semaphore(5)

# In-memory user object cache {str(user_id): (user_obj, timestamp)}
_user_cache: dict[str, tuple] = {}
_USER_CACHE_TTL = 3600


# ── Price helpers (ported 1:1) ───────────────────────────────────────────

def _extract_price_breaks(embed: discord.Embed) -> list[float] | None:
    """Extract all prices from the 'Price Breaks' field. Returns None if not found."""
    for field in embed.fields:
        if field.name and field.name.strip() == "Price Breaks":
            raw = re.findall(r"(\d+(?:\.\d+)?)\s*:", field.value or "")
            if raw:
                return [float(p) for p in raw]
            return None
    return None


def _check_price_limit(prices: list[float] | None, max_price: float | None) -> bool:
    """True if autostart is allowed (no limit, or at least one price <= max)."""
    if max_price is None:
        return True
    if prices is None:
        return False
    max_rounded = round(float(max_price), 2)
    return any(round(p, 2) <= max_rounded for p in prices)


def _extract_stock(embed: discord.Embed) -> int | None:
    """Extract stock value from embed's 'Stock' field."""
    for field in embed.fields:
        if field.name and field.name.strip().lower() == "stock":
            try:
                return int(field.value.strip())
            except (ValueError, AttributeError):
                pass
    return None


def _extract_quicktask_url(embed: discord.Embed) -> str | None:
    """Extract Silently quicktask URL from embed fields."""
    for field in embed.fields:
        if field.value and "https://qt.silently.gg/?" in field.value:
            match = re.search(r"https://qt\.silently\.gg/\?[^\s\)]+", field.value)
            if match:
                return match.group(0)
    return None


def _build_pushover_message(embed: discord.Embed, jump_url: str) -> str:
    """Build the Pushover notification message body from an embed."""
    parts = []
    if embed.title:
        parts.append(f"Title: {embed.title}")
    if embed.description:
        parts.append(f"Description: {embed.description}")
    if embed.url:
        parts.append(f"URL: {embed.url}")
    if embed.footer and embed.footer.text:
        parts.append(f"Footer: {embed.footer.text}")
    for f in embed.fields:
        parts.append(f"{f.name or 'Field'}: {f.value or 'N/A'}")
    parts.append(f"Jump to message: {jump_url}")
    return "\n".join(parts)


# ── User fetching ────────────────────────────────────────────────────────
# NOTE on IDs:
#   The DB rows are keyed by Whop user_id (e.g. "user_v0uynja6gMtkm", string).
#   Discord APIs need a numeric Discord snowflake (e.g. 581447756858785792).
#   The mapping whop_id -> discord_id lives in BotCache.discord_id_by_whop,
#   loaded from `profiles.discord_user_id` and kept in sync via Realtime.
#   Users without a Discord ID mapping are silently skipped (no crash, no spam).
#
#   `_user_cache` is keyed by **Discord ID** (the actual ID used against
#   Discord APIs), not the Whop ID.


async def _fetch_user(bot: discord.Client, discord_id: str) -> discord.User | None:
    """Fetch a Discord user object by their numeric Discord ID (as string)."""
    now = datetime.now(pytz.UTC).timestamp()
    if discord_id in _user_cache and now - _user_cache[discord_id][1] < _USER_CACHE_TTL:
        return _user_cache[discord_id][0]

    try:
        did_int = int(discord_id)
    except (ValueError, TypeError):
        logger.warning(f"Invalid Discord ID: {discord_id!r}")
        return None

    guild = bot.get_guild(GUILD_ID)
    if guild:
        member = guild.get_member(did_int)
        if member:
            _user_cache[discord_id] = (member, now)
            return member

    async with FETCH_SEMAPHORE:
        for attempt in range(3):
            try:
                user = await bot.fetch_user(did_int)
                _user_cache[discord_id] = (user, now)
                return user
            except discord.HTTPException as e:
                if e.status == 429:
                    retry = float(e.response.headers.get("X-RateLimit-Reset-After", 1))
                    await asyncio.sleep(retry)
                elif attempt == 2:
                    return None
                await asyncio.sleep(2**attempt + 0.1)
    return None


async def _batch_fetch_users(
    bot: discord.Client, cache: BotCache, whop_user_ids: set[str]
) -> dict[str, discord.User]:
    """
    Resolve a set of Whop user IDs to Discord user objects.

    Returns a dict keyed by the WHOP user id so downstream logic (which is
    keyed by whop id everywhere) keeps working unchanged. Whop users without
    a discord_user_id mapping are skipped with a debug log.
    """
    users: dict[str, discord.User] = {}
    guild = bot.get_guild(GUILD_ID)
    now = datetime.now(pytz.UTC).timestamp()

    missing_mapping: list[str] = []
    to_fetch: list[tuple[str, str]] = []  # (whop_id, discord_id)

    for whop_id in whop_user_ids:
        discord_id = cache.discord_id_by_whop.get(whop_id)
        if not discord_id:
            missing_mapping.append(whop_id)
            continue

        # Try memory cache first
        if discord_id in _user_cache and now - _user_cache[discord_id][1] < _USER_CACHE_TTL:
            users[whop_id] = _user_cache[discord_id][0]
            continue

        # Try guild member lookup
        if guild:
            try:
                m = guild.get_member(int(discord_id))
                if m:
                    _user_cache[discord_id] = (m, now)
                    users[whop_id] = m
                    continue
            except (ValueError, TypeError):
                logger.warning(
                    f"Invalid Discord ID mapping: whop={whop_id} discord={discord_id!r}"
                )
                continue

        to_fetch.append((whop_id, discord_id))

    if missing_mapping:
        logger.debug(
            f"Skip {len(missing_mapping)} users with no Discord ID mapping: "
            f"{missing_mapping[:5]}{'…' if len(missing_mapping) > 5 else ''}"
        )

    # Fall back to Discord API for any uncached/non-member users
    for whop_id, discord_id in to_fetch:
        u = await _fetch_user(bot, discord_id)
        if u:
            users[whop_id] = u

    return users


def _is_member(bot: discord.Client, user) -> bool:
    guild = bot.get_guild(GUILD_ID)
    return guild is not None and guild.get_member(user.id) is not None


# ── Schedule check ───────────────────────────────────────────────────────

def _is_in_schedule(schedule_start: str | None, schedule_end: str | None, now: datetime) -> bool:
    """Check if current CEST time is within the user's schedule window."""
    if not schedule_start or not schedule_end:
        return True  # No schedule = always allowed

    try:
        # Parse TIME strings like "09:00:00" or "09:00"
        parts_s = schedule_start.split(":")
        parts_e = schedule_end.split(":")
        start_t = dtime(int(parts_s[0]), int(parts_s[1]))
        end_t = dtime(int(parts_e[0]), int(parts_e[1]))
    except (ValueError, IndexError):
        return True  # Invalid format = allow

    current_t = now.time()
    if start_t <= end_t:
        return start_t <= current_t <= end_t
    else:
        # Overnight schedule (e.g. 22:00 - 06:00)
        return current_t >= start_t or current_t <= end_t


# ── Main message handler ────────────────────────────────────────────────

async def handle_message(bot: discord.Client, cache: BotCache, message: discord.Message):
    """
    Process a Discord message for keyword matches and trigger notifications.
    Reads exclusively from BotCache (RAM) — no DB queries.
    """
    # ── Gate checks (same as original) ──
    if isinstance(message.channel, discord.DMChannel) or not message.webhook_id:
        return
    if message.channel.category_id not in cache.app.allowed_category_ids:
        return
    if not message.embeds:
        return

    current_time = datetime.now(pytz.timezone("Europe/Berlin"))
    cache.cleanup_expired()

    for embed in message.embeds:
        # ── Build searchable text from embed ──
        embed_text = ""
        if embed.title:
            embed_text += embed.title + " "
        if embed.description:
            embed_text += embed.description + " "
        if embed.footer and embed.footer.text:
            embed_text += embed.footer.text + " "
        for field in embed.fields:
            embed_text += f"{field.name or ''} {field.value or ''} "
        embed_text = embed_text.lower()

        # ── Extract URLs and values from embed ──
        quicktask_url = _extract_quicktask_url(embed)
        pushover_msg = _build_pushover_message(embed, message.jump_url)
        embed_prices = _extract_price_breaks(embed)

        # Product-ID für den Cooldown: extrahiere den ?product=-Wert aus der
        # Quicktask-URL — varianten-übergreifend (size/color teilen sich
        # einen Cooldown, weil sie alle dieselbe product-URL enthalten).
        # Wenn keine Quicktask-URL vorhanden ist oder der ?product=-Param
        # fehlt, gibt extract_product_url "not found" zurück — in dem Fall
        # gibt es keinen stabilen Produkt-Key und der Cooldown greift
        # nicht (Notifications laufen normal durch).
        product_id: str | None = None
        if quicktask_url:
            extracted = silently.extract_product_url(quicktask_url)
            if extracted and extracted != "not found":
                product_id = extracted

        # ── Match keywords against all users ──
        # {keyword_text: {channel_id: [{user_id, keyword_id}, ...]}}
        keyword_matches: dict[str, dict[str, list[dict]]] = {}
        user_ids_to_fetch: set[str] = set()

        for user_id, user_keywords in cache.keywords.items():
            # ── Test bot filter ──
            # BOT_ROLE=test        → process ONLY admins (profiles.is_admin=true)
            # BOT_ROLE=production  → process EVERYONE (no filter)
            #
            # The test bot is meant to run temporarily alongside the prod bot
            # when you're verifying changes. When both are live, admins get
            # double-pings (one from prod, one from test) — that's acceptable
            # and keeps admins from losing notifications while the test bot
            # is off. Admin membership is read from profiles.is_admin and
            # kept in sync via _on_profile_change + periodic_resync.
            if BOT_ROLE == "test" and user_id not in cache.admin_ids:
                continue

            # NOTE: Global Pinger (pinger_settings.is_active) is NO LONGER a
            # full-user gate here — it only disables DM + Pushover further
            # down. Users with pinger OFF must still reach the Silently
            # autostart + autostart webhook paths, which are orthogonal to
            # the notification toggle.

            # Product-Cooldown auf User-Level: ist dieses Produkt für diesen
            # User noch im Cooldown-Fenster, überspringen wir ALLE Keyword-
            # Matches dieses Embeds. Channel-übergreifend, varianten-
            # übergreifend (size/color), gilt für DM, Pushover,
            # Silently/Autostart und Webhook gleichermaßen.
            # Ohne stabile Product-ID (kein Quicktask-URL oder kein
            # ?product=-Param) greift kein Cooldown.
            if product_id and cache.is_on_cooldown(user_id, product_id):
                logger.info(f"[COOLDOWN] Skip {user_id} | Product matched in last window")
                continue

            for kw in user_keywords:
                if kw.keyword not in embed_text:
                    continue

                cid_str = str(message.channel.id)

                # Channel/category restriction check — OR over both scopes.
                # A keyword with BOTH scopes empty is a "global" keyword and
                # matches everywhere the bot listens (same behaviour as the
                # old Python Eventry tool).
                channel_ids = kw.channel_ids or []
                category_ids = kw.category_ids or []

                is_global = not channel_ids and not category_ids
                match_ok = is_global

                if not match_ok and channel_ids and cid_str in [str(c) for c in channel_ids]:
                    match_ok = True
                elif not match_ok and category_ids:
                    msg_cat = message.channel.category_id
                    if msg_cat is not None:
                        match_ok = str(msg_cat) in [str(c) for c in category_ids]

                if match_ok:
                    keyword_matches.setdefault(kw.keyword, {}).setdefault(cid_str, []).append(
                        {
                            "user_id": user_id,
                            "keyword_id": kw.id,
                            # Per-keyword override; None = fall back to silently.min_stock later.
                            "kw_min_stock": kw.min_stock,
                        }
                    )
                    user_ids_to_fetch.add(user_id)
                    # User-facing activity log — one line per (user, keyword, channel)
                    # that actually passes the matching filters. Gives a live feed
                    # of "what the bot is reacting to" without the downstream DM
                    # success noise.
                    _uname = cache.username_by_whop.get(user_id) or user_id[:12]
                    _cname = getattr(message.channel, "name", cid_str)
                    logger.info(f"[MATCH] {_uname} | '{kw.keyword}' | #{_cname}")

                    # Product-Cooldown SOFORT setzen (vor jedem await), um Races
                    # zwischen konkurrenten handle_message-Tasks zu schliessen.
                    # discord.py dispatcht on_message als Tasks; ohne diesen
                    # frühen Set sehen parallele Bursts denselben "noch nicht
                    # gesetzt"-Zustand und feuern alle. Idempotent: bei mehreren
                    # passenden Keywords desselben Users im selben Embed
                    # setzt der erste Match den Cooldown, der Loop läuft aber
                    # weiter (Notifications für alle gematchten Keywords gehen
                    # raus, der Cooldown blockt erst die NÄCHSTEN Messages für
                    # dasselbe Produkt). Setzt nur, wenn eine stabile Product-ID
                    # extrahiert wurde — Embeds ohne ?product=-Param haben
                    # keinen Key und keinen Cooldown.
                    if product_id:
                        _pinger = cache.pinger.get(user_id)
                        if _pinger and _pinger.cooldown_minutes > 0:
                            _expiry = current_time + timedelta(minutes=_pinger.cooldown_minutes)
                            cache.set_cooldown(user_id, product_id, _expiry)
                            asyncio.create_task(write_cooldown(user_id, product_id, _expiry))
                            logger.info(f"[COOLDOWN SET] {user_id} | Product (cooldown {_pinger.cooldown_minutes}m)")

        if not keyword_matches:
            continue

        # ── Fetch Discord user objects ──
        # user_ids_to_fetch contains WHOP user ids; _batch_fetch_users
        # translates them to Discord ids via the cache mapping.
        users = await _batch_fetch_users(bot, cache, user_ids_to_fetch)
        silently_queue: list[dict] = []

        for keyword, channels in keyword_matches.items():
            for channel_id_str, user_data_list in channels.items():
                for ud in user_data_list:
                    user_id = ud["user_id"]
                    keyword_id = ud["keyword_id"]
                    user = users.get(user_id)
                    if user is None or not _is_member(bot, user):
                        continue

                    dm_sent = False
                    pushover_sent = False
                    silently_triggered = False
                    silently_success = None
                    webhook_sent = False

                    # Global Pinger gate — only affects DM + Pushover below.
                    # Silently + autostart webhooks further down are
                    # orthogonal and must still fire when pinger is off.
                    pinger = cache.pinger.get(user_id)
                    pinger_on = bool(pinger and pinger.is_active)

                    # ── DM notification (pinger-gated, per-keyword opt-out) ──
                    dm_disabled = cache.dm_disabled.get(user_id, set())
                    if pinger_on and keyword_id not in dm_disabled:
                        dm_embed = discord.Embed(
                            title="Keyword Match Found",
                            color=0xADADAD,
                            timestamp=datetime.now(timezone.utc),
                        )
                        dm_embed.add_field(name="Keyword", value=f'"{keyword}"', inline=False)
                        dm_embed.add_field(name="User", value=user.mention, inline=False)
                        dm_embed.add_field(name="Message Link", value=message.jump_url, inline=False)
                        try:
                            await user.send(embed=dm_embed)
                            dm_sent = True
                        except Exception as e:
                            logger.error(f"DM failed for {user_id}: {e}")

                    # ── Pushover (pinger-gated) ──
                    # Cache is used only as a cheap "does this user have pushover at all?"
                    # gate. The actual user_key and priority are re-read fresh from the DB
                    # right before sending, because cache.pushover is realtime-only and
                    # can drift silently (single lost UPDATE event = stale priority until
                    # bot restart). Cost: one single-row PK lookup per pushover send.
                    po = cache.pushover.get(user_id)
                    po_disabled = cache.pushover_disabled.get(user_id, set())
                    if pinger_on and po and po.user_key and keyword_id not in po_disabled:
                        try:
                            fresh_rows = (
                                supabase.table("pushover_settings")
                                .select("user_key, priority")
                                .eq("user_id", user_id)
                                .limit(1)
                                .execute()
                                .data
                                or []
                            )
                        except Exception as e:
                            logger.warning(
                                f"[Pushover] Fresh read failed for {user_id}, "
                                f"falling back to cache: {e}"
                            )
                            fresh_rows = None

                        if fresh_rows:
                            po_user_key = fresh_rows[0].get("user_key") or po.user_key
                            po_priority = fresh_rows[0].get("priority", po.priority)
                        else:
                            # Fresh read failed OR the row was deleted since the cache
                            # was populated. Fall back to cache so we don't silently
                            # drop notifications on transient DB hiccups.
                            po_user_key = po.user_key
                            po_priority = po.priority

                        if po_user_key:
                            try:
                                pushover_sent = pushover.send_pushover(
                                    app_key=cache.app.pushover_app_key,
                                    user_key=po_user_key,
                                    title=f"Keyword Match: {keyword}",
                                    message=pushover_msg,
                                    url=quicktask_url,
                                    priority=po_priority,
                                )
                            except Exception as e:
                                logger.error(f"Pushover exception for {user_id}: {e}")

                    # ── Silently autostart filter ──
                    sl = cache.silently.get(user_id)
                    disabled = cache.disabled_keywords.get(user_id, set())
                    keyword_autostart_ok = keyword not in disabled
                    price_ok = _check_price_limit(embed_prices, _get_max_price(cache, user_id, keyword))

                    if not price_ok:
                        if embed_prices is None:
                            logger.info(
                                f"[PRICE] Skip {user_id} | '{keyword}' | No Price Breaks field"
                            )
                        else:
                            logger.info(
                                f"[PRICE] Skip {user_id} | '{keyword}' | "
                                f"All prices {[round(p,2) for p in embed_prices]} > max"
                            )

                    if (
                        quicktask_url
                        and sl
                        and sl.user_key
                        and sl.is_active
                        and keyword_autostart_ok
                        and price_ok
                    ):
                        # Per-keyword min_stock overrides the global silently_settings
                        # value. None = inherit global (backwards-compatible default).
                        kw_min_stock = ud.get("kw_min_stock")
                        effective_min_stock = (
                            kw_min_stock if kw_min_stock is not None else sl.min_stock
                        )
                        silently_queue.append({
                            "user_id": user_id,
                            "key": sl.user_key,
                            "keyword_id": keyword_id,
                            "keyword": keyword,
                            "min_stock": effective_min_stock,
                            "schedule_start": sl.schedule_start,
                            "schedule_end": sl.schedule_end,
                            # Remember whether DM was actually sent for this
                            # match so the silently-path notification_log
                            # doesn't lie when pinger was off.
                            "dm_sent": dm_sent,
                            "pushover_sent": pushover_sent,
                        })
                    elif not keyword_autostart_ok:
                        logger.info(f"[DISABLED KW] Skip {user_id} | '{keyword}'")

                    # Cooldown wurde bereits beim Match-Time gesetzt (siehe oben),
                    # bevor irgendein await das Event-Loop yieldet. Dadurch sind
                    # konkurrente handle_message-Bursts korrekt geblockt.

                    # ── Write notification log (without silently result yet) ──
                    # Silently result will be logged after batch processing below
                    if not (quicktask_url and sl and sl.user_key and sl.is_active and keyword_autostart_ok and price_ok):
                        # No silently attempt — log now
                        asyncio.create_task(write_notification_log(
                            user_id=user_id,
                            keyword_id=keyword_id,
                            keyword_text=keyword,
                            channel_id=channel_id_str,
                            channel_name=getattr(message.channel, "name", None),
                            message_url=message.jump_url,
                            dm_sent=dm_sent,
                            pushover_sent=pushover_sent,
                            silently_triggered=False,
                            silently_success=None,
                            webhook_sent=False,
                        ))

        # ── Silently batch processing ──
        if silently_queue and quicktask_url:
            stock_value = _extract_stock(embed)

            # Apply schedule + stock filters
            filtered = []
            for entry in silently_queue:
                # Schedule filter
                if not _is_in_schedule(entry["schedule_start"], entry["schedule_end"], current_time):
                    logger.info(
                        f"[SCHEDULE] Skip {entry['user_id']} | "
                        f"Outside {entry['schedule_start']}-{entry['schedule_end']}"
                    )
                    # Log as not triggered
                    asyncio.create_task(write_notification_log(
                        user_id=entry["user_id"],
                        keyword_id=entry["keyword_id"],
                        keyword_text=entry["keyword"],
                        channel_id=str(message.channel.id),
                        channel_name=getattr(message.channel, "name", None),
                        message_url=message.jump_url,
                        dm_sent=entry.get("dm_sent", False),
                        pushover_sent=entry.get("pushover_sent", False),
                        silently_triggered=False,
                        stock_value=stock_value,
                    ))
                    continue

                # Stock filter
                min_val = entry["min_stock"]
                if stock_value is not None and stock_value < min_val:
                    logger.info(f"[STOCK] Skip {entry['user_id']} | {stock_value} < {min_val}")
                    asyncio.create_task(write_notification_log(
                        user_id=entry["user_id"],
                        keyword_id=entry["keyword_id"],
                        keyword_text=entry["keyword"],
                        channel_id=str(message.channel.id),
                        channel_name=getattr(message.channel, "name", None),
                        message_url=message.jump_url,
                        dm_sent=entry.get("dm_sent", False),
                        pushover_sent=entry.get("pushover_sent", False),
                        silently_triggered=False,
                        stock_value=stock_value,
                    ))
                    continue

                filtered.append(entry)

            # Extract embed info for webhook notifications (shared across all chunks)
            product_title = embed.title or "Unknown Product"
            price_info = "—"
            stock_info = "—"
            for field in embed.fields:
                fname = (field.name or "").strip().lower()
                if fname == "price breaks":
                    price_info = field.value or "—"
                elif fname == "stock":
                    stock_info = field.value or "—"

            # Accumulate per-user results for a SINGLE aggregated admin log webhook
            # sent once after all Silently chunks have been processed.
            admin_log_results: list[dict] = []

            # Batch in chunks of 10 (Silently API limit)
            for i in range(0, len(filtered), 10):
                chunk = filtered[i : i + 10]
                user_keys = [u["key"] for u in chunk]

                success, http_status = silently.trigger_silently(
                    quicktask_url=quicktask_url,
                    user_keys=user_keys,
                    api_key=cache.app.silently_api_key,
                )

                for entry in chunk:
                    uid = entry["user_id"]

                    # Send user webhook notification (still per-user)
                    wh = cache.webhooks.get(uid)
                    wh_sent = False
                    if wh and wh.webhook_url and wh.is_active:
                        try:
                            wh_sent = webhooks.send_autostart_webhook(
                                webhook_url=wh.webhook_url,
                                keyword=entry["keyword"],
                                quicktask_url=quicktask_url,
                                product_title=product_title,
                                product_description=embed.description or "",
                                price_info=price_info,
                                stock_info=stock_info,
                                message_jump_url=message.jump_url,
                                http_status=http_status,
                                template=cache.app.webhook_user_payload_template,
                            )
                        except Exception as e:
                            logger.error(f"[WEBHOOK] Failed for {uid}: {e}")

                    # Collect for the aggregated admin log webhook
                    admin_log_results.append({
                        "whop_user_id": uid,
                        "discord_user_id": cache.discord_id_by_whop.get(uid),
                        "silently_key": entry["key"],
                        "keyword": entry["keyword"],
                        "http_status": http_status,
                    })

                    # Log to notification_log
                    asyncio.create_task(write_notification_log(
                        user_id=uid,
                        keyword_id=entry["keyword_id"],
                        keyword_text=entry["keyword"],
                        channel_id=str(message.channel.id),
                        channel_name=getattr(message.channel, "name", None),
                        message_url=message.jump_url,
                        dm_sent=entry.get("dm_sent", False),
                        pushover_sent=entry.get("pushover_sent", False),
                        silently_triggered=True,
                        silently_success=success,
                        webhook_sent=wh_sent,
                        stock_value=stock_value,
                    ))

            # Send ONE aggregated admin log webhook for this quicktask URL,
            # containing every user who was triggered in this event.
            log_url = cache.app.autostart_log_webhook_url
            if log_url and admin_log_results:
                try:
                    webhooks.send_autostart_log_webhook(
                        log_webhook_url=log_url,
                        quicktask_url=quicktask_url,
                        product_title=product_title,
                        channel_name=getattr(message.channel, "name", None),
                        message_jump_url=message.jump_url,
                        results=admin_log_results,
                        template=cache.app.webhook_admin_payload_template,
                    )
                except Exception as e:
                    logger.error(f"[LOG WEBHOOK] Aggregated send failed: {e}")


def _get_max_price(cache: BotCache, user_id: str, keyword: str) -> float | None:
    """Get the max_price for a specific user+keyword from the keywords cache."""
    for kw in cache.keywords.get(user_id, []):
        if kw.keyword == keyword and kw.max_price is not None:
            return kw.max_price
    return None
