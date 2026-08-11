"""
auth.py
Simple in-memory session-based authentication (no JWT needed for this project).

Each successful login creates a random session token, stored server-side in
SESSIONS with an expiry, and returned to the client as an HttpOnly cookie.
Every protected endpoint depends on get_current_session (or the role-specific
wrappers below) to resolve "who is calling".
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import SESSION_COOKIE_NAME, SESSION_EXPIRE_HOURS
from app.database.database import get_db
from app import models

# token -> {"user_type": "admin"|"assistant"|"student", "user_id": int, "expires": datetime}
SESSIONS: dict = {}


def create_session(user_type: str, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {
        "user_type": user_type,
        "user_id": user_id,
        "expires": datetime.utcnow() + timedelta(hours=SESSION_EXPIRE_HOURS),
    }
    return token


def destroy_session(token: str):
    SESSIONS.pop(token, None)


def _get_session_data(request: Request) -> dict:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token or token not in SESSIONS:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    session = SESSIONS[token]
    if session["expires"] < datetime.utcnow():
        destroy_session(token)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired")
    return session


def get_current_session(request: Request) -> dict:
    """Generic dependency: returns raw session dict (user_type, user_id)."""
    return _get_session_data(request)


def require_admin(session: dict = Depends(get_current_session), db: Session = Depends(get_db)) -> models.User:
    if session["user_type"] != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    user = db.query(models.User).get(session["user_id"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_staff(session: dict = Depends(get_current_session), db: Session = Depends(get_db)) -> models.User:
    """Admin OR Assistant Teacher."""
    if session["user_type"] not in ("admin", "assistant"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Staff access required")
    user = db.query(models.User).get(session["user_id"])
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return user


def require_student(session: dict = Depends(get_current_session), db: Session = Depends(get_db)) -> models.Student:
    if session["user_type"] != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student access required")
    student = db.query(models.Student).get(session["user_id"])
    if not student:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Student not found")
    return student


def get_optional_session(request: Request) -> Optional[dict]:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if token and token in SESSIONS and SESSIONS[token]["expires"] >= datetime.utcnow():
        return SESSIONS[token]
    return None
