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
from config import GUILD_ID, TARGET_CATEGORIES
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

async def _fetch_user(bot: discord.Client, user_id: str) -> discord.User | None:
    now = datetime.now(pytz.UTC).timestamp()
    if user_id in _user_cache and now - _user_cache[user_id][1] < _USER_CACHE_TTL:
        return _user_cache[user_id][0]

    guild = bot.get_guild(GUILD_ID)
    if guild:
        member = guild.get_member(int(user_id))
        if member:
            _user_cache[user_id] = (member, now)
            return member

    async with FETCH_SEMAPHORE:
        for attempt in range(3):
            try:
                user = await bot.fetch_user(int(user_id))
                _user_cache[user_id] = (user, now)
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
    bot: discord.Client, user_ids: set[str]
) -> dict[str, discord.User]:
    users = {}
    guild = bot.get_guild(GUILD_ID)
    now = datetime.now(pytz.UTC).timestamp()

    for uid in user_ids:
        if uid in _user_cache and now - _user_cache[uid][1] < _USER_CACHE_TTL:
            users[uid] = _user_cache[uid][0]
            continue
        if guild:
            m = guild.get_member(int(uid))
            if m:
                _user_cache[uid] = (m, now)
                users[uid] = m
                continue

    uncached = user_ids - set(users.keys())
    for uid in uncached:
        u = await _fetch_user(bot, uid)
        if u:
            users[uid] = u

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
    if message.channel.category_id not in TARGET_CATEGORIES:
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

        # ── Match keywords against all users ──
        # {keyword_text: {channel_id: [{user_id, keyword_id}, ...]}}
        keyword_matches: dict[str, dict[str, list[dict]]] = {}
        user_ids_to_fetch: set[str] = set()

        for user_id, user_keywords in cache.keywords.items():
            # Check pinger is active
            pinger = cache.pinger.get(user_id)
            if not pinger or not pinger.is_active:
                continue

            for kw in user_keywords:
                if kw.keyword not in embed_text:
                    continue

                cid_str = str(message.channel.id)

                # Cooldown check
                if cache.is_on_cooldown(user_id, cid_str, kw.id):
                    logger.info(f"[COOLDOWN] Skip {user_id} | KW {kw.id} | Ch {cid_str}")
                    continue

                # Channel/category restriction check — OR over both scopes.
                # A keyword must have at least one scope after the multi_category
                # migration; defense-in-depth: both empty -> no match.
                channel_ids = kw.channel_ids or []
                category_ids = kw.category_ids or []

                match_ok = False
                if channel_ids and cid_str in [str(c) for c in channel_ids]:
                    match_ok = True
                elif category_ids:
                    msg_cat = message.channel.category_id
                    if msg_cat is not None:
                        match_ok = str(msg_cat) in [str(c) for c in category_ids]

                if match_ok:
                    keyword_matches.setdefault(kw.keyword, {}).setdefault(cid_str, []).append(
                        {"user_id": user_id, "keyword_id": kw.id}
                    )
                    user_ids_to_fetch.add(user_id)

        if not keyword_matches:
            continue

        # ── Fetch Discord user objects ──
        users = await _batch_fetch_users(bot, user_ids_to_fetch)
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

                    # ── DM notification ──
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

                    # ── Pushover ──
                    po = cache.pushover.get(user_id)
                    if po and po.user_key:
                        try:
                            pushover_sent = pushover.send_pushover(
                                app_key=cache.app.pushover_app_key,
                                user_key=po.user_key,
                                title=f"Keyword Match: {keyword}",
                                message=pushover_msg,
                                url=quicktask_url,
                                priority=po.priority,
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
                        silently_queue.append({
                            "user_id": user_id,
                            "key": sl.user_key,
                            "keyword_id": keyword_id,
                            "keyword": keyword,
                            "min_stock": sl.min_stock,
                            "schedule_start": sl.schedule_start,
                            "schedule_end": sl.schedule_end,
                        })
                    elif not keyword_autostart_ok:
                        logger.info(f"[DISABLED KW] Skip {user_id} | '{keyword}'")

                    # ── Cooldown ──
                    pinger = cache.pinger.get(user_id)
                    if dm_sent and pinger and pinger.cooldown_minutes > 0:
                        expiry = current_time + timedelta(minutes=pinger.cooldown_minutes)
                        cache.set_cooldown(user_id, channel_id_str, keyword_id, expiry)
                        asyncio.create_task(write_cooldown(user_id, channel_id_str, keyword_id, expiry))
                        logger.info(f"[COOLDOWN SET] {user_id} | KW {keyword_id} | Ch {channel_id_str}")

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
                        dm_sent=True,
                        pushover_sent=cache.pushover.get(entry["user_id"]) is not None,
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
                        dm_sent=True,
                        pushover_sent=cache.pushover.get(entry["user_id"]) is not None,
                        silently_triggered=False,
                        stock_value=stock_value,
                    ))
                    continue

                filtered.append(entry)

            # Batch in chunks of 10
            for i in range(0, len(filtered), 10):
                chunk = filtered[i : i + 10]
                user_keys = [u["key"] for u in chunk]

                success, http_status = silently.trigger_silently(
                    quicktask_url=quicktask_url,
                    user_keys=user_keys,
                    api_key=cache.app.silently_api_key,
                )

                # Extract embed info for webhook notifications
                product_title = embed.title or "Unknown Product"
                price_info = "—"
                stock_info = "—"
                for field in embed.fields:
                    fname = (field.name or "").strip().lower()
                    if fname == "price breaks":
                        price_info = field.value or "—"
                    elif fname == "stock":
                        stock_info = field.value or "—"

                for entry in chunk:
                    uid = entry["user_id"]

                    # Send user webhook notification
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
                            )
                        except Exception as e:
                            logger.error(f"[WEBHOOK] Failed for {uid}: {e}")

                    # Log to notification_log
                    asyncio.create_task(write_notification_log(
                        user_id=uid,
                        keyword_id=entry["keyword_id"],
                        keyword_text=entry["keyword"],
                        channel_id=str(message.channel.id),
                        channel_name=getattr(message.channel, "name", None),
                        message_url=message.jump_url,
                        dm_sent=True,
                        pushover_sent=cache.pushover.get(uid) is not None,
                        silently_triggered=True,
                        silently_success=success,
                        webhook_sent=wh_sent,
                        stock_value=stock_value,
                    ))


def _get_max_price(cache: BotCache, user_id: str, keyword: str) -> float | None:
    """Get the max_price for a specific user+keyword from the keywords cache."""
    for kw in cache.keywords.get(user_id, []):
        if kw.keyword == keyword and kw.max_price is not None:
            return kw.max_price
    return None
