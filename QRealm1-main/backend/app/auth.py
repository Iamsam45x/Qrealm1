import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from passlib.context import CryptContext

from app.db import now_iso

pwd_context = CryptContext(
  schemes=["bcrypt_sha256", "bcrypt"],
  deprecated="auto",
)

JWT_ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "dev-access-secret")
JWT_REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "dev-refresh-secret")

try:
  ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
except ValueError:
  ACCESS_TOKEN_EXPIRE_MINUTES = 60

try:
  REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
except ValueError:
  REFRESH_TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
  return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
  return pwd_context.verify(password, password_hash)


def _create_token(
  subject: str,
  role: str,
  token_type: str,
  expires_delta: timedelta,
  secret: str,
) -> str:
  now = datetime.utcnow()
  payload = {
    "sub": subject,
    "role": role,
    "type": token_type,
    "iat": int(now.timestamp()),
    "exp": int((now + expires_delta).timestamp()),
  }
  return jwt.encode(payload, secret, algorithm="HS256")


def create_access_token(user_id: str, role: str) -> str:
  return _create_token(
    user_id,
    role,
    "access",
    timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    JWT_ACCESS_SECRET,
  )


def create_refresh_token(user_id: str, role: str) -> str:
  return _create_token(
    user_id,
    role,
    "refresh",
    timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    JWT_REFRESH_SECRET,
  )


def decode_access_token(token: str) -> Dict[str, Any]:
  return jwt.decode(token, JWT_ACCESS_SECRET, algorithms=["HS256"])


def decode_refresh_token(token: str) -> Dict[str, Any]:
  return jwt.decode(token, JWT_REFRESH_SECRET, algorithms=["HS256"])


def refresh_expires_at() -> str:
  return (datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)).isoformat() + "Z"


def access_expires_in() -> str:
  return str(ACCESS_TOKEN_EXPIRE_MINUTES * 60)
