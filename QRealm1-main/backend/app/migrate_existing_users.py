"""
Migration script to link existing users with their Firebase accounts.

This script should be run ONCE after Firebase authentication is enabled
and users have been migrated to Firebase. It updates the firebase_uid
column for existing users who have created Firebase accounts.

Usage:
    python -m app.migrate_existing_users

IMPORTANT:
1. First, ensure the 002_add_firebase_uid migration has been run
2. Each user must have already created a Firebase account
3. Get the Firebase UID from Firebase Console -> Authentication -> Users
4. Update the MIGRATIONS list below with the mapping

MIGRATION FORMAT:
    ("user@example.com", "<FIREBASE_UID>"),
"""

MIGRATIONS = [
    # Example entries - Replace with actual mappings:
    # ("user1@example.com", "abc123xyz456..."),
    # ("user2@example.com", "def789uvw012..."),
]


def migrate_users():
    """Migrate existing users to Firebase."""
    from app.db import get_conn
    
    success_count = 0
    error_count = 0
    skipped_count = 0
    
    with get_conn() as conn:
        for email, firebase_uid in MIGRATIONS:
            existing = conn.execute(
                "SELECT id, firebase_uid FROM users WHERE email = ?",
                (email,)
            ).fetchone()
            
            if not existing:
                print(f"  [SKIP] No user found with email: {email}")
                skipped_count += 1
                continue
            
            if existing["firebase_uid"]:
                print(f"  [SKIP] User already has firebase_uid: {email}")
                skipped_count += 1
                continue
            
            conn.execute(
                "UPDATE users SET firebase_uid = ? WHERE email = ?",
                (firebase_uid, email)
            )
            conn.commit()
            print(f"  [OK] Updated {email} with firebase_uid: {firebase_uid}")
            success_count += 1
    
    print(f"\nMigration complete:")
    print(f"  - Successfully migrated: {success_count}")
    print(f"  - Skipped: {skipped_count}")
    print(f"  - Errors: {error_count}")


if __name__ == "__main__":
    print("Starting user migration to Firebase...")
    print(f"Found {len(MIGRATIONS)} migration entries.")
    
    if not MIGRATIONS:
        print("\nWARNING: No migrations defined!")
        print("Add entries to the MIGRATIONS list in this script.")
    else:
        migrate_users()
