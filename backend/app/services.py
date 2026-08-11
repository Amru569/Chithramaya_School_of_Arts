"""
services.py
All business logic. api.py stays thin and calls into these functions.

All "what is today / what is now" logic uses utils.now_local() /
utils.today_local() (the academy's fixed timezone), never the raw
server clock — see utils.py.
"""
import calendar
from datetime import date, datetime, timedelta
from typing import Optional, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app import models, schemas, utils


# ---------- Branches ----------
def create_branch(db: Session, data: schemas.BranchCreate) -> models.Branch:
    if db.query(models.Branch).filter(models.Branch.name == data.name).first():
        raise HTTPException(400, "Branch already exists")
    branch = models.Branch(**data.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch


def list_branches(db: Session) -> List[models.Branch]:
    return db.query(models.Branch).all()


def update_branch(db: Session, branch_id: int, data: schemas.BranchCreate) -> models.Branch:
    branch = db.query(models.Branch).get(branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    branch.name = data.name
    branch.location = data.location
    db.commit()
    db.refresh(branch)
    return branch


def delete_branch(db: Session, branch_id: int):
    branch = db.query(models.Branch).get(branch_id)
    if not branch:
        raise HTTPException(404, "Branch not found")
    db.delete(branch)
    db.commit()


# ---------- Batches ----------
def create_batch(db: Session, data: schemas.BatchCreate) -> models.Batch:
    if not db.query(models.Branch).get(data.branch_id):
        raise HTTPException(404, "Branch not found")
    batch = models.Batch(**data.model_dump())
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


def list_batches(db: Session, branch_id: Optional[int] = None) -> List[models.Batch]:
    q = db.query(models.Batch)
    if branch_id:
        q = q.filter(models.Batch.branch_id == branch_id)
    return q.all()


def update_batch(db: Session, batch_id: int, data: schemas.BatchCreate) -> models.Batch:
    batch = db.query(models.Batch).get(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    batch.name = data.name
    batch.branch_id = data.branch_id
    batch.schedule = data.schedule
    db.commit()
    db.refresh(batch)
    return batch


def delete_batch(db: Session, batch_id: int):
    batch = db.query(models.Batch).get(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    db.delete(batch)
    db.commit()


# ---------- Students ----------
def register_student(db: Session, data: schemas.StudentCreate, photo_path: Optional[str] = None) -> models.Student:
    """Admin registration. joining_date is always set to today automatically.

    The mobile-uniqueness check below is a fast pre-check for a friendly
    error message, but under concurrent requests two students could pass
    it at the same time — the unique DB index on student_mobile is the
    real guard, so a race is still caught and reported cleanly rather
    than corrupting data or crashing.
    """
    if not db.query(models.Batch).get(data.batch_id):
        raise HTTPException(404, "Batch not found")
    if db.query(models.Student).filter(models.Student.student_mobile == data.student_mobile).first():
        raise HTTPException(400, "A student with this mobile number already exists")

    student = models.Student(
        **data.model_dump(),
        student_code=utils.generate_student_code(db),
        joining_date=utils.today_local(),
        photo_path=photo_path,
    )
    db.add(student)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, "A student with this mobile number already exists")
    db.refresh(student)
    return student


def register_student_self(
    db: Session,
    name: str,
    student_mobile: str,
    branch_id: int,
    batch_id: int,
    date_of_birth: Optional[date] = None,
    gender: Optional[str] = None,
    parent_name: Optional[str] = None,
    parent_mobile: Optional[str] = None,
    address: Optional[str] = None,
    photo_path: Optional[str] = None,
) -> models.Student:
    """Public self-registration (multipart form, so an optional photo can
    be attached in the same request). Validates the chosen batch actually
    belongs to the chosen branch before creating the student.

    Safe under concurrent registrations: the pre-check below gives a fast,
    friendly error for the common case, but the actual safety net is the
    unique DB index on student_mobile plus a retry loop on the generated
    student_code — if two requests land at almost the same instant, the
    DB-level commit still rejects a genuine duplicate mobile number, and a
    student_code collision (astronomically unlikely, but possible under
    heavy concurrent load) is retried with a freshly generated code
    instead of failing the registration.
    """
    batch = db.query(models.Batch).get(batch_id)
    if not batch:
        raise HTTPException(404, "Batch not found")
    if batch.branch_id != branch_id:
        raise HTTPException(400, "Selected batch does not belong to the selected branch")
    if db.query(models.Student).filter(models.Student.student_mobile == student_mobile).first():
        raise HTTPException(400, "A student with this mobile number already exists")

    for attempt in range(3):
        student = models.Student(
            name=name,
            student_mobile=student_mobile,
            batch_id=batch_id,
            date_of_birth=date_of_birth,
            gender=gender,
            parent_name=parent_name,
            parent_mobile=parent_mobile,
            address=address,
            photo_path=photo_path,
            student_code=utils.generate_student_code(db),
            joining_date=utils.today_local(),
        )
        db.add(student)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            # A student_code collision can be retried with a new code;
            # a mobile-number collision (a genuine duplicate registration
            # racing this one) cannot — report it clearly instead.
            if "student_mobile" in str(exc.orig).lower():
                raise HTTPException(400, "A student with this mobile number already exists")
            if attempt == 2:
                raise HTTPException(500, "Could not complete registration — please try again")
            continue
        db.refresh(student)
        return student


def list_students(db: Session, batch_id: Optional[int] = None) -> List[models.Student]:
    q = db.query(models.Student)
    if batch_id:
        q = q.filter(models.Student.batch_id == batch_id)
    return q.all()


def list_students_scoped(db: Session, batch_id: Optional[int] = None, branch_id: Optional[int] = None) -> List[models.Student]:
    """Like list_students, but also supports filtering by branch (via the
    student's batch) — used by the export endpoints."""
    q = db.query(models.Student)
    if batch_id:
        q = q.filter(models.Student.batch_id == batch_id)
    elif branch_id:
        batch_ids = [b.id for b in db.query(models.Batch).filter(models.Batch.branch_id == branch_id).all()]
        q = q.filter(models.Student.batch_id.in_(batch_ids)) if batch_ids else q.filter(False)
    return q.all()


def get_student(db: Session, student_id: int) -> models.Student:
    student = db.query(models.Student).get(student_id)
    if not student:
        raise HTTPException(404, "Student not found")
    return student


def update_student(db: Session, student_id: int, data: schemas.StudentUpdate) -> models.Student:
    student = get_student(db, student_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: int):
    student = get_student(db, student_id)
    db.delete(student)
    db.commit()


# ============================================================
# Weekly recurring class patterns + generated class sessions
# ============================================================
def create_pattern(db: Session, data: schemas.PatternCreate) -> models.WeeklyPattern:
    if not db.query(models.Batch).get(data.batch_id):
        raise HTTPException(404, "Batch not found")
    if not (0 <= data.day_of_week <= 6):
        raise HTTPException(400, "day_of_week must be 0 (Monday) through 6 (Sunday)")
    pattern = models.WeeklyPattern(**data.model_dump())
    db.add(pattern)
    db.commit()
    db.refresh(pattern)
    return pattern


def list_patterns(db: Session, batch_id: Optional[int] = None) -> List[models.WeeklyPattern]:
    q = db.query(models.WeeklyPattern)
    if batch_id:
        q = q.filter(models.WeeklyPattern.batch_id == batch_id)
    return q.order_by(models.WeeklyPattern.day_of_week).all()


def delete_pattern(db: Session, pattern_id: int):
    pattern = db.query(models.WeeklyPattern).get(pattern_id)
    if not pattern:
        raise HTTPException(404, "Weekly pattern not found")
    db.delete(pattern)
    db.commit()


def replace_patterns(db: Session, batch_id: int, patterns: List[schemas.PatternItem]) -> List[models.WeeklyPattern]:
    """Replaces a batch's entire weekly schedule set in one call — this is
    what the Batches form uses so a batch can have classes on several
    days/times a week, with the calendar staying in sync automatically.

    Future 'regular' sessions that were auto-generated from the OLD
    patterns and have no attendance recorded yet are cleared out, so the
    calendar regenerates cleanly from the new set next time it's viewed.
    Sessions with attendance already marked, or in the past, are left
    untouched — editing a schedule never destroys attendance history.
    """
    if not db.query(models.Batch).get(batch_id):
        raise HTTPException(404, "Batch not found")

    today = utils.today_local()
    stale_sessions = db.query(models.ClassSession).filter(
        models.ClassSession.batch_id == batch_id,
        models.ClassSession.session_type == "regular",
        models.ClassSession.pattern_id.isnot(None),
        models.ClassSession.date >= today,
    ).all()
    for s in stale_sessions:
        has_attendance = db.query(models.Attendance).filter(models.Attendance.session_id == s.id).first()
        if not has_attendance:
            db.delete(s)

    db.query(models.WeeklyPattern).filter(models.WeeklyPattern.batch_id == batch_id).delete()

    created = []
    for p in patterns:
        if not (0 <= p.day_of_week <= 6):
            raise HTTPException(400, "day_of_week must be 0 (Monday) through 6 (Sunday)")
        pattern = models.WeeklyPattern(batch_id=batch_id, day_of_week=p.day_of_week, start_time=p.start_time, end_time=p.end_time, teacher=p.teacher)
        db.add(pattern)
        created.append(pattern)
    db.commit()
    for c in created:
        db.refresh(c)
    return created


def ensure_sessions_generated(db: Session, batch_id: int, start: date, end: date):
    """Auto-generate 'regular' ClassSession rows for every pattern
    occurrence in [start, end] that doesn't already exist and isn't
    cancelled by a holiday on that date. Idempotent — safe to call on
    every calendar/attendance read."""
    patterns = db.query(models.WeeklyPattern).filter(models.WeeklyPattern.batch_id == batch_id).all()
    if not patterns:
        return

    existing = (
        db.query(models.ClassSession)
        .filter(models.ClassSession.batch_id == batch_id, models.ClassSession.date >= start, models.ClassSession.date <= end)
        .all()
    )
    holiday_dates = {s.date for s in existing if s.session_type == "holiday"}
    existing_pattern_dates = {(s.pattern_id, s.date) for s in existing if s.pattern_id}

    cur = start
    changed = False
    while cur <= end:
        weekday = cur.weekday()
        if cur not in holiday_dates:
            for p in patterns:
                if p.day_of_week == weekday and (p.id, cur) not in existing_pattern_dates:
                    db.add(models.ClassSession(
                        batch_id=batch_id, pattern_id=p.id, date=cur,
                        start_time=p.start_time, end_time=p.end_time,
                        session_type="regular", teacher=p.teacher,
                    ))
                    changed = True
        cur += timedelta(days=1)
    if changed:
        db.commit()


def count_pattern_occurrences(db: Session, batch_id: int, start: date, end: date) -> int:
    """The 'Regular Classes' baseline — how many times the weekly pattern
    would occur in this range, regardless of holidays."""
    patterns = db.query(models.WeeklyPattern).filter(models.WeeklyPattern.batch_id == batch_id).all()
    if not patterns:
        return 0
    weekdays = [p.day_of_week for p in patterns]
    count, cur = 0, start
    while cur <= end:
        count += weekdays.count(cur.weekday())
        cur += timedelta(days=1)
    return count


def create_holiday(db: Session, data: schemas.HolidayCreate) -> List[models.ClassSession]:
    if not data.batch_id and not data.branch_id:
        raise HTTPException(400, "Provide either batch_id or branch_id")
    if data.batch_id:
        batch_ids = [data.batch_id]
    else:
        batch_ids = [b.id for b in db.query(models.Batch).filter(models.Batch.branch_id == data.branch_id).all()]
        if not batch_ids:
            raise HTTPException(404, "Branch has no batches")

    created = []
    for bid in batch_ids:
        # A holiday cancels any regular class already generated for that date.
        for s in db.query(models.ClassSession).filter(
            models.ClassSession.batch_id == bid,
            models.ClassSession.date == data.date,
            models.ClassSession.session_type == "regular",
        ).all():
            db.delete(s)
        holiday = models.ClassSession(batch_id=bid, date=data.date, session_type="holiday", notes=data.notes)
        db.add(holiday)
        created.append(holiday)
    db.commit()
    for h in created:
        db.refresh(h)
    return created


def create_compensation(db: Session, data: schemas.CompensationCreate) -> models.ClassSession:
    if not db.query(models.Batch).get(data.batch_id):
        raise HTTPException(404, "Batch not found")
    session = models.ClassSession(
        batch_id=data.batch_id, date=data.date, start_time=data.start_time, end_time=data.end_time,
        session_type="compensation", teacher=data.teacher, notes=data.notes,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def delete_session(db: Session, session_id: int):
    session = db.query(models.ClassSession).get(session_id)
    if not session:
        raise HTTPException(404, "Class session not found")
    db.delete(session)
    db.commit()


def get_calendar(db: Session, batch_id: int, year: int, month: int, student_id: Optional[int] = None) -> List[schemas.CalendarDayOut]:
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    ensure_sessions_generated(db, batch_id, start, end)

    sessions = (
        db.query(models.ClassSession)
        .filter(models.ClassSession.batch_id == batch_id, models.ClassSession.date >= start, models.ClassSession.date <= end)
        .order_by(models.ClassSession.date, models.ClassSession.start_time)
        .all()
    )
    results = []
    for s in sessions:
        my_status = None
        if student_id:
            att = db.query(models.Attendance).filter(
                models.Attendance.session_id == s.id, models.Attendance.student_id == student_id
            ).first()
            if att:
                my_status = att.status
        results.append(schemas.CalendarDayOut(session=schemas.SessionOut.model_validate(s), my_status=my_status))
    return results


def list_sessions(db: Session, batch_id: Optional[int] = None, branch_id: Optional[int] = None) -> List[models.ClassSession]:
    """A rolling window (this week +/- a bit) used to populate the
    Attendance page's session picker."""
    today = utils.today_local()
    start, end = today - timedelta(days=7), today + timedelta(days=14)

    batch_ids = []
    if batch_id:
        batch_ids = [batch_id]
    elif branch_id:
        batch_ids = [b.id for b in db.query(models.Batch).filter(models.Batch.branch_id == branch_id).all()]
    else:
        batch_ids = [b.id for b in db.query(models.Batch).all()]

    for bid in batch_ids:
        ensure_sessions_generated(db, bid, start, end)

    q = db.query(models.ClassSession).filter(
        models.ClassSession.batch_id.in_(batch_ids), models.ClassSession.date >= start, models.ClassSession.date <= end,
        models.ClassSession.session_type.in_(["regular", "compensation"]),
    )
    return q.order_by(models.ClassSession.date, models.ClassSession.start_time).all()


# ---------- Attendance window logic (computed live — no cron) ----------
def session_window_status(session: models.ClassSession, has_submission: bool, has_any_marks: bool) -> str:
    if session.session_type not in ("regular", "compensation"):
        return "not_applicable"
    if has_submission:
        return "submitted"

    now = utils.now_local()
    start_dt = datetime.combine(session.date, datetime.strptime(session.start_time, "%H:%M").time(), tzinfo=now.tzinfo)
    draft_cutoff = start_dt + timedelta(hours=1)

    if now < start_dt:
        return "not_started"
    if now >= draft_cutoff and has_any_marks:
        return "draft"
    return "active"


def save_attendance(db: Session, data: schemas.AttendanceBulkSave, marked_by: int) -> List[models.Attendance]:
    valid_statuses = {"present", "leave"}
    for record in data.records:
        if record.status not in valid_statuses:
            raise HTTPException(400, "Status must be 'present' or 'leave'")

    session = db.query(models.ClassSession).get(data.session_id)
    if not session:
        raise HTTPException(404, "Class session not found")

    saved = []
    for record in data.records:
        existing = db.query(models.Attendance).filter(
            models.Attendance.student_id == record.student_id, models.Attendance.session_id == data.session_id
        ).first()
        if existing:
            if existing.is_final and not data.submit:
                continue  # don't silently downgrade a submitted record
            existing.status = record.status
            existing.marked_by = marked_by
            existing.is_final = data.submit
            saved.append(existing)
        else:
            entry = models.Attendance(
                student_id=record.student_id, batch_id=data.batch_id, session_id=data.session_id,
                date=session.date, status=record.status, marked_by=marked_by, is_final=data.submit,
            )
            db.add(entry)
            saved.append(entry)
    db.commit()
    for e in saved:
        db.refresh(e)
    return saved


def get_session_attendance(db: Session, session_id: int) -> schemas.SessionAttendanceStatus:
    session = db.query(models.ClassSession).get(session_id)
    if not session:
        raise HTTPException(404, "Class session not found")
    records = db.query(models.Attendance).filter(models.Attendance.session_id == session_id).all()
    has_submission = any(r.is_final for r in records)
    win_status = session_window_status(session, has_submission, bool(records))
    return schemas.SessionAttendanceStatus(
        session_id=session_id, window_status=win_status,
        records=[schemas.AttendanceOut.model_validate(r) for r in records],
    )


# ---------- Prior leave requests (kept separate from Chat) ----------
def create_leave_request(db: Session, student: models.Student, data: schemas.LeaveRequestCreate) -> models.LeaveRequest:
    """Submitting a prior leave immediately records a final 'leave'
    Attendance entry (is_prior_leave=True) so it's counted correctly in
    monthly stats right away, and staff can see in advance that the
    student won't attend — distinct from an ordinary absence or a leave
    staff mark themselves during class."""
    session = db.query(models.ClassSession).get(data.session_id)
    if not session:
        raise HTTPException(404, "Class session not found")
    if session.batch_id != student.batch_id:
        raise HTTPException(403, "You can only request leave for your own batch's classes")
    if session.session_type not in ("regular", "compensation"):
        raise HTTPException(400, "Leave can only be requested for a regular or compensation class")
    if session.date < utils.today_local():
        raise HTTPException(400, "Can't request leave for a class that has already happened")
    if data.reason_category == "Other" and not data.custom_reason:
        raise HTTPException(400, "Please enter a reason")
    if data.reason_category not in schemas.LEAVE_REASON_CATEGORIES:
        raise HTTPException(400, "Invalid reason category")

    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == student.id, models.Attendance.session_id == data.session_id
    ).first()
    if existing and existing.is_final and not existing.is_prior_leave:
        raise HTTPException(400, "Attendance has already been recorded for this class")

    leave = models.LeaveRequest(
        student_id=student.id, session_id=data.session_id,
        reason_category=data.reason_category, custom_reason=data.custom_reason,
    )
    db.add(leave)

    if existing:
        existing.status = "leave"
        existing.is_final = True
        existing.is_prior_leave = True
    else:
        db.add(models.Attendance(
            student_id=student.id, batch_id=student.batch_id, session_id=data.session_id,
            date=session.date, status="leave", is_final=True, is_prior_leave=True,
        ))
    db.commit()
    db.refresh(leave)
    return leave


def list_my_leave_requests(db: Session, student_id: int) -> List[models.LeaveRequest]:
    return (
        db.query(models.LeaveRequest)
        .filter(models.LeaveRequest.student_id == student_id)
        .order_by(models.LeaveRequest.created_at.desc())
        .all()
    )


def list_leave_requests_for_session(db: Session, session_id: int) -> List[models.LeaveRequest]:
    """Used by staff viewing a session's attendance, to see who already
    informed the system in advance."""
    return db.query(models.LeaveRequest).filter(models.LeaveRequest.session_id == session_id).all()


def get_attendance(db: Session, batch_id: Optional[int] = None, student_id: Optional[int] = None) -> List[models.Attendance]:
    q = db.query(models.Attendance)
    if batch_id:
        q = q.filter(models.Attendance.batch_id == batch_id)
    if student_id:
        q = q.filter(models.Attendance.student_id == student_id)
    return q.order_by(models.Attendance.date.desc()).all()


def delete_attendance(db: Session, attendance_id: int):
    entry = db.query(models.Attendance).get(attendance_id)
    if not entry:
        raise HTTPException(404, "Attendance record not found")
    db.delete(entry)
    db.commit()


def attendance_star(percentage: float) -> str:
    """🟢 100% | 🔵 50-99% | 🔴 below 50% — computed purely from the
    percentage, so it works the same regardless of how many classes
    were scheduled that month."""
    if percentage >= 100:
        return "green"
    if percentage >= 50:
        return "blue"
    return "red"


def is_month_finalized(db: Session, batch_id: int, year: int, month: int, sessions_in_range: Optional[List[models.ClassSession]] = None) -> bool:
    """A month's report is only 'final' once every class scheduled for it
    has actually happened — i.e. there's no conducted session left with a
    date still in the future."""
    today = utils.today_local()
    if sessions_in_range is None:
        start = date(year, month, 1)
        end = date(year, month, calendar.monthrange(year, month)[1])
        sessions_in_range = db.query(models.ClassSession).filter(
            models.ClassSession.batch_id == batch_id, models.ClassSession.date >= start, models.ClassSession.date <= end,
        ).all()
    conducted_dates = [s.date for s in sessions_in_range if s.session_type in ("regular", "compensation")]
    if not conducted_dates:
        # No classes at all this month — "finalized" once the month itself has passed.
        return date(year, month, calendar.monthrange(year, month)[1]) < today
    return max(conducted_dates) < today


def monthly_attendance(db: Session, student_id: int, year: int, month: int) -> schemas.MonthlyAttendanceOut:
    """Conducted Classes = Regular − Holiday + Compensation.
    Attendance % = Present / Conducted."""
    student = get_student(db, student_id)
    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    ensure_sessions_generated(db, student.batch_id, start, end)

    regular = count_pattern_occurrences(db, student.batch_id, start, end)
    sessions_in_range = db.query(models.ClassSession).filter(
        models.ClassSession.batch_id == student.batch_id, models.ClassSession.date >= start, models.ClassSession.date <= end,
    ).all()
    holiday = sum(1 for s in sessions_in_range if s.session_type == "holiday")
    compensation = sum(1 for s in sessions_in_range if s.session_type == "compensation")
    conducted = max(regular - holiday + compensation, 0)

    conducted_session_ids = [s.id for s in sessions_in_range if s.session_type in ("regular", "compensation")]
    records = []
    if conducted_session_ids:
        records = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id,
            models.Attendance.session_id.in_(conducted_session_ids),
            models.Attendance.is_final == True,  # noqa: E712
        ).all()
    present = sum(1 for r in records if r.status == "present")
    leave = sum(1 for r in records if r.status == "leave")
    percentage = round((present / conducted) * 100, 2) if conducted else 0.0

    return schemas.MonthlyAttendanceOut(
        year=year, month=month, regular_classes=regular, holiday_classes=holiday,
        compensation_classes=compensation, conducted_classes=conducted,
        present=present, leave=leave, percentage=percentage,
        star=attendance_star(percentage),
        is_finalized=is_month_finalized(db, student.batch_id, year, month, sessions_in_range),
    )


def monthly_report(db: Session, student_id: int, year: int, month: int) -> schemas.MonthlyReportOut:
    """The full downloadable report — everything in monthly_attendance()
    plus student/branch/batch identity and the attended/missed/leave
    breakdown the report format calls for."""
    student = get_student(db, student_id)
    batch = db.query(models.Batch).get(student.batch_id)
    branch = db.query(models.Branch).get(batch.branch_id) if batch else None
    monthly = monthly_attendance(db, student_id, year, month)

    start = date(year, month, 1)
    end = date(year, month, calendar.monthrange(year, month)[1])
    sessions_in_range = db.query(models.ClassSession).filter(
        models.ClassSession.batch_id == student.batch_id, models.ClassSession.date >= start, models.ClassSession.date <= end,
    ).all()
    conducted_session_ids = [s.id for s in sessions_in_range if s.session_type in ("regular", "compensation")]
    prior_leaves = 0
    if conducted_session_ids:
        prior_leaves = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id,
            models.Attendance.session_id.in_(conducted_session_ids),
            models.Attendance.status == "leave", models.Attendance.is_final == True,  # noqa: E712
            models.Attendance.is_prior_leave == True,  # noqa: E712
        ).count()
    other_leaves = monthly.leave - prior_leaves
    missed = max(monthly.conducted_classes - monthly.present - monthly.leave, 0)

    return schemas.MonthlyReportOut(
        student_id=student.id, student_name=student.name, student_code=student.student_code,
        branch_name=branch.name if branch else "-", batch_name=batch.name if batch else "-",
        year=year, month=month, month_label=date(year, month, 1).strftime("%B %Y"),
        total_scheduled=monthly.conducted_classes, attended=monthly.present, missed=missed,
        prior_leaves=prior_leaves, other_leaves=other_leaves,
        attendance_percentage=monthly.percentage, star=monthly.star, is_finalized=monthly.is_finalized,
    )


# ---------- Fees ----------
def create_fee(db: Session, data: schemas.FeeCreate) -> models.Fee:
    get_student(db, data.student_id)
    fee = models.Fee(**data.model_dump())
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee


def submit_fee(db: Session, student: models.Student, data: schemas.FeeSubmit) -> models.Fee:
    """A student submits a payment for admin review. Cash needs remarks
    instead of a receipt; UPI/bank transfer expect a receipt upload next."""
    if data.payment_method == "cash" and not data.remarks:
        raise HTTPException(400, "Remarks are required when paying by cash")
    fee = models.Fee(
        student_id=student.id,
        amount=data.amount,
        billing_month=data.billing_month,
        payment_method=data.payment_method,
        remarks=data.remarks,
        status="pending",
        payment_date=utils.today_local(),
    )
    db.add(fee)
    db.commit()
    db.refresh(fee)
    return fee


def review_fee(db: Session, fee_id: int, data: schemas.FeeReview) -> models.Fee:
    fee = db.query(models.Fee).get(fee_id)
    if not fee:
        raise HTTPException(404, "Fee record not found")
    if data.status not in ("approved", "rejected"):
        raise HTTPException(400, "Status must be 'approved' or 'rejected'")
    fee.status = data.status
    db.commit()
    db.refresh(fee)
    return fee


def update_fee(db: Session, fee_id: int, data: schemas.FeeUpdate) -> models.Fee:
    fee = db.query(models.Fee).get(fee_id)
    if not fee:
        raise HTTPException(404, "Fee record not found")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(fee, field, value)
    db.commit()
    db.refresh(fee)
    return fee


def delete_fee(db: Session, fee_id: int):
    fee = db.query(models.Fee).get(fee_id)
    if not fee:
        raise HTTPException(404, "Fee record not found")
    db.delete(fee)
    db.commit()


def list_fees(db: Session, student_id: Optional[int] = None, batch_id: Optional[int] = None, branch_id: Optional[int] = None) -> List[models.Fee]:
    q = db.query(models.Fee)
    if student_id:
        q = q.filter(models.Fee.student_id == student_id)
    if batch_id or branch_id:
        q = q.join(models.Student, models.Fee.student_id == models.Student.id)
        if batch_id:
            q = q.filter(models.Student.batch_id == batch_id)
        if branch_id:
            q = q.join(models.Batch, models.Student.batch_id == models.Batch.id).filter(models.Batch.branch_id == branch_id)
    return q.order_by(models.Fee.billing_month.desc(), models.Fee.created_at.desc()).all()


# ---------- Announcements ----------
def create_announcement(db: Session, data: schemas.AnnouncementCreate) -> models.Announcement:
    if data.batch_id:
        batch = db.query(models.Batch).get(data.batch_id)
        if not batch:
            raise HTTPException(404, "Batch not found")
        if data.branch_id and batch.branch_id != data.branch_id:
            raise HTTPException(400, "Selected batch does not belong to the selected branch")
    elif data.branch_id and not db.query(models.Branch).get(data.branch_id):
        raise HTTPException(404, "Branch not found")

    ann = models.Announcement(**data.model_dump())
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


def _announcement_scope_filter(db: Session, batch_id: int):
    """An announcement is visible to a batch if it targets that exact
    batch, or every batch in that batch's branch, or everyone."""
    batch = db.query(models.Batch).get(batch_id)
    branch_id = batch.branch_id if batch else None
    return (
        (models.Announcement.batch_id == batch_id)
        | ((models.Announcement.batch_id.is_(None)) & (models.Announcement.branch_id == branch_id))
        | ((models.Announcement.batch_id.is_(None)) & (models.Announcement.branch_id.is_(None)))
    )


def list_announcements(db: Session, batch_id: Optional[int] = None) -> List[models.Announcement]:
    q = db.query(models.Announcement)
    if batch_id:
        q = q.filter(_announcement_scope_filter(db, batch_id))
    return q.order_by(models.Announcement.created_at.desc()).all()


def list_recent_announcements_since(db: Session, batch_id: Optional[int], after: datetime) -> List[models.Announcement]:
    """Used by the in-app notification banner's polling."""
    q = db.query(models.Announcement).filter(models.Announcement.created_at > after)
    if batch_id:
        q = q.filter(_announcement_scope_filter(db, batch_id))
    return q.order_by(models.Announcement.created_at.asc()).all()


def list_recent_pending_fees_since(db: Session, after: datetime) -> List[models.Fee]:
    """Used by the admin's in-app notification banner's polling."""
    return db.query(models.Fee).filter(models.Fee.created_at > after, models.Fee.status == "pending").order_by(models.Fee.created_at.asc()).all()


# ---------- Chat ----------
def post_chat_message(db: Session, data: schemas.ChatMessageCreate, sender_name: str, sender_role: str) -> models.ChatMessage:
    msg = models.ChatMessage(
        batch_id=data.batch_id,
        sender_name=sender_name,
        sender_role=sender_role,
        message=data.message,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


def broadcast_chat_message(db: Session, data: schemas.ChatBroadcastCreate, sender_name: str) -> List[models.ChatMessage]:
    """Admin sends one message to every batch in scope at once — a
    specific branch's batches, or literally everyone. Posts one row per
    target batch so each batch's normal chat feed (GET /chat/{batch_id})
    picks it up with no special handling needed."""
    if data.batch_id:
        batch_ids = [data.batch_id]
    elif data.branch_id:
        batch_ids = [b.id for b in db.query(models.Batch).filter(models.Batch.branch_id == data.branch_id).all()]
    else:
        batch_ids = [b.id for b in db.query(models.Batch).all()]
    if not batch_ids:
        raise HTTPException(404, "No batches found in that scope")

    created = []
    for bid in batch_ids:
        msg = models.ChatMessage(batch_id=bid, sender_name=sender_name, sender_role="admin", message=data.message)
        db.add(msg)
        created.append(msg)
    db.commit()
    for m in created:
        db.refresh(m)
    return created


def get_chat_messages(db: Session, batch_id: int) -> List[models.ChatMessage]:
    return (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.batch_id == batch_id)
        .order_by(models.ChatMessage.created_at.asc())
        .all()
    )


def get_chat_messages_scoped(db: Session, batch_id: Optional[int] = None, branch_id: Optional[int] = None, limit: int = 200) -> List[models.ChatMessage]:
    """Admin's aggregated view across a branch's batches, or everyone —
    merged by time, each message still tagged with its batch_id so the
    UI can show which batch it belongs to."""
    q = db.query(models.ChatMessage)
    if batch_id:
        q = q.filter(models.ChatMessage.batch_id == batch_id)
    elif branch_id:
        batch_ids = [b.id for b in db.query(models.Batch).filter(models.Batch.branch_id == branch_id).all()]
        q = q.filter(models.ChatMessage.batch_id.in_(batch_ids)) if batch_ids else q.filter(False)
    return q.order_by(models.ChatMessage.created_at.desc()).limit(limit).all()[::-1]


# ---------- Dashboards ----------
def admin_dashboard(db: Session) -> dict:
    total_students = db.query(models.Student).count()
    total_branches = db.query(models.Branch).count()
    total_batches = db.query(models.Batch).count()

    attendance_records = db.query(models.Attendance).filter(models.Attendance.is_final == True).all()  # noqa: E712
    present = sum(1 for a in attendance_records if a.status == "present")
    attendance_summary = {
        "total_marked": len(attendance_records),
        "present": present,
        "leave": len(attendance_records) - present,
    }

    fees = db.query(models.Fee).all()
    fee_summary = {
        "total_collected": sum(f.amount for f in fees if f.status == "approved"),
        "pending": sum(1 for f in fees if f.status == "pending"),
        "rejected": sum(1 for f in fees if f.status == "rejected"),
    }

    return {
        "total_students": total_students,
        "total_branches": total_branches,
        "total_batches": total_batches,
        "attendance_summary": attendance_summary,
        "fee_summary": fee_summary,
    }


def admin_dashboard_hierarchy(db: Session) -> dict:
    """Branch -> Batch breakdown of student count, this-month fee
    collection, and this-month attendance % — automatically the current
    month, since it's computed from utils.today_local() on every call."""
    today = utils.today_local()
    year, month = today.year, today.month
    billing_month = f"{year}-{month:02d}"
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    branches = []
    for branch in list_branches(db):
        batch_entries = []
        for batch in list_batches(db, branch.id):
            students = list_students(db, batch.id)
            student_ids = [s.id for s in students]
            student_count = len(students)

            fees_this_month = (
                db.query(models.Fee).filter(models.Fee.student_id.in_(student_ids), models.Fee.billing_month == billing_month).all()
                if student_ids else []
            )
            collected = sum(f.amount for f in fees_this_month if f.status == "approved")
            pending = sum(f.amount for f in fees_this_month if f.status in ("pending",))

            ensure_sessions_generated(db, batch.id, month_start, month_end)
            regular = count_pattern_occurrences(db, batch.id, month_start, month_end)
            sessions_in_range = db.query(models.ClassSession).filter(
                models.ClassSession.batch_id == batch.id, models.ClassSession.date >= month_start, models.ClassSession.date <= month_end,
            ).all()
            holiday = sum(1 for s in sessions_in_range if s.session_type == "holiday")
            compensation = sum(1 for s in sessions_in_range if s.session_type == "compensation")
            conducted = max(regular - holiday + compensation, 0)
            conducted_session_ids = [s.id for s in sessions_in_range if s.session_type in ("regular", "compensation")]

            present_count = 0
            if conducted_session_ids and student_ids:
                present_count = db.query(models.Attendance).filter(
                    models.Attendance.session_id.in_(conducted_session_ids),
                    models.Attendance.student_id.in_(student_ids),
                    models.Attendance.status == "present",
                    models.Attendance.is_final == True,  # noqa: E712
                ).count()
            denom = conducted * student_count
            attendance_percentage = round((present_count / denom) * 100, 1) if denom else 0.0

            batch_entries.append({
                "batch_id": batch.id, "batch_name": batch.name, "student_count": student_count,
                "fee_collected": collected, "fee_pending": pending,
                "attendance_percentage": attendance_percentage,
            })
        branches.append({"branch_id": branch.id, "branch_name": branch.name, "batches": batch_entries})

    return {"month_label": today.strftime("%B %Y"), "billing_month": billing_month, "branches": branches}


def assistant_dashboard(db: Session, batch_id: Optional[int]) -> dict:
    if not batch_id:
        return {"todays_batches": [], "todays_attendance": []}
    today = utils.today_local()
    today_records = (
        db.query(models.Attendance)
        .filter(models.Attendance.batch_id == batch_id, models.Attendance.date == today)
        .all()
    )
    batch = db.query(models.Batch).get(batch_id)
    return {
        "todays_batches": [batch.name] if batch else [],
        "todays_attendance": [{"student_id": r.student_id, "status": r.status} for r in today_records],
    }


def student_dashboard(db: Session, student: models.Student) -> dict:
    """Everything here is scoped to the current month, and automatically
    rolls to the next month once utils.today_local() crosses into it —
    no manual switch, nothing hardcoded."""
    today = utils.today_local()
    year, month = today.year, today.month
    billing_month = f"{year}-{month:02d}"
    month_start = date(year, month, 1)
    month_end = date(year, month, calendar.monthrange(year, month)[1])

    monthly = monthly_attendance(db, student.id, year, month)

    fees_this_month = [f for f in list_fees(db, student.id) if f.billing_month == billing_month]
    fee_status = fees_this_month[0].status if fees_this_month else "not_submitted"

    ensure_sessions_generated(db, student.batch_id, month_start, month_end)
    sessions_this_month = (
        db.query(models.ClassSession)
        .filter(
            models.ClassSession.batch_id == student.batch_id,
            models.ClassSession.date >= month_start, models.ClassSession.date <= month_end,
            models.ClassSession.session_type.in_(["regular", "compensation"]),
        )
        .order_by(models.ClassSession.date, models.ClassSession.start_time)
        .all()
    )

    announcements = list_announcements(db, student.batch_id)
    return {
        "month_label": today.strftime("%B %Y"),
        "billing_month": billing_month,
        "attendance_percentage": monthly.percentage,
        "fee_status": fee_status,
        "class_schedule": [schemas.SessionOut.model_validate(s).model_dump() for s in sessions_this_month],
        "announcements": [schemas.AnnouncementOut.model_validate(a).model_dump() for a in announcements[:5]],
    }


# ============================================================
# Exports — the database is always the source of truth; these just
# render its current state as a downloadable file on request, so there's
# never a second copy of the data to keep in sync.
# ============================================================
def export_students_xlsx(db: Session, batch_id: Optional[int] = None, branch_id: Optional[int] = None) -> bytes:
    from openpyxl import Workbook
    from io import BytesIO

    students = list_students_scoped(db, batch_id, branch_id)
    wb = Workbook()
    ws = wb.active
    ws.title = "Students"
    headers = [
        "Student Code", "Name", "Gender", "Date of Birth", "Parent Name", "Parent Mobile",
        "Student Mobile", "Address", "Branch", "Batch", "Joining Date", "Status",
    ]
    ws.append(headers)
    for s in students:
        batch = db.query(models.Batch).get(s.batch_id)
        branch = db.query(models.Branch).get(batch.branch_id) if batch else None
        ws.append([
            s.student_code, s.name, s.gender or "", str(s.date_of_birth or ""), s.parent_name or "",
            s.parent_mobile or "", s.student_mobile, s.address or "", branch.name if branch else "",
            batch.name if batch else "", str(s.joining_date or ""), s.status,
        ])
    for col in ws.columns:
        max_len = max((len(str(c.value)) for c in col if c.value), default=10)
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 2, 40)

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def export_students_json(db: Session, batch_id: Optional[int] = None, branch_id: Optional[int] = None) -> list:
    students = list_students_scoped(db, batch_id, branch_id)
    result = []
    for s in students:
        batch = db.query(models.Batch).get(s.batch_id)
        branch = db.query(models.Branch).get(batch.branch_id) if batch else None
        row = schemas.StudentOut.model_validate(s).model_dump(mode="json")
        row["branch_name"] = branch.name if branch else None
        row["batch_name"] = batch.name if batch else None
        result.append(row)
    return result


def export_monthly_report_xlsx(report: schemas.MonthlyReportOut) -> bytes:
    from openpyxl import Workbook
    from io import BytesIO

    wb = Workbook()
    ws = wb.active
    ws.title = "Monthly Report"
    rows = [
        ("Student Name", report.student_name),
        ("Student Code", report.student_code),
        ("Branch", report.branch_name),
        ("Batch", report.batch_name),
        ("Month", report.month_label),
        ("Total Scheduled Classes", report.total_scheduled),
        ("Classes Attended", report.attended),
        ("Classes Missed", report.missed),
        ("Prior-Approved Leaves", report.prior_leaves),
        ("Other Leaves", report.other_leaves),
        ("Attendance Percentage", f"{report.attendance_percentage}%"),
        ("Attendance Status", report.star.capitalize()),
        ("Finalized", "Yes" if report.is_finalized else "No — month still in progress"),
    ]
    for label, value in rows:
        ws.append([label, value])
    ws.column_dimensions["A"].width = 26
    ws.column_dimensions["B"].width = 28

    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()
