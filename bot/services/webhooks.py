"""
Discord webhook notifications for autostart events.
"""

import logging
import urllib.parse
from datetime import datetime

import pytz
import requests

logger = logging.getLogger(__name__)


def send_autostart_webhook(
    webhook_url: str,
    keyword: str,
    quicktask_url: str,
    product_title: str,
    product_description: str,
    price_info: str,
    stock_info: str,
    message_jump_url: str,
    http_status: int,
) -> bool:
    """
    Send a professional embed notification to the user's autostart webhook.
    Called after a Silently autostart attempt for a matched keyword.
    """
    now_cest = datetime.now(pytz.timezone("Europe/Berlin"))
    timestamp_str = now_cest.strftime("%d.%m.%Y %H:%M:%S CEST")

    # Extract product link from quicktask URL
    product_link = "—"
    try:
        parsed = urllib.parse.urlparse(quicktask_url)
        params = urllib.parse.parse_qs(parsed.query)
        if "product" in params:
            product_link = params["product"][0]
    except Exception:
        pass

    status_text = f"✅ {http_status} OK" if http_status == 200 else f"❌ {http_status} Failed"

    payload = {
        "embeds": [
            {
                "title": "🚀 Autostart Triggered",
                "color": 0xADADAD,
                "timestamp": datetime.utcnow().isoformat(),
                "fields": [
                    {"name": "Keyword", "value": f"`{keyword}`", "inline": True},
                    {"name": "Status", "value": status_text, "inline": True},
                    {"name": "Product", "value": product_title[:256], "inline": False},
                    {"name": "Price Breaks", "value": price_info[:256], "inline": True},
                    {"name": "Stock", "value": stock_info[:64], "inline": True},
                    {
                        "name": "Product Link",
                        "value": product_link[:512] if product_link != "—" else "—",
                        "inline": False,
                    },
                    {
                        "name": "Message",
                        "value": f"[Jump to original message]({message_jump_url})",
                        "inline": False,
                    },
                ],
                "footer": {"text": f"Eventry Autostart • {timestamp_str}"},
            }
        ]
    }

    try:
        response = requests.post(webhook_url, json=payload, timeout=10)
        if response.status_code not in (200, 204):
            logger.warning(
                f"[WEBHOOK] Delivery failed | Status: {response.status_code} | URL: {webhook_url[:60]}"
            )
            return False
        logger.info(f"[WEBHOOK] Delivered | Keyword: {keyword}")
        return True
    except Exception as e:
        logger.error(f"[WEBHOOK] Exception: {e}")
        return False
