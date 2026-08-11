"""
api.py
Every FastAPI route for the Dance Academy Management System.
"""
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File, Form
from sqlalchemy.orm import Session

from app import models, schemas, services, utils, auth
from app.config import SESSION_COOKIE_NAME
from app.database.database import get_db

router = APIRouter()


# ============================================================
# AUTH
# ============================================================
@router.post("/auth/login/staff")
def login_staff(payload: schemas.AdminLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login for Admin and Assistant Teacher (username + password)."""
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not utils.verify_password(payload.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = auth.create_session(user.role, user.id)
    response.set_cookie(SESSION_COOKIE_NAME, token, httponly=True, max_age=12 * 3600, samesite="none")
    return {"user": schemas.UserOut.model_validate(user)}


@router.post("/auth/login/student")
def login_student(payload: schemas.StudentLoginRequest, response: Response, db: Session = Depends(get_db)):
    """Login for Students (mobile number + student code)."""
    student = (
        db.query(models.Student)
        .filter(
            models.Student.student_mobile == payload.mobile,
            models.Student.student_code == payload.student_code,
        )
        .first()
    )
    if not student:
        raise HTTPException(401, "Invalid mobile number or student code")
    token = auth.create_session("student", student.id)
    response.set_cookie(SESSION_COOKIE_NAME, token, httponly=True, max_age=12 * 3600, samesite="none")
    return {"student": schemas.StudentOut.model_validate(student)}


@router.post("/students/register", response_model=schemas.StudentRegisterOut)
def self_register_student(
    db: Session = Depends(get_db),
    name: str = Form(...),
    student_mobile: str = Form(...),
    branch_id: int = Form(...),
    batch_id: int = Form(...),
    date_of_birth: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    parent_name: Optional[str] = Form(None),
    parent_mobile: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    photo: Optional[UploadFile] = File(None),
):
    """Public endpoint — a new student registers themselves, no login
    required. Multipart form (not JSON) so an optional profile photo can
    be attached in the same request, before the student ever logs in."""
    photo_path = None
    if photo is not None and photo.filename:
        photo_path = utils.save_upload_file(photo.file.read(), photo.filename, subfolder="students")

    dob = date.fromisoformat(date_of_birth) if date_of_birth else None
    student = services.register_student_self(
        db, name=name, student_mobile=student_mobile, branch_id=branch_id, batch_id=batch_id,
        date_of_birth=dob, gender=gender, parent_name=parent_name, parent_mobile=parent_mobile,
        address=address, photo_path=photo_path,
    )
    return schemas.StudentRegisterOut(student_code=student.student_code, name=student.name)


@router.post("/auth/logout")
def logout(response: Response, session: dict = Depends(auth.get_current_session)):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"message": "Logged out"}


@router.get("/auth/me")
def get_me(db: Session = Depends(get_db), session: Optional[dict] = Depends(auth.get_optional_session)):
    if not session:
        return {"authenticated": False}
    if session["user_type"] == "student":
        student = db.query(models.Student).get(session["user_id"])
        return {"authenticated": True, "role": "student", "profile": schemas.StudentOut.model_validate(student)}
    user = db.query(models.User).get(session["user_id"])
    return {"authenticated": True, "role": user.role, "profile": schemas.UserOut.model_validate(user)}


# ============================================================
# BRANCHES (admin only for write; read is public — self-registration needs it)
# ============================================================
@router.post("/branches", response_model=schemas.BranchOut)
def create_branch(data: schemas.BranchCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_branch(db, data)


@router.get("/branches", response_model=list[schemas.BranchOut])
def get_branches(db: Session = Depends(get_db)):
    return services.list_branches(db)


@router.put("/branches/{branch_id}", response_model=schemas.BranchOut)
def update_branch(branch_id: int, data: schemas.BranchCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.update_branch(db, branch_id, data)


@router.delete("/branches/{branch_id}")
def delete_branch(branch_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_branch(db, branch_id)
    return {"message": "Branch deleted"}


# ============================================================
# BATCHES (admin only for write; read is public)
# ============================================================
@router.post("/batches", response_model=schemas.BatchOut)
def create_batch(data: schemas.BatchCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_batch(db, data)


@router.get("/batches", response_model=list[schemas.BatchOut])
def get_batches(branch_id: Optional[int] = None, db: Session = Depends(get_db)):
    return services.list_batches(db, branch_id)


@router.put("/batches/{batch_id}", response_model=schemas.BatchOut)
def update_batch(batch_id: int, data: schemas.BatchCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.update_batch(db, batch_id, data)


@router.delete("/batches/{batch_id}")
def delete_batch(batch_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_batch(db, batch_id)
    return {"message": "Batch deleted"}


@router.put("/batches/{batch_id}/patterns", response_model=list[schemas.PatternOut])
def replace_batch_patterns(batch_id: int, data: schemas.PatternsReplaceRequest, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    """Sets a batch's full weekly schedule (one or more day/time slots) in
    one call. This is the source of truth the Calendar reads from — no
    separate 'Add Weekly Slot' step needed once a batch is saved here."""
    return services.replace_patterns(db, batch_id, data.patterns)


# ============================================================
# STUDENTS (admin: full CRUD, assistant: read only within their batch)
# ============================================================
@router.post("/students", response_model=schemas.StudentOut)
def register_student(data: schemas.StudentCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.register_student(db, data)


@router.get("/students", response_model=list[schemas.StudentOut])
def get_students(batch_id: Optional[int] = None, db: Session = Depends(get_db), user: models.User = Depends(auth.require_staff)):
    if user.role == "assistant":
        batch_id = user.batch_id
    return services.list_students(db, batch_id)


@router.put("/students/{student_id}", response_model=schemas.StudentOut)
def update_student(student_id: int, data: schemas.StudentUpdate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.update_student(db, student_id, data)


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_student(db, student_id)
    return {"message": "Student deleted"}


@router.post("/students/{student_id}/photo")
def upload_student_photo(student_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    student = services.get_student(db, student_id)
    path = utils.save_upload_file(file.file.read(), file.filename, subfolder="students")
    student.photo_path = path
    db.commit()
    return {"photo_path": path}


@router.get("/students/export")
def export_students(
    format: str = "xlsx", batch_id: Optional[int] = None, branch_id: Optional[int] = None,
    db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin),
):
    """Downloadable raw-data export of student registrations. The
    database is always the source of truth — this just renders its
    current state on request, so there's nothing to keep manually in
    sync. Supports Excel (.xlsx) and JSON."""
    if format == "json":
        return services.export_students_json(db, batch_id, branch_id)
    if format == "xlsx":
        content = services.export_students_xlsx(db, batch_id, branch_id)
        return Response(
            content=content,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=students.xlsx"},
        )
    raise HTTPException(400, "format must be 'xlsx' or 'json'")


# ============================================================
# WEEKLY CLASS PATTERNS — admin defines the recurring weekly slots
# (e.g. "every Mon & Wed, 5-6 PM") once per batch.
# ============================================================
@router.post("/schedule-patterns", response_model=schemas.PatternOut)
def create_pattern(data: schemas.PatternCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_pattern(db, data)


@router.get("/schedule-patterns", response_model=list[schemas.PatternOut])
def get_patterns(batch_id: Optional[int] = None, db: Session = Depends(get_db), _: dict = Depends(auth.get_current_session)):
    return services.list_patterns(db, batch_id)


@router.delete("/schedule-patterns/{pattern_id}")
def delete_pattern(pattern_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_pattern(db, pattern_id)
    return {"message": "Weekly pattern deleted"}


# ============================================================
# CALENDAR — generated class sessions (regular/holiday/compensation)
# ============================================================
@router.post("/calendar/holiday", response_model=list[schemas.SessionOut])
def create_holiday(data: schemas.HolidayCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_holiday(db, data)


@router.post("/calendar/compensation", response_model=schemas.SessionOut)
def create_compensation(data: schemas.CompensationCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_compensation(db, data)


@router.delete("/calendar/session/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_session(db, session_id)
    return {"message": "Removed from calendar"}


@router.get("/calendar", response_model=list[schemas.CalendarDayOut])
def get_calendar(batch_id: int, year: int, month: int, db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    """Role-scoped: admin/assistant get the schedule view (no personal
    status); students get their own attendance status per session too."""
    student_id = None
    if session["user_type"] == "student":
        student = db.query(models.Student).get(session["user_id"])
        if not student or student.batch_id != batch_id:
            raise HTTPException(403, "You can only view your own batch calendar")
        student_id = student.id
    elif session["user_type"] == "assistant":
        user = db.query(models.User).get(session["user_id"])
        if user.batch_id != batch_id:
            raise HTTPException(403, "You can only view your assigned batch calendar")
    return services.get_calendar(db, batch_id, year, month, student_id=student_id)


@router.get("/attendance/session/{session_id}", response_model=schemas.SessionAttendanceStatus)
def get_session_attendance(session_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_staff)):
    """Returns the computed window status (not_started/active/draft/submitted)
    plus any marks recorded so far — evaluated live, no background job."""
    return services.get_session_attendance(db, session_id)


@router.get("/sessions", response_model=list[schemas.SessionOut])
def get_sessions(batch_id: Optional[int] = None, branch_id: Optional[int] = None, db: Session = Depends(get_db), _: models.User = Depends(auth.require_staff)):
    """A rolling window of markable sessions for the Attendance page's
    session picker (admin: any batch/branch; assistant: enforced to their own)."""
    return services.list_sessions(db, batch_id, branch_id)


@router.get("/sessions/mine", response_model=list[schemas.SessionOut])
def get_my_sessions(db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    """Assistants get their assigned batch's markable sessions."""
    user = db.query(models.User).get(session["user_id"])
    return services.list_sessions(db, batch_id=user.batch_id if user else None)


# ============================================================
# PRIOR LEAVE REQUESTS — kept separate from Chat. Submitting one
# immediately records a final Attendance('leave') entry, distinct from
# an ordinary leave/absence, so it's counted correctly right away.
# ============================================================
@router.post("/leave-requests", response_model=schemas.LeaveRequestOut)
def create_leave_request(data: schemas.LeaveRequestCreate, db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    return services.create_leave_request(db, student, data)


@router.get("/leave-requests/mine", response_model=list[schemas.LeaveRequestOut])
def get_my_leave_requests(db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    return services.list_my_leave_requests(db, student.id)


@router.get("/leave-requests/session/{session_id}", response_model=list[schemas.LeaveRequestOut])
def get_session_leave_requests(session_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_staff)):
    """Lets staff see, before or during a class, who already gave advance notice."""
    return services.list_leave_requests_for_session(db, session_id)


# ============================================================
# ATTENDANCE
# ============================================================
@router.post("/attendance", response_model=list[schemas.AttendanceOut])
def save_attendance(data: schemas.AttendanceBulkSave, db: Session = Depends(get_db), user: models.User = Depends(auth.require_staff)):
    if user.role == "assistant" and data.batch_id != user.batch_id:
        raise HTTPException(403, "You can only mark attendance for your assigned batch")

    session = db.query(models.ClassSession).get(data.session_id)
    if not session:
        raise HTTPException(404, "Class session not found")
    existing = db.query(models.Attendance).filter(models.Attendance.session_id == data.session_id).all()
    win_status = services.session_window_status(session, any(r.is_final for r in existing), bool(existing))
    if win_status == "not_started":
        raise HTTPException(400, "Attendance opens automatically once the class starts")
    if win_status == "not_applicable":
        raise HTTPException(400, "Attendance can't be marked for a holiday")

    return services.save_attendance(db, data, marked_by=user.id)


@router.get("/attendance", response_model=list[schemas.AttendanceOut])
def get_attendance_admin(batch_id: Optional[int] = None, db: Session = Depends(get_db), _: models.User = Depends(auth.require_staff)):
    return services.get_attendance(db, batch_id=batch_id)


@router.get("/attendance/mine", response_model=list[schemas.AttendanceOut])
def get_my_attendance(db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    return services.get_attendance(db, student_id=student.id)


@router.get("/attendance/monthly", response_model=schemas.MonthlyAttendanceOut)
def get_monthly_attendance(year: int, month: int, student_id: Optional[int] = None, db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    """Students get their own; admin/assistant can pass student_id."""
    if session["user_type"] == "student":
        student_id = session["user_id"]
    elif not student_id:
        raise HTTPException(400, "student_id is required")
    return services.monthly_attendance(db, student_id, year, month)


@router.get("/reports/monthly/mine")
def get_my_monthly_report(year: int, month: int, format: str = "json", db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    """Only available once every class for that month has actually
    happened — see MonthlyReportOut.is_finalized."""
    report = services.monthly_report(db, student.id, year, month)
    if format == "xlsx":
        content = services.export_monthly_report_xlsx(report)
        return Response(
            content=content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=report-{year}-{month:02d}.xlsx"},
        )
    return report


@router.get("/reports/monthly/{student_id}")
def get_student_monthly_report(student_id: int, year: int, month: int, format: str = "json", db: Session = Depends(get_db), _: models.User = Depends(auth.require_staff)):
    report = services.monthly_report(db, student_id, year, month)
    if format == "xlsx":
        content = services.export_monthly_report_xlsx(report)
        return Response(
            content=content, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=report-{year}-{month:02d}.xlsx"},
        )
    return report


@router.delete("/attendance/{attendance_id}")
def delete_attendance(attendance_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_attendance(db, attendance_id)
    return {"message": "Attendance record deleted"}


# ============================================================
# FEES (admin only manages, student views/submits own)
# ============================================================
@router.post("/fees", response_model=schemas.FeeOut)
def create_fee(data: schemas.FeeCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_fee(db, data)


@router.get("/fees", response_model=list[schemas.FeeOut])
def get_fees(student_id: Optional[int] = None, batch_id: Optional[int] = None, branch_id: Optional[int] = None, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    """Supports branch/batch filtering so the admin fee list can be
    segregated instead of one giant table."""
    return services.list_fees(db, student_id, batch_id, branch_id)


@router.put("/fees/{fee_id}", response_model=schemas.FeeOut)
def update_fee(fee_id: int, data: schemas.FeeUpdate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.update_fee(db, fee_id, data)


@router.delete("/fees/{fee_id}")
def delete_fee(fee_id: int, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    services.delete_fee(db, fee_id)
    return {"message": "Fee record deleted"}


@router.post("/fees/{fee_id}/receipt")
def upload_receipt(fee_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    fee = db.query(models.Fee).get(fee_id)
    if not fee:
        raise HTTPException(404, "Fee record not found")
    path = utils.save_upload_file(file.file.read(), file.filename, subfolder="receipts")
    fee.receipt_path = path
    db.commit()
    return {"receipt_path": path}


@router.get("/fees/mine", response_model=list[schemas.FeeOut])
def get_my_fees(db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    return services.list_fees(db, student.id)


@router.post("/fees/mine", response_model=schemas.FeeOut)
def submit_my_fee(data: schemas.FeeSubmit, db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    """Student submits a payment (cash needs remarks; UPI/bank expects a
    receipt upload next via /fees/{id}/receipt/mine). Starts as 'pending'
    for admin review, tagged to a billing month."""
    return services.submit_fee(db, student, data)


@router.post("/fees/{fee_id}/receipt/mine")
def upload_my_receipt(fee_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    fee = db.query(models.Fee).get(fee_id)
    if not fee or fee.student_id != student.id:
        raise HTTPException(404, "Fee record not found")
    path = utils.save_upload_file(file.file.read(), file.filename, subfolder="receipts")
    fee.receipt_path = path
    db.commit()
    return {"receipt_path": path}


@router.put("/fees/{fee_id}/review", response_model=schemas.FeeOut)
def review_fee(fee_id: int, data: schemas.FeeReview, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    """Admin approves or rejects a student-submitted payment."""
    return services.review_fee(db, fee_id, data)


# ============================================================
# ANNOUNCEMENTS
# ============================================================
@router.post("/announcements", response_model=schemas.AnnouncementOut)
def create_announcement(data: schemas.AnnouncementCreate, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.create_announcement(db, data)


@router.get("/announcements", response_model=list[schemas.AnnouncementOut])
def get_announcements(batch_id: Optional[int] = None, db: Session = Depends(get_db), _: dict = Depends(auth.get_current_session)):
    return services.list_announcements(db, batch_id)


# ============================================================
# NOTIFICATIONS — lightweight polling endpoint for the in-app banner.
# Not a real push service: the frontend polls this every few seconds
# while the app is open and shows a toast for anything new.
# ============================================================
@router.get("/notifications/poll")
def poll_notifications(since: str, db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    """`since` is an ISO timestamp — returns anything newer than it.
    Students/assistants get new announcements for their batch; admin
    gets newly-submitted (pending) fee payments."""
    try:
        after = datetime.fromisoformat(since)
        if after.tzinfo is None:
            after = after.replace(tzinfo=timezone.utc)
    except ValueError:
        raise HTTPException(400, "Invalid 'since' timestamp")

    events = []
    if session["user_type"] == "admin":
        for fee in services.list_recent_pending_fees_since(db, after):
            student = db.query(models.Student).get(fee.student_id)
            events.append({
                "type": "fee_submitted",
                "message": f"{student.name if student else 'A student'} submitted a payment of ₹{fee.amount:.0f} for review",
                "created_at": fee.created_at,
            })
    else:
        batch_id = None
        if session["user_type"] == "student":
            student = db.query(models.Student).get(session["user_id"])
            batch_id = student.batch_id if student else None
        elif session["user_type"] == "assistant":
            user = db.query(models.User).get(session["user_id"])
            batch_id = user.batch_id if user else None
        for ann in services.list_recent_announcements_since(db, batch_id, after):
            events.append({"type": "announcement", "message": ann.title, "created_at": ann.created_at})

    return {"server_time": datetime.now(timezone.utc), "events": events}


# ============================================================
# CHAT (batch-wise, with admin broadcast + aggregated views)
# ============================================================
@router.post("/chat", response_model=schemas.ChatMessageOut)
def post_chat(data: schemas.ChatMessageCreate, db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    if session["user_type"] == "student":
        student = db.query(models.Student).get(session["user_id"])
        if student.batch_id != data.batch_id:
            raise HTTPException(403, "You can only chat in your own batch")
        return services.post_chat_message(db, data, student.name, "student")

    user = db.query(models.User).get(session["user_id"])
    if session["user_type"] == "assistant" and user.batch_id != data.batch_id:
        raise HTTPException(403, "You can only chat in your assigned batch")
    return services.post_chat_message(db, data, user.full_name or user.username, session["user_type"])


@router.post("/chat/broadcast", response_model=list[schemas.ChatMessageOut])
def broadcast_chat(data: schemas.ChatBroadcastCreate, db: Session = Depends(get_db), user: models.User = Depends(auth.require_admin)):
    """Admin sends to every batch in a branch, or to everyone, in one call."""
    return services.broadcast_chat_message(db, data, user.full_name or user.username)


@router.get("/chat", response_model=list[schemas.ChatMessageOut])
def get_chat_scoped(batch_id: Optional[int] = None, branch_id: Optional[int] = None, db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    """Admin's aggregated view: a whole branch's chats merged by time, or
    everyone's — each message still tagged with its own batch_id."""
    return services.get_chat_messages_scoped(db, batch_id, branch_id)


@router.get("/chat/{batch_id}", response_model=list[schemas.ChatMessageOut])
def get_chat(batch_id: int, db: Session = Depends(get_db), session: dict = Depends(auth.get_current_session)):
    if session["user_type"] == "student":
        student = db.query(models.Student).get(session["user_id"])
        if student.batch_id != batch_id:
            raise HTTPException(403, "You can only view your own batch chat")
    elif session["user_type"] == "assistant":
        user = db.query(models.User).get(session["user_id"])
        if user.batch_id != batch_id:
            raise HTTPException(403, "You can only view your assigned batch chat")
    return services.get_chat_messages(db, batch_id)


# ============================================================
# DASHBOARDS
# ============================================================
@router.get("/dashboard/admin")
def get_admin_dashboard(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    return services.admin_dashboard(db)


@router.get("/dashboard/admin/hierarchy")
def get_admin_dashboard_hierarchy(db: Session = Depends(get_db), _: models.User = Depends(auth.require_admin)):
    """Branch -> Batch breakdown of students, this month's fee collection,
    and this month's attendance % — always the current month automatically."""
    return services.admin_dashboard_hierarchy(db)


@router.get("/dashboard/assistant")
def get_assistant_dashboard(db: Session = Depends(get_db), user: models.User = Depends(auth.require_staff)):
    return services.assistant_dashboard(db, user.batch_id)


@router.get("/dashboard/student")
def get_student_dashboard(db: Session = Depends(get_db), student: models.Student = Depends(auth.require_student)):
    return services.student_dashboard(db, student)
