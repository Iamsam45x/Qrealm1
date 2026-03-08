import os
import uuid

from dotenv import load_dotenv

from app import auth
from app.db import get_conn, init_db, now_iso

load_dotenv()

ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com").lower()
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")


def main():
  init_db()
  with get_conn() as conn:
    existing = conn.execute("SELECT 1 FROM users WHERE email = ?", (ADMIN_EMAIL,)).fetchone()
    if existing:
      print("Admin user already exists")
      return

    user_id = str(uuid.uuid4())
    conn.execute(
      "INSERT INTO users (id, name, email, password_hash, role, bio, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      (
        user_id,
        ADMIN_NAME,
        ADMIN_EMAIL,
        auth.hash_password(ADMIN_PASSWORD),
        "ADMIN",
        "",
        now_iso(),
      ),
    )
    conn.commit()

  print("Admin user created", ADMIN_EMAIL)


if __name__ == "__main__":
  main()
