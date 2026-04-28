"""
Supabase write operations.
Read operations are handled by the cache (loaded at startup + Realtime).
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from config import supabase

logger = logging.getLogger(__name__)


async def write_notification_log(
    user_id: str,
    keyword_id: Optional[str],
    keyword_text: str,
    channel_id: Optional[str],
    channel_name: Optional[str],
    message_url: Optional[str],
    dm_sent: bool = False,
    pushover_sent: bool = False,
    silently_triggered: bool = False,
    silently_success: Optional[bool] = None,
    webhook_sent: bool = False,
    stock_value: Optional[int] = None,
):
    """Insert a notification log entry."""
    try:
        supabase.table("notification_log").insert({
            "user_id": user_id,
            "keyword_id": keyword_id,
            "keyword_text": keyword_text,
            "channel_id": channel_id,
            "channel_name": channel_name,
            "message_url": message_url,
            "dm_sent": dm_sent,
            "pushover_sent": pushover_sent,
            "silently_triggered": silently_triggered,
            "silently_success": silently_success,
            "webhook_sent": webhook_sent,
            "stock_value": stock_value,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to write notification_log: {e}")


async def write_cooldown(user_id: str, product_id: str, expires_at: datetime):
    """Upsert an active cooldown.

    product_id is the full Quicktask URL (e.g. https://qt.silently.gg/?...).
    Cooldown ist channel-übergreifend pro (user, product) — wenn dasselbe
    Produkt in mehreren Channels gepostet wird, blockt der Cooldown alle.
    """
    try:
        supabase.table("active_cooldowns").upsert(
            {
                "user_id": user_id,
                "product_id": product_id,
                "expires_at": expires_at.isoformat(),
            },
            on_conflict="user_id,product_id",
        ).execute()
    except Exception as e:
        logger.error(f"Failed to write cooldown: {e}")


async def delete_expired_cooldowns():
    """Remove expired cooldowns from DB."""
    try:
        supabase.table("active_cooldowns").delete().lt(
            "expires_at", datetime.now(timezone.utc).isoformat()
        ).execute()
    except Exception as e:
        logger.error(f"Failed to clean cooldowns: {e}")
