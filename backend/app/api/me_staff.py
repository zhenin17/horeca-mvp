from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Body, Depends, HTTPException, Request
from sqlalchemy.orm import Session, joinedload, selectinload

from app.api.vacancy_candidate_matches import (
    can_transition_to,
    create_shift_event_if_needed,
    create_status_event,
    get_match_or_404,
    is_shift_match,
)
from app.core.db import get_db
from app.dependencies.auth import require_admin_or_moderator, require_staff
from app.dependencies.rate_limit import rate_limit_read, rate_limit_staff_action
from app.models.candidate import Candidate
from app.models.candidate_availability import CandidateAvailability
from app.models.candidate_photo import CandidatePhoto
from app.models.funnel_event import FunnelEvent
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.models.vacancy_photo import VacancyPhoto
from app.schemas.candidate import (
    CandidateAvailabilityRead,
    CandidatePhotoRead,
    CandidateRead,
)
from app.schemas.candidate_dashboard import CandidateDashboardRead
from app.schemas.funnel_event import FunnelEventRead
from app.schemas.reliability import CandidateReliabilityRead
from app.schemas.shortlist import VacancyFunnelRead, VacancyShortlistRead
from app.schemas.vacancy import VacancyPhotoRead, VacancyRead
from app.schemas.vacancy_candidate_match import (
    VacancyCandidateMatchRead,
    VacancyCandidateMatchWithCandidateRead,
)
from app.services.auth import CurrentUserContext
from app.services.reliability import calculate_candidate_reliability

router = APIRouter(prefix="/me/staff", tags=["Me Staff"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"


def get_candidate_or_404(candidate_id: int, db: Session) -> Candidate:
    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == candidate_id)
        .first()
    )

    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return candidate


def get_vacancy_or_404(vacancy_id: int, db: Session) -> Vacancy:
    vacancy = (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy_id)
        .first()
    )

    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    return vacancy


def delete_upload_file_if_local(photo_url: str) -> None:
    if not photo_url.startswith("/uploads/"):
        return

    uploads_root = UPLOADS_DIR.resolve()
    relative_path = photo_url.removeprefix("/uploads/")
    file_path = (UPLOADS_DIR / relative_path).resolve()

    try:
        file_path.relative_to(uploads_root)
    except ValueError:
        return

    if file_path.exists() and file_path.is_file():
        file_path.unlink()


def apply_staff_status_transition(
    match_id: int,
    new_status: str,
    db: Session,
) -> VacancyCandidateMatch:
    match = get_match_or_404(match_id, db)

    old_status = match.status
    shift_match = is_shift_match(db, match)

    if not can_transition_to(old_status, new_status, is_shift=shift_match):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {old_status} -> {new_status}",
        )

    match.status = new_status
    db.commit()
    db.refresh(match)

    create_status_event(db, match, old_status, new_status)

    if shift_match:
        create_shift_event_if_needed(db, match, new_status)

    db.commit()

    return match


