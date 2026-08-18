import os
from urllib.parse import urlsplit

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Import and initialize standard logging
from app.logging_setup import setup_logging
from app.request_logging_middleware import register_request_logging_middleware

logger = setup_logging()

app = FastAPI(title="FastAPI Starter API", version="1.0.0", redirect_slashes=False)

register_request_logging_middleware(app, logger)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    """Log HTTP exceptions with 5xx status codes."""
    if exc.status_code >= 500:
        extra = {
            "event": "http_exception",
            "request_id": getattr(request.state, "request_id", ""),
            "method": request.method,
            "path": request.url.path,
            "status_code": exc.status_code,
        }
        logger.error("HTTP 5xx response", extra=extra)
    return await http_exception_handler(request, exc)


def _normalize_origin(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    if not candidate:
        return None
    parsed = urlsplit(candidate)
    if parsed.scheme and parsed.netloc:
        return f"{parsed.scheme}://{parsed.netloc}"
    return candidate.rstrip("/")


def _allowed_origins_from_env() -> list[str]:
    raw_allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    parsed_origins: list[str] = []
    seen: set[str] = set()
    for chunk in raw_allowed_origins.split(","):
        origin = _normalize_origin(chunk)
        if origin and origin not in seen:
            seen.add(origin)
            parsed_origins.append(origin)

    if parsed_origins:
        return parsed_origins

    frontend_origin = _normalize_origin(os.getenv("FRONTEND_URL"))
    return [frontend_origin] if frontend_origin else []


# Catch unhandled exceptions INSIDE the CORS middleware so 500 responses
# still carry Access-Control-Allow-Origin headers.
# @app.exception_handler(Exception) cannot be used here because it registers
# on ServerErrorMiddleware, which sits OUTSIDE CORSMiddleware and therefore
# bypasses it — causing the browser to see a CORS error instead of a 500.
@app.middleware("http")
async def _handle_unhandled_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        logger.exception(
            "Unhandled exception",
            extra={
                "event": "unhandled_exception",
                "request_id": getattr(request.state, "request_id", ""),
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
            },
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )


# Configure CORS from environment-derived allowed origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins_from_env(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handling is done via exception handlers above (sync-compatible)

# 🚨 CRITICAL: Include your API routers here
# After creating any router file (app/routers/users.py), you MUST:
# 1. Import the router: from app.routers import users
# 2. Include the router: app.include_router(users.router)
#
# Example:
# from app.routers import users, products, orders
# app.include_router(users.router)
# app.include_router(products.router)
# app.include_router(orders.router)
#
# Runtime upload flow example (presigned URL pattern):
# from app.routers import runtime_uploads
# app.include_router(runtime_uploads.router)
#
# Generated backend should issue upload contracts and call Appifex signing endpoint.
# Do not add R2 master credentials in generated apps.

from app.routers import spots

app.include_router(spots.router)


@app.get("/")
def root():
    return {"message": "FastAPI Starter API", "version": "1.0.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}
