import os
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase._async.client import create_client as create_async_client, AsyncClient

load_dotenv()

DISCORD_BOT_TOKEN: str = os.environ["DISCORD_BOT_TOKEN"]
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Bot role — controls which users this instance processes:
#   production (default) → processes every user (no filter)
#   test                 → processes ONLY admins (profiles.is_admin=true),
#                          meant to run temporarily alongside prod while
#                          you're verifying changes.
# When both instances are live, admin users intentionally receive two
# notifications per match (one from each bot's Discord token). When the
# test bot is stopped, admins behave like any other user and get their
# normal notifications from the prod bot.
BOT_ROLE: str = os.environ.get("BOT_ROLE", "production").strip().lower()
if BOT_ROLE not in ("production", "test"):
    raise ValueError(
        f"BOT_ROLE must be 'production' or 'test', got {BOT_ROLE!r}"
    )

# Discord constants
GUILD_ID = 1341267240540180542

AUTHORIZED_ROLES = [
    1341269862281908337,
    1341269230112346162,
    1341269744720023562,
]

# Sync client for regular DB queries (service role — bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Async client for Realtime subscriptions (initialized lazily in cache.py)
_async_client: AsyncClient | None = None


async def get_async_supabase() -> AsyncClient:
    global _async_client
    if _async_client is None:
        _async_client = await create_async_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return _async_client


async def reset_async_supabase() -> AsyncClient:
    """Teardown the existing async client completely and create a fresh one.

    Used by the Realtime watchdog when WebSocket 1006 leaves the socket dead
    but reports channels as SUBSCRIBED (silent event loss). A new client is
    returned so callers can immediately re-subscribe.
    """
    global _async_client
    if _async_client is not None:
        try:
            await _async_client.realtime.close()
        except Exception:
            pass
        _async_client = None
    return await get_async_supabase()
