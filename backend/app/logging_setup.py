"""Structured logging setup for generated FastAPI apps.

Logs are emitted as one JSON object per line and captured by sandbox `backend.log`.
"""

import contextvars
import json
import logging
import os
import sys
from datetime import UTC, datetime
from typing import Any

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

_request_context: contextvars.ContextVar[dict[str, Any] | None] = (
    contextvars.ContextVar("request_context", default=None)
)
# Baseline LogRecord attributes used to avoid duplicating default keys in JSON payloads.
_DEFAULT_LOG_RECORD_ATTRS = frozenset(logging.makeLogRecord({}).__dict__)
_RESERVED_STRUCTURED_ATTRS = frozenset(
    {"request_id", "method", "path", "status_code", "latency_ms", "event", "error"}
)


def set_request_context(
    *,
    request_id: str,
    method: str,
    path: str,
) -> None:
    _request_context.set(
        {
            "request_id": request_id,
            "method": method,
            "path": path,
        }
    )


def clear_request_context() -> None:
    _request_context.set(None)


class RequestContextFilter(logging.Filter):
    """Attach per-request context fields onto each log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        context = _request_context.get() or {}
        record.request_id = context.get("request_id", "")
        record.method = context.get("method", "")
        record.path = context.get("path", "")
        return True


class StructuredJSONFormatter(logging.Formatter):
    """Render log records as stable JSON lines for `jq` filtering."""

    # Skip default LogRecord attrs plus our canonical structured keys when copying extras.
    _STANDARD_ATTRS = _DEFAULT_LOG_RECORD_ATTRS | _RESERVED_STRUCTURED_ATTRS

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, tz=UTC).isoformat(
            timespec="milliseconds"
        )
        log_entry: dict[str, Any] = {
            "ts": timestamp,
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        for key in (
            "event",
            "request_id",
            "method",
            "path",
            "status_code",
            "latency_ms",
        ):
            value = getattr(record, key, None)
            if value not in (None, ""):
                log_entry[key] = value

        if record.exc_info and record.exc_info[1]:
            log_entry["error"] = {
                "type": type(record.exc_info[1]).__name__,
                "message": str(record.exc_info[1]),
                "stack": self.formatException(record.exc_info),
            }

        for key, value in record.__dict__.items():
            if key in self._STANDARD_ATTRS or key.startswith("_"):
                continue
            if key not in log_entry:
                log_entry[key] = value

        return json.dumps(log_entry, default=str)


def setup_logging() -> logging.Logger:
    """Configure root logging for generated apps."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))
    root_logger.handlers.clear()

    stdout_handler = logging.StreamHandler(sys.stdout)
    stdout_handler.addFilter(RequestContextFilter())
    stdout_handler.setFormatter(StructuredJSONFormatter())
    root_logger.addHandler(stdout_handler)

    # Disable default uvicorn access logging; request middleware logs structured events.
    uvicorn_access = logging.getLogger("uvicorn.access")
    uvicorn_access.handlers.clear()
    uvicorn_access.disabled = True
    uvicorn_access.propagate = False

    return root_logger
