from typing import List, Optional

from fastapi import Depends, HTTPException, Request

from app.firebase_admin import verify_firebase_token
from app.db import get_conn


def get_bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return ""


def get_current_user(request: Request):
    import logging
    id_token = get_bearer_token(request)
    
    if not id_token:
        logging.warning("[get_current_user] No bearer token found")
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    logging.info(f"[get_current_user] Token present, verifying...")
    
    try:
        firebase_uid = verify_firebase_token(id_token)
    except ValueError as e:
        logging.warning(f"[get_current_user] Token verification failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))
    
    logging.info(f"[get_current_user] Firebase UID: {firebase_uid}")
    
    with get_conn() as conn:
        row = conn.execute(
            """SELECT id, name, email, role, user_type, bio, verified, institution, course, 
               year_of_study, student_id, field_of_research, years_of_experience, 
               research_profile, firebase_uid, vote_weight
               FROM users WHERE firebase_uid = ?""",
            (firebase_uid,),
        ).fetchone()
    
    if not row:
        raise HTTPException(status_code=401, detail="User not found. Please complete registration.")
    
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
        "firebaseUid": row["firebase_uid"] if row["firebase_uid"] else None,
        "voteWeight": row["vote_weight"] if row["vote_weight"] else 1,
    }


def require_role(*roles):
    def dependency(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return dependency


def get_optional_user(request: Request):
    token = get_bearer_token(request)
    if not token:
        return None
    
    try:
        return get_current_user(request)
    except HTTPException:
        return None
