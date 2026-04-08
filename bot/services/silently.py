"""
Silently quicktask API integration.
GET https://qt.silently.gg/?{product_params}&user_key={keys}&api_key={global_key}
"""

import logging
import urllib.parse

import requests

logger = logging.getLogger(__name__)


def trigger_silently(
    quicktask_url: str,
    user_keys: list[str],
    api_key: str,
) -> tuple[bool, int]:
    """
    Call the Silently quicktask API.

    Args:
        quicktask_url: Base URL extracted from embed (e.g. https://qt.silently.gg/?product=...)
        user_keys: List of per-user Silently keys (max 10 per batch)
        api_key: Global Silently API key from app_settings

    Returns:
        (success, http_status_code)
    """
    key_param = f"&user_key={','.join(user_keys)}&api_key={api_key}"
    request_url = f"{quicktask_url}{key_param}"

    try:
        response = requests.get(request_url, timeout=30)
        success = response.status_code == 200
        product = extract_product_url(quicktask_url)
        if success:
            logger.info(
                f"[SILENTLY] OK | Users: {len(user_keys)} | Product: {product}"
            )
        else:
            logger.warning(
                f"[SILENTLY] FAILED {response.status_code} | Users: {len(user_keys)} | "
                f"Product: {product}"
            )
        logger.debug(f"[SILENTLY] Full URL: {quicktask_url}")
        return success, response.status_code
    except Exception as e:
        logger.error(f"[SILENTLY] Request exception: {e}")
        return False, 0


def extract_product_url(quicktask_url: str) -> str:
    """Extract the product URL from a quicktask URL query params."""
    try:
        parsed = urllib.parse.urlparse(quicktask_url)
        params = urllib.parse.parse_qs(parsed.query)
        if "product" in params:
            return params["product"][0]
    except Exception:
        pass
    return "not found"
