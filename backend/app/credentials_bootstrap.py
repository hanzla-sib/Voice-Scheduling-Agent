"""Materialize Google service account JSON from env at startup (Docker / DigitalOcean / Render).

Platforms often inject secrets as env vars; writing a file avoids pydantic/env length issues
and matches local dev (service-account.json next to the app).
"""

from __future__ import annotations

import base64
import json
import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def _unwrap_quoted_json(raw: str) -> str:
    raw = raw.strip()
    if len(raw) >= 2 and raw[0] == raw[-1] and raw[0] in "\"'":
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return raw


def read_service_account_json_from_environment() -> str:
    """Full JSON string for the service account, or empty. Uses os.environ + pydantic fallback."""
    # 1) Path to mounted secret file (DigitalOcean / Kubernetes style)
    file_path = (os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_FILE") or "").strip()
    if file_path and Path(file_path).is_file():
        try:
            return Path(file_path).read_text(encoding="utf-8")
        except OSError as e:
            logger.error("Could not read GOOGLE_SERVICE_ACCOUNT_JSON_FILE=%s: %s", file_path, e)

    # 2) Base64 (recommended for long JSON in dashboards)
    b64 = (os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON_B64") or "").strip()
    if b64:
        try:
            return base64.b64decode(b64).decode("utf-8")
        except Exception as e:
            logger.error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON_B64: %s", e)

    # 3) Raw JSON in env (single line)
    raw = (os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON") or "").strip()
    if raw:
        return _unwrap_quoted_json(raw)

    # 4) Pydantic / .env (local dev)
    try:
        from app.config import get_settings

        s = get_settings()
        b64_s = (s.google_service_account_json_b64 or "").strip()
        if b64_s:
            try:
                return base64.b64decode(b64_s).decode("utf-8")
            except Exception as e:
                logger.error("Invalid google_service_account_json_b64 in settings: %s", e)
        js = (s.google_service_account_json or "").strip()
        if js:
            return _unwrap_quoted_json(js)
    except Exception as e:
        logger.debug("Settings fallback for service account: %s", e)

    return ""


def materialize_service_account_file() -> None:
    """If service-account.json is missing, create it from env (one-time per container start)."""
    name = os.environ.get("GOOGLE_SERVICE_ACCOUNT_PATH", "service-account.json")
    path = Path(name)
    if not path.is_absolute():
        path = Path.cwd() / path

    if path.is_file():
        logger.debug("Service account file already present: %s", path)
        return

    raw = read_service_account_json_from_environment()
    if not raw:
        return

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.error(
            "Service account JSON from env is not valid JSON: %s. "
            "Use GOOGLE_SERVICE_ACCOUNT_JSON_B64 if the dashboard breaks long strings.",
            e,
        )
        return

    if data.get("type") != "service_account":
        logger.warning("JSON does not look like a Google service account (type != service_account)")

    try:
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        try:
            path.chmod(0o600)
        except OSError:
            pass
        logger.info("Wrote service account file from environment: %s", path)
    except OSError as e:
        logger.error("Could not write service account file %s: %s", path, e)
