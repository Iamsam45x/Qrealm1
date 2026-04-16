"""
SQLAlchemy Database Module

Provides database connectivity using SQLAlchemy with PostgreSQL/Supabase.
Configuration is read from settings which uses environment variables.

Supabase Connection:
    - Use port 6543 for PgBouncer connection pooler (recommended)
    - Use port 5432 for direct connection
    - Always include sslmode=require
"""

import logging
import socket
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Generator, Optional

from sqlalchemy import (
    create_engine,
    event,
    text,
    Column,
    String,
    Text,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import (
    declarative_base,
    sessionmaker,
    relationship,
    Session,
)

from app.settings import settings

logger = logging.getLogger(__name__)

# Create declarative base for ORM models
Base = declarative_base()

# Build engine based on environment
_engine = None
_SessionLocal = None


def get_engine():
    """Create and configure SQLAlchemy engine."""
    global _engine
    
    if _engine is not None:
        return _engine
    
    database_url = settings.database_url
    pool_config = settings.db_pool_config
    
    connect_args = {
        "connect_timeout": 10,
        "options": "-c statement_timeout=30000",
    }
    
    if "sslmode" not in database_url.lower():
        connect_args["sslmode"] = "require"
    
    _engine = create_engine(
        database_url,
        echo=settings.is_development,
        connect_args=connect_args,
        **pool_config,
    )
    
    logger.info(f"PostgreSQL engine created for: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'database'}")
    
    return _engine


def get_session_local():
    """Get or create session factory."""
    global _SessionLocal
    
    if _SessionLocal is None:
        engine = get_engine()
        _SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
        )
    
    return _SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for getting database session.
    
    Usage:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            ...
    """
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_conn():
    """
    Context manager for database connections.
    
    Provides backward compatibility with existing code while
    using SQLAlchemy under the hood.
    """
    SessionLocal = get_session_local()
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def init_db() -> None:
    """Initialize database tables using SQLAlchemy models."""
    engine = get_engine()
    Base.metadata.create_all(bind=engine)


def now_iso() -> str:
    """Get current UTC time in ISO format."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


# -----------------------------------------------------------------------------
# SQLAlchemy ORM Models
# -----------------------------------------------------------------------------


