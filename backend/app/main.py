"""
main.py
Application entrypoint: creates the FastAPI app, initializes the database,
seeds default Admin/Assistant accounts, and registers all API routes.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import (
    FRONTEND_ORIGINS,
    UPLOAD_DIR,
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_PASSWORD,
    DEFAULT_ASSISTANT_USERNAME,
    DEFAULT_ASSISTANT_PASSWORD,
    ACADEMY_NAME,
    LOGO_PATH,
    ACADEMY_ABOUT,
)
from app.database.database import init_db, SessionLocal
from app import models, utils, api

app = FastAPI(title=ACADEMY_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.include_router(api.router, prefix="/api")


def seed_default_users():
    """Create default Admin and Assistant accounts if they don't exist yet."""
    db = SessionLocal()
    try:
        if not db.query(models.User).filter(models.User.username == DEFAULT_ADMIN_USERNAME).first():
            db.add(models.User(
                username=DEFAULT_ADMIN_USERNAME,
                password_hash=utils.hash_password(DEFAULT_ADMIN_PASSWORD),
                role="admin",
                full_name="Administrator",
            ))
        if not db.query(models.User).filter(models.User.username == DEFAULT_ASSISTANT_USERNAME).first():
            db.add(models.User(
                username=DEFAULT_ASSISTANT_USERNAME,
                password_hash=utils.hash_password(DEFAULT_ASSISTANT_PASSWORD),
                role="assistant",
                full_name="Assistant Teacher",
            ))
        db.commit()
    finally:
        db.close()


@app.on_event("startup")
def on_startup():
    init_db()
    seed_default_users()


@app.get("/")
def root():
    return {"status": "ok", "message": f"{ACADEMY_NAME} API"}


@app.get("/api/config")
def get_public_config():
    """Public — lets the frontend splash/login/settings screens show the
    academy name, logo, and about text without hardcoding them."""
    return {"academy_name": ACADEMY_NAME, "logo_path": LOGO_PATH, "about": ACADEMY_ABOUT}
