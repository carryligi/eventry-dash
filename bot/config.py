import os
from dotenv import load_dotenv
from supabase import create_client, Client
from supabase._async.client import create_client as create_async_client, AsyncClient

load_dotenv()

DISCORD_BOT_TOKEN: str = os.environ["DISCORD_BOT_TOKEN"]
SUPABASE_URL: str = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Discord constants
GUILD_ID = 1341267240540180542

TARGET_CATEGORIES = [
    1344768296372797614,
    1341277169191489628,
    1341277125092704266,
    1341277243573538919,
]

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
