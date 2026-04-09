"""
Shared Discord webhook payload templates for the Python bot.

Templates are edited in the Dashboard Admin Panel and stored in the
`app_settings` table under:
    - webhook_user_payload_template
    - webhook_admin_payload_template

Substitution uses mustache-style `{{variable}}` tokens and happens BEFORE
json.loads, so string vars must be JSON-escaped via `json_escape()` first.

These defaults 1:1 mirror the previous hardcoded payloads in webhooks.py.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Optional

import pytz

logger = logging.getLogger(__name__)


DEFAULT_USER_WEBHOOK_TEMPLATE = r"""{
  "username": "Eventry",
  "embeds": [
    {
      "title": "\ud83d\ude80 Autostart Triggered",
      "color": 11382189,
      "timestamp": "{{timestamp_iso}}",
      "fields": [
        { "name": "Keyword",      "value": "`{{keyword}}`",                              "inline": true  },
        { "name": "Status",       "value": "{{status_emoji}} {{status}}",                "inline": true  },
        { "name": "Product",      "value": "{{product_title}}",                          "inline": false },
        { "name": "Price Breaks", "value": "{{price_info}}",                             "inline": true  },
        { "name": "Stock",        "value": "{{stock_info}}",                             "inline": true  },
        { "name": "Product Link", "value": "{{product_link}}",                           "inline": false },
        { "name": "Message",      "value": "[Jump to original message]({{message_jump_url}})", "inline": false }
      ],
      "footer": { "text": "Eventry Autostart \u2022 {{timestamp_cest}}" }
    }
  ]
}"""


DEFAULT_ADMIN_WEBHOOK_TEMPLATE = r"""{
  "username": "Eventry Admin Log",
  "embeds": [
    {
      "title": "\ud83d\udd14 Autostart Triggered",
      "color": {{color}},
      "timestamp": "{{timestamp_iso}}",
      "fields": [
        { "name": "Product",        "value": "{{product_title}}",                        "inline": false },
        { "name": "Product Link",   "value": "{{product_link}}",                         "inline": false },
        { "name": "Status",         "value": "{{status_emoji}} {{status_summary}}",      "inline": true  },
        { "name": "Channel",        "value": "#{{channel_name}}",                        "inline": true  },
        { "name": "Source Message", "value": "[Jump to original]({{message_jump_url}})", "inline": false },
        { "name": "Users ({{user_count}})", "value": "{{user_list}}",                    "inline": false }
      ],
      "footer": { "text": "Eventry Admin Log \u2022 {{timestamp_cest}}" }
    }
  ]
}"""


_PLACEHOLDER_RE = re.compile(r"\{\{(\w+)\}\}")


def json_escape(s: str) -> str:
    """
    Escape a string so it can be safely inlined inside a JSON string literal.
    Produces exactly what json.loads will accept — handles ", \\, \n, \t, \r,
    and control characters. Mirrors JS `JSON.stringify(s).slice(1, -1)`.
    """
    if s is None:
        return ""
    dumped = json.dumps(s, ensure_ascii=False)
    return dumped[1:-1]


def render_template(template: str, variables: dict) -> Optional[dict]:
    """
    Substitute `{{name}}` tokens in `template`, then `json.loads` the result.
    Returns `None` on parse error so callers can fall back to a default.
    """
    def _sub(m: re.Match) -> str:
        name = m.group(1)
        val = variables.get(name)
        if val is None:
            return ""
        return str(val)

    rendered = _PLACEHOLDER_RE.sub(_sub, template)
    try:
        parsed = json.loads(rendered)
    except json.JSONDecodeError as e:
        logger.warning(f"[WEBHOOK TEMPLATE] JSON parse error: {e} | rendered[:200]={rendered[:200]!r}")
        return None
    if not isinstance(parsed, dict):
        logger.warning("[WEBHOOK TEMPLATE] Rendered payload is not an object")
        return None
    return parsed


def build_user_vars(
    *,
    keyword: str,
    http_status: int,
    product_title: str,
    product_description: str,
    price_info: str,
    stock_info: str,
    product_link: str,
    message_jump_url: str,
) -> dict:
    """Build the variable dict for the user autostart webhook template."""
    now_utc = datetime.now(timezone.utc)
    now_cest = datetime.now(pytz.timezone("Europe/Berlin"))
    cest_str = now_cest.strftime("%d.%m.%Y %H:%M:%S CEST")
    ok = http_status == 200
    return {
        "keyword":             json_escape(keyword),
        "status":              json_escape(f"{http_status} {'OK' if ok else 'Failed'}"),
        "status_emoji":        "\u2705" if ok else "\u274c",
        "http_status":         str(http_status),
        "product_title":       json_escape(product_title[:256]),
        "product_description": json_escape(product_description or ""),
        "price_info":          json_escape(price_info[:256]),
        "stock_info":          json_escape(stock_info[:64]),
        "product_link":        json_escape(product_link),
        "message_jump_url":    json_escape(message_jump_url),
        "timestamp_iso":       now_utc.isoformat(),
        "timestamp_cest":      json_escape(cest_str),
    }


def build_admin_vars(
    *,
    product_title: str,
    product_link: str,
    channel_name: str,
    message_jump_url: str,
    results: list[dict],
) -> dict:
    """
    Build the variable dict for the admin log webhook template.

    `results` is a list of dicts — one per user who participated in the same
    quicktask autostart event. Each dict must contain:
        { discord_user_id, whop_user_id, silently_key, keyword, http_status }

    The resulting webhook is aggregated into ONE payload (not per user).
    """
    now_utc = datetime.now(timezone.utc)
    now_cest = datetime.now(pytz.timezone("Europe/Berlin"))
    cest_str = now_cest.strftime("%d.%m.%Y %H:%M:%S CEST")

    user_count = len(results)
    success_count = sum(1 for r in results if r.get("http_status") == 200)
    failure_count = user_count - success_count

    if user_count == 0:
        status_emoji = "\u2753"  # ❓
        color = 8421504  # gray
    elif failure_count == 0:
        status_emoji = "\u2705"  # ✅
        color = 4906624          # green
    elif success_count == 0:
        status_emoji = "\u274c"  # ❌
        color = 16287345         # red
    else:
        status_emoji = "\u26a0\ufe0f"  # ⚠️
        color = 16753920               # amber

    status_summary = f"{success_count} OK / {failure_count} Failed"

    # Build a multi-line user list: `<@discord>` · `silently_key` · `keyword` · status
    lines: list[str] = []
    for r in results:
        dc_id = r.get("discord_user_id") or ""
        whop = r.get("whop_user_id") or ""
        mention = f"<@{dc_id}>" if dc_id else f"`{whop}`"
        key = r.get("silently_key") or "—"
        keyword = r.get("keyword") or "—"
        http = r.get("http_status", 0)
        ok = http == 200
        line_status = f"\u2705 {http} OK" if ok else f"\u274c {http} Failed"
        lines.append(f"{mention} \u00b7 `{key}` \u00b7 `{keyword}` \u00b7 {line_status}")

    # Cap to 1024 chars (Discord field value limit) with graceful truncation
    user_list = "\n".join(lines)
    if len(user_list) > 1000:
        truncated_lines: list[str] = []
        running = 0
        for ln in lines:
            if running + len(ln) + 1 > 950:
                break
            truncated_lines.append(ln)
            running += len(ln) + 1
        remaining = user_count - len(truncated_lines)
        truncated_lines.append(f"\u2026 and {remaining} more")
        user_list = "\n".join(truncated_lines)

    return {
        "product_title":   json_escape(product_title[:256]),
        "product_link":    json_escape(product_link),
        "channel_name":    json_escape(channel_name or "—"),
        "message_jump_url": json_escape(message_jump_url),
        "user_list":       json_escape(user_list),
        "user_count":      str(user_count),
        "success_count":   str(success_count),
        "failure_count":   str(failure_count),
        "status_summary":  json_escape(status_summary),
        "status_emoji":    status_emoji,
        "color":           color,
        "timestamp_iso":   now_utc.isoformat(),
        "timestamp_cest":  json_escape(cest_str),
    }
