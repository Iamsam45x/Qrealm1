"""Phase 1 upgrades - Soft delete, moderation, debates, notifications

Revision ID: 002_phase1_upgrades
Revises: 001_initial
Create Date: 2024-01-15

This migration adds:
- Soft delete (deleted_at) and moderation (is_hidden) columns
- Flagship report system (is_flagship, report_type)
- Role-based vote weight for users
- Debates and DebateVotes tables
- Notifications table
- Reports table
- Feedback table
- Invites table
- PostViews table

Safe: Uses IF NOT EXISTS checks where applicable
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '002_phase1_upgrades'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === Soft Delete + Moderation Columns ===
    
    # Add to blogs
    op.add_column('blogs', sa.Column('deleted_at', sa.DateTime, nullable=True))
    op.add_column('blogs', sa.Column('is_hidden', sa.Boolean, nullable=False, server_default='0'))
    op.add_column('blogs', sa.Column('is_flagship', sa.Boolean, nullable=False, server_default='0'))
    op.add_column('blogs', sa.Column('report_type', sa.String(20), nullable=True))
    
    # Add to forums
    op.add_column('forums', sa.Column('deleted_at', sa.DateTime, nullable=True))
    op.add_column('forums', sa.Column('is_hidden', sa.Boolean, nullable=False, server_default='0'))
    
    # Add to comments
    op.add_column('comments', sa.Column('deleted_at', sa.DateTime, nullable=True))
    op.add_column('comments', sa.Column('is_hidden', sa.Boolean, nullable=False, server_default='0'))
    
    # Add vote_weight to users
    op.add_column('users', sa.Column('vote_weight', sa.Integer, nullable=False, server_default='1'))
    
    # === Indexes for new columns ===
    op.create_index('idx_blogs_deleted', 'blogs', ['deleted_at'])
    op.create_index('idx_blogs_hidden', 'blogs', ['is_hidden'])
    op.create_index('idx_blogs_flagship', 'blogs', ['is_flagship'])
    op.create_index('idx_forums_deleted', 'forums', ['deleted_at'])
    op.create_index('idx_forums_hidden', 'forums', ['is_hidden'])
    op.create_index('idx_comments_deleted', 'comments', ['deleted_at'])
    op.create_index('idx_comments_hidden', 'comments', ['is_hidden'])
    
    # === Debates Table ===
    op.create_table(
        'debates',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('blog_a_id', sa.String(36), sa.ForeignKey('blogs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blog_b_id', sa.String(36), sa.ForeignKey('blogs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_by', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(200), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='ACTIVE'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('ended_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_debates_blog_a', 'debates', ['blog_a_id'])
    op.create_index('idx_debates_blog_b', 'debates', ['blog_b_id'])
    op.create_index('idx_debates_status', 'debates', ['status'])
    
    # === DebateVotes Table ===
    op.create_table(
        'debate_votes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('debate_id', sa.String(36), sa.ForeignKey('debates.id', ondelete='CASCADE'), nullable=False),
        sa.Column('vote', sa.String(1), nullable=False),  # 'A' or 'B'
        sa.Column('weight', sa.Integer, nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_debate_votes_user', 'debate_votes', ['user_id'])
    op.create_index('idx_debate_votes_debate', 'debate_votes', ['debate_id'])
    op.create_index('idx_debate_votes_unique', 'debate_votes', ['user_id', 'debate_id'], unique=True)
    
    # === Notifications Table ===
    op.create_table(
        'notifications',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('link', sa.String(255), nullable=True),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('is_read', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
    )
    op.create_index('idx_notifications_read', 'notifications', ['is_read'])
    
    # === Reports Table ===
    op.create_table(
        'reports',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('reporter_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('target_type', sa.String(20), nullable=False),  # 'blog', 'forum', 'comment', 'user'
        sa.Column('target_id', sa.String(36), nullable=False),
        sa.Column('reason', sa.Text, nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('resolved_by', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('resolution', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
        sa.Column('resolved_at', sa.DateTime, nullable=True),
    )
    op.create_index('idx_reports_target', 'reports', ['target_type', 'target_id'])
    op.create_index('idx_reports_status', 'reports', ['status'])
    op.create_index('idx_reports_reporter', 'reports', ['reporter_id'])
    
    # === Feedback Table ===
    op.create_table(
        'feedback',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('category', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
    )
    op.create_index('idx_feedback_user', 'feedback', ['user_id'])
    
    # === Invites Table ===
    op.create_table(
        'invites',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('invited_by', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(20), nullable=False, server_default='STUDENT'),
        sa.Column('token', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='PENDING'),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('accepted_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_invites_status', 'invites', ['status'])
    
    # === PostViews Table ===
    op.create_table(
        'post_views',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('post_type', sa.String(20), nullable=False),  # 'blog' or 'forum'
        sa.Column('post_id', sa.String(36), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False, index=True),
    )
    op.create_index('idx_post_views_post', 'post_views', ['post_type', 'post_id'])
    op.create_index('idx_post_views_user', 'post_views', ['user_id'])
    
    # === Full-Text Search tsvector columns (PostgreSQL only) ===
    op.execute("""
        ALTER TABLE blogs 
        ADD COLUMN IF NOT EXISTS fts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
    """)
    op.execute("""
        ALTER TABLE forums 
        ADD COLUMN IF NOT EXISTS fts_vector tsvector GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED
    """)


def downgrade() -> None:
    # Drop FTS vectors first
    op.execute("ALTER TABLE forums DROP COLUMN IF EXISTS fts_vector")
    op.execute("ALTER TABLE blogs DROP COLUMN IF EXISTS fts_vector")
    
    # Drop new tables
    op.drop_table('post_views')
    op.drop_table('invites')
    op.drop_table('feedback')
    op.drop_table('reports')
    op.drop_table('notifications')
    op.drop_table('debate_votes')
    op.drop_table('debates')
    
    # Drop added columns from existing tables
    op.drop_column('users', 'vote_weight')
    op.drop_column('comments', 'is_hidden')
    op.drop_column('comments', 'deleted_at')
    op.drop_column('forums', 'is_hidden')
    op.drop_column('forums', 'deleted_at')
    op.drop_column('blogs', 'report_type')
    op.drop_column('blogs', 'is_flagship')
    op.drop_column('blogs', 'is_hidden')
    op.drop_column('blogs', 'deleted_at')