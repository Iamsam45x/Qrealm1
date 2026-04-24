import re
import secrets
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import auth
from app.auth import access_expires_in
from app.db import get_conn, init_db, now_iso, check_db_connection
from app.deps import get_current_user, require_role
from app.models import (
  BlogCreateInput,
  BlogUpdateInput,
  ChangePasswordInput,
  CommentCreateInput,
  DebateCreateInput,
  DebateVoteInput,
  FeedbackCreateInput,
  FirebaseRegisterInput,
  ForgotPasswordInput,
  ForumCreateInput,
  InviteAcceptInput,
  InviteCreateInput,
  LearningInteractionCreateInput,
  LearningInteractionResponseInput,
  LoginInput,
  NotificationCreateInput,
  RegisterInput,
  RegisterWithVerificationInput,
  ReportCreateInput,
  ResetPasswordInput,
  SearchInput,
  UploadSignedInput,
  ROLE_CAN_CREATE_DEBATE,
  ROLE_HIERARCHY,
  VOTE_WEIGHTS,
)
from app.upload import save_upload
from app.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables if missing (dev/single-instance). Prefer Alembic in production.
    init_db()
    yield


app = FastAPI(title=settings.APP_NAME, lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=settings.frontend_origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
def health_check():
    """
    Liveness/readiness probe: verifies PostgreSQL (or SQLite fallback) connectivity.

    Returns HTTP 503 when the database is unreachable so orchestrators can restart the service.
    """
    db_status = check_db_connection()
    payload = {
        "status": "healthy" if db_status["connected"] else "unhealthy",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
    }
    if not db_status["connected"]:
        return JSONResponse(status_code=503, content=payload)
    return payload


def ok(data: Any):
  return {"success": True, "data": data}


def fail(message: str, code: Optional[str] = None, status: int = 400):
  payload: Dict[str, Any] = {"success": False, "error": message}
  if code:
    payload["code"] = code
  return JSONResponse(status_code=status, content=payload)


def set_auth_cookies(res: JSONResponse, access_token: str, refresh_token: str):
  cookie_opts: Dict[str, Any] = {
    "httponly": True,
    "secure": settings.COOKIE_SECURE,
    "samesite": settings.COOKIE_SAMESITE if settings.COOKIE_SAMESITE in ("lax", "strict", "none") else "lax",
    "path": "/",
  }
  if settings.COOKIE_DOMAIN:
    cookie_opts["domain"] = settings.COOKIE_DOMAIN

  res.set_cookie("accessToken", access_token, **cookie_opts)
  res.set_cookie("refreshToken", refresh_token, **cookie_opts)

  delete_opts: Dict[str, Any] = {"path": "/api"}
  if settings.COOKIE_DOMAIN:
    delete_opts["domain"] = settings.COOKIE_DOMAIN
  res.delete_cookie("accessToken", **delete_opts)
  res.delete_cookie("refreshToken", **delete_opts)


def clear_auth_cookies(res: JSONResponse):
  delete_paths = ["/", "/api"]
  for path in delete_paths:
    delete_opts: Dict[str, Any] = {"path": path}
    if settings.COOKIE_DOMAIN:
      delete_opts["domain"] = settings.COOKIE_DOMAIN
    res.delete_cookie("accessToken", **delete_opts)
    res.delete_cookie("refreshToken", **delete_opts)


@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException):
  return fail(str(exc.detail), status=exc.status_code)


@app.exception_handler(Exception)
def unhandled_exception_handler(request: Request, exc: Exception):
  return fail("Internal server error", status=500)


def user_payload(row) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "name": row["name"],
    "email": row["email"],
    "role": row["role"],
    "userType": row["user_type"] if row["user_type"] else "STUDENT",
    "bio": row["bio"] if row["bio"] else None,
    "verified": bool(row["verified"] if row["verified"] else 0),
    "institution": row["institution"] if row["institution"] else None,
    "course": row["course"] if row["course"] else None,
    "yearOfStudy": row["year_of_study"] if row["year_of_study"] else None,
    "studentId": row["student_id"] if row["student_id"] else None,
    "fieldOfResearch": row["field_of_research"] if row["field_of_research"] else None,
    "yearsOfExperience": row["years_of_experience"] if row["years_of_experience"] else 0,
    "researchProfile": row["research_profile"] if row["research_profile"] else None,
  }


def issue_refresh_session(token: str):
  try:
    payload = auth.decode_refresh_token(token)
  except Exception:
    return None

  user_id = payload.get("sub")
  role = payload.get("role")
  if not user_id or not role:
    return None

  with get_conn() as conn:
    row = conn.execute(
      "SELECT id, revoked, expires_at FROM refresh_tokens WHERE token = ?",
      (token,),
    ).fetchone()

    if not row or row["revoked"]:
      return None

    user_row = conn.execute(
      "SELECT id, name, email, role, bio, created_at FROM users WHERE id = ?",
      (user_id,),
    ).fetchone()

    if not user_row:
      return None

    access_token = auth.create_access_token(user_id, role)
    new_refresh = auth.create_refresh_token(user_id, role)

    # Boolean columns: use TRUE/FALSE for PostgreSQL; parameters use Python bool for drivers.
    conn.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?", (token,))
    conn.execute(
      "INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, ?, ?)",
      (str(uuid.uuid4()), user_id, new_refresh, now_iso(), auth.refresh_expires_at(), False),
    )
    conn.commit()

  return {
    "access_token": access_token,
    "refresh_token": new_refresh,
    "user_row": user_row,
  }


def blog_payload(row) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "title": row["title"],
    "slug": row["slug"],
    "content": row["content"],
    "published": bool(row["published"]),
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
    "authorId": row["author_id"],
    "author": {
      "id": row["author_id"],
      "name": row["author_name"],
      "email": row["author_email"],
      "role": row["author_role"],
    },
    "_count": {
      "comments": row["comments_count"],
      "likes": row["likes_count"],
    },
  }


def forum_payload(row) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "title": row["title"],
    "content": row["content"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
    "authorId": row["author_id"],
    "author": {
      "id": row["author_id"],
      "name": row["author_name"],
      "email": row["author_email"],
      "role": row["author_role"],
    },
    "_count": {
      "comments": row["comments_count"],
      "likes": row["likes_count"],
    },
  }


def comment_payload(row) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "content": row["content"],
    "createdAt": row["created_at"],
    "userId": row["user_id"],
    "user": {
      "id": row["user_id"],
      "name": row["user_name"],
    },
    "parentId": row["parent_id"],
  }


def build_comment_tree(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
  by_id: Dict[str, Dict[str, Any]] = {}
  roots: List[Dict[str, Any]] = []

  for row in rows:
    item = comment_payload(row)
    item["replies"] = []
    by_id[item["id"]] = item

  for item in by_id.values():
    parent_id = item.get("parentId")
    if parent_id and parent_id in by_id:
      by_id[parent_id]["replies"].append(item)
    else:
      roots.append(item)

  return roots


def slugify(text: str) -> str:
  slug = "".join(ch.lower() if ch.isalnum() else "-" for ch in text).strip("-")
  while "--" in slug:
    slug = slug.replace("--", "-")
  return slug or uuid.uuid4().hex


VISIBILITY_FILTER = "deleted_at IS NULL AND is_hidden = FALSE"


def debate_payload(row) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "blogAId": row["blog_a_id"],
    "blogBId": row["blog_b_id"],
    "createdBy": row["created_by"],
    "title": row["title"],
    "description": row["description"],
    "status": row["status"],
    "createdAt": row["created_at"],
    "endedAt": row["ended_at"],
    "voteCounts": {
      "A": row.get("votes_a", 0),
      "B": row.get("votes_b", 0),
    },
  }


def notification_payload(row: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "userId": row["user_id"],
    "message": row["message"],
    "link": row["link"],
    "type": row["notification_type"],
    "isRead": bool(row["is_read"]),
    "createdAt": row["created_at"],
  }


def learning_interaction_payload(row: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "userId": row["user_id"],
    "targetType": row["target_type"],
    "targetId": row["target_id"],
    "interactionType": row["interaction_type"],
    "content": row["content"],
    "status": row["status"],
    "classification": row["classification"],
    "resolution": row["resolution"],
    "isPublic": bool(row["is_public"]),
    "createdAt": row["created_at"],
    "resolvedAt": row["resolved_at"],
    "user": {"id": row["user_id"], "name": row.get("user_name"), "role": row.get("user_role")} if "user_id" in row else None,
  }


def learning_response_payload(row: Dict[str, Any]) -> Dict[str, Any]:
  return {
    "id": row["id"],
    "interactionId": row["interaction_id"],
    "responderId": row["responder_id"],
    "responseType": row["response_type"],
    "content": row["content"],
    "createdAt": row["created_at"],
  }


def create_notification(user_id: str, message: str, link: Optional[str], notification_type: str):
  notif_id = str(uuid.uuid4())
  with get_conn() as conn:
    conn.execute(
      "INSERT INTO notifications (id, user_id, message, link, notification_type, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      (notif_id, user_id, message, link, notification_type, False, now_iso()),
    )
    conn.commit()
  return notif_id


RATE_LIMIT_MAX_ATTEMPTS = settings.RATE_LIMIT_MAX_ATTEMPTS
RATE_LIMIT_WINDOW_MINUTES = settings.RATE_LIMIT_WINDOW_MINUTES


def is_rate_limited(conn, email: str) -> tuple[bool, int]:
    row = conn.execute(
        "SELECT login_attempts, locked_until FROM users WHERE email = ?",
        (email.lower(),)
    ).fetchone()
    
    if not row:
        return False, 0
    
    locked_until = row["locked_until"]
    if locked_until:
        lock_time = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) < lock_time:
            remaining = (lock_time - datetime.now(timezone.utc)).seconds // 60
            return True, remaining
    
    return False, 0


def increment_login_attempts(conn, email: str) -> None:
    email_lower = email.lower()
    row = conn.execute(
        "SELECT login_attempts FROM users WHERE email = ?",
        (email_lower,)
    ).fetchone()
    
    attempts = (row["login_attempts"] or 0) + 1
    
    if attempts >= RATE_LIMIT_MAX_ATTEMPTS:
        locked_until = datetime.now(timezone.utc) + timedelta(minutes=RATE_LIMIT_WINDOW_MINUTES)
        conn.execute(
            "UPDATE users SET login_attempts = ?, locked_until = ? WHERE email = ?",
            (attempts, locked_until.isoformat(), email_lower)
        )
    else:
        conn.execute(
            "UPDATE users SET login_attempts = ? WHERE email = ?",
            (attempts, email_lower)
        )
    conn.commit()


def reset_login_attempts(conn, email: str) -> None:
    conn.execute(
        "UPDATE users SET login_attempts = 0, locked_until = NULL WHERE email = ?",
        (email.lower(),)
    )
    conn.commit()


def user_payload_extended(row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "userType": row["user_type"] if row["user_type"] else "STUDENT",
        "bio": row["bio"] if row["bio"] else None,
        "verified": bool(row["verified"] if row["verified"] else 0),
        "institution": row["institution"] if row["institution"] else None,
        "course": row["course"] if row["course"] else None,
        "yearOfStudy": row["year_of_study"] if row["year_of_study"] else None,
        "studentId": row["student_id"] if row["student_id"] else None,
        "fieldOfResearch": row["field_of_research"] if row["field_of_research"] else None,
        "yearsOfExperience": row["years_of_experience"] if row["years_of_experience"] else 0,
        "researchProfile": row["research_profile"] if row["research_profile"] else None,
    }


@app.post("/api/auth/register-firebase")
def register_firebase(input: FirebaseRegisterInput):
    """
    Register a new user with Firebase Authentication.
    This endpoint is called after a user signs up with Firebase,
    to create their profile in the Supabase database.
    """
    name = input.name.strip()
    email = input.email.lower().strip()
    user_type = input.user_type
    firebase_uid = input.firebase_uid

    if user_type not in {"STUDENT", "RESEARCHER"}:
        return fail("Invalid user type", code="INVALID_TYPE")

    student_fields = input.get_student_fields()
    researcher_fields = input.get_researcher_fields()

    with get_conn() as conn:
        existing_firebase = conn.execute(
            "SELECT 1 FROM users WHERE firebase_uid = ?",
            (firebase_uid,)
        ).fetchone()
        if existing_firebase:
            return ok({
                "message": "User already registered",
                "userId": conn.execute(
                    "SELECT id FROM users WHERE firebase_uid = ?",
                    (firebase_uid,)
                ).fetchone()["id"]
            })

        existing_email = conn.execute(
            "SELECT 1 FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        if existing_email:
            return fail("Email already registered", code="EMAIL_EXISTS")

        user_id = str(uuid.uuid4())
        
        conn.execute(
            """INSERT INTO users (id, name, email, role, user_type, bio, 
               verified, firebase_uid, institution, course, year_of_study, student_id,
               field_of_research, years_of_experience, research_profile, created_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                name,
                email,
                "PROFESSOR" if user_type == "RESEARCHER" else "STUDENT",
                user_type,
                input.bio,
                True,
                firebase_uid,
                student_fields.institution if student_fields else (researcher_fields.institution if researcher_fields else None),
                student_fields.course if student_fields else None,
                student_fields.year_of_study if student_fields else None,
                student_fields.student_id if student_fields else None,
                researcher_fields.field_of_research if researcher_fields else None,
                researcher_fields.years_of_experience if researcher_fields else None,
                researcher_fields.research_profile if researcher_fields else None,
                now_iso(),
            ),
        )
        conn.commit()

    return ok({
        "message": "Registration successful",
        "userId": user_id
    })


@app.post("/api/auth/forgot-password")
def forgot_password(input: ForgotPasswordInput):
    email = input.email.lower().strip()
    
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id FROM users WHERE email = ?",
            (email,)
        ).fetchone()
        
        if row:
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            
            conn.execute(
                "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?",
                (reset_token, expires_at.isoformat(), row["id"])
            )
            conn.commit()
            
            return ok({
                "message": "If an account exists with this email, a password reset link has been sent.",
                "resetToken": reset_token
            })
        
        return ok({"message": "If an account exists with this email, a password reset link has been sent."})


@app.post("/api/auth/reset-password")
def reset_password(input: ResetPasswordInput):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, reset_token_expires FROM users WHERE reset_token = ?",
            (input.token,)
        ).fetchone()
        
        if not row:
            return fail("Invalid reset token", code="INVALID_TOKEN", status=400)
        
        expires_str = row["reset_token_expires"]
        if expires_str:
            expires = datetime.fromisoformat(expires_str.replace("Z", "+00:00"))
            if datetime.now(timezone.utc) > expires:
                return fail("Reset token has expired", code="TOKEN_EXPIRED", status=400)
        
        conn.execute(
            "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
            (auth.hash_password(input.new_password), row["id"])
        )
        conn.commit()
    
    return ok({"message": "Password reset successfully"})


@app.post("/api/auth/change-password")
def change_password(input: ChangePasswordInput, user=Depends(get_current_user)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT password_hash FROM users WHERE id = ?",
            (user["id"],)
        ).fetchone()
        
        if not row or not auth.verify_password(input.old_password, row["password_hash"]):
            return fail("Current password is incorrect", status=401)
        
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            (auth.hash_password(input.new_password), user["id"])
        )
        conn.commit()
    
    return ok({"message": "Password changed successfully"})


@app.post("/api/auth/login")
def login(input: LoginInput):
    email = input.email.lower().strip()
    
    with get_conn() as conn:
        is_limited, remaining = is_rate_limited(conn, email)
        if is_limited:
            return fail(
                f"Account locked due to too many failed attempts. Try again in {remaining} minutes.",
                code="RATE_LIMITED",
                status=429
            )
        
        row = conn.execute(
            "SELECT * FROM users WHERE email = ?",
            (email,)
        ).fetchone()

        if not row:
            return fail("Invalid email or password", status=401)

        if not auth.verify_password(input.password, row["password_hash"]):
            increment_login_attempts(conn, email)
            return fail("Invalid email or password", status=401)

        if not row["verified"]:
            return fail("Please verify your email before logging in", code="NOT_VERIFIED", status=403)

        reset_login_attempts(conn, email)
        
        user_id = row["id"]
        user_role = row["role"]
        user_name = row["name"]
        user_email = row["email"]
        user_type = row["user_type"] if row["user_type"] else "STUDENT"
        user_bio = row["bio"] if row["bio"] else None
        user_verified = bool(row["verified"])
        
        remember_token = secrets.token_urlsafe(32) if input.remember else None
        
        access_token = auth.create_access_token(user_id, user_role)
        refresh_token = auth.create_refresh_token(user_id, user_role)

        conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (user_id,))
        conn.execute(
            "INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), user_id, refresh_token, now_iso(), auth.refresh_expires_at(), False),
        )
        
        if remember_token:
            conn.execute(
                "UPDATE users SET remember_token = ? WHERE id = ?",
                (remember_token, user_id)
            )
        
        conn.commit()
        
        user_data = {
            "id": user_id,
            "name": user_name,
            "email": user_email,
            "role": user_role,
            "userType": user_type,
            "bio": user_bio,
            "verified": user_verified,
        }

    response = ok({
        "user": user_data,
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "expiresIn": access_expires_in(),
    })
    res = JSONResponse(content=response)
    set_auth_cookies(res, access_token, refresh_token)
    return res


@app.post("/api/auth/logout")
def logout(request: Request):
  refresh_token = request.cookies.get("refreshToken")
  if refresh_token:
    with get_conn() as conn:
      conn.execute("UPDATE refresh_tokens SET revoked = TRUE WHERE token = ?", (refresh_token,))
      conn.commit()

  res = JSONResponse(content=ok({"message": "Logged out"}))
  clear_auth_cookies(res)
  return res


@app.get("/auth/me")
def me(request: Request):
  try:
    user = get_current_user(request)
    return ok({"user": user})
  except HTTPException as exc:
    if exc.status_code != 401:
      raise

  token = request.cookies.get("refreshToken")
  if not token:
    return fail("Not authenticated", status=401)

  session = issue_refresh_session(token)
  if not session:
    return fail("Invalid refresh token", status=401)

  response = ok(
    {
      "user": user_payload(session["user_row"]),
      "accessToken": session["access_token"],
      "refreshToken": session["refresh_token"],
      "expiresIn": access_expires_in(),
    }
  )
  res = JSONResponse(content=response)
  set_auth_cookies(res, session["access_token"], session["refresh_token"])
  return res


@app.post("/api/auth/refresh")
async def refresh_session(request: Request):
  token = request.cookies.get("refreshToken")
  if not token:
    try:
      data = await request.json()
    except Exception:
      data = None
    if isinstance(data, dict):
      token = data.get("refreshToken")

  if not token:
    return fail("Missing refresh token", status=401)

  session = issue_refresh_session(token)
  if not session:
    return fail("Invalid refresh token", status=401)

  response = ok(
    {
      "accessToken": session["access_token"],
      "refreshToken": session["refresh_token"],
      "expiresIn": access_expires_in(),
    }
  )
  res = JSONResponse(content=response)
  set_auth_cookies(res, session["access_token"], session["refresh_token"])
  return res


@app.get("/api/blogs")
def list_blogs(
  page: int = Query(1, ge=1),
  limit: int = Query(10, ge=1, le=100),
  search: Optional[str] = None,
  published: Optional[str] = None,
  cursor: Optional[str] = None,
):
  import logging
  logging.info(f"[LIST_BLOGS] published param: {published}")
  
  where = [VISIBILITY_FILTER]
  params: List[Any] = []

  if published != "false":
    where.append("b.published = TRUE")

  if search:
    where.append("(b.title LIKE ? OR b.content LIKE ?)")
    like = f"%{search}%"
    params.extend([like, like])

  if cursor:
    where.append("b.id > ?")
    params.append(cursor)

  where_clause = f"WHERE {' AND '.join(where)}" if where else ""
  logging.info(f"[LIST_BLOGS] where_clause: {where_clause}")

  offset = (page - 1) * limit

  with get_conn() as conn:
    all_blogs = conn.execute("SELECT COUNT(*), published FROM blogs WHERE deleted_at IS NULL GROUP BY published").fetchall()
    logging.info(f"[LIST_BLOGS] Blog counts by published status: {all_blogs}")
    
    total_result = conn.execute(
      f"SELECT COUNT(*) FROM blogs b {where_clause}",
      tuple(params),
    )
    count_row = total_result.fetchone()
    total = count_row[0] if count_row else 0

    rows = conn.execute(
      f"""
      SELECT
        b.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id AND c.deleted_at IS NULL AND c.is_hidden = FALSE) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      {where_clause}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
      """,
      [*params, limit, offset],
    ).fetchall()

  items = [blog_payload(row) for row in rows]
  logging.info(f"[LIST_BLOGS] Returning {len(items)} blogs out of {total} total")
  next_cursor = items[-1]["id"] if items else None
  return ok({"items": items, "total": total, "page": page, "limit": limit, "nextCursor": next_cursor})


@app.get("/api/blogs/popular")
def popular_blogs(limit: int = Query(5, ge=1, le=20)):
  with get_conn() as conn:
    rows = conn.execute(
      """
      SELECT
        b.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      WHERE b.published = TRUE
      ORDER BY likes_count DESC, b.created_at DESC
      LIMIT ?
      """,
      (limit,),
    ).fetchall()

  return ok([blog_payload(row) for row in rows])


@app.get("/api/blogs/{slug}")
def get_blog(slug: str):
  with get_conn() as conn:
    row = conn.execute(
      """
      SELECT
        b.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id AND c.deleted_at IS NULL AND c.is_hidden = FALSE) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      WHERE b.slug = ? AND b.deleted_at IS NULL
      """,
      (slug,),
    ).fetchone()

    if not row or row["is_hidden"]:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    comment_rows = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.blog_id = ? AND c.deleted_at IS NULL AND c.is_hidden = FALSE
      ORDER BY c.created_at ASC
      """,
      (row["id"],),
    ).fetchall()

  blog = blog_payload(row)
  blog["comments"] = build_comment_tree(comment_rows)
  return ok(blog)


@app.post("/api/blogs")
def create_blog(
  input: BlogCreateInput,
  user=Depends(get_current_user),
):
  import logging
  logging.info(f"[CREATE_BLOG] User authenticated: {user.get('email')} ({user.get('role')})")
  logging.info(f"[CREATE_BLOG] Request body: {input.dict()}")
  slug = slugify(input.title)
  blog_id = str(uuid.uuid4())
  now = now_iso()

  with get_conn() as conn:
    existing = conn.execute("SELECT 1 FROM blogs WHERE slug = ?", (slug,)).fetchone()
    if existing:
      slug = f"{slug}-{uuid.uuid4().hex[:6]}"

    conn.execute(
      """
      INSERT INTO blogs (id, title, slug, content, author_id, published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (
        blog_id,
        input.title,
        slug,
        input.content,
        user["id"],
        True if input.published else False,
        now,
        now,
      ),
    )
    conn.commit()

  return get_blog(slug)


@app.put("/api/blogs/{blog_id}")
def update_blog(blog_id: str, input: BlogUpdateInput, user=Depends(get_current_user)):
  with get_conn() as conn:
    row = conn.execute("SELECT * FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not row:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    if user["role"] != "ADMIN" and row["author_id"] != user["id"]:
      return fail("Forbidden", status=403)

    title = input.title or row["title"]
    content = input.content or row["content"]
    published = row["published"] if input.published is None else (True if input.published else False)
    updated_at = now_iso()

    conn.execute(
      """
      UPDATE blogs
      SET title = ?, content = ?, published = ?, updated_at = ?
      WHERE id = ?
      """,
      (title, content, published, updated_at, blog_id),
    )
    conn.commit()

    slug = row["slug"]

  return get_blog(slug)


@app.delete("/api/blogs/{blog_id}")
def delete_blog(blog_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    row = conn.execute("SELECT author_id FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not row:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    if user["role"] != "ADMIN" and row["author_id"] != user["id"]:
      return fail("Forbidden", status=403)

    conn.execute(
      "UPDATE blogs SET deleted_at = ? WHERE id = ?",
      (now_iso(), blog_id),
    )
    conn.commit()

  return ok({"message": "Deleted"})


@app.post("/api/blogs/{blog_id}/comment")
def add_blog_comment(blog_id: str, input: CommentCreateInput, user=Depends(get_current_user)):
  comment_id = str(uuid.uuid4())
  with get_conn() as conn:
    blog = conn.execute("SELECT 1 FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not blog:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    conn.execute(
      """
      INSERT INTO comments (id, content, user_id, blog_id, forum_id, parent_id, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
      """,
      (comment_id, input.content, user["id"], blog_id, input.parent_id, now_iso()),
    )
    conn.commit()

    row = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
      """,
      (comment_id,),
    ).fetchone()

  return ok(comment_payload(row))


@app.post("/api/blogs/{blog_id}/like")
def toggle_blog_like(blog_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    blog = conn.execute("SELECT 1 FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not blog:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    existing = conn.execute(
      "SELECT id FROM likes WHERE user_id = ? AND blog_id = ?",
      (user["id"], blog_id),
    ).fetchone()

    if existing:
      conn.execute("DELETE FROM likes WHERE id = ?", (existing["id"],))
      conn.commit()
      return ok({"liked": False})

    conn.execute(
      "INSERT INTO likes (id, user_id, blog_id, forum_id, created_at) VALUES (?, ?, ?, NULL, ?)",
      (str(uuid.uuid4()), user["id"], blog_id, now_iso()),
    )
    conn.commit()

  return ok({"liked": True})


@app.get("/api/forums")
def list_forums(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100), cursor: Optional[str] = None):
  offset = (page - 1) * limit
  where = [VISIBILITY_FILTER]
  params: List[Any] = []

  if cursor:
    where.append("f.id > ?")
    params.append(cursor)

  where_clause = f"WHERE {' AND '.join(where)}" if where else "WHERE deleted_at IS NULL AND is_hidden = FALSE"

  with get_conn() as conn:
    result = conn.execute(f"SELECT COUNT(*) FROM forums f {where_clause}", tuple(params)).fetchone()
    total = result[0] if result else 0

    rows = conn.execute(
      f"""
      SELECT
        f.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id AND c.deleted_at IS NULL AND c.is_hidden = FALSE) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
      FROM forums f
      LEFT JOIN users u ON u.id = f.author_id
      {where_clause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
      """,
      [*params, limit, offset],
    ).fetchall()

  items = [forum_payload(row) for row in rows]
  next_cursor = items[-1]["id"] if items else None
  return ok({"items": items, "total": total, "page": page, "limit": limit, "nextCursor": next_cursor})


@app.get("/api/forums/{forum_id}")
def get_forum(forum_id: str):
  with get_conn() as conn:
    row = conn.execute(
      """
      SELECT
        f.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id AND c.deleted_at IS NULL AND c.is_hidden = FALSE) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
      FROM forums f
      LEFT JOIN users u ON u.id = f.author_id
      WHERE f.id = ? AND f.deleted_at IS NULL
      """,
      (forum_id,),
    ).fetchone()

    if not row or row["is_hidden"]:
      return fail("Forum not found", code="NOT_FOUND", status=404)

    comment_rows = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.forum_id = ? AND c.deleted_at IS NULL AND c.is_hidden = FALSE
      ORDER BY c.created_at ASC
      """,
      (row["id"],),
    ).fetchall()

  forum = forum_payload(row)
  forum["comments"] = build_comment_tree(comment_rows)
  return ok(forum)


@app.post("/api/forums")
def create_forum(input: ForumCreateInput, user=Depends(get_current_user)):
  forum_id = str(uuid.uuid4())
  now = now_iso()

  with get_conn() as conn:
    conn.execute(
      """
      INSERT INTO forums (id, title, content, author_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      """,
      (forum_id, input.title, input.content, user["id"], now, now),
    )
    conn.commit()

  return get_forum(forum_id)


@app.post("/api/forums/{forum_id}/comment")
def add_forum_comment(forum_id: str, input: CommentCreateInput, user=Depends(get_current_user)):
  comment_id = str(uuid.uuid4())
  with get_conn() as conn:
    forum = conn.execute("SELECT 1 FROM forums WHERE id = ?", (forum_id,)).fetchone()
    if not forum:
      return fail("Forum not found", code="NOT_FOUND", status=404)

    conn.execute(
      """
      INSERT INTO comments (id, content, user_id, blog_id, forum_id, parent_id, created_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?)
      """,
      (comment_id, input.content, user["id"], forum_id, input.parent_id, now_iso()),
    )
    conn.commit()

    row = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
      """,
      (comment_id,),
    ).fetchone()

  return ok(comment_payload(row))


@app.post("/api/forums/{forum_id}/like")
def toggle_forum_like(forum_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    forum = conn.execute("SELECT 1 FROM forums WHERE id = ?", (forum_id,)).fetchone()
    if not forum:
      return fail("Forum not found", code="NOT_FOUND", status=404)

    existing = conn.execute(
      "SELECT id FROM likes WHERE user_id = ? AND forum_id = ?",
      (user["id"], forum_id),
    ).fetchone()

    if existing:
      conn.execute("DELETE FROM likes WHERE id = ?", (existing["id"],))
      conn.commit()
      return ok({"liked": False})

    conn.execute(
      "INSERT INTO likes (id, user_id, blog_id, forum_id, created_at) VALUES (?, ?, NULL, ?, ?)",
      (str(uuid.uuid4()), user["id"], forum_id, now_iso()),
    )
    conn.commit()

  return ok({"liked": True})


@app.post("/api/upload")
def upload_file(file: UploadFile = File(...), user=Depends(get_current_user)):
  data = save_upload(file)
  return ok({
    "filename": data["filename"],
    "path": data["path"],
    "url": f"/uploads/{data['path']}",
  })


@app.post("/api/upload/signed-params")
def upload_signed_params(input: UploadSignedInput, user=Depends(get_current_user)):
  return ok({"message": "Local uploads only", "filename": input.filename})


@app.get("/api/admin/users")
def admin_users(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  user=Depends(require_role("ADMIN")),
):
  offset = (page - 1) * limit

  # Columns to exclude (sensitive fields)
  excluded = {"password_hash", "password", "firebase_uid", "refresh_token"}
  
  # Map snake_case to camelCase for known fields
  field_map = {
    "created_at": "createdAt",
    "updated_at": "updatedAt",
    "user_type": "userType",
    "year_of_study": "yearOfStudy",
    "student_id": "studentId",
    "field_of_research": "fieldOfResearch",
    "years_of_experience": "yearsOfExperience",
    "research_profile": "researchProfile",
  }

  with get_conn() as conn:
    result = conn.execute("SELECT COUNT(*) FROM users").fetchone()
    total = result[0] if result else 0
    rows = conn.execute(
      "SELECT id, name, email, role, bio, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      (limit, offset),
    ).fetchall()

  # Dynamically convert each row to a dict using only columns present in the result
  items = []
  for row in rows:
    item = {}
    # Get column keys from the row (works with both RowWrapper and dict)
    keys = row.keys() if hasattr(row, 'keys') else row._fields if hasattr(row, '_fields') else []
    for key in keys:
      if key.lower() in excluded:
        continue
      # Use mapped name if available, otherwise use as-is
      mapped_key = field_map.get(key, key)
      value = row[key]
      # Convert to appropriate types
      if key in ("verified", "is_hidden", "is_flagship"):
        item[mapped_key] = bool(value) if value else False
      elif value is None:
        item[mapped_key] = None
      else:
        item[mapped_key] = value
    items.append(item)
  
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.get("/api/admin/analytics")
def admin_analytics(user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    users_result = conn.execute("SELECT COUNT(*) FROM users").fetchone()
    users = users_result[0] if users_result else 0
    blogs_result = conn.execute("SELECT COUNT(*) FROM blogs").fetchone()
    blogs = blogs_result[0] if blogs_result else 0
    forums_result = conn.execute("SELECT COUNT(*) FROM forums").fetchone()
    forums = forums_result[0] if forums_result else 0
    comments_result = conn.execute("SELECT COUNT(*) FROM comments").fetchone()
    comments = comments_result[0] if comments_result else 0
    likes_result = conn.execute("SELECT COUNT(*) FROM likes").fetchone()
    likes = likes_result[0] if likes_result else 0
    
    # Learning interactions
    interactions_result = conn.execute("SELECT COUNT(*) FROM learning_interactions").fetchone()
    interactions = interactions_result[0] if interactions_result else 0
    
    # User reports
    reports_result = conn.execute("SELECT COUNT(*) FROM reports").fetchone()
    reports = reports_result[0] if reports_result else 0

  return ok({
    "users": users,
    "blogs": blogs,
    "forums": forums,
    "comments": comments,
    "likes": likes,
    "interactions": interactions,
    "reports": reports,
  })


@app.delete("/api/admin/user/{user_id}")
def admin_delete_user(user_id: str, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    existing = conn.execute("SELECT 1 FROM users WHERE id = ?", (user_id,)).fetchone()
    if not existing:
      return fail("User not found", code="NOT_FOUND", status=404)

    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()

  return ok({"message": "User deleted"})


@app.get("/api/reports")
def list_reports(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
  offset = (page - 1) * limit
  with get_conn() as conn:
    result = conn.execute(
      "SELECT COUNT(*) FROM blogs WHERE is_flagship = TRUE AND deleted_at IS NULL"
    ).fetchone()
    total = result[0] if result else 0

    rows = conn.execute(
      """
      SELECT
        b.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id AND c.deleted_at IS NULL AND c.is_hidden = FALSE) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      WHERE b.is_flagship = TRUE AND b.deleted_at IS NULL AND b.is_hidden = FALSE
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
      """,
      (limit, offset),
    ).fetchall()

  items = [blog_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.post("/api/debates")
def create_debate(input: DebateCreateInput, user=Depends(get_current_user)):
  if user["role"] not in ROLE_CAN_CREATE_DEBATE:
    return fail("Only researchers and professors can create debates", status=403)

  with get_conn() as conn:
    blog_a = conn.execute(
      "SELECT id FROM blogs WHERE id = ? AND deleted_at IS NULL",
      (input.blog_a_id,),
    ).fetchone()
    blog_b = conn.execute(
      "SELECT id FROM blogs WHERE id = ? AND deleted_at IS NULL",
      (input.blog_b_id,),
    ).fetchone()

    if not blog_a or not blog_b:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    if input.blog_a_id == input.blog_b_id:
      return fail("Cannot create debate with same blog", status=400)

    debate_id = str(uuid.uuid4())
    now = now_iso()

    conn.execute(
      """
      INSERT INTO debates (id, blog_a_id, blog_b_id, created_by, title, description, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      """,
      (debate_id, input.blog_a_id, input.blog_b_id, user["id"], input.title, input.description, "ACTIVE", now),
    )
    conn.commit()

  return ok({"id": debate_id, "message": "Debate created"})


@app.get("/api/debates")
def list_debates(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100)):
  offset = (page - 1) * limit
  with get_conn() as conn:
    result = conn.execute("SELECT COUNT(*) FROM debates WHERE status = 'ACTIVE'").fetchone()
    total = result[0] if result else 0

    rows = conn.execute(
      """
      SELECT
        d.*,
        (SELECT COUNT(*) FROM debate_votes dv WHERE dv.debate_id = d.id AND dv.vote = 'A') AS votes_a,
        (SELECT COUNT(*) FROM debate_votes dv WHERE dv.debate_id = d.id AND dv.vote = 'B') AS votes_b
      FROM debates d
      WHERE d.status = 'ACTIVE'
      ORDER BY d.created_at DESC
      LIMIT ? OFFSET ?
      """,
      (limit, offset),
    ).fetchall()

  items = [debate_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.post("/api/debates/{debate_id}/vote")
def vote_debate(debate_id: str, input: DebateVoteInput, user=Depends(get_current_user)):
  user_role = user["role"]
  weight = VOTE_WEIGHTS.get(user_role, 1)

  with get_conn() as conn:
    debate = conn.execute(
      "SELECT id FROM debates WHERE id = ? AND status = 'ACTIVE'",
      (debate_id,),
    ).fetchone()

    if not debate:
      return fail("Debate not found or ended", code="NOT_FOUND", status=404)

    existing = conn.execute(
      "SELECT id FROM debate_votes WHERE user_id = ? AND debate_id = ?",
      (user["id"], debate_id),
    ).fetchone()

    if existing:
      conn.execute(
        "UPDATE debate_votes SET vote = ?, weight = ? WHERE id = ?",
        (input.vote, weight, existing["id"]),
      )
    else:
      vote_id = str(uuid.uuid4())
      conn.execute(
        "INSERT INTO debate_votes (id, user_id, debate_id, vote, weight, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        (vote_id, user["id"], debate_id, input.vote, weight, now_iso()),
      )
    conn.commit()

  return ok({"voted": input.vote, "weight": weight})


@app.get("/api/notifications")
def list_notifications(page: int = Query(1, ge=1), limit: int = Query(20, ge=1, le=100), user=Depends(get_current_user)):
  offset = (page - 1) * limit
  with get_conn() as conn:
    result = conn.execute(
      "SELECT COUNT(*) FROM notifications WHERE user_id = ?",
      (user["id"],),
    ).fetchone()
    total = result[0] if result else 0

    rows = conn.execute(
      "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
      (user["id"], limit, offset),
    ).fetchall()

  items = [notification_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.patch("/api/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    conn.execute(
      "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?",
      (notification_id, user["id"]),
    )
    conn.commit()

  return ok({"message": "Notification marked as read"})


@app.post("/api/report")
def create_report(input: ReportCreateInput, user=Depends(get_current_user)):
  report_id = str(uuid.uuid4())
  with get_conn() as conn:
    conn.execute(
      "INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      (report_id, user["id"], input.target_type, input.target_id, input.reason, "PENDING", now_iso()),
    )
    conn.commit()

  return ok({"id": report_id, "message": "Report submitted"})


@app.post("/api/feedback")
def create_feedback(input: FeedbackCreateInput, user=Depends(get_current_user)):
  feedback_id = str(uuid.uuid4())
  with get_conn() as conn:
    conn.execute(
      "INSERT INTO feedback (id, user_id, message, category, created_at) VALUES (?, ?, ?, ?, ?)",
      (feedback_id, user["id"], input.message, input.category, now_iso()),
    )
    conn.commit()

  return ok({"id": feedback_id, "message": "Feedback submitted"})


@app.post("/api/learning/interaction")
def create_learning_interaction(input: LearningInteractionCreateInput, user=Depends(get_current_user)):
  interaction_id = str(uuid.uuid4())
  
  classification = None
  if input.interaction_type == "ERROR_REPORT":
    classification = "PENDING_REVIEW"
  elif input.interaction_type == "DOUBT":
    classification = "DOUBT_RECEIVED"
  
  with get_conn() as conn:
    conn.execute(
      """INSERT INTO learning_interactions 
         (id, user_id, target_type, target_id, interaction_type, content, status, classification, is_public, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
      (interaction_id, user["id"], input.target_type, input.target_id, input.interaction_type, 
       input.content, "PENDING", classification, False, now_iso()),
    )
    conn.commit()

  return ok({"id": interaction_id, "message": "Interaction received", "guidance": "Your submission is under review. If it is determined to be an error, it will be corrected. If it is a doubt, you will receive an explanation."})


@app.get("/api/learning/interactions")
def list_learning_interactions(
  page: int = Query(1, ge=1), 
  limit: int = Query(20, ge=1, le=100),
  type: Optional[str] = Query(None, pattern=r"^(ERROR_REPORT|DOUBT)$"),
  status: Optional[str] = Query(None, pattern=r"^(PENDING|RESOLVED)$"),
  user=Depends(get_current_user)
):
  offset = (page - 1) * limit
  
  with get_conn() as conn:
    where_clauses = ["1=1"]
    params = []
    
    if type:
      where_clauses.append("interaction_type = ?")
      params.append(type)
    
    if status:
      where_clauses.append("status = ?")
      params.append(status)
    
    where_clause = " AND ".join(where_clauses)
    
    result = conn.execute(
      f"SELECT COUNT(*) FROM learning_interactions WHERE {where_clause}",
      params
    ).fetchone()
    total = result[0] if result else 0
    
    rows = conn.execute(
      f"""SELECT li.*, u.name as user_name, u.role as user_role
          FROM learning_interactions li
          LEFT JOIN users u ON u.id = li.user_id
          WHERE {where_clause}
          ORDER BY li.created_at DESC
          LIMIT ? OFFSET ?""",
      params + [limit, offset],
    ).fetchall()

  items = [learning_interaction_payload(dict(row)) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.get("/api/learning/public")
def list_public_learning_interactions(
  page: int = Query(1, ge=1), 
  limit: int = Query(20, ge=1, le=100)
):
  offset = (page - 1) * limit
  with get_conn() as conn:
    result = conn.execute(
      "SELECT COUNT(*) FROM learning_interactions WHERE is_public = TRUE AND status = 'RESOLVED'"
    ).fetchone()
    total = result[0] if result else 0
    
    rows = conn.execute(
      """SELECT li.*, u.name as user_name, u.role as user_role
         FROM learning_interactions li
         LEFT JOIN users u ON u.id = li.user_id
         WHERE li.is_public = TRUE AND li.status = 'RESOLVED'
         ORDER BY li.resolved_at DESC
         LIMIT ? OFFSET ?""",
      (limit, offset),
    ).fetchall()

  items = [learning_interaction_payload(dict(row)) for row in rows]
  
  for item in items:
    responses = conn.execute(
      """SELECT lr.*, u.name as responder_name
         FROM learning_responses lr
         LEFT JOIN users u ON u.id = lr.responder_id
         WHERE lr.interaction_id = ?
         ORDER BY lr.created_at""",
      (item["id"],),
    ).fetchall()
    item["responses"] = [learning_response_payload(dict(r)) for r in responses]

  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.get("/api/learning/interactions/{interaction_id}")
def get_learning_interaction(interaction_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    row = conn.execute(
      """SELECT li.*, u.name as user_name, u.role as user_role
         FROM learning_interactions li
         LEFT JOIN users u ON u.id = li.user_id
         WHERE li.id = ?""",
      (interaction_id,),
    ).fetchone()

    if not row:
      return fail("Interaction not found", code="NOT_FOUND", status=404)

    item = learning_interaction_payload(dict(row))
    
    responses = conn.execute(
      """SELECT lr.*, u.name as responder_name
         FROM learning_responses lr
         LEFT JOIN users u ON u.id = lr.responder_id
         WHERE lr.interaction_id = ?
         ORDER BY lr.created_at""",
      (interaction_id,),
    ).fetchall()
    item["responses"] = [learning_response_payload(dict(r)) for r in responses]

  return ok(item)


@app.post("/api/learning/interactions/{interaction_id}/respond")
def respond_to_learning_interaction(
  interaction_id: str, 
  input: LearningInteractionResponseInput,
  user=Depends(require_role("ADMIN", "RESEARCHER", "PROFESSOR"))
):
  with get_conn() as conn:
    interaction = conn.execute(
      "SELECT * FROM learning_interactions WHERE id = ?",
      (interaction_id,),
    ).fetchone()

    if not interaction:
      return fail("Interaction not found", code="NOT_FOUND", status=404)

    classification = "RESOLVED"
    if input.response_type == "ACKNOWLEDGE":
      classification = "VALID_ERROR" if interaction["interaction_type"] == "ERROR_REPORT" else "DOUBT_RESOLVED"
    elif input.response_type == "CORRECT":
      classification = "VALID_ERROR"
    elif input.response_type == "EXPLAIN":
      classification = "DOUBT_PLATFORM"
    elif input.response_type == "CLARIFY":
      classification = "DOUBT_EXTERNAL"
    elif input.response_type == "RECONCILE":
      classification = "MISCONCEPTION_RESOLVED"

    response_id = str(uuid.uuid4())
    conn.execute(
      """INSERT INTO learning_responses 
         (id, interaction_id, responder_id, response_type, content, created_at) 
         VALUES (?, ?, ?, ?, ?, ?)""",
      (response_id, interaction_id, user["id"], input.response_type, input.content, now_iso()),
    )
    
    conn.execute(
      "UPDATE learning_interactions SET status = ?, classification = ?, resolved_by = ?, resolution = ?, resolved_at = ?, is_public = ? WHERE id = ?",
      ("RESOLVED", classification, user["id"], input.content, now_iso(), input.response_type == "ACKNOWLEDGE", interaction_id),
    )
    conn.commit()

  return ok({"id": response_id, "message": "Response added"})


@app.post("/api/learning/interactions/{interaction_id}/make-public")
def make_interaction_public(interaction_id: str, user=Depends(get_current_user)):
  with get_conn() as conn:
    interaction = conn.execute(
      "SELECT * FROM learning_interactions WHERE id = ? AND user_id = ?",
      (interaction_id, user["id"]),
    ).fetchone()

    if not interaction:
      return fail("Interaction not found or unauthorized", code="NOT_FOUND", status=404)

    if interaction["status"] != "RESOLVED":
      return fail("Only resolved interactions can be made public", status=400)

    conn.execute(
      "UPDATE learning_interactions SET is_public = TRUE WHERE id = ?",
      (interaction_id,),
    )
    conn.commit()

  return ok({"message": "Interaction is now public"})


@app.post("/api/invites")
def create_invite(input: InviteCreateInput, user=Depends(require_role("ADMIN", "PROFESSOR"))):
  import secrets as sec
  token = sec.token_urlsafe(32)
  expires_at = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()

  invite_id = str(uuid.uuid4())
  with get_conn() as conn:
    existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (input.email.lower(),)).fetchone()
    if existing:
      return fail("Email already registered", code="EMAIL_EXISTS", status=400)

    conn.execute(
      "INSERT INTO invites (id, email, invited_by, role, token, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      (invite_id, input.email.lower(), user["id"], input.role, token, "PENDING", expires_at, now_iso()),
    )
    conn.commit()

  return ok({"id": invite_id, "token": token, "message": "Invite created"})


@app.post("/api/invites/accept")
def accept_invite(input: InviteAcceptInput):
  with get_conn() as conn:
    invite = conn.execute(
      "SELECT * FROM invites WHERE token = ? AND status = 'PENDING'",
      (input.token,),
    ).fetchone()

    if not invite:
      return fail("Invalid or expired invite", code="INVALID_TOKEN", status=400)

    expires_at = invite["expires_at"]
    if expires_at and datetime.now(timezone.utc) > datetime.fromisoformat(expires_at.replace("Z", "+00:00")):
      return fail("Invite expired", code="TOKEN_EXPIRED", status=400)

    existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (invite["email"],)).fetchone()
    if existing:
      return fail("Email already registered", code="EMAIL_EXISTS", status=400)

    return fail("Registration not implemented via invite yet", status=501)


@app.get("/api/search")
def search_content(
  q: str = Query(..., min_length=1, max_length=200),
  type: Optional[str] = Query(None, pattern=r"^(blog|report)$"),
  limit: int = Query(20, ge=1, le=100),
  cursor: Optional[str] = None,
):
  import logging
  logging.info(f"[SEARCH] query: {q}, type: {type}")

  where: List[str] = []
  params: List[Any] = []

  if type == "report":
    where.append("b.deleted_at IS NULL")
    where.append("b.is_hidden = FALSE")
    where.append("b.is_flagship = TRUE")
  elif type == "blog":
    where.append("b.deleted_at IS NULL")
    where.append("b.is_hidden = FALSE")
    where.append("b.published = TRUE")
  else:
    where.append("b.deleted_at IS NULL")
    where.append("b.is_hidden = FALSE")

  where.append("(b.title ILIKE ? OR b.content ILIKE ?)")
  like = f"%{q}%"
  params.extend([like, like])

  if cursor:
    where.append("b.id > ?")
    params.append(cursor)

  where_clause = "WHERE " + " AND ".join(where)

  with get_conn() as conn:
    if type == "report" or type == "blog" or type is None:
      rows = conn.execute(
        f"""
        SELECT
          b.*,
          u.name AS author_name,
          u.email AS author_email,
          u.role AS author_role,
          (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id) AS comments_count,
          (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
        FROM blogs b
        LEFT JOIN users u ON u.id = b.author_id
        {where_clause}
        ORDER BY b.created_at DESC
        LIMIT ?
        """,
        [*params, limit],
      ).fetchall()
      items = [blog_payload(row) for row in rows]
    else:
      blog_rows = conn.execute(
        f"""
        SELECT
          b.*,
          u.name AS author_name,
          u.email AS author_email,
          u.role AS author_role,
          (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id) AS comments_count,
          (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
        FROM blogs b
        LEFT JOIN users u ON u.id = b.author_id
        {where_clause}
        ORDER BY b.created_at DESC
        LIMIT ?
        """,
        [*params, limit],
      ).fetchall()

      forum_rows = conn.execute(
        f"""
        SELECT
          f.*,
          u.name AS author_name,
          u.email AS author_email,
          u.role AS author_role,
          (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id) AS comments_count,
          (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
        FROM forums f
        LEFT JOIN users u ON u.id = f.author_id
        {where_clause}
        ORDER BY f.created_at DESC
        LIMIT ?
        """,
        [*params, limit],
      ).fetchall()

      items = [blog_payload(row) for row in blog_rows] + [forum_payload(row) for row in forum_rows]
      items.sort(key=lambda x: x["createdAt"], reverse=True)
      items = items[:limit]

  next_cursor = items[-1]["id"] if items else None
  logging.info(f"[SEARCH] Returning {len(items)} results")
  return ok({"items": items, "nextCursor": next_cursor})


@app.patch("/api/admin/moderate/{type_}/{id}")
def moderate_content(type_: str, id: str, user=Depends(require_role("ADMIN"))):
  table_map = {"blog": "blogs", "forum": "forums", "comment": "comments"}

  if type_ not in table_map:
    return fail("Invalid type", code="INVALID_TYPE", status=400)

  table = table_map[type_]

  with get_conn() as conn:
    existing = conn.execute(f"SELECT id, is_hidden FROM {table} WHERE id = ?", (id,)).fetchone()
    if not existing:
      return fail(f"{type_} not found", code="NOT_FOUND", status=404)

    new_hidden = not existing["is_hidden"]
    conn.execute(f"UPDATE {table} SET is_hidden = ? WHERE id = ?", (new_hidden, id))
    conn.commit()

  return ok({"id": id, "isHidden": new_hidden})


@app.get("/api/admin/blogs")
def admin_list_blogs(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  search: Optional[str] = None,
  user=Depends(require_role("ADMIN")),
):
  offset = (page - 1) * limit
  with get_conn() as conn:
    count_query = "SELECT COUNT(*) FROM blogs WHERE deleted_at IS NULL"
    query = """
      SELECT b.*, u.name AS author_name, u.email AS author_email, u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id AND c.deleted_at IS NULL) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      WHERE b.deleted_at IS NULL
    """
    params = []
    if search:
      count_query += " AND (title ILIKE ? OR content ILIKE ?)"
      query += " AND (b.title ILIKE ? OR b.content ILIike ?)"
      params.extend([f"%{search}%", f"%{search}%"])
    
    count_result = conn.execute(count_query, params).fetchone()
    total = count_result[0] if count_result else 0
    
    query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?"
    rows = conn.execute(query, [*params, limit, offset]).fetchall()

  items = [blog_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.get("/api/admin/forums")
def admin_list_forums(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  search: Optional[str] = None,
  user=Depends(require_role("ADMIN")),
):
  offset = (page - 1) * limit
  with get_conn() as conn:
    count_query = "SELECT COUNT(*) FROM forums WHERE deleted_at IS NULL"
    query = """
      SELECT f.*, u.name AS author_name, u.email AS author_email, u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id AND c.deleted_at IS NULL) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
      FROM forums f
      LEFT JOIN users u ON u.id = f.author_id
      WHERE f.deleted_at IS NULL
    """
    params = []
    if search:
      count_query += " AND (title ILIKE ? OR content ILIKE ?)"
      query += " AND (f.title ILIKE ? OR f.content ILIKE ?)"
      params.extend([f"%{search}%", f"%{search}%"])
    
    count_result = conn.execute(count_query, params).fetchone()
    total = count_result[0] if count_result else 0
    
    query += " ORDER BY f.created_at DESC LIMIT ? OFFSET ?"
    rows = conn.execute(query, [*params, limit, offset]).fetchall()

  items = [forum_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.patch("/api/admin/user/{user_id}/role")
def update_user_role(user_id: str, input: dict, user=Depends(require_role("ADMIN"))):
  new_role = input.get("role")
  valid_roles = {"ADMIN", "PROFESSOR", "RESEARCHER", "STUDENT"}
  if new_role not in valid_roles:
    return fail("Invalid role", code="INVALID_ROLE", status=400)

  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)).fetchone()
    if not existing:
      return fail("User not found", code="NOT_FOUND", status=404)
    
    if user["id"] == user_id and new_role != "ADMIN":
      return fail("Cannot demote yourself from admin", code="CANNOT_DEMOTE", status=400)
    
    conn.execute("UPDATE users SET role = ? WHERE id = ?", (new_role, user_id))
    conn.commit()

  return ok({"id": user_id, "role": new_role})


# Learning modules table creation and endpoints
LEARNING_TABLE_CREATED = False

def ensure_learning_table():
  global LEARNING_TABLE_CREATED
  if LEARNING_TABLE_CREATED:
    return
  try:
    with get_conn() as conn:
      conn.execute("""
        CREATE TABLE IF NOT EXISTS learning_modules (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          content TEXT,
          module_order INTEGER DEFAULT 0,
          category TEXT NOT NULL CHECK (category IN ('QUANTUM_PHYSICS', 'QUANTUM_COMPUTING')),
          created_at TEXT DEFAULT (now() at time zone 'utc'),
          updated_at TEXT DEFAULT (now() at time zone 'utc')
        )
      """)
      conn.commit()
      LEARNING_TABLE_CREATED = True
  except Exception as e:
    print(f"Error creating learning_modules table: {e}")

ensure_learning_table()


@app.get("/api/admin/learning")
def admin_list_learning(
  category: Optional[str] = Query(None, pattern=r"^(QUANTUM_PHYSICS|QUANTUM_COMPUTING)$"),
  user=Depends(require_role("ADMIN")),
):
  with get_conn() as conn:
    query = "SELECT * FROM learning_modules"
    params = []
    if category:
      query += " WHERE category = ?"
      params.append(category)
    query += " ORDER BY category, module_order"
    rows = conn.execute(query, params).fetchall()

  items = [{
    "id": row["id"],
    "slug": row["slug"],
    "title": row["title"],
    "description": row["description"],
    "content": row["content"],
    "order": row["module_order"],
    "category": row["category"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
  } for row in rows]
  return ok({"items": items})


@app.get("/api/admin/learning/{slug}")
def admin_get_learning(slug: str, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    row = conn.execute("SELECT * FROM learning_modules WHERE slug = ?", (slug,)).fetchone()
    if not row:
      return fail("Module not found", code="NOT_FOUND", status=404)
  
  return ok({
    "id": row["id"],
    "slug": row["slug"],
    "title": row["title"],
    "description": row["description"],
    "content": row["content"],
    "order": row["module_order"],
    "category": row["category"],
    "createdAt": row["created_at"],
    "updatedAt": row["updated_at"],
  })


@app.post("/api/admin/learning")
def admin_create_learning(input: dict, user=Depends(require_role("ADMIN"))):
  required = ["slug", "title", "description", "content", "order", "category"]
  for field in required:
    if field not in input:
      return fail(f"Missing required field: {field}", code="MISSING_FIELD", status=400)
  
  if input["category"] not in ("QUANTUM_PHYSICS", "QUANTUM_COMPUTING"):
    return fail("Invalid category", code="INVALID_CATEGORY", status=400)
  
  module_id = str(uuid.uuid4())
  now = now_iso()
  
  with get_conn() as conn:
    conn.execute("""
      INSERT INTO learning_modules (id, slug, title, description, content, module_order, category, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (module_id, input["slug"], input["title"], input["description"], input["content"], input["order"], input["category"], now, now))
    conn.commit()
  
  return ok({
    "id": module_id,
    "slug": input["slug"],
    "title": input["title"],
    "description": input["description"],
    "content": input["content"],
    "order": input["order"],
    "category": input["category"],
    "createdAt": now,
    "updatedAt": now,
  })


@app.patch("/api/admin/learning/{module_id}")
def admin_update_learning(module_id: str, input: dict, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM learning_modules WHERE id = ?", (module_id,)).fetchone()
    if not existing:
      return fail("Module not found", code="NOT_FOUND", status=404)
    
    now = now_iso()
    updates = []
    params = []
    for field in ["slug", "title", "description", "content", "order", "category"]:
      if field in input:
        updates.append(f"{field} = ?")
        params.append(input[field])
    
    updates.append("updated_at = ?")
    params.append(now)
    params.append(module_id)
    
    conn.execute(f"UPDATE learning_modules SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
  
  return ok({"id": module_id, "message": "Updated successfully"})


@app.delete("/api/admin/learning/{module_id}")
def admin_delete_learning(module_id: str, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM learning_modules WHERE id = ?", (module_id,)).fetchone()
    if not existing:
      return fail("Module not found", code="NOT_FOUND", status=404)
    
    conn.execute("DELETE FROM learning_modules WHERE id = ?", (module_id,))
    conn.commit()
  
  return ok({"message": "Module deleted"})


# Reports table and endpoints
REPORTS_TABLE_CREATED = False

def ensure_reports_table():
  global REPORTS_TABLE_CREATED
  if REPORTS_TABLE_CREATED:
    return
  try:
    with get_conn() as conn:
      conn.execute("""
        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          target_type TEXT NOT NULL CHECK (target_type IN ('blog', 'forum', 'comment', 'user')),
          target_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED', 'DISMISSED')),
          reporter_id TEXT NOT NULL,
          resolved_by TEXT,
          resolution TEXT,
          created_at TEXT DEFAULT (now() at time zone 'utc'),
          resolved_at TEXT
        )
      """)
      conn.commit()
      REPORTS_TABLE_CREATED = True
  except Exception as e:
    print(f"Error creating reports table: {e}")

ensure_reports_table()


@app.get("/api/admin/reports")
def admin_list_reports(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  status: Optional[str] = Query(None),
  user=Depends(require_role("ADMIN")),
):
  offset = (page - 1) * limit
  with get_conn() as conn:
    count_query = "SELECT COUNT(*) FROM reports"
    query = """
      SELECT r.*, u.name AS reporter_name
      FROM reports r
      LEFT JOIN users u ON u.id = r.reporter_id
    """
    params = []
    if status:
      count_query += " WHERE status = ?"
      query += " WHERE r.status = ?"
      params.append(status)
    
    count_result = conn.execute(count_query, params).fetchone()
    total = count_result[0] if count_result else 0
    
    query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?"
    rows = conn.execute(query, [*params, limit, offset]).fetchall()

  items = [{
    "id": row["id"],
    "targetType": row["target_type"],
    "targetId": row["target_id"],
    "reason": row["reason"],
    "status": row["status"],
    "reporterId": row["reporter_id"],
    "createdAt": row["created_at"],
    "reporter": {"id": row["reporter_id"], "name": row["reporter_name"]} if row.get("reporter_name") else None,
  } for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.patch("/api/admin/reports/{report_id}/status")
def admin_update_report(report_id: str, input: dict, user=Depends(require_role("ADMIN"))):
  new_status = input.get("status")
  if new_status not in ("RESOLVED", "DISMISSED"):
    return fail("Invalid status", code="INVALID_STATUS", status=400)
  
  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM reports WHERE id = ?", (report_id,)).fetchone()
    if not existing:
      return fail("Report not found", code="NOT_FOUND", status=404)
    
    conn.execute("UPDATE reports SET status = ? WHERE id = ?", (new_status, report_id))
    conn.commit()
  
  return ok({"id": report_id, "status": new_status})


@app.post("/api/report")
def create_report(input: ReportCreateInput, user=Depends(get_current_user)):
  report_id = str(uuid.uuid4())
  now = now_iso()
  
  with get_conn() as conn:
    conn.execute("""
      INSERT INTO reports (id, target_type, target_id, reason, status, reporter_id, created_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?, ?)
    """, (report_id, input.target_type, input.target_id, input.reason, user["id"], now))
    conn.commit()
  
  return ok({"id": report_id, "message": "Report submitted successfully"})


# Learning Interactions table
LEARNING_INTERACTIONS_TABLE_CREATED = False

def ensure_learning_interactions_table():
  global LEARNING_INTERACTIONS_TABLE_CREATED
  if LEARNING_INTERACTIONS_TABLE_CREATED:
    return
  try:
    with get_conn() as conn:
      conn.execute("""
        CREATE TABLE IF NOT EXISTS learning_interactions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          interaction_type TEXT NOT NULL,
          content TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          classification TEXT,
          resolution TEXT,
          resolved_by TEXT,
          is_public BOOLEAN DEFAULT FALSE,
          is_duplicate_of TEXT,
          created_at TEXT DEFAULT (now() at time zone 'utc'),
          resolved_at TEXT
        )
      """)
      conn.execute("""
        CREATE TABLE IF NOT EXISTS learning_responses (
          id TEXT PRIMARY KEY,
          interaction_id TEXT NOT NULL,
          responder_id TEXT NOT NULL,
          response_type TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT (now() at time zone 'utc')
        )
      """)
      conn.commit()
      LEARNING_INTERACTIONS_TABLE_CREATED = True
  except Exception as e:
    print(f"Error creating learning_interactions table: {e}")

ensure_learning_interactions_table()


# Admin: Learning Interactions (Error Reports & Doubts)
@app.get("/api/admin/learning/interactions")
def admin_list_learning_interactions(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  status: Optional[str] = Query(None),
  interaction_type: Optional[str] = Query(None),
  user=Depends(require_role("ADMIN")),
):
  import logging
  logging.info(f"[admin_list_learning_interactions] User: {user.get('id')}, role: {user.get('role')}")
  offset = (page - 1) * limit
  
  where_clause = "1=1"
  params = []
  if status:
    where_clause += " AND li.status = ?"
    params.append(status)
  if interaction_type:
    where_clause += " AND li.interaction_type = ?"
    params.append(interaction_type)
  
  logging.info(f"[admin_list_learning_interactions] Query: status={status}, type={interaction_type}, params={params}")
  
  try:
    with get_conn() as conn:
      count_all = conn.execute("SELECT COUNT(*) FROM learning_interactions").fetchone()
      logging.info(f"[admin_list_learning_interactions] Total in table: {count_all[0] if count_all else 0}")
      
      count_result = conn.execute(
        f"SELECT COUNT(*) FROM learning_interactions li WHERE {where_clause}",
        params
      ).fetchone()
      total = count_result[0] if count_result else 0
      logging.info(f"[admin_list_learning_interactions] Filtered total: {total}")
      
      rows = conn.execute(f"""
        SELECT li.*, u.name as user_name, u.email as user_email, u.role as user_role
        FROM learning_interactions li
        LEFT JOIN users u ON u.id = li.user_id
        WHERE {where_clause}
        ORDER BY li.created_at DESC
        LIMIT ? OFFSET ?
      """, [*params, limit, offset]).fetchall()
      
      logging.info(f"[admin_list_learning_interactions] Fetched rows: {len(rows)}")
      for row in rows:
        logging.info(f"[admin_list_learning_interactions] Row: {dict(row)}")

    items = []
    for row in rows:
      item = dict(row)
      if row.get("user_name"):
        item["user_name"] = row["user_name"]
        item["user_email"] = row.get("user_email")
      if hasattr(row.get("created_at"), "isoformat"):
        item["created_at"] = row["created_at"].isoformat()
      items.append(item)
    
    logging.info(f"[admin_list_learning_interactions] Returning {len(items)} items")
    return ok({"items": items, "total": total, "page": page, "limit": limit})
  except Exception as e:
    logging.error(f"[admin_list_learning_interactions] Error: {e}")
    return fail(str(e), code="INTERNAL_ERROR", status=500)


@app.get("/api/admin/learning/interactions/{interaction_id}")
def admin_get_learning_interaction(interaction_id: str, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    row = conn.execute("""
      SELECT li.*, u.name as user_name, u.email as user_email, u.role as user_role
      FROM learning_interactions li
      LEFT JOIN users u ON u.id = li.user_id
      WHERE li.id = ?
    """, (interaction_id,)).fetchone()
    
    if not row:
      return fail("Interaction not found", code="NOT_FOUND", status=404)
    
    # Get existing responses
    responses = conn.execute("""
      SELECT lr.*, u.name as responder_name
      FROM learning_responses lr
      LEFT JOIN users u ON u.id = lr.responder_id
      WHERE lr.interaction_id = ?
      ORDER BY lr.created_at ASC
    """, (interaction_id,)).fetchall()

  item = {
    "id": row["id"],
    "userId": row["user_id"],
    "targetType": row["target_type"],
    "targetId": row["target_id"],
    "interactionType": row["interaction_type"],
    "content": row["content"],
    "status": row["status"],
    "classification": row["classification"],
    "resolution": row["resolution"],
    "isPublic": bool(row["is_public"]) if row["is_public"] else False,
    "createdAt": row["created_at"],
    "resolvedAt": row["resolved_at"],
    "user": {
      "id": row["user_id"],
      "name": row.get("user_name"),
      "email": row.get("user_email"),
      "role": row.get("user_role")
    } if row.get("user_name") else None,
    "responses": [
      {
        "id": r["id"],
        "interactionId": r["interaction_id"],
        "responderId": r["responder_id"],
        "responseType": r["response_type"],
        "content": r["content"],
        "createdAt": r["created_at"],
        "responder": {"id": r["responder_id"], "name": r.get("responder_name")} if r.get("responder_name") else None,
      }
      for r in responses
    ]
  }
  
  return ok(item)


@app.post("/api/admin/learning/interactions/{interaction_id}/respond")
def admin_respond_learning_interaction(
  interaction_id: str,
  input: dict,
  user=Depends(require_role("ADMIN")),
):
  response_type = input.get("response_type")
  content = input.get("content")
  
  valid_types = {"ACKNOWLEDGE", "EXPLAIN", "CLARIFY", "RECONCILE", "CORRECT"}
  if response_type not in valid_types:
    return fail("Invalid response type", code="INVALID_TYPE", status=400)
  
  if not content or not content.strip():
    return fail("Content is required", code="MISSING_CONTENT", status=400)
  
  response_id = str(uuid.uuid4())
  now = now_iso()
  
  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM learning_interactions WHERE id = ?", (interaction_id,)).fetchone()
    if not existing:
      return fail("Interaction not found", code="NOT_FOUND", status=404)
    
    conn.execute("""
      INSERT INTO learning_responses (id, interaction_id, responder_id, response_type, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    """, (response_id, interaction_id, user["id"], response_type, content.strip(), now))
    conn.commit()
  
  return ok({"id": response_id, "message": "Response added"})


@app.patch("/api/admin/learning/interactions/{interaction_id}/resolve")
def admin_resolve_learning_interaction(
  interaction_id: str,
  input: dict,
  user=Depends(require_role("ADMIN")),
):
  classification = input.get("classification")
  resolution = input.get("resolution", "")
  make_public = input.get("make_public", False)
  
  valid_classifications = {"VALID_ERROR", "INVALID_ERROR", "DOUBT_PLATFORM", "DOUBT_EXTERNAL", "MISCONCEPTION", "AMBIGUOUS"}
  if classification and classification not in valid_classifications:
    return fail("Invalid classification", code="INVALID_CLASSIFICATION", status=400)
  
  now = now_iso()
  
  with get_conn() as conn:
    existing = conn.execute("SELECT id FROM learning_interactions WHERE id = ?", (interaction_id,)).fetchone()
    if not existing:
      return fail("Interaction not found", code="NOT_FOUND", status=404)
    
    conn.execute("""
      UPDATE learning_interactions 
      SET status = 'RESOLVED', classification = ?, resolved_by = ?, resolution = ?, resolved_at = ?, is_public = ?
      WHERE id = ?
    """, (classification or "AMBIGUOUS", user["id"], resolution or "", now, make_public, interaction_id))
    conn.commit()
  
  return ok({"id": interaction_id, "status": "RESOLVED"})


@app.patch("/api/admin/flagship/{blog_id}")
def set_flagship(blog_id: str, user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    blog = conn.execute("SELECT id FROM blogs WHERE id = ?", (blog_id,)).fetchone()
    if not blog:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    conn.execute(
      "UPDATE blogs SET is_flagship = TRUE, report_type = 'REPORT' WHERE id = ?",
      (blog_id,),
    )
    conn.commit()

  return ok({"id": blog_id, "isFlagship": True})


@app.post("/api/admin/cleanup")
def run_cleanup(user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    conn.execute(
      "DELETE FROM blogs WHERE deleted_at < NOW() - INTERVAL '30 days'"
    )
    conn.execute(
      "DELETE FROM forums WHERE deleted_at < NOW() - INTERVAL '30 days'"
    )
    conn.execute(
      "DELETE FROM comments WHERE deleted_at < NOW() - INTERVAL '30 days'"
    )
    conn.commit()

  return ok({"message": "Cleanup completed"})