class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(String(20), nullable=False)
    user_type = Column(String(20), nullable=False, default="STUDENT")
    bio = Column(Text, nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    institution = Column(String(200), nullable=True)
    course = Column(String(200), nullable=True)
    year_of_study = Column(String(10), nullable=True)
    student_id = Column(String(50), nullable=True)
    field_of_research = Column(String(200), nullable=True)
    years_of_experience = Column(Integer, default=0)
    research_profile = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    firebase_uid = Column(String(128), nullable=True, unique=True, index=True)
    vote_weight = Column(Integer, default=1, nullable=False)
    
    blogs = relationship("Blog", back_populates="author", cascade="all, delete-orphan")
    forums = relationship("Forum", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    likes = relationship("Like", back_populates="user", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Blog(Base):
    __tablename__ = "blogs"
    
    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    published = Column(Boolean, default=False, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    is_hidden = Column(Boolean, default=False, nullable=False, index=True)
    is_flagship = Column(Boolean, default=False, nullable=False, index=True)
    report_type = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    author = relationship("User", back_populates="blogs")
    comments = relationship("Comment", back_populates="blog", cascade="all, delete-orphan", foreign_keys="Comment.blog_id")
    likes = relationship("Like", back_populates="blog", cascade="all, delete-orphan", foreign_keys="Like.blog_id")


class Forum(Base):
    __tablename__ = "forums"
    
    id = Column(String(36), primary_key=True)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    is_hidden = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    author = relationship("User", back_populates="forums")
    comments = relationship("Comment", back_populates="forum", cascade="all, delete-orphan", foreign_keys="Comment.forum_id")
    likes = relationship("Like", back_populates="forum", cascade="all, delete-orphan", foreign_keys="Like.forum_id")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(String(36), primary_key=True)
    content = Column(Text, nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blog_id = Column(String(36), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=True, index=True)
    forum_id = Column(String(36), ForeignKey("forums.id", ondelete="CASCADE"), nullable=True, index=True)
    parent_id = Column(String(36), ForeignKey("comments.id", ondelete="CASCADE"), nullable=True, index=True)
    deleted_at = Column(DateTime, nullable=True)
    is_hidden = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    user = relationship("User", back_populates="comments")
    blog = relationship("Blog", back_populates="comments", foreign_keys=[blog_id])
    forum = relationship("Forum", back_populates="comments", foreign_keys=[forum_id])
    parent = relationship("Comment", remote_side=[id], back_populates="replies")
    replies = relationship("Comment", back_populates="parent", cascade="all, delete-orphan")


class Like(Base):
    __tablename__ = "likes"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blog_id = Column(String(36), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=True, index=True)
    forum_id = Column(String(36), ForeignKey("forums.id", ondelete="CASCADE"), nullable=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    user = relationship("User", back_populates="likes")
    blog = relationship("Blog", back_populates="likes", foreign_keys=[blog_id])
    forum = relationship("Forum", back_populates="likes", foreign_keys=[forum_id])
    
    __table_args__ = (
        Index("idx_like_user_blog", "user_id", "blog_id", unique=True, postgresql_where=(blog_id.isnot(None))),
        Index("idx_like_user_forum", "user_id", "forum_id", unique=True, postgresql_where=(forum_id.isnot(None))),
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    revoked = Column(Boolean, default=False, nullable=False, index=True)
    
    user = relationship("User", back_populates="refresh_tokens")


class Debate(Base):
    __tablename__ = "debates"
    
    id = Column(String(36), primary_key=True)
    blog_a_id = Column(String(36), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=False, index=True)
    blog_b_id = Column(String(36), ForeignKey("blogs.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(20), nullable=False, default="ACTIVE")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    ended_at = Column(DateTime, nullable=True)
    
    votes = relationship("DebateVote", back_populates="debate", cascade="all, delete-orphan")


class DebateVote(Base):
    __tablename__ = "debate_votes"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    debate_id = Column(String(36), ForeignKey("debates.id", ondelete="CASCADE"), nullable=False, index=True)
    vote = Column(String(1), nullable=False)
    weight = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    debate = relationship("Debate", back_populates="votes")
    user = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    link = Column(String(255), nullable=True)
    notification_type = Column(String(50), nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    user = relationship("User")


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True)
    reporter_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_type = Column(String(20), nullable=False)
    target_id = Column(String(36), nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    resolved_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    reporter = relationship("User", foreign_keys=[reporter_id])
    resolver = relationship("User", foreign_keys=[resolved_by])


class Feedback(Base):
    __tablename__ = "feedback"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    user = relationship("User")


class Invite(Base):
    __tablename__ = "invites"
    
    id = Column(String(36), primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    invited_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False, default="STUDENT")
    token = Column(String(255), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="PENDING")
    expires_at = Column(DateTime, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    
    inviter = relationship("User")


class PostView(Base):
    __tablename__ = "post_views"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    post_type = Column(String(20), nullable=False)
    post_id = Column(String(36), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    user = relationship("User")


class LearningInteraction(Base):
    __tablename__ = "learning_interactions"
    
    id = Column(String(36), primary_key=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    target_type = Column(String(20), nullable=False)
    target_id = Column(String(36), nullable=False)
    interaction_type = Column(String(30), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="PENDING")
    classification = Column(String(30), nullable=True)
    resolution = Column(Text, nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    is_duplicate_of = Column(String(36), ForeignKey("learning_interactions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    resolved_at = Column(DateTime, nullable=True)
    
    user = relationship("User", foreign_keys=[user_id])
    resolver = relationship("User", foreign_keys=[resolved_by])
    original = relationship("LearningInteraction", remote_side=[id], foreign_keys=[is_duplicate_of])
    response = relationship("LearningResponse", back_populates="interaction", cascade="all, delete-orphan")


class LearningResponse(Base):
    __tablename__ = "learning_responses"
    
    id = Column(String(36), primary_key=True)
    interaction_id = Column(String(36), ForeignKey("learning_interactions.id", ondelete="CASCADE"), nullable=False, index=True)
    responder_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    response_type = Column(String(30), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    
    interaction = relationship("LearningInteraction", back_populates="response")
    responder = relationship("User")


# -----------------------------------------------------------------------------
# Database Connectivity Check
# -----------------------------------------------------------------------------

def check_database_connection() -> dict:
    """
    Check database connectivity and return status.
    
    Returns:
        dict: Status information including:
            - connected: bool
            - database_type: str (always postgresql)
            - version: str or None
            - error: str or None (if connection failed)
    """
    try:
        engine = get_engine()
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            return {
                "connected": True,
                "database_type": "postgresql",
                "version": version.split(" ")[0],
                "error": None,
            }
    except Exception as e:
        return {
            "connected": False,
            "database_type": "postgresql",
            "version": None,
            "error": str(e),
        }


# -----------------------------------------------------------------------------
# DNS Resolution Utilities (for IPv6 workaround)
# -----------------------------------------------------------------------------

def resolve_hostname_ipv4(hostname: str) -> Optional[str]:
    """
    Resolve hostname to IPv4 address.
    
    Args:
        hostname: The hostname to resolve
        
    Returns:
        IPv4 address string or None if resolution fails
    """
    try:
        result = socket.getaddrinfo(hostname, None, socket.AF_INET)
        if result:
            addr = result[0][4][0]
            return str(addr) if addr else None
    except socket.gaierror as e:
        logger.warning(f"Failed to resolve {hostname} to IPv4: {e}")
    return None


def check_dns_resolution(hostname: str) -> dict:
    """
    Check DNS resolution for a hostname.
    
    Returns dict with IPv4/IPv6 addresses and any errors.
    """
    result = {
        "hostname": hostname,
        "ipv4_addresses": [],
        "ipv6_addresses": [],
        "has_ipv4": False,
        "has_ipv6": False,
        "error": None,
    }
    
    try:
        addr_info = socket.getaddrinfo(hostname, 5432)
        for info in addr_info:
            addr = info[4][0]
            addr_str = str(addr)
            if ":" in addr_str:
                result["ipv6_addresses"].append(addr_str)
            else:
                result["ipv4_addresses"].append(addr_str)
        
        result["has_ipv4"] = len(result["ipv4_addresses"]) > 0
        result["has_ipv6"] = len(result["ipv6_addresses"]) > 0
        
    except socket.gaierror as e:
        result["error"] = str(e)
    
    return result


# -----------------------------------------------------------------------------
# Direct psycopg2 Connection (alternative to SQLAlchemy)
# -----------------------------------------------------------------------------

def get_psycopg2_connection():
    """
    Get a direct psycopg2 connection for Supabase.
    
    Use this for direct control over connection parameters,
    especially useful when troubleshooting connection issues.
    """
    import psycopg2
    from urllib.parse import urlparse
    
    database_url = settings.database_url
    parsed = urlparse(database_url)
    
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        database=parsed.path.lstrip("/"),
        user=parsed.username,
        password=parsed.password,
        sslmode="require",
        connect_timeout=10,
    )


# -----------------------------------------------------------------------------
# Connection Test with Detailed Logging
# -----------------------------------------------------------------------------

def test_connection_detailed() -> dict:
    """
    Test database connection with detailed diagnostic information.
    
    Useful for debugging Supabase connection issues.
    """
    result = {
        "success": False,
        "engine_created": False,
        "connection_ok": False,
        "dns_check": None,
        "database_type": "postgresql",
        "error": None,
        "suggestions": [],
    }
    
    try:
        from urllib.parse import urlparse
        parsed = urlparse(settings.DATABASE_URL)
        hostname = parsed.hostname
        
        if hostname:
            result["dns_check"] = check_dns_resolution(hostname)
            
            if not result["dns_check"]["has_ipv4"] and result["dns_check"]["has_ipv6"]:
                result["suggestions"].append(
                    "IPv6-only DNS detected. Set FORCE_IPV4=true in .env"
                )
                result["suggestions"].append(
                    "Or use Supabase pooler on port 6543 instead of 5432"
                )
        
        engine = get_engine()
        result["engine_created"] = True
        
        with engine.connect() as conn:
            version = conn.execute(text("SELECT version()")).fetchone()[0]
            
            result["connection_ok"] = True
            result["success"] = True
            logger.info(f"Database connection successful: {version}")
            
    except Exception as e:
        result["error"] = str(e)
        error_str = str(e).lower()
        
        if "name or service not known" in error_str or "could not translate host" in error_str:
            result["suggestions"].append(
                "DNS resolution failed. Try setting FORCE_IPV4=true"
            )
            result["suggestions"].append(
                "Or add explicit IP to DATABASE_URL: postgresql://user:pass@<IP>:6543/..."
            )
        elif "ssl" in error_str:
            result["suggestions"].append(
                "SSL error. Ensure sslmode=require is in DATABASE_URL"
            )
        elif "timeout" in error_str:
            result["suggestions"].append(
                "Connection timeout. Check firewall/network settings"
            )
        
        logger.error(f"Database connection failed: {e}")
    
    return result
