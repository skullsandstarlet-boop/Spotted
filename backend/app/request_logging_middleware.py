"""Request logging middleware registration for the FastAPI starter template."""

import time
import uuid
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, Request
from starlette.responses import Response

from app.logging_setup import clear_request_context, set_request_context


def register_request_logging_middleware(app: FastAPI, logger: Any) -> None:
    @app.middleware("http")
    async def request_context_middleware(
        request: Request,
        call_next: Callable[[Request], Any],
    ) -> Response:
        """Attach request context and emit one structured access log per request."""
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        started_at = time.perf_counter()
        set_request_context(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        request.state.request_id = request_id

        response: Response | None = None
        try:
            response = await call_next(request)
            return response
        finally:
            latency_ms = round((time.perf_counter() - started_at) * 1000, 2)
            status_code = response.status_code if response is not None else 500
            logger.info(
                "HTTP request completed",
                extra={
                    "event": "http_request",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "latency_ms": latency_ms,
                },
            )
            if response is not None:
                response.headers["X-Request-ID"] = request_id
            clear_request_context()
