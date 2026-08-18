import os
import re
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool, text

from alembic import context

# Load environment variables
load_dotenv()

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Set the database URL from environment variables
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL"))

# Get schema name for isolation (defaults to 'public')
SCHEMA_NAME = os.getenv("SCHEMA_NAME", "public")

# Validate schema name to prevent SQL injection
# Schema names must be valid PostgreSQL identifiers:
# - Start with lowercase letter or underscore
# - Contain only lowercase letters, digits, underscores
# - Max 63 characters (PostgreSQL limit)
if not re.match(r"^[a-z_][a-z0-9_]{0,62}$", SCHEMA_NAME):
    raise ValueError(
        f"Invalid SCHEMA_NAME: '{SCHEMA_NAME}'. "
        "Must be lowercase alphanumeric with underscores, starting with letter or underscore."
    )

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
from app.database import Base

# IMPORTANT: Import your models here so Alembic can detect changes
# Automatically import the models module to register models with Base
try:
    from app import models  # noqa: F401 - Import registers models with Base.metadata
except ImportError:
    pass  # Models file might not exist yet

target_metadata = Base.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    url = config.get_main_option("sqlalchemy.url")

    # Filter function to exclude alembic_version from autogenerate
    def include_object(object, name, type_, reflected, compare_to):
        """
        Exclude alembic_version table from autogenerate detection.
        Alembic manages this table internally, so we don't want it in migrations.
        """
        if type_ == "table" and name == "alembic_version":
            return False
        return True

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table_schema=SCHEMA_NAME,  # Track migrations per schema
        include_object=include_object,  # Ignore alembic_version during autogenerate
    )

    with context.begin_transaction():
        # Set search_path for the schema (use quoted identifier for safety)
        if SCHEMA_NAME != "public":
            context.execute(text(f'SET search_path TO "{SCHEMA_NAME}"'))
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """
    # Configure engine with schema-specific connection
    configuration = config.get_section(config.config_ini_section, {})

    # Note: We don't set search_path in connect_args because NeonDB pooler
    # doesn't support it. We'll set it after connection is established.

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Set search_path for the schema (use text() for SQLAlchemy 2.0+)
        if SCHEMA_NAME != "public":
            connection.execute(text(f'SET search_path TO "{SCHEMA_NAME}"'))
            connection.commit()  # Commit the SET command

        # Filter function to exclude alembic_version from autogenerate
        def include_object(object, name, type_, reflected, compare_to):
            """
            Exclude alembic_version table from autogenerate detection.
            Alembic manages this table internally, so we don't want it in migrations.
            """
            if type_ == "table" and name == "alembic_version":
                return False
            return True

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            version_table_schema=SCHEMA_NAME,  # Track migrations per schema
            include_object=include_object,  # Ignore alembic_version during autogenerate
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
