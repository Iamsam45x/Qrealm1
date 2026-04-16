"""
Centralized Settings Module for FastAPI Backend

This module provides a single source of truth for all configuration values
using Pydantic BaseSettings. It supports both development and production modes
with appropriate validation and defaults.

Environment Variables:
    ENVIRONMENT: Set to "production" to enable strict validation
    JWT_SECRET_KEY: Required in production (auto-generated in dev)
    JWT_REFRESH_SECRET_KEY: Required in production
    DATABASE_URL: PostgreSQL/Supabase URL, e.g. postgresql+psycopg2://user:pass@host:5432/dbname
    ALLOWED_ORIGINS: Comma-separated list of allowed CORS origins
    SMTP_*: Email configuration
    SENTRY_DSN: Optional error tracking
"""

import socket
from typing import List, Optional
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Centralized application settings using Pydantic BaseSettings.
    
    All configuration is loaded from environment variables with sensible
    defaults for development. In production, required secrets must be set.
    """
    
    # Environment
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias="ENVIRONMENT",
        description="Set to 'production' for production mode"
    )
    
    # Server
    PORT: int = Field(default=4000, validation_alias="PORT")
    
    # Database (PostgreSQL/Supabase only)
    DATABASE_URL: str = Field(
        default="",
        validation_alias="DATABASE_URL",
        description="PostgreSQL connection URL. Format: postgresql://user:pass@host:port/dbname"
    )
    
    # PostgreSQL Connection Pooling
    DB_POOL_SIZE: int = Field(
        default=5,
        validation_alias="DB_POOL_SIZE",
        description="Number of connections to maintain in the pool"
    )
    DB_MAX_OVERFLOW: int = Field(
        default=10,
        validation_alias="DB_MAX_OVERFLOW",
        description="Max number of connections that can be created beyond POOL_SIZE"
    )
    DB_POOL_TIMEOUT: int = Field(
        default=30,
        validation_alias="DB_POOL_TIMEOUT",
        description="Seconds to wait for a connection from the pool"
    )
    DB_POOL_RECYCLE: int = Field(
        default=1800,
        validation_alias="DB_POOL_RECYCLE",
        description="Recycle connections after this many seconds (30 minutes)"
    )
    
    # JWT Configuration
    JWT_SECRET_KEY: str = Field(
        default="dev-secret-key-do-not-use-in-production",
        validation_alias="JWT_SECRET_KEY",
        description="Secret key for JWT access tokens"
    )
    JWT_REFRESH_SECRET_KEY: str = Field(
        default="dev-refresh-secret-key-do-not-use-in-production",
        validation_alias="JWT_REFRESH_SECRET_KEY",
        description="Secret key for JWT refresh tokens"
    )
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=60,
        validation_alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
        description="Access token expiry in minutes"
    )
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = Field(
        default=7,
        validation_alias="JWT_REFRESH_TOKEN_EXPIRE_DAYS",
        description="Refresh token expiry in days"
    )
    
    # Frontend / CORS
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        validation_alias="FRONTEND_URL",
        description="Primary frontend URL"
    )
    ALLOWED_ORIGINS: str = Field(
        default="http://localhost:3000,https://my-production-frontend.com",
        validation_alias="ALLOWED_ORIGINS",
        description="Comma-separated CORS origins (dev + production frontend)"
    )
    
    # Cookie Settings
    COOKIE_SECURE: bool = Field(
        default=False,
        validation_alias="COOKIE_SECURE",
        description="Set to true in production (requires HTTPS)"
    )
    COOKIE_SAMESITE: str = Field(
        default="lax",
        validation_alias="COOKIE_SAMESITE",
        description="Cookie SameSite policy"
    )
    COOKIE_DOMAIN: Optional[str] = Field(
        default=None,
        validation_alias="COOKIE_DOMAIN",
        description="Cookie domain for cross-subdomain cookies"
    )
    
    # File Uploads
    UPLOAD_DIR: str = Field(
        default="./uploads",
        validation_alias="UPLOAD_DIR",
        description="Directory for uploaded files"
    )
    
    # SMTP Configuration
    SMTP_HOST: str = Field(
        default="smtp.gmail.com",
        validation_alias="SMTP_HOST",
        description="SMTP server hostname"
    )
    SMTP_PORT: int = Field(
        default=587,
        validation_alias="SMTP_PORT",
        description="SMTP server port"
    )
    SMTP_USER: str = Field(
        default="",
        validation_alias="SMTP_USER",
        description="SMTP username/email"
    )
    SMTP_PASSWORD: str = Field(
        default="",
        validation_alias="SMTP_PASSWORD",
        description="SMTP password or app-specific password"
    )
    SMTP_FROM: Optional[str] = Field(
        default=None,
        validation_alias="SMTP_FROM",
        description="Sender email address (defaults to SMTP_USER)"
    )
    SMTP_FROM_NAME: str = Field(
        default="QRealm",
        validation_alias="SMTP_FROM_NAME",
        description="Sender display name"
    )
    
    # Alternative Email Provider
    RESEND_API_KEY: Optional[str] = Field(
        default=None,
        validation_alias="RESEND_API_KEY",
        description="Resend API key for email delivery"
    )
    EMAIL_FROM: Optional[str] = Field(
        default=None,
        validation_alias="EMAIL_FROM",
        description="Default sender email for Resend"
    )
    
    # Monitoring
    SENTRY_DSN: Optional[str] = Field(
        default=None,
        validation_alias="SENTRY_DSN",
        description="Sentry DSN for error tracking"
    )
    
    # Admin Account (for initial setup / seeding)
    ADMIN_NAME: str = Field(
        default="Admin",
        validation_alias="ADMIN_NAME"
    )
    ADMIN_EMAIL: str = Field(
        default="admin@example.com",
        validation_alias="ADMIN_EMAIL"
    )
    ADMIN_PASSWORD: str = Field(
        default="admin123",
        validation_alias="ADMIN_PASSWORD"
    )
    
    # Development OTP (for testing without email)
    SAMPLE_OTP: str = Field(
        default="123456",
        validation_alias="SAMPLE_OTP"
    )
    
    # Rate Limiting
    RATE_LIMIT_MAX_ATTEMPTS: int = Field(
        default=5,
        validation_alias="RATE_LIMIT_MAX_ATTEMPTS",
        description="Max failed login attempts before lockout"
    )
    RATE_LIMIT_WINDOW_MINUTES: int = Field(
        default=15,
        validation_alias="RATE_LIMIT_WINDOW_MINUTES",
        description="Lockout duration in minutes"
    )
    
    # Network / DNS
    FORCE_IPV4: bool = Field(
        default=False,
        validation_alias="FORCE_IPV4",
        description="Force IPv4-only connections (use if IPv6 DNS resolution fails)"
    )
    
    # App Name (static, not from env)
    APP_NAME: str = "Educational Platform API"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.ENVIRONMENT.lower() == "development"
    
    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def cors_origins(self) -> List[str]:
        """
        Get CORS allowed origins based on environment.
        
        In development: includes localhost origins even if not explicitly set
        In production: uses only explicitly configured ALLOWED_ORIGINS
        
        Returns:
            List of allowed origins for CORS middleware
        """
        # Parse explicitly configured origins
        configured = [item.strip() for item in self.ALLOWED_ORIGINS.split(",") if item.strip()]
        
        if self.is_production:
            # Production: use only explicitly configured origins
            # Never use wildcard in production
            if "*" in configured:
                raise ValueError("Wildcard '*' not allowed in ALLOWED_ORIGINS in production")
            if not configured:
                raise ValueError("ALLOWED_ORIGINS must be configured in production")
            return configured
        
        # Development: add localhost if not present
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
        
        # Start with configured origins
        origins = configured.copy() if configured else [self.FRONTEND_URL]
        
        # Add localhost origins for development
        for origin in dev_origins:
            if origin not in origins:
                origins.append(origin)
        
        return origins
    
    @property
    def frontend_origins(self) -> List[str]:
        """
        Legacy property - returns cors_origins for backward compatibility.
        """
        return self.cors_origins
    
    @property
    def jwt_access_token_expires_minutes(self) -> int:
        """JWT access token expiry in minutes."""
        return self.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
    
    @property
    def jwt_refresh_token_expires_days(self) -> int:
        """JWT refresh token expiry in days."""
        return self.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    
    @property
    def database_url(self) -> str:
        """
        Resolve SQLAlchemy database URL.

        PostgreSQL/Supabase is required. DATABASE_URL must be set.
        """
        url = self.DATABASE_URL.strip() if self.DATABASE_URL else ""
        
        if not url:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Please configure your Supabase PostgreSQL connection URL."
            )
        
        if "postgresql" not in url.lower():
            raise ValueError(
                f"DATABASE_URL must be a PostgreSQL connection string. "
                f"Received: {url[:50]}..."
            )
        
        if self.FORCE_IPV4 and "supabase.co" in url.lower():
            url = self._resolve_postgres_host_ipv4(url)
        
        return url
    
    def _resolve_postgres_host_ipv4(self, url: str) -> str:
        """
        Replace hostname with IPv4 address for Supabase PostgreSQL.
        
        This works around IPv6-only DNS resolution failures.
        """
        import re
        from urllib.parse import urlparse, urlunparse
        
        parsed = urlparse(url)
        hostname = parsed.hostname
        
        if hostname and hostname.endswith(".supabase.co"):
            try:
                result = socket.getaddrinfo(hostname, None, socket.AF_INET)
                if result:
                    ipv4_addr = result[0][4][0]
                    new_netloc = f"{parsed.username}:{parsed.password}@{ipv4_addr}:{parsed.port}" if parsed.port else f"{parsed.username}:{parsed.password}@{ipv4_addr}"
                    new_parsed = parsed._replace(netloc=new_netloc)
                    return urlunparse(new_parsed)
            except socket.gaierror:
                pass
        
        return url
    
    @property
    def is_postgresql(self) -> bool:
        """Check if using PostgreSQL database."""
        return "postgresql" in self.database_url.lower()
    
    @property
    def db_pool_config(self) -> dict:
        """Get SQLAlchemy engine pool configuration."""
        return {
            "pool_size": self.DB_POOL_SIZE,
            "max_overflow": self.DB_MAX_OVERFLOW,
            "pool_timeout": self.DB_POOL_TIMEOUT,
            "pool_recycle": self.DB_POOL_RECYCLE,
            "pool_pre_ping": True,
        }
    
    @property
    def cookie_settings(self) -> dict:
        """Build cookie settings dictionary for FastAPI responses."""
        return {
            "secure": self.COOKIE_SECURE,
            "samesite": self.COOKIE_SAMESITE if self.COOKIE_SAMESITE in ("lax", "strict", "none") else "lax",
        }
    
    @model_validator(mode="after")
    def validate_production_config(self):
        """
        Validate required configuration in production mode.
        
        Raises clear errors if required environment variables are missing
        when ENVIRONMENT is set to 'production'.
        """
        if self.is_production:
            errors = []
            
            # Check JWT secrets - fail fast if using defaults in production
            if "dev-" in self.JWT_SECRET_KEY.lower() or "change" in self.JWT_SECRET_KEY.lower():
                errors.append("JWT_SECRET_KEY must be set to a secure value in production")
            
            if "dev-" in self.JWT_REFRESH_SECRET_KEY.lower() or "change" in self.JWT_REFRESH_SECRET_KEY.lower():
                errors.append("JWT_REFRESH_SECRET_KEY must be set to a secure value in production")
            
            # Warn about cookie security
            if not self.COOKIE_SECURE:
                errors.append("COOKIE_SECURE should be set to true in production")
            
            # PostgreSQL required
            if not self.DATABASE_URL:
                errors.append("DATABASE_URL must be set (Supabase PostgreSQL)")
            
            # Validate CORS configuration
            try:
                cors = self.cors_origins
                if "*" in cors:
                    errors.append("Wildcard '*' not allowed in ALLOWED_ORIGINS in production")
            except ValueError as e:
                errors.append(str(e))
            
            if errors:
                raise ValueError(
                    f"Production configuration errors:\n" + 
                    "\n".join(f"  - {e}" for e in errors)
                )
        
        return self
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


# Singleton instance - import this throughout the application
settings = Settings()
