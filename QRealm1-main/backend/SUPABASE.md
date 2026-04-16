# Connecting FastAPI to Supabase Postgres

This app uses SQLAlchemy with **`DATABASE_URL`**. Supabase gives you a connection string in the dashboard (**Project Settings → Database**).

## 1. URL-encode the password

If your password contains **`@`**, **`:`**, **`/ `**, or other reserved characters, the URL parser will break unless you encode them.

Example: password `Qrealm@1pranav` must use **`@` → `%40`**:

```text
postgresql://postgres:Qrealm%401pranav@db.xxxxx.supabase.co:5432/postgres
```

In Python you can build the URL safely:

```python
from urllib.parse import quote_plus
user, password, host = "postgres", "Qrealm@1pranav", "db.xxxxx.supabase.co"
safe = quote_plus(password)
print(f"postgresql+psycopg2://{user}:{safe}@{host}:5432/postgres?sslmode=require")
```

## 2. SQLAlchemy driver + SSL

Use the **`postgresql+psycopg2://`** scheme (matches `requirements.txt`). Supabase requires TLS from outside their network:

```env
DATABASE_URL=postgresql+psycopg2://postgres:YOUR_ENCODED_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
```

Put this in **`backend/.env`** (never commit real passwords). Rotate the DB password in Supabase if it was ever pasted into chat or committed to git.

## 3. Apply schema to Supabase

After `DATABASE_URL` points at Supabase:

```bash
cd backend
alembic upgrade head
# or rely on app startup init_db() once against an empty database
python -m app.seed
```

## 4. Supabase CLI (optional): link and pull schema

The CLI helps manage migrations and remote schema; it is **not** required for the app to run.

Install (pick one):

- `npm install -g supabase`
- Or see: https://supabase.com/docs/guides/cli

Then log in and link (you need your **project ref** from the Supabase dashboard URL):

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db pull
```

`db pull` writes migration SQL from the remote database. Your app already defines models in `app/database.py` and Alembic under `alembic/`; use the CLI when you want to **diff** or **sync** with Supabase-managed changes.

## 5. CORS

Set **`ALLOWED_ORIGINS`** in `backend/.env` to your Next.js URL(s), e.g. `http://localhost:3000` and your deployed frontend URL.
