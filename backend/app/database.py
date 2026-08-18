import os
import re

from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

# Lazy initialization for Vercel serverless compatibility
# Environment variables are only available at RUNTIME, not during build phase
# We must defer engine/session creation until first database access

_engine = None
_SessionLocal = None

Base = declarative_base()


def _validate_schema_name(schema_name: str) -> None:
    """Validate schema name to prevent SQL injection.

    Schema names must be valid PostgreSQL identifiers:
    - Start with lowercase letter or underscore
    - Contain only lowercase letters, digits, underscores
    - Max 63 characters (PostgreSQL limit)
    """
    if not re.match(r"^[a-z_][a-z0-9_]{0,62}$", schema_name):
        raise ValueError(
            f"Invalid SCHEMA_NAME: '{schema_name}'. "
            "Must be lowercase alphanumeric with underscores, starting with letter or underscore."
        )


def _get_engine():
    """Lazily create the database engine on first use.

    This defers reading DATABASE_URL until runtime, which is required for
    Vercel serverless functions where env vars are only available at runtime,
    not during the build phase when Python modules are imported.
    """
    global _engine

    if _engine is not None:
        return _engine

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Database connection requires DATABASE_URL to be configured."
        )

    schema_name = os.getenv("SCHEMA_NAME", "public")
    _validate_schema_name(schema_name)

    # Configure engine with schema isolation
    # Note: We don't use connect_args["options"] because NeonDB pooler doesn't support it
    # Instead, we set search_path after connection via event listener below
    # pool_pre_ping=True ensures connections are tested before use (fixes SSL timeout issues)
    # When using NeonDB's PgBouncer pooler (transaction pooling), session state such as
    # search_path is not guaranteed to persist. Using NullPool avoids double-pooling
    # and the checkout event re-applies search_path every time a connection is borrowed.
    _engine = create_engine(database_url, pool_pre_ping=True, poolclass=NullPool)

    # Ensure all connections use the correct schema
    @event.listens_for(_engine, "checkout")
    def set_search_path_on_checkout(
        dbapi_connection, connection_record, connection_proxy
    ):
        """Set search_path on every checkout to ensure schema isolation.

        This is required for PgBouncer transaction pooling mode, which may reset session
        state between transactions.
        """
        cursor = dbapi_connection.cursor()
        # Use quoted identifier for safety (schema name already validated above)
        cursor.execute(f'SET search_path TO "{schema_name}"')
        cursor.close()

    return _engine


def _get_session_local():
    """Lazily create the SessionLocal factory on first use."""
    global _SessionLocal

    if _SessionLocal is not None:
        return _SessionLocal

    _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_get_engine())
    return _SessionLocal


def get_db():
    """Database session dependency for FastAPI endpoints.

    Usage:
        @router.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    SessionLocal = _get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Expose engine and SessionLocal as properties for backward compatibility
# These will raise RuntimeError if DATABASE_URL is not set
def get_engine():
    """Get the database engine (creates it lazily if needed)."""
    return _get_engine()


def get_session_local():
    """Get the SessionLocal factory (creates it lazily if needed)."""
    return _get_session_local()
