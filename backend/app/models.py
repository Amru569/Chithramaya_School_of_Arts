"""
models.py
Every SQLAlchemy ORM model for the Dance Academy Management System.

Timestamps (created_at, etc.) are stored timezone-aware in UTC
(DateTime(timezone=True), default=datetime.now(timezone.utc)) so the
frontend can always convert them correctly to the viewer's local time.
Calendar dates (joining_date, class dates) are plain Date columns —
no timezone concept applies to a date.
"""
from datetime import datetime, date, timezone

from sqlalchemy import (
    Column, Integer, String, Boolean, Date, DateTime, ForeignKey, Text, Float
)
from sqlalchemy.types import TypeDecorator
from sqlalchemy.orm import relationship

from app.database.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """DateTime that is always UTC-aware going in and coming out.

    SQLite has no native timezone-aware datetime type — even with
    DateTime(timezone=True), it silently drops the tzinfo on round-trip,
    which is exactly what caused announcement/fee timestamps to display
    hours off (the frontend correctly converts UTC-to-local, but a naive
    datetime gets misread as if it were already local). This type
    guarantees every value read back from the DB carries tzinfo=UTC, so
    that guarantee holds regardless of which DB driver is behind it.
    """
    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class User(Base):
    """Admin and Assistant Teacher accounts (session-based login)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # "admin" | "assistant"
    full_name = Column(String(100), nullable=True)

    # Assistants are scoped to one branch/batch; admins ignore these.
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(UTCDateTime, default=utcnow)

    branch = relationship("Branch", foreign_keys=[branch_id])
    batch = relationship("Batch", foreign_keys=[batch_id])


class Branch(Base):
    """A physical/online academy branch, e.g. Chennai."""
    __tablename__ = "branches"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    location = Column(String(200), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    batches = relationship("Batch", back_populates="branch", cascade="all, delete-orphan")


class Batch(Base):
    """A batch belongs to exactly one branch, e.g. Junior, Weekend."""
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    schedule = Column(String(200), nullable=True)  # free-text label, e.g. "Mon/Wed 5-6 PM"
    created_at = Column(UTCDateTime, default=utcnow)

    branch = relationship("Branch", back_populates="batches")
    students = relationship("Student", back_populates="batch", cascade="all, delete-orphan")
    patterns = relationship("WeeklyPattern", back_populates="batch", cascade="all, delete-orphan")


class Student(Base):
    """A student enrolled in one batch."""
    __tablename__ = "students"

    id = Column(Integer, primary_key=True)
    student_code = Column(String(20), unique=True, nullable=False, index=True)  # CSA1234
    name = Column(String(100), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    parent_name = Column(String(100), nullable=True)
    parent_mobile = Column(String(20), nullable=True)
    student_mobile = Column(String(20), unique=True, nullable=False, index=True)
    address = Column(Text, nullable=True)
    # Always set automatically on creation — never a field the student fills in.
    joining_date = Column(Date, default=date.today)
    photo_path = Column(String(300), nullable=True)
    status = Column(String(20), default="active")  # active | inactive

    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    batch = relationship("Batch", back_populates="students")

    attendance_records = relationship("Attendance", back_populates="student", cascade="all, delete-orphan")
    fee_records = relationship("Fee", back_populates="student", cascade="all, delete-orphan")


class WeeklyPattern(Base):
    """A recurring weekly class slot for a batch, e.g. 'every Monday and
    Wednesday, 5-6 PM'. Admin defines this once; actual dated ClassSession
    rows are auto-generated from it whenever the calendar/attendance is
    viewed for a date range."""
    __tablename__ = "weekly_patterns"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # Monday=0 ... Sunday=6 (Python date.weekday())
    start_time = Column(String(5), nullable=False)  # "HH:MM", 24-hour
    end_time = Column(String(5), nullable=False)
    teacher = Column(String(100), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    batch = relationship("Batch", back_populates="patterns")
    sessions = relationship("ClassSession", back_populates="pattern")


class ClassSession(Base):
    """One actual dated class occurrence — the source of truth for when
    attendance is allowed to be marked. Generated automatically from a
    WeeklyPattern (type='regular'), or created directly by the admin as a
    'holiday' (cancels that date) or 'compensation' (extra one-off class)."""
    __tablename__ = "class_sessions"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    pattern_id = Column(Integer, ForeignKey("weekly_patterns.id"), nullable=True)
    date = Column(Date, nullable=False)
    start_time = Column(String(5), nullable=True)  # not meaningful for "holiday"
    end_time = Column(String(5), nullable=True)
    session_type = Column(String(20), default="regular")  # regular | holiday | compensation
    teacher = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    pattern = relationship("WeeklyPattern", back_populates="sessions")
    attendance_records = relationship("Attendance", back_populates="session", cascade="all, delete-orphan")


class Attendance(Base):
    """One attendance mark for one student for one class session.
    Only 'present' or 'leave' are ever stored — a student with neither
    for a conducted class is inferred absent when computing reports."""
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.id"), nullable=False)
    date = Column(Date, default=date.today, nullable=False)
    status = Column(String(10), nullable=False)  # present | leave
    is_final = Column(Boolean, default=False)  # False = draft, True = submitted
    # True when this 'leave' came from the student submitting a prior leave
    # request before the class, rather than staff marking it during/after
    # class — lets attendance views distinguish "informed in advance" from
    # an ordinary leave/absence.
    is_prior_leave = Column(Boolean, default=False)
    marked_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    student = relationship("Student", back_populates="attendance_records")
    session = relationship("ClassSession", back_populates="attendance_records")


class LeaveRequest(Base):
    """A student's advance notice that they'll miss an upcoming class.
    Submitting one immediately creates a matching Attendance('leave')
    record flagged is_prior_leave=True, so it's counted correctly in
    monthly stats right away — this table is the audit trail of *why*
    and *when* the leave was requested, kept separate from Chat."""
    __tablename__ = "leave_requests"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    session_id = Column(Integer, ForeignKey("class_sessions.id"), nullable=False)
    reason_category = Column(String(50), nullable=False)  # Personal | Medical | Family Emergency | ...
    custom_reason = Column(Text, nullable=True)  # used when reason_category == "Other"
    created_at = Column(UTCDateTime, default=utcnow)

    student = relationship("Student")
    session = relationship("ClassSession")


class Fee(Base):
    """A fee record for a student, for a specific billing month."""
    __tablename__ = "fees"

    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    amount = Column(Float, nullable=False)
    # "YYYY-MM" — the month this payment is for, so both admin and student
    # views can group fee history by month.
    billing_month = Column(String(7), nullable=False)
    payment_method = Column(String(20), nullable=True)  # cash | upi | bank_transfer
    # pending: awaiting admin review | approved | rejected
    status = Column(String(20), default="pending")
    payment_date = Column(Date, nullable=True)
    receipt_path = Column(String(300), nullable=True)
    remarks = Column(String(300), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)

    student = relationship("Student", back_populates="fee_records")


class Announcement(Base):
    """Admin-created announcement, with dependent branch/batch targeting:
    - branch_id set, batch_id set   -> that one batch only
    - branch_id set, batch_id null  -> every batch in that branch
    - branch_id null, batch_id null -> everyone (all branches, all batches)
    - branch_id null, batch_id set  -> that one batch (branch is implied by it)
    """
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=True)
    created_at = Column(UTCDateTime, default=utcnow)


class ChatMessage(Base):
    """Batch-wise chat message."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    sender_name = Column(String(100), nullable=False)
    sender_role = Column(String(20), nullable=False)  # admin | assistant | student
    message = Column(Text, nullable=False)
    created_at = Column(UTCDateTime, default=utcnow)
