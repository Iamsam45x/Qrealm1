"""Initial migration - Create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2024-01-01

This migration creates all the database tables based on SQLAlchemy models.
It works for both SQLite (development) and PostgreSQL (production).

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('user_type', sa.String(20), nullable=False, server_default='STUDENT'),
        sa.Column('bio', sa.Text, nullable=True),
        sa.Column('verified', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('otp', sa.String(6), nullable=True),
        sa.Column('otp_expires_at', sa.DateTime, nullable=True),
        sa.Column('otp_attempts', sa.Integer, server_default='0'),
        sa.Column('reset_token', sa.String(255), nullable=True),
        sa.Column('reset_token_expires', sa.DateTime, nullable=True),
        sa.Column('institution', sa.String(200), nullable=True),
        sa.Column('course', sa.String(200), nullable=True),
        sa.Column('year_of_study', sa.String(10), nullable=True),
        sa.Column('student_id', sa.String(50), nullable=True),
        sa.Column('field_of_research', sa.String(200), nullable=True),
        sa.Column('years_of_experience', sa.Integer, server_default='0'),
        sa.Column('research_profile', sa.Text, nullable=True),
        sa.Column('remember_token', sa.String(255), nullable=True),
        sa.Column('login_attempts', sa.Integer, server_default='0'),
        sa.Column('locked_until', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_users_email', 'users', ['email'])
    
    # Blogs table
    op.create_table(
        'blogs',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('slug', sa.String(200), nullable=False, unique=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('published', sa.Boolean, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_blogs_author', 'blogs', ['author_id'])
    op.create_index('idx_blogs_created', 'blogs', ['created_at'])
    op.create_index('idx_blogs_published', 'blogs', ['published'])
    op.create_index('idx_blogs_slug', 'blogs', ['slug'])
    
    # Forums table
    op.create_table(
        'forums',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('author_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('updated_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_forums_author', 'forums', ['author_id'])
    op.create_index('idx_forums_created', 'forums', ['created_at'])
    
    # Comments table
    op.create_table(
        'comments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blog_id', sa.String(36), sa.ForeignKey('blogs.id', ondelete='CASCADE'), nullable=True),
        sa.Column('forum_id', sa.String(36), sa.ForeignKey('forums.id', ondelete='CASCADE'), nullable=True),
        sa.Column('parent_id', sa.String(36), sa.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_comments_user', 'comments', ['user_id'])
    op.create_index('idx_comments_blog', 'comments', ['blog_id'])
    op.create_index('idx_comments_forum', 'comments', ['forum_id'])
    op.create_index('idx_comments_parent', 'comments', ['parent_id'])
    
    # Likes table
    op.create_table(
        'likes',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('blog_id', sa.String(36), sa.ForeignKey('blogs.id', ondelete='CASCADE'), nullable=True),
        sa.Column('forum_id', sa.String(36), sa.ForeignKey('forums.id', ondelete='CASCADE'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )
    op.create_index('idx_likes_user', 'likes', ['user_id'])
    op.create_index('idx_likes_blog', 'likes', ['blog_id'])
    op.create_index('idx_likes_forum', 'likes', ['forum_id'])
    
    # Refresh tokens table
    op.create_table(
        'refresh_tokens',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token', sa.String(255), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
        sa.Column('revoked', sa.Boolean, nullable=False, server_default='0'),
    )
    op.create_index('idx_refresh_tokens_user', 'refresh_tokens', ['user_id'])
    op.create_index('idx_refresh_tokens_token', 'refresh_tokens', ['token'])
    op.create_index('idx_refresh_tokens_expires', 'refresh_tokens', ['expires_at'])
    op.create_index('idx_refresh_tokens_revoked', 'refresh_tokens', ['revoked'])


def downgrade() -> None:
    op.drop_table('refresh_tokens')
    op.drop_table('likes')
    op.drop_table('comments')
    op.drop_table('forums')
    op.drop_table('blogs')
    op.drop_table('users')
