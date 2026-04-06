import os
from dotenv import load_dotenv
from supabase import create_client, Client

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

# Supabase client (service role — bypasses RLS)
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