@router.get("/candidates", response_model=list[CandidateRead])
def list_staff_candidates(
    request: Request,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .order_by(Candidate.id.desc())
        .all()
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateRead)
def get_staff_candidate(
    request: Request,
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    return get_candidate_or_404(candidate_id, db)


@router.get("/candidates/{candidate_id}/photos", response_model=list[CandidatePhotoRead])
def list_staff_candidate_photos(
    request: Request,
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    get_candidate_or_404(candidate_id, db)

    return (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .order_by(
            CandidatePhoto.is_cover.desc(),
            CandidatePhoto.sort_order.asc(),
            CandidatePhoto.id.asc(),
        )
        .all()
    )


@router.delete("/candidates/{candidate_id}/photos/{photo_id}")
def delete_staff_candidate_photo(
    request: Request,
    candidate_id: int,
    photo_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    get_candidate_or_404(candidate_id, db)

    photo = (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.id == photo_id)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .first()
    )

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    delete_upload_file_if_local(photo.photo_url)

    db.delete(photo)
    db.commit()

    return {"status": "ok"}


@router.get(
    "/candidates/{candidate_id}/availability",
    response_model=list[CandidateAvailabilityRead],
)
def list_staff_candidate_availability(
    request: Request,
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    get_candidate_or_404(candidate_id, db)

    return (
        db.query(CandidateAvailability)
        .filter(CandidateAvailability.candidate_id == candidate_id)
        .order_by(
            CandidateAvailability.available_date.asc(),
            CandidateAvailability.id.asc(),
        )
        .all()
    )


@router.get(
    "/candidates/{candidate_id}/dashboard",
    response_model=CandidateDashboardRead,
)
def get_staff_candidate_dashboard(
    request: Request,
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    candidate = get_candidate_or_404(candidate_id, db)

    matches = (
        db.query(VacancyCandidateMatch, Vacancy)
        .join(Vacancy, Vacancy.id == VacancyCandidateMatch.vacancy_id)
        .filter(VacancyCandidateMatch.candidate_id == candidate_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )

    items = []
    for match, vacancy in matches:
        items.append(
            {
                "match_id": match.id,
                "vacancy_id": vacancy.id,
                "employer_id": match.employer_id,
                "role": vacancy.role,
                "venue_name": vacancy.venue_name,
                "city": vacancy.city,
                "district": vacancy.district,
                "match_score": match.match_score,
                "status": match.status,
                "comment": match.comment,
            }
        )

    total_matches = len(items)
    active_statuses = {
        "shortlist",
        "sent",
        "viewed",
        "invited",
        "interviewed",
        "offered",
        "confirmed",
    }

    active_matches = len([item for item in items if item["status"] in active_statuses])
    hired_matches = len([item for item in items if item["status"] in {"hired", "worked"}])
    rejected_matches = len(
        [
            item
            for item in items
            if item["status"] in {"rejected", "no_show", "cancelled"}
        ]
    )

    return {
        "candidate_id": candidate.id,
        "full_name": candidate.full_name,
        "primary_role": candidate.primary_role,
        "city": candidate.city,
        "district": candidate.district,
        "ready_to_start": candidate.ready_to_start,
        "total_matches": total_matches,
        "active_matches": active_matches,
        "hired_matches": hired_matches,
        "rejected_matches": rejected_matches,
        "items": items,
    }


@router.get(
    "/candidates/{candidate_id}/reliability",
    response_model=CandidateReliabilityRead,
)
def get_staff_candidate_reliability(
    request: Request,
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    candidate = get_candidate_or_404(candidate_id, db)

    events = (
        db.query(FunnelEvent)
        .filter(FunnelEvent.candidate_id == candidate_id)
        .all()
    )

    summary = calculate_candidate_reliability(events)

    return {
        "candidate_id": candidate.id,
        **summary,
    }


@router.get("/vacancies", response_model=list[VacancyRead])
def list_staff_vacancies(
    request: Request,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .order_by(Vacancy.id.desc())
        .all()
    )


@router.get("/vacancies/{vacancy_id}", response_model=VacancyRead)
def get_staff_vacancy(
    request: Request,
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    return get_vacancy_or_404(vacancy_id, db)


@router.get(
    "/vacancies/{vacancy_id}/shortlist",
    response_model=VacancyShortlistRead,
)
def get_staff_vacancy_shortlist(
    request: Request,
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    vacancy = get_vacancy_or_404(vacancy_id, db)

    matches = (
        db.query(VacancyCandidateMatch)
        .options(joinedload(VacancyCandidateMatch.candidate))
        .filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )

    return {
        "vacancy_id": vacancy.id,
        "role": vacancy.role,
        "venue_name": vacancy.venue_name,
        "city": vacancy.city,
        "district": vacancy.district,
        "status": vacancy.status,
        "matches": matches,
    }


@router.get(
    "/vacancies/{vacancy_id}/funnel",
    response_model=VacancyFunnelRead,
)
def get_staff_vacancy_funnel(
    request: Request,
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    vacancy = get_vacancy_or_404(vacancy_id, db)

    matches = (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
        .all()
    )

    by_status = dict(Counter(match.status for match in matches))

    return {
        "vacancy_id": vacancy.id,
        "role": vacancy.role,
        "venue_name": vacancy.venue_name,
        "total_matches": len(matches),
        "by_status": by_status,
    }


@router.get("/vacancies/{vacancy_id}/photos", response_model=list[VacancyPhotoRead])
def list_staff_vacancy_photos(
    request: Request,
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    get_vacancy_or_404(vacancy_id, db)

    return (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
        .order_by(
            VacancyPhoto.is_cover.desc(),
            VacancyPhoto.sort_order.asc(),
            VacancyPhoto.id.asc(),
        )
        .all()
    )


@router.delete("/vacancies/{vacancy_id}/photos/{photo_id}")
def delete_staff_vacancy_photo(
    request: Request,
    vacancy_id: int,
    photo_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    get_vacancy_or_404(vacancy_id, db)

    photo = (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.id == photo_id)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
        .first()
    )

    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    delete_upload_file_if_local(photo.photo_url)

    db.delete(photo)
    db.commit()

    return {"status": "ok"}


@router.patch("/vacancies/{vacancy_id}/status", response_model=VacancyRead)
def update_staff_vacancy_status(
    request: Request,
    vacancy_id: int,
    status_value: str = Body(..., embed=True, alias="status"),
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    allowed_statuses = {"new", "in_progress", "closed", "archived"}

    if status_value not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid vacancy status")

    vacancy = get_vacancy_or_404(vacancy_id, db)
    vacancy.status = status_value

    db.commit()
    db.refresh(vacancy)

    return get_vacancy_or_404(vacancy_id, db)


@router.get("/matches", response_model=list[VacancyCandidateMatchWithCandidateRead])
def list_staff_matches(
    request: Request,
    vacancy_id: int | None = None,
    candidate_id: int | None = None,
    employer_id: int | None = None,
    status: str | None = None,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    query = db.query(VacancyCandidateMatch).options(
        selectinload(VacancyCandidateMatch.candidate).selectinload(Candidate.photos)
    )

    if vacancy_id is not None:
        query = query.filter(VacancyCandidateMatch.vacancy_id == vacancy_id)

    if candidate_id is not None:
        query = query.filter(VacancyCandidateMatch.candidate_id == candidate_id)

    if employer_id is not None:
        query = query.filter(VacancyCandidateMatch.employer_id == employer_id)

    if status is not None:
        query = query.filter(VacancyCandidateMatch.status == status)

    return query.order_by(VacancyCandidateMatch.id.desc()).all()


@router.post("/matches/{match_id}/send", response_model=VacancyCandidateMatchRead)
def staff_send_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "sent", db)


@router.post("/matches/{match_id}/view", response_model=VacancyCandidateMatchRead)
def staff_view_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "viewed", db)


@router.post("/matches/{match_id}/invite", response_model=VacancyCandidateMatchRead)
def staff_invite_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "invited", db)


@router.post("/matches/{match_id}/confirm", response_model=VacancyCandidateMatchRead)
def staff_confirm_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "confirmed", db)


@router.post("/matches/{match_id}/worked", response_model=VacancyCandidateMatchRead)
def staff_worked_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "worked", db)


@router.post("/matches/{match_id}/cancel", response_model=VacancyCandidateMatchRead)
def staff_cancel_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "cancelled", db)


@router.post("/matches/{match_id}/interview", response_model=VacancyCandidateMatchRead)
def staff_interview_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "interviewed", db)


@router.post("/matches/{match_id}/hire", response_model=VacancyCandidateMatchRead)
def staff_hire_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "hired", db)


@router.post("/matches/{match_id}/reject", response_model=VacancyCandidateMatchRead)
def staff_reject_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "rejected", db)


@router.post("/matches/{match_id}/no-show", response_model=VacancyCandidateMatchRead)
def staff_no_show_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    return apply_staff_status_transition(match_id, "no_show", db)


@router.post("/matches/{match_id}/reopen", response_model=VacancyCandidateMatchRead)
def staff_reopen_match(
    request: Request,
    match_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
    rate_limit_staff_action(request, user_id=current_user.telegram_user_id)

    match = get_match_or_404(match_id, db)

    old_status = match.status

    if old_status not in {"rejected", "no_show", "hired", "worked", "cancelled"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {old_status} -> shortlist",
        )

    match.status = "shortlist"
    db.commit()
    db.refresh(match)

    create_status_event(db, match, old_status, "shortlist")
    db.commit()

    return match


@router.get("/events", response_model=list[FunnelEventRead])
def list_staff_events(
    request: Request,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    rate_limit_read(request, user_id=current_user.telegram_user_id)

    return db.query(FunnelEvent).order_by(FunnelEvent.id.desc()).all()
