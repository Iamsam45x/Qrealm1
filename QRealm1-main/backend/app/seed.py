import uuid

from app import auth
from app.db import get_conn, init_db, now_iso
from app.settings import settings


def main():
    init_db()
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT 1 FROM users WHERE email = ?",
            (settings.ADMIN_EMAIL.lower(),)
        ).fetchone()
        
        if existing:
            print("Admin user already exists")
            return

        user_id = str(uuid.uuid4())
        # Include boolean and user_type so PostgreSQL NOT NULL constraints are satisfied.
        conn.execute(
            """INSERT INTO users (id, name, email, password_hash, role, user_type, verified, bio, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                settings.ADMIN_NAME,
                settings.ADMIN_EMAIL.lower(),
                auth.hash_password(settings.ADMIN_PASSWORD),
                "ADMIN",
                "STUDENT",
                True,
                "",
                now_iso(),
            ),
        )
        conn.commit()

    print(f"Admin user created: {settings.ADMIN_EMAIL}")


if __name__ == "__main__":
    main()
