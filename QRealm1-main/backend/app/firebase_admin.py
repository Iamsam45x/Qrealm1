"""
Firebase Admin SDK Module

Initializes Firebase Admin SDK for backend JWT verification.
Uses FIREBASE_SERVICE_ACCOUNT environment variable containing the full JSON string.
"""

import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth

env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

_firebase_app = None


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        if not service_account_json:
            raise ValueError(
                "FIREBASE_SERVICE_ACCOUNT environment variable is not set. "
                "Please set it with the full Firebase service account JSON as a string."
            )
        try:
            cred_dict = json.loads(service_account_json)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"FIREBASE_SERVICE_ACCOUNT is not valid JSON: {e}"
            )
        cred = credentials.Certificate(cred_dict)
        _firebase_app = firebase_admin.initialize_app(cred)
    return _firebase_app


def verify_firebase_token(id_token: str) -> str:
    """
    Verify a Firebase ID token and return the Firebase UID.
    
    Args:
        id_token: The Firebase ID token to verify
        
    Returns:
        The Firebase UID of the user
        
    Raises:
        ValueError: If the token is invalid or expired
    """
    try:
        app = get_firebase_app()
        decoded_token = auth.verify_id_token(id_token, app=app)
        uid = decoded_token.get("uid")
        if not uid:
            raise ValueError("Token does not contain a valid UID")
        return uid
    except firebase_admin.auth.InvalidIdTokenError as e:
        raise ValueError(f"Invalid token: {str(e)}")
    except firebase_admin.auth.ExpiredIdTokenError:
        raise ValueError("Token has expired")
    except firebase_admin.auth.RevokedIdTokenError:
        raise ValueError("Token has been revoked")
    except Exception as e:
        raise ValueError(f"Token verification failed: {str(e)}")


def get_user(uid: str) -> Optional[dict]:
    """
    Get Firebase user by UID.
    
    Args:
        uid: The Firebase UID
        
    Returns:
        User dict with email, display_name, etc. or None if not found
    """
    try:
        app = get_firebase_app()
        user = auth.get_user(uid, app=app)
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "email_verified": user.email_verified,
            "disabled": user.disabled,
        }
    except firebase_admin.auth.UserNotFoundError:
        return None
    except Exception:
        return None


def create_custom_token(uid: str, additional_claims: dict = None) -> str:
    """
    Create a custom Firebase token for a user.
    
    Args:
        uid: The Firebase UID
        additional_claims: Optional additional claims to include
        
    Returns:
        Custom token string
    """
    app = get_firebase_app()
    return auth.create_custom_token(uid, app=app)
