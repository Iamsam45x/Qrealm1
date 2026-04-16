# Educational Platform — Backend (FastAPI + PostgreSQL)

FastAPI API that matches the Next.js frontend. The database is **PostgreSQL** via SQLAlchemy and `DATABASE_URL`.

## Stack

- Python + FastAPI
- PostgreSQL (recommended local URL: `postgresql+psycopg2://user:pass@localhost:5432/dbname`)
- SQLAlchemy + Alembic migrations
- JWT auth (access + refresh) and httpOnly cookies
- Local file uploads

## PostgreSQL setup

1. **Install PostgreSQL** and create a database:

   ```bash
   # Example (psql) — adjust user/password/db name
   createdb mydb
   # or
   psql -U postgres -c "CREATE DATABASE mydb;"
   ```

2. **Configure the backend** — copy `backend/.env.example` to `backend/.env` and set:

   ```env
   DATABASE_URL=postgresql+psycopg2://username:password@localhost:5432/mydb
   ALLOWED_ORIGINS=http://localhost:3000,https://my-production-frontend.com
   ```

3. **Install dependencies** (from the `backend` folder):

   ```bash
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Create tables** (pick one):

   - **Alembic (recommended for production)**

     ```bash
     alembic upgrade head
     ```

   - **SQLAlchemy `create_all` (dev / empty DB)** — already run on app startup via `init_db()` in `app/database.py`:

     ```python
     from app.database import Base, get_engine
     Base.metadata.create_all(bind=get_engine())
     ```

5. **Seed admin user** (optional):

   ```bash
   python -m app.seed
   ```

6. **Run the server**:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
   ```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLAlchemy URL, e.g. `postgresql+psycopg2://user:pass@host:5432/db` |
| `ENVIRONMENT` | `development` or `production` (production enforces stricter checks) |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (frontend dev + production URLs) |
| `JWT_SECRET_KEY` / `JWT_REFRESH_SECRET_KEY` | JWT signing secrets (required strong values in production) |

## API base

- Base URL: `http://localhost:4000/api`
- Health: `GET /api/health` (returns `503` if the database is unreachable)
- Auth: JWT in `Authorization: Bearer <token>` or cookies `accessToken` / `refreshToken`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/refresh`

### Blogs / forums / upload / admin

See previous API documentation in the repository; routes are unchanged.

## Raw SQL placeholders

Application code uses SQLite-style `?` placeholders in SQL strings. `app/db.py` rewrites them to SQLAlchemy named parameters so the same queries work with **PostgreSQL** and optional **SQLite** fallback when `DATABASE_URL` is not set.
