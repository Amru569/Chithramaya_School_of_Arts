"""
config.py
Central configuration for the Dance Academy Management System.
"""
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Branding
ACADEMY_NAME = "Chithramaya School of Arts"
LOGO_PATH = "/uploads/branding/logo.jpg"  # served via the static /uploads mount
ACADEMY_ABOUT = (
    "Chithramaya School of Arts in Anna Nagar, Chennai, founded in January 2015 by "
    "Smt. Krishnapriya Jayagar, is a multidisciplinary institute focused on traditional "
    "Indian performing arts, martial arts, and creative hobbies.\n\n"
    "Founder: Smt. Krishnapriya Jayagar (a trained exponent qualified from Nirtyakshetra "
    "Dance Academy under Guru Madurai R. Muralidaran and Smt Chithra Muralidharan)"
)

# Timezone — all "current date/time" comparisons for schedules and
# attendance windows use this, not the host server's OS timezone, so the
# app behaves correctly regardless of where it's deployed. Timestamps are
# still stored in UTC in the database; this is only used for "what is
# 'now'/'today' for the academy" business logic.
ACADEMY_TIMEZONE = "Asia/Kolkata"

# Database
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'dance_academy.db')}"

# Uploads (receipts, student photos)
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Session auth
SESSION_COOKIE_NAME = "academy_session"
SESSION_EXPIRE_HOURS = 12

# Default seeded accounts (change after first login)
DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin123"
DEFAULT_ASSISTANT_USERNAME = "assistant"
DEFAULT_ASSISTANT_PASSWORD = "assistant123"

# CORS - Vite dev server
FRONTEND_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]

STUDENT_CODE_PREFIX = "CSA"
