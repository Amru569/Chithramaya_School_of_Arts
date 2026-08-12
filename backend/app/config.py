"""
config.py
Central configuration for the Dance Academy Management System.

Local development works with zero setup (all defaults below are for
localhost). In production (e.g. Render), set the environment variables
noted next to each setting — see .env.example for the full list and
DEPLOYMENT.md for the exact values to use on Render/Vercel.
"""
import os

from dotenv import load_dotenv

load_dotenv()  # loads a local .env file if present; a no-op on Render,
                # which injects real environment variables directly.

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
ACADEMY_TIMEZONE = os.environ.get("ACADEMY_TIMEZONE", "Asia/Kolkata")

# Database — set DATABASE_URL on Render if you move off SQLite later
# (e.g. a managed Postgres instance). Defaults to the local SQLite file.
DATABASE_URL = os.environ.get("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'dance_academy.db')}")

# Uploads (receipts, student photos). NOTE: Render's filesystem is
# ephemeral on the free tier — files here are wiped on every redeploy.
# Fine for local dev/testing; for production, point this at a persistent
# disk (Render's "Persistent Disk" add-on) or external storage (e.g. S3).
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Session auth
SESSION_COOKIE_NAME = "academy_session"
SESSION_EXPIRE_HOURS = int(os.environ.get("SESSION_EXPIRE_HOURS", "12"))
# In production, the frontend (Vercel) and backend (Render) are on
# different domains, so the session cookie must be sent cross-site.
# Set SESSION_COOKIE_SECURE=true on Render — it's required for
# SameSite=None cookies to be accepted by browsers (HTTPS only).
SESSION_COOKIE_SECURE = os.environ.get("SESSION_COOKIE_SECURE", "false").lower() == "true"
SESSION_COOKIE_SAMESITE = "none" if SESSION_COOKIE_SECURE else "lax"

# Default seeded accounts (change after first login — via
# DEFAULT_ADMIN_PASSWORD / DEFAULT_ASSISTANT_PASSWORD env vars, or just
# log in and update them once real usage starts).
DEFAULT_ADMIN_USERNAME = os.environ.get("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.environ.get("DEFAULT_ADMIN_PASSWORD", "admin123")
DEFAULT_ASSISTANT_USERNAME = os.environ.get("DEFAULT_ASSISTANT_USERNAME", "assistant")
DEFAULT_ASSISTANT_PASSWORD = os.environ.get("DEFAULT_ASSISTANT_PASSWORD", "assistant123")

# CORS — comma-separated list of allowed frontend origins. Defaults to
# the local Vite dev server; on Render, set FRONTEND_ORIGINS to your
# Vercel URL(s), e.g.:
#   FRONTEND_ORIGINS=https://your-chithramaya.vercel.app
# Multiple origins (e.g. a preview + production Vercel URL) are
# comma-separated, no spaces.
_default_origins = "http://localhost:5173,http://127.0.0.1:5173"
FRONTEND_ORIGINS = [o.strip() for o in os.environ.get("FRONTEND_ORIGINS", _default_origins).split(",") if o.strip()]

STUDENT_CODE_PREFIX = "CSA"
