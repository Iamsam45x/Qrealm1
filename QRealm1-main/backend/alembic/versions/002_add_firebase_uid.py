"""Add firebase_uid column to users table

Revision ID: 002_add_firebase_uid
Revises: 001_initial
Create Date: 2026-04-09

This migration adds the firebase_uid column to the users table for
Firebase Authentication integration.

IMPORTANT: 
1. Run this migration via Supabase SQL Editor (see below)
2. For existing users, populate firebase_uid manually
3. New users get firebase_uid set during registration
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002_add_firebase_uid'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('firebase_uid', sa.String(128), nullable=True))
    op.create_index('idx_users_firebase_uid', 'users', ['firebase_uid'], unique=True)


def downgrade() -> None:
    op.drop_index('idx_users_firebase_uid', table_name='users')
    op.drop_column('users', 'firebase_uid')
