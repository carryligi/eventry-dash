"""
Discord webhook notifications for autostart events.

Templates are loaded from `app_settings` (edited in the Dashboard Admin Panel)
and rendered with mustache-style `{{variable}}` substitution. Falls back to
hardcoded defaults if no template is configured or the template is invalid.
"""

import logging
import urllib.parse
from typing import Optional

import requests

from services.webhook_templates import (
    DEFAULT_USER_WEBHOOK_TEMPLATE,
    DEFAULT_ADMIN_WEBHOOK_TEMPLATE,
    build_user_vars,
    build_admin_vars,
    render_template,
)

logger = logging.getLogger(__name__)


def _decode_product_link(quicktask_url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(quicktask_url)
        params = urllib.parse.parse_qs(parsed.query)
        if "product" in params:
            return params["product"][0]
    except Exception:
        pass
    return "—"


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
    template: Optional[str] = None,
) -> bool:
    """
    Send a Discord embed notification to the user's autostart webhook.
    Uses the admin-configured template if provided, falls back to default.
    """
    product_link = _decode_product_link(quicktask_url)
    variables = build_user_vars(
        keyword=keyword,
        http_status=http_status,
        product_title=product_title,
        product_description=product_description,
        price_info=price_info,
        stock_info=stock_info,
        product_link=product_link,
        message_jump_url=message_jump_url,
    )

    payload = None
    if template:
        payload = render_template(template, variables)
        if payload is None:
            logger.warning("[WEBHOOK] Custom user template failed to render, using default")
    if payload is None:
        payload = render_template(DEFAULT_USER_WEBHOOK_TEMPLATE, variables)
    if payload is None:
        logger.error("[WEBHOOK] Default user template failed to render — this should never happen")
        return False

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


def send_autostart_log_webhook(
    log_webhook_url: str,
    quicktask_url: str,
    product_title: str,
    channel_name: Optional[str],
    message_jump_url: str,
    results: list[dict],
    template: Optional[str] = None,
) -> bool:
    """
    Send a SINGLE aggregated admin audit log entry for one autostart event.

    `results` contains one dict per user who was part of the same quicktask
    trigger. Required keys per dict:
        discord_user_id, whop_user_id, silently_key, keyword, http_status

    Previously this function sent one webhook PER user. Now it fires exactly
    once per quicktask event, with a condensed user list inside the payload.
    """
    if not log_webhook_url or not results:
        return False

    product_link = _decode_product_link(quicktask_url)
    variables = build_admin_vars(
        product_title=product_title,
        product_link=product_link,
        channel_name=channel_name or "",
        message_jump_url=message_jump_url,
        results=results,
    )

    payload = None
    if template:
        payload = render_template(template, variables)
        if payload is None:
            logger.warning("[LOG WEBHOOK] Custom admin template failed to render, using default")
    if payload is None:
        payload = render_template(DEFAULT_ADMIN_WEBHOOK_TEMPLATE, variables)
    if payload is None:
        logger.error("[LOG WEBHOOK] Default admin template failed to render — this should never happen")
        return False

    try:
        response = requests.post(log_webhook_url, json=payload, timeout=10)
        if response.status_code not in (200, 204):
            logger.warning(
                f"[LOG WEBHOOK] Delivery failed | Status: {response.status_code}"
            )
            return False
        logger.info(
            f"[LOG WEBHOOK] Delivered | users={len(results)} | product={product_title[:60]}"
        )
        return True
    except Exception as e:
        logger.error(f"[LOG WEBHOOK] Exception: {e}")
        return False
