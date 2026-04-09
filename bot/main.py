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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
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
