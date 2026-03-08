from typing import List, Optional

from fastapi import Depends, HTTPException, Request

from app.auth import decode_access_token
from app.db import get_conn


def get_cookie_values(request: Request, name: str) -> List[str]:
  values: List[str] = []
  raw = request.headers.get("cookie", "")
  if raw:
    for chunk in raw.split(";"):
      part = chunk.strip()
      if not part or "=" not in part:
        continue
      key, value = part.split("=", 1)
      if key.strip() != name:
        continue
      cleaned = value.strip().strip('"')
      if cleaned:
        values.append(cleaned)

  if not values:
    single = request.cookies.get(name)
    if single:
      values.append(single)

  return values


def get_current_user(request: Request):
  candidates: List[str] = []

  auth = request.headers.get("Authorization", "")
  if auth.lower().startswith("bearer "):
    bearer = auth.split(" ", 1)[1].strip()
    if bearer:
      candidates.append(bearer)

  # Browsers may send multiple same-name cookies (different paths/domains).
  # Try the most recently appended value first.
  cookie_tokens = get_cookie_values(request, "accessToken")
  candidates.extend(reversed(cookie_tokens))

  if not candidates:
    raise HTTPException(status_code=401, detail="Not authenticated")

  payload = None
  last_exception = None
  for token in candidates:
    try:
      payload = decode_access_token(token)
      break
    except Exception as e:
      last_exception = e
      continue

  if not payload:
    detail = "Invalid token"
    if last_exception:
      detail = f"Invalid token: {str(last_exception)}"
    raise HTTPException(status_code=401, detail=detail)

  user_id = payload.get("sub")
  if not user_id:
    raise HTTPException(status_code=401, detail="Invalid token")

  with get_conn() as conn:
    row = conn.execute(
      "SELECT id, name, email, role, bio, created_at FROM users WHERE id = ?",
      (user_id,),
    ).fetchone()

  if not row:
    raise HTTPException(status_code=401, detail="User not found")

  return dict(row)


def require_role(*roles):
  def dependency(user=Depends(get_current_user)):
    if user["role"] not in roles:
      raise HTTPException(status_code=403, detail="Forbidden")
    return user

  return dependency
