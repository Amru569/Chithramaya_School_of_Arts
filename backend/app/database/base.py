"""
base.py
Single declarative base shared by every model.
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
