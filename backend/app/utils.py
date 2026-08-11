"""
utils.py
Small stateless helper functions used across the app.
"""
import hashlib
import os
import secrets
import string
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import STUDENT_CODE_PREFIX, UPLOAD_DIR, ACADEMY_TIMEZONE

_TZ = ZoneInfo(ACADEMY_TIMEZONE)


# ---------- Real-world time, in the academy's timezone ----------
def now_local() -> datetime:
    """Current date/time in the academy's timezone (handles DST/leap years
    automatically via zoneinfo) — the single source of truth for 'now' in
    schedule/attendance business logic. Never hardcode or mock this."""
    return datetime.now(_TZ)


def today_local():
    return now_local().date()


# ---------- Passwords ----------
def hash_password(raw_password: str) -> str:
    """Salted SHA-256 hash, stored as 'salt$hash'. Simple and dependency-free."""
    salt = secrets.token_hex(8)
    digest = hashlib.sha256((salt + raw_password).encode()).hexdigest()
    return f"{salt}${digest}"


def verify_password(raw_password: str, stored_hash: str) -> bool:
    try:
        salt, digest = stored_hash.split("$")
    except ValueError:
        return False
    return hashlib.sha256((salt + raw_password).encode()).hexdigest() == digest


# ---------- Student code ----------
def generate_student_code(db: Session) -> str:
    """Generate a unique CSA#### code, e.g. CSA4821."""
    from app import models  # local import avoids circular import

    while True:
        number = "".join(secrets.choice(string.digits) for _ in range(4))
        code = f"{STUDENT_CODE_PREFIX}{number}"
        exists = db.query(models.Student).filter(models.Student.student_code == code).first()
        if not exists:
            return code


# ---------- File uploads ----------
def save_upload_file(file_bytes: bytes, filename: str, subfolder: str = "") -> str:
    """Save uploaded bytes to disk, return the relative path stored in DB."""
    folder = os.path.join(UPLOAD_DIR, subfolder) if subfolder else UPLOAD_DIR
    os.makedirs(folder, exist_ok=True)
    safe_name = f"{secrets.token_hex(4)}_{filename}"
    full_path = os.path.join(folder, safe_name)
    with open(full_path, "wb") as f:
        f.write(file_bytes)
    return os.path.relpath(full_path, UPLOAD_DIR)
