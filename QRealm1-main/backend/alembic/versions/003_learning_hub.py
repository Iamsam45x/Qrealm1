"""Learning Hub - Community Learning Interaction System

Revision ID: 003_learning_hub
Revises: 002_phase1_upgrades
Create Date: 2024-01-20

This migration adds:
- learning_interactions table for error reports and doubts
- learning_responses table for responses to interactions

The Community Learning Hub separates:
- Correction Intent (ERROR_REPORT): "Something here is wrong"
- Understanding Intent (DOUBT): "I don't understand something"

Safe: Creates new tables, no data loss
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '003_learning_hub'
down_revision: Union[str, None] = '002_phase1_upgrades'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === Learning Interactions Table ===
    op.create_table(
        'learning_interactions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_type', sa.String(20), nullable=False),  # 'blog', 'forum', 'question', 'practice'
        sa.Column('target_id', sa.String(36), nullable=False),
        sa.Column('interaction_type', sa.String(30), nullable=False),  # 'ERROR_REPORT' or 'DOUBT'
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('classification', sa.String(30), nullable=True),  # 'VALID_ERROR', 'INVALID_ERROR', etc.
        sa.Column('resolution', sa.Text, nullable=True),
        sa.Column('resolved_by', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('is_public', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('is_duplicate_of', sa.String(36), sa.ForeignKey('learning_interactions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('resolved_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_learning_interactions_user', 'learning_interactions', ['user_id'])
    op.create_index('idx_learning_interactions_target', 'learning_interactions', ['target_type', 'target_id'])
    op.create_index('idx_learning_interactions_type', 'learning_interactions', ['interaction_type'])
    op.create_index('idx_learning_interactions_status', 'learning_interactions', ['status'])
    op.create_index('idx_learning_interactions_created', 'learning_interactions', ['created_at'])
    op.create_index('idx_learning_interactions_public', 'learning_interactions', ['is_public', 'status'])
    op.create_index('idx_learning_interactions_duplicate', 'learning_interactions', ['is_duplicate_of'])

    # === Learning Responses Table ===
    op.create_table(
        'learning_responses',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('interaction_id', sa.String(36), sa.ForeignKey('learning_interactions.id', ondelete='CASCADE'), nullable=False),
        sa.Column('responder_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('response_type', sa.String(30), nullable=False),  # 'ACKNOWLEDGE', 'EXPLAIN', 'CLARIFY', 'RECONCILE', 'CORRECT'
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_learning_responses_interaction', 'learning_responses', ['interaction_id'])
    op.create_index('idx_learning_responses_responder', 'learning_responses', ['responder_id'])
    op.create_index('idx_learning_responses_created', 'learning_responses', ['created_at'])


def downgrade() -> None:
    op.drop_table('learning_responses')
    op.drop_table('learning_interactions')