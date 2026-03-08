import os
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
load_dotenv()

from fastapi import Depends, FastAPI, File, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import auth
from app.auth import access_expires_in
from app.db import get_conn, init_db, now_iso
from app.deps import get_current_user, require_role
from app.models import (
  BlogCreateInput,
  BlogUpdateInput,
  CommentCreateInput,
  ForumCreateInput,
  LoginInput,
  RegisterInput,
  UploadSignedInput,
)
from app.upload import save_upload

APP_NAME = "Educational Platform API"

def parse_origins(raw: str) -> List[str]:
  origins = [item.strip() for item in raw.split(",") if item.strip()]
  return origins or ["http://localhost:3000"]


FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
FRONTEND_ORIGINS = parse_origins(os.getenv("FRONTEND_ORIGINS", FRONTEND_ORIGIN))
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax")
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title=APP_NAME, lifespan=lifespan)

app.add_middleware(
  CORSMiddleware,
  allow_origins=FRONTEND_ORIGINS,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=os.getenv("UPLOAD_DIR", "./uploads")), name="uploads")


def ok(data: Any):
  return {"success": True, "data": data}


def fail(message: str, code: Optional[str] = None, status: int = 400):
  payload: Dict[str, Any] = {"success": False, "error": message}
  if code:
    payload["code"] = code
  return JSONResponse(status_code=status, content=payload)


def set_auth_cookies(res: JSONResponse, access_token: str, refresh_token: str):
  cookie_opts = {
    "httponly": True,
    "secure": COOKIE_SECURE,
    "samesite": COOKIE_SAMESITE,
    "path": "/",
  }
  if COOKIE_DOMAIN:
    cookie_opts["domain"] = COOKIE_DOMAIN

  res.set_cookie("accessToken", access_token, **cookie_opts)
  res.set_cookie("refreshToken", refresh_token, **cookie_opts)

  # Clear older path-scoped variants that may override newer values.
  delete_opts = {"path": "/api"}
  if COOKIE_DOMAIN:
    delete_opts["domain"] = COOKIE_DOMAIN
  res.delete_cookie("accessToken", **delete_opts)
  res.delete_cookie("refreshToken", **delete_opts)


def clear_auth_cookies(res: JSONResponse):
  delete_paths = ["/", "/api"]
  for path in delete_paths:
    delete_opts = {"path": path}
    if COOKIE_DOMAIN:
      delete_opts["domain"] = COOKIE_DOMAIN
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
    "bio": row["bio"],
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

    conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token = ?", (token,))
    conn.execute(
      "INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, ?, 0)",
      (str(uuid.uuid4()), user_id, new_refresh, now_iso(), auth.refresh_expires_at()),
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


@app.post("/api/auth/register")
def register(input: RegisterInput):
  role = input.role or "STUDENT"
  if role not in {"ADMIN", "PROFESSOR", "STUDENT"}:
    return fail("Invalid role")

  with get_conn() as conn:
    existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (input.email,)).fetchone()
    if existing:
      return fail("Email already registered")

    user_id = str(uuid.uuid4())
    conn.execute(
      "INSERT INTO users (id, name, email, password_hash, role, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      (
        user_id,
        input.name,
        input.email.lower(),
        auth.hash_password(input.password),
        role,
        input.bio,
        now_iso(),
      ),
    )
    conn.commit()

    row = conn.execute(
      "SELECT id, name, email, role, bio, created_at FROM users WHERE id = ?",
      (user_id,),
    ).fetchone()

  return ok({"user": user_payload(row)})


@app.post("/api/auth/login")
def login(input: LoginInput):
  with get_conn() as conn:
    row = conn.execute(
      "SELECT id, name, email, role, bio, password_hash FROM users WHERE email = ?",
      (input.email.lower(),),
    ).fetchone()

    if not row or not auth.verify_password(input.password, row["password_hash"]):
      return fail("Invalid credentials", status=401)

    access_token = auth.create_access_token(row["id"], row["role"])
    refresh_token = auth.create_refresh_token(row["id"], row["role"])

    conn.execute("DELETE FROM refresh_tokens WHERE user_id = ?", (row["id"],))
    conn.execute(
      "INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked) VALUES (?, ?, ?, ?, ?, 0)",
      (str(uuid.uuid4()), row["id"], refresh_token, now_iso(), auth.refresh_expires_at()),
    )
    conn.commit()

  response = ok(
    {
      "user": user_payload(row),
      "accessToken": access_token,
      "refreshToken": refresh_token,
      "expiresIn": access_expires_in(),
    }
  )
  res = JSONResponse(content=response)
  set_auth_cookies(res, access_token, refresh_token)
  return res


@app.post("/api/auth/logout")
def logout(request: Request):
  refresh_token = request.cookies.get("refreshToken")
  if refresh_token:
    with get_conn() as conn:
      conn.execute("UPDATE refresh_tokens SET revoked = 1 WHERE token = ?", (refresh_token,))
      conn.commit()

  res = JSONResponse(content=ok({"message": "Logged out"}))
  clear_auth_cookies(res)
  return res


@app.get("/api/auth/me")
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
):
  where = []
  params: List[Any] = []

  if published != "false":
    where.append("b.published = 1")

  if search:
    where.append("(b.title LIKE ? OR b.content LIKE ?)")
    like = f"%{search}%"
    params.extend([like, like])

  where_clause = f"WHERE {' AND '.join(where)}" if where else ""

  offset = (page - 1) * limit

  with get_conn() as conn:
    total = conn.execute(
      f"SELECT COUNT(*) FROM blogs b {where_clause}",
      params,
    ).fetchone()[0]

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
      LIMIT ? OFFSET ?
      """,
      [*params, limit, offset],
    ).fetchall()

  items = [blog_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


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
      WHERE b.published = 1
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
        (SELECT COUNT(*) FROM comments c WHERE c.blog_id = b.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.blog_id = b.id) AS likes_count
      FROM blogs b
      LEFT JOIN users u ON u.id = b.author_id
      WHERE b.slug = ?
      """,
      (slug,),
    ).fetchone()

    if not row:
      return fail("Blog not found", code="NOT_FOUND", status=404)

    comment_rows = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.blog_id = ?
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
  user=Depends(require_role("ADMIN", "PROFESSOR")),
):
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
        1 if input.published else 0,
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
    published = row["published"] if input.published is None else (1 if input.published else 0)
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

    conn.execute("DELETE FROM blogs WHERE id = ?", (blog_id,))
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
      (comment_id, input.content, user["id"], blog_id, input.parentId, now_iso()),
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
def list_forums(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=100)):
  offset = (page - 1) * limit

  with get_conn() as conn:
    total = conn.execute("SELECT COUNT(*) FROM forums").fetchone()[0]

    rows = conn.execute(
      """
      SELECT
        f.*,
        u.name AS author_name,
        u.email AS author_email,
        u.role AS author_role,
        (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
      FROM forums f
      LEFT JOIN users u ON u.id = f.author_id
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
      """,
      (limit, offset),
    ).fetchall()

  items = [forum_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


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
        (SELECT COUNT(*) FROM comments c WHERE c.forum_id = f.id) AS comments_count,
        (SELECT COUNT(*) FROM likes l WHERE l.forum_id = f.id) AS likes_count
      FROM forums f
      LEFT JOIN users u ON u.id = f.author_id
      WHERE f.id = ?
      """,
      (forum_id,),
    ).fetchone()

    if not row:
      return fail("Forum not found", code="NOT_FOUND", status=404)

    comment_rows = conn.execute(
      """
      SELECT c.*, u.name AS user_name
      FROM comments c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.forum_id = ?
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
      (comment_id, input.content, user["id"], forum_id, input.parentId, now_iso()),
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
  return ok({"message": "Local uploads only", "folder": input.folder})


@app.get("/api/admin/users")
def admin_users(
  page: int = Query(1, ge=1),
  limit: int = Query(20, ge=1, le=100),
  user=Depends(require_role("ADMIN")),
):
  offset = (page - 1) * limit

  with get_conn() as conn:
    total = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    rows = conn.execute(
      "SELECT id, name, email, role, bio, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
      (limit, offset),
    ).fetchall()

  items = [user_payload(row) for row in rows]
  return ok({"items": items, "total": total, "page": page, "limit": limit})


@app.get("/api/admin/analytics")
def admin_analytics(user=Depends(require_role("ADMIN"))):
  with get_conn() as conn:
    users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    blogs = conn.execute("SELECT COUNT(*) FROM blogs").fetchone()[0]
    forums = conn.execute("SELECT COUNT(*) FROM forums").fetchone()[0]
    comments = conn.execute("SELECT COUNT(*) FROM comments").fetchone()[0]
    likes = conn.execute("SELECT COUNT(*) FROM likes").fetchone()[0]

  return ok({
    "users": users,
    "blogs": blogs,
    "forums": forums,
    "comments": comments,
    "likes": likes,
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
