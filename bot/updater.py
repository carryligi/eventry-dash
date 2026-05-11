"""
Self-updater for the Eventry Discord bot.

Runs once per bot launch (called from start.bat BEFORE `pip install` and
BEFORE `python main.py`). Checks GitHub for a newer commit on `main`; if
found, downloads the repo ZIP and overwrites the local `bot/` files in
place.

Design goals:
- Stdlib-only (urllib + zipfile). Must work before pip install has run.
- Soft-fail: any network / filesystem error -> log + exit 0 so start.bat
  still boots the bot with the current (working) version.
- Never touch user state: .env, .bot_version, venv, __pycache__, start.bat.
  start.bat is protected because cmd.exe reads .bat files line-by-line
  during execution — overwriting it mid-run can corrupt the running shell.
- requirements.txt changes are picked up automatically: start.bat runs
  `pip install -r requirements.txt --upgrade` AFTER this updater exits.

Local state lives in `.bot_version` next to this file (one line, the
commit SHA). Missing / empty => "unknown, try to update".
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import ssl
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

# Load .env so BOT_UPDATE_BRANCH / BOT_AUTO_UPDATE from the bot's own env
# file are visible BEFORE the main bot process starts. dotenv is part of
# the bot's requirements but may not be installed yet on first boot; fall
# back to os.environ only in that case.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent / ".env")
except Exception:
    pass

REPO = "carryligi/eventry-dash"
# Path inside the repo ZIP that holds the bot files we actually want to sync
BOT_SUBDIR = "bot"

# Branch to pull from. Production bots track `main`; the test bot can set
# BOT_UPDATE_BRANCH=Develope in its own .env to stay one step ahead.
BRANCH = os.environ.get("BOT_UPDATE_BRANCH", "main").strip() or "main"

# Set BOT_AUTO_UPDATE=false to disable the updater entirely — useful when
# you're iterating locally on files inside the test bot folder and don't
# want them overwritten on restart.
AUTO_UPDATE = os.environ.get("BOT_AUTO_UPDATE", "true").strip().lower() not in (
    "false", "0", "no", "off",
)

HERE = Path(__file__).resolve().parent
VERSION_FILE = HERE / ".bot_version"

API_URL = f"https://api.github.com/repos/{REPO}/commits/{BRANCH}"
ZIP_URL = f"https://codeload.github.com/{REPO}/zip/refs/heads/{BRANCH}"

USER_AGENT = "eventry-bot-updater"
HTTP_TIMEOUT = 30

# Top-level names inside `bot/` that must NEVER be overwritten.
# - .env / .bot_version: user/runtime state
# - venv / .venv / __pycache__: local build artifacts
# - start.bat: the currently executing shell script (overwriting it mid-run
#   can make cmd.exe jump to garbage lines)
PROTECTED_TOP_LEVEL = {
    ".env",
    ".bot_version",
    "venv",
    ".venv",
    "__pycache__",
    "start.bat",
}

logging.basicConfig(
    level=logging.INFO,
    format="[updater] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("updater")


def _build_ssl_context() -> ssl.SSLContext:
    """
    Build an SSL context that trusts something reasonable on Windows even
    when Python's bundled OpenSSL has no CA bundle of its own. Order:
      1. certifi (best — same bundle requests/urllib3 use, installed as a
         transitive dep after first pip install).
      2. Windows root + CA stores via ssl.enum_certificates (works on a
         fresh Python install before any pip install has run).
      3. Plain default context (Linux/macOS path, or last resort).
    """
    ctx = ssl.create_default_context()

    try:
        import certifi  # type: ignore
        ctx.load_verify_locations(cafile=certifi.where())
        return ctx
    except Exception:
        pass

    if sys.platform == "win32":
        try:
            for store in ("ROOT", "CA"):
                for cert_bytes, _enc, trust in ssl.enum_certificates(store):
                    # trust is True, or an iterable of EKU OIDs; "any purpose"
                    # = True. Server auth = 1.3.6.1.5.5.7.3.1.
                    if trust is True or (
                        isinstance(trust, (set, tuple, list))
                        and "1.3.6.1.5.5.7.3.1" in trust
                    ):
                        try:
                            pem = ssl.DER_cert_to_PEM_cert(cert_bytes)
                            ctx.load_verify_locations(cadata=pem)
                        except ssl.SSLError:
                            continue
        except Exception:
            pass

    return ctx


_SSL_CTX = _build_ssl_context()


def _http_get(url: str, timeout: int = HTTP_TIMEOUT) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL_CTX) as resp:
        return resp.read()


def get_local_sha() -> str | None:
    if not VERSION_FILE.exists():
        return None
    try:
        return VERSION_FILE.read_text(encoding="utf-8").strip() or None
    except OSError:
        return None


def get_remote_sha() -> str | None:
    try:
        data = json.loads(_http_get(API_URL, timeout=10).decode("utf-8"))
    except Exception as e:
        log.warning(f"cannot reach GitHub API: {e}")
        return None
    sha = data.get("sha")
    return sha if isinstance(sha, str) and len(sha) >= 7 else None


def download_zip(dest: Path) -> bool:
    try:
        log.info(f"downloading {ZIP_URL}")
        with urllib.request.urlopen(
            urllib.request.Request(ZIP_URL, headers={"User-Agent": USER_AGENT}),
            timeout=HTTP_TIMEOUT * 2,
            context=_SSL_CTX,
        ) as resp, dest.open("wb") as f:
            shutil.copyfileobj(resp, f)
        return True
    except Exception as e:
        log.warning(f"download failed: {e}")
        return False


def extract_zip(zip_path: Path, dest: Path) -> Path | None:
    """Extract the ZIP and return the top-level directory inside it."""
    try:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest)
    except Exception as e:
        log.warning(f"extract failed: {e}")
        return None

    top_dirs = [p for p in dest.iterdir() if p.is_dir()]
    if len(top_dirs) != 1:
        log.warning(f"unexpected zip layout: {len(top_dirs)} top-level dirs")
        return None
    return top_dirs[0]


def copy_tree(src: Path, dst: Path) -> int:
    """
    Copy every file under src into dst (overwriting), skipping any path
    whose FIRST component matches PROTECTED_TOP_LEVEL. Returns the number
    of files written.
    """
    count = 0
    for item in src.rglob("*"):
        rel = item.relative_to(src)
        if rel.parts and rel.parts[0] in PROTECTED_TOP_LEVEL:
            continue
        target = dst / rel
        if item.is_dir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            shutil.copy2(item, target)
            count += 1
        except PermissionError as e:
            # Windows can lock a file briefly; log and continue so we
            # update as much as possible.
            log.warning(f"skip (locked): {rel} ({e})")
    return count


def main() -> int:
    if not AUTO_UPDATE:
        log.info("skip: BOT_AUTO_UPDATE=false")
        return 0

    log.info(f"checking branch '{BRANCH}' of {REPO}")
    local = get_local_sha()
    remote = get_remote_sha()

    if not remote:
        log.info("skip: no remote sha (offline or rate-limited)")
        return 0

    if local == remote:
        log.info(f"already up to date ({remote[:7]})")
        return 0

    log.info(f"update available: {(local or 'unknown')[:7]} -> {remote[:7]}")

    with tempfile.TemporaryDirectory(prefix="eventry-update-") as tmp:
        tmp_path = Path(tmp)
        zip_path = tmp_path / "main.zip"

        if not download_zip(zip_path):
            return 0

        extract_dir = tmp_path / "extract"
        extract_dir.mkdir()
        top = extract_zip(zip_path, extract_dir)
        if top is None:
            return 0

        src_bot = top / BOT_SUBDIR
        sentinel = src_bot / "main.py"
        if not sentinel.exists():
            log.warning(f"downloaded archive missing {BOT_SUBDIR}/main.py — aborting")
            return 0

        count = copy_tree(src_bot, HERE)
        log.info(f"wrote {count} files")

    # Record the new version LAST so a crash mid-copy retries next boot.
    try:
        VERSION_FILE.write_text(remote, encoding="utf-8")
    except OSError as e:
        log.warning(f"could not write {VERSION_FILE.name}: {e}")

    log.info(f"updated to {remote[:7]}")
    return 0


if __name__ == "__main__":
    # Always exit 0 so start.bat continues booting the bot even on failure.
    try:
        sys.exit(main())
    except Exception as e:  # noqa: BLE001
        log.warning(f"unhandled error: {e}")
        sys.exit(0)
