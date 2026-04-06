"""
Pushover notification API.
POST https://api.pushover.net/1/messages.json
"""

import logging
import urllib.parse

import requests

logger = logging.getLogger(__name__)

PUSHOVER_URL = "https://api.pushover.net/1/messages.json"


def send_pushover(
    app_key: str,
    user_key: str,
    title: str,
    message: str,
    url: str | None = None,
    priority: int = 0,
) -> bool:
    """
    Send a Pushover notification.

    Returns True if the notification was sent successfully.
    """
    payload = {
        "token": app_key,
        "user": user_key,
        "title": title,
        "message": message,
        "priority": priority,
    }

    if url:
        payload["url"] = urllib.parse.quote(url, safe=":/?=&")
        payload["url_title"] = "Open Quicktask Link"

    if priority == 1:
        payload["sound"] = "siren"
    elif priority == 2:
        payload["sound"] = "siren"
        payload["retry"] = 30
        payload["expire"] = 3600

    try:
        response = requests.post(PUSHOVER_URL, data=payload, timeout=10)
        success = response.status_code == 200
        if not success:
            logger.warning(f"[PUSHOVER] Failed {response.status_code}: {response.text[:200]}")
        return success
    except Exception as e:
        logger.error(f"[PUSHOVER] Exception: {e}")
        return False
