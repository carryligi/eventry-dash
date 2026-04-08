from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Keyword:
    id: str
    user_id: str
    keyword: str
    internal_name: Optional[str] = None
    channel_ids: Optional[list[str]] = None
    category_ids: Optional[list[str]] = None
    max_price: Optional[float] = None


@dataclass
class PingerSettings:
    user_id: str
    is_active: bool = False
    cooldown_minutes: int = 0


@dataclass
class SilentlySettings:
    user_id: str
    user_key: str = ""
    is_active: bool = False
    min_stock: int = 0
    schedule_start: Optional[str] = None  # TIME string e.g. "09:00:00"
    schedule_end: Optional[str] = None


@dataclass
class PushoverSettings:
    user_id: str
    user_key: str = ""
    priority: int = 0  # 0=normal, 1=high, 2=emergency


@dataclass
class WebhookSettings:
    user_id: str
    webhook_url: str = ""
    is_active: bool = False


@dataclass
class AppSettings:
    silently_api_key: str = ""
    pushover_app_key: str = ""
    discord_bot_token: str = ""
    guild_id: str = ""
