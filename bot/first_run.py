"""
Interactive credential bootstrapper for the Eventry Discord bot.

Runs once per bot launch (called from start.bat BEFORE updater.py and
pip install). If the local .env still contains placeholder values for
required secrets (DISCORD_BOT_TOKEN, SUPABASE_SERVICE_ROLE_KEY), this
script prompts the user interactively and writes the entered values
back into .env, preserving every other line byte-for-byte.

Design goals:
- Stdlib-only. Runs before pip install — we cannot rely on python-dotenv.
- Idempotent: subsequent runs with real credentials exit in <50 ms
  with a short skip message.
- Visible input via plain input() so the user can verify the paste
  succeeded. Trade-off: the token appears in CMD scrollback. Close
  the CMD window or run `cls` after setup if that bothers you.
- Preserves .env structure: comments, blank lines, ordering, and
  non-secret keys (BOT_ROLE, BOT_UPDATE_BRANCH, SUPABASE_URL, etc.)
  remain exactly as they were.
- Aborts cleanly on Ctrl+C with exit code 1 so start.bat can halt
  before trying to launch a bot with no credentials.
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ENV_PATH = HERE / ".env"

# Secrets that must be filled in before the bot can start. Keyed by
# env-var name; value is the human-readable label shown in the prompt.
REQUIRED_SECRETS: dict[str, str] = {
    "DISCORD_BOT_TOKEN": "Discord Bot Token",
    "SUPABASE_SERVICE_ROLE_KEY": "Supabase Service Role Key",
}

# Values we treat as "not yet filled in". Covers the current ZIP
# placeholders and the old .env.example defaults.
_PLACEHOLDER_EXACT = {
    "your_bot_token",
    "your_discord_bot_token",
    "your_service_role_key",
}


def is_placeholder(value: str) -> bool:
    """True if `value` is empty, whitespace, or a known placeholder."""
    if value is None:
        return True
    v = value.strip()
    if not v:
        return True
    if v.startswith("REPLACE_ME"):
        return True
    if v in _PLACEHOLDER_EXACT:
        return True
    return False


def read_env_values(path: Path) -> dict[str, str]:
    """Parse KEY=VALUE pairs from `path`. Minimal, not a full dotenv parser."""
    result: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        stripped = raw.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        result[key.strip()] = value.strip()
    return result


def write_env_updates(path: Path, updates: dict[str, str]) -> None:
    """
    Rewrite `path` replacing the first occurrence of each KEY= line
    with `KEY={updates[KEY]}`. All other lines (comments, blanks,
    non-matching keys) are preserved byte-for-byte. Any keys in
    `updates` that did not exist in the file are appended at the end.
    """
    existing_lines = path.read_text(encoding="utf-8").splitlines(keepends=True)

    seen: set[str] = set()
    new_lines: list[str] = []
    for line in existing_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in updates and key not in seen:
                # Preserve the trailing newline style of the original line
                nl = "\n" if line.endswith("\n") else ""
                new_lines.append(f"{key}={updates[key]}{nl}")
                seen.add(key)
                continue
        new_lines.append(line)

    # Append any update keys that were not present in the file
    for key, value in updates.items():
        if key not in seen:
            # Ensure a newline separator if the file doesn't end with one
            if new_lines and not new_lines[-1].endswith("\n"):
                new_lines[-1] += "\n"
            new_lines.append(f"{key}={value}\n")

    path.write_text("".join(new_lines), encoding="utf-8")


def prompt_secret(label: str) -> str:
    """Read a value from stdin with VISIBLE input.

    User requested visible input so they can verify the paste worked.
    Trade-off: the token appears in the CMD scrollback buffer. After
    setup completes, close the CMD window or type `cls` to clear it
    if you're worried about the token sitting in the visible history.
    """
    print(f"  {label}: ", end="", flush=True)
    return input().strip()


def print_banner() -> None:
    print("=" * 60)
    print(" First-run setup — Eventry Bot")
    print("=" * 60)
    print(" The following credentials are still placeholders in .env.")
    print(" Paste them now to continue starting the bot.")
    print(" Input is VISIBLE — you can see what you paste. Ctrl+C to abort.")
    print()


def main() -> int:
    if not ENV_PATH.exists():
        print("[first_run] .env not found, skipping")
        return 0

    env = read_env_values(ENV_PATH)

    missing: list[str] = [
        key for key in REQUIRED_SECRETS if is_placeholder(env.get(key, ""))
    ]

    if not missing:
        print("[first_run] all credentials set, skipping")
        return 0

    print_banner()

    updates: dict[str, str] = {}
    for key in missing:
        label = REQUIRED_SECRETS[key]
        while True:
            value = prompt_secret(label)
            if not value:
                print("  (empty — please paste the value)")
                continue
            if is_placeholder(value):
                print("  (looks like another placeholder — paste the REAL value)")
                continue
            updates[key] = value
            break

    write_env_updates(ENV_PATH, updates)

    print()
    print(f"[first_run] wrote {len(updates)} credential(s) to .env")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print()
        print("[first_run] aborted by user")
        sys.exit(1)
