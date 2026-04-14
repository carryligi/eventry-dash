"""
Eventry Discord Bot — Supabase Edition
Monitors Discord messages for keyword matches and triggers notifications.
All configuration is read from Supabase (via Dashboard), not JSON files.
"""

import asyncio
import logging

import discord

from config import DISCORD_BOT_TOKEN, GUILD_ID
from cache import BotCache
from handlers.message import handle_message


class CleanFormatter(logging.Formatter):
    """Terse formatter: ``HH:MM:SS  message`` for INFO, with a level
    prefix for WARNING and above. No logger name, no full date — the
    goal is one glanceable line per event, not structured parsing.
    """

    def format(self, record: logging.LogRecord) -> str:
        ts = self.formatTime(record, "%H:%M:%S")
        msg = record.getMessage()
        if record.exc_info:
            msg = f"{msg}\n{self.formatException(record.exc_info)}"
        if record.levelno >= logging.WARNING:
            return f"{ts}  [{record.levelname}] {msg}"
        return f"{ts}  {msg}"


_handler = logging.StreamHandler()
_handler.setFormatter(CleanFormatter())
logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)

# Silence noisy third-party libraries. Their INFO output otherwise
# spams the console with Discord gateway events, httpx HTTP request
# lines, and — most importantly — full Realtime WebSocket payloads
# which include the Supabase service_role JWT in cleartext. Keeping
# them at WARNING means we still see genuine problems without the
# per-message noise and without accidentally leaking the token.
for _noisy in (
    "httpx",
    "httpcore",
    "discord",
    "discord.client",
    "discord.gateway",
    "discord.http",
    "discord.state",
    "realtime",
    "realtime._async.client",
    "realtime._async.channel",
    "websockets",
    "websockets.client",
    "urllib3",
):
    logging.getLogger(_noisy).setLevel(logging.WARNING)

logger = logging.getLogger(__name__)

# Discord client setup
intents = discord.Intents.default()
intents.message_content = True
intents.messages = True
intents.members = True

bot = discord.Client(intents=intents)
cache = BotCache()

bot_start_time = None


@bot.event
async def on_ready():
    global bot_start_time

    # Load all settings from Supabase into RAM
    await cache.load_all()

    # Subscribe to Realtime changes (instant cache updates). Wrapped in
    # try/except so a startup hiccup doesn't prevent the bot from handling
    # Discord messages — the watchdog will try to reconnect on the next
    # 1006 signal anyway.
    try:
        await cache.subscribe()
    except Exception as e:
        logger.error(f"Realtime subscribe failed on startup: {e}", exc_info=True)

    # Start the Realtime watchdog. on_ready can fire multiple times when
    # discord.py reconnects, so only start a new task if the previous one
    # is absent or already finished.
    if cache._watchdog_task is None or cache._watchdog_task.done():
        cache._watchdog_task = asyncio.create_task(cache.watchdog())

    # Start the periodic cache resync task. Safety net for silently-dropped
    # Realtime events — re-reads small settings tables from the DB every 60s
    # so stale priorities / keys / webhooks self-heal without a bot restart.
    if cache._resync_task is None or cache._resync_task.done():
        cache._resync_task = asyncio.create_task(cache.periodic_resync(60))

    bot_start_time = discord.utils.utcnow()
    logger.info(f"Bot ready: {bot.user} | Guild: {GUILD_ID}")
    logger.info(f"Cache: {sum(len(v) for v in cache.keywords.values())} keywords loaded")
    logger.info("Supabase Realtime subscriptions active — zero-delay sync")


@bot.event
async def on_message(message: discord.Message):
    # Ignore messages from before bot started
    if bot_start_time is None or message.created_at < bot_start_time:
        return

    await handle_message(bot, cache, message)


if __name__ == "__main__":
    bot.run(DISCORD_BOT_TOKEN)
