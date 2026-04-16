"""
Alembic Environment Configuration

This module configures Alembic to work with the application's SQLAlchemy models
and database configuration.

Usage:
    # Create a new migration
    alembic revision --autogenerate -m "description"
    
    # Apply migrations
    alembic upgrade head
    
    # Rollback one migration
    alembic downgrade -1
"""

import os
import sys
from logging.config import fileConfig

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from alembic import context
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

# Import the settings and Base from our application
from app.settings import settings
from app.database import Base

# Import all models so they are registered with Base.metadata
from app.database import User, Blog, Forum, Comment, Like, RefreshToken

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def get_engine() -> Engine:
    """
    Create SQLAlchemy engine for PostgreSQL/Supabase.
    """
    return create_engine(
        settings.database_url,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,
        echo=settings.is_development,
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.database_url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = get_engine()

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
