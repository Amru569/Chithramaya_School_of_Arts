"""
schemas.py
Every Pydantic schema used for request/response validation.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------
class AdminLoginRequest(BaseModel):
    username: str
    password: str


class StudentLoginRequest(BaseModel):
    mobile: str
    student_code: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    role: str
    full_name: Optional[str] = None
    branch_id: Optional[int] = None
    batch_id: Optional[int] = None


# ---------- Branch ----------
class BranchCreate(BaseModel):
    name: str
    location: Optional[str] = None


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    location: Optional[str] = None


# ---------- Batch ----------
class BatchCreate(BaseModel):
    name: str
    branch_id: int
    schedule: Optional[str] = None


class BatchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    branch_id: int
    schedule: Optional[str] = None


# ---------- Student ----------
class StudentCreate(BaseModel):
    """Used by Admin registration. joining_date is never accepted here —
    it is always set automatically to today on the server."""
    name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    student_mobile: str
    address: Optional[str] = None
    batch_id: int


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    student_mobile: Optional[str] = None
    address: Optional[str] = None
    batch_id: Optional[int] = None
    status: Optional[str] = None


class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_code: str
    name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    student_mobile: str
    address: Optional[str] = None
    joining_date: Optional[date] = None
    photo_path: Optional[str] = None
    status: str
    batch_id: int


class StudentRegisterOut(BaseModel):
    """Returned right after self-registration — shows the generated code."""
    student_code: str
    name: str
    message: str = "Use your Mobile Number and Student Code to log in from now on."


# ---------- Weekly recurring class pattern ----------
class PatternCreate(BaseModel):
    batch_id: int
    day_of_week: int  # 0=Monday ... 6=Sunday
    start_time: str   # "HH:MM"
    end_time: str
    teacher: Optional[str] = None


class PatternOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    batch_id: int
    day_of_week: int
    start_time: str
    end_time: str
    teacher: Optional[str] = None


class PatternItem(BaseModel):
    """One row in a batch's multi-schedule list (no batch_id — that comes
    from the URL path when replacing a batch's full schedule set)."""
    day_of_week: int  # 0=Monday ... 6=Sunday
    start_time: str
    end_time: str
    teacher: Optional[str] = None


class PatternsReplaceRequest(BaseModel):
    """Replaces a batch's entire set of weekly schedules in one call —
    supports a batch having classes on several days/times a week."""
    patterns: List[PatternItem]


# ---------- Class sessions (calendar) ----------
class HolidayCreate(BaseModel):
    batch_id: Optional[int] = None   # one specific batch...
    branch_id: Optional[int] = None  # ...or every batch in a branch
    date: date
    notes: Optional[str] = None


class CompensationCreate(BaseModel):
    batch_id: int
    date: date
    start_time: str
    end_time: str
    teacher: Optional[str] = None
    notes: Optional[str] = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    batch_id: int
    date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    session_type: str  # regular | holiday | compensation
    teacher: Optional[str] = None
    notes: Optional[str] = None


class CalendarDayOut(BaseModel):
    """A single session on the calendar, plus (for a student's own
    calendar) their attendance status for it — used to color the dot:
    present=green, leave=yellow, holiday=blue, compensation=purple."""
    session: SessionOut
    my_status: Optional[str] = None  # present | leave | None (not marked / not applicable)


# ---------- Attendance ----------
class AttendanceMark(BaseModel):
    student_id: int
    status: str  # present | leave


class AttendanceBulkSave(BaseModel):
    batch_id: int
    session_id: int
    submit: bool = False  # False = save as draft, True = finalize
    records: List[AttendanceMark]


class AttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    batch_id: int
    session_id: int
    date: date
    status: str
    is_final: bool
    is_prior_leave: bool = False


class SessionAttendanceStatus(BaseModel):
    """Computed live from the current time vs. the session — no cron involved."""
    session_id: int
    window_status: str  # not_started | active | draft | submitted | not_applicable
    records: List[AttendanceOut] = []


class MonthlyAttendanceOut(BaseModel):
    year: int
    month: int
    regular_classes: int
    holiday_classes: int
    compensation_classes: int
    conducted_classes: int
    present: int
    leave: int
    percentage: float
    star: str  # green (100%) | blue (50-99%) | red (<50%)
    is_finalized: bool  # True once every class this month has already happened


class MonthlyReportOut(BaseModel):
    """The full downloadable monthly report for one student."""
    student_id: int
    student_name: str
    student_code: str
    branch_name: str
    batch_name: str
    year: int
    month: int
    month_label: str  # "August 2026"
    total_scheduled: int  # conducted classes (regular - holiday + compensation)
    attended: int
    missed: int  # scheduled - attended - leaves
    prior_leaves: int
    other_leaves: int
    attendance_percentage: float
    star: str
    is_finalized: bool


# ---------- Fees ----------
class FeeCreate(BaseModel):
    """Used by Admin to log a fee record directly."""
    student_id: int
    amount: float
    billing_month: str  # "YYYY-MM"
    status: str = "pending"
    payment_method: Optional[str] = None  # cash | upi | bank_transfer
    payment_date: Optional[date] = None
    remarks: Optional[str] = None


class FeeSubmit(BaseModel):
    """Used by a student submitting their own payment for review."""
    amount: float
    billing_month: str  # "YYYY-MM"
    payment_method: str  # cash | upi | bank_transfer
    remarks: Optional[str] = None  # required in practice when method is cash


class FeeReview(BaseModel):
    """Used by Admin to approve or reject a submitted payment."""
    status: str  # approved | rejected


class FeeUpdate(BaseModel):
    amount: Optional[float] = None
    billing_month: Optional[str] = None
    status: Optional[str] = None
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    remarks: Optional[str] = None


class FeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    amount: float
    billing_month: str
    status: str
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    receipt_path: Optional[str] = None
    remarks: Optional[str] = None
    created_at: datetime


# ---------- Announcements ----------
class AnnouncementCreate(BaseModel):
    title: str
    message: str
    branch_id: Optional[int] = None  # None + batch_id None = everyone
    batch_id: Optional[int] = None   # None = every batch in branch_id (or everyone if branch_id also None)


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    message: str
    branch_id: Optional[int] = None
    batch_id: Optional[int] = None
    created_at: datetime


# ---------- Chat ----------
class ChatMessageCreate(BaseModel):
    batch_id: int
    message: str


class ChatBroadcastCreate(BaseModel):
    """Admin-only: send one message to every batch in a scope at once —
    a specific branch's batches, or literally everyone."""
    message: str
    branch_id: Optional[int] = None  # None = every branch
    batch_id: Optional[int] = None   # None = every batch in branch_id (or everyone)


class ChatMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    batch_id: int
    sender_name: str
    sender_role: str
    message: str
    created_at: datetime


# ---------- Prior leave requests ----------
LEAVE_REASON_CATEGORIES = [
    "Personal Reason", "Medical Reason", "Family Emergency",
    "Academic/College Commitment", "Work/Professional Commitment", "Travel", "Other",
]


class LeaveRequestCreate(BaseModel):
    session_id: int
    reason_category: str
    custom_reason: Optional[str] = None  # required when reason_category == "Other"


class LeaveRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    student_id: int
    session_id: int
    reason_category: str
    custom_reason: Optional[str] = None
    created_at: datetime
