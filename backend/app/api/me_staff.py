from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_admin_or_moderator, require_staff
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
from app.schemas.vacancy import VacancyPhotoRead, VacancyRead
from app.schemas.vacancy_candidate_match import VacancyCandidateMatchWithCandidateRead
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

    relative_path = photo_url.removeprefix("/uploads/")
    file_path = UPLOADS_DIR / relative_path

    if file_path.exists() and file_path.is_file():
        file_path.unlink()


@router.get("/candidates", response_model=list[CandidateRead])
def list_staff_candidates(
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .order_by(Candidate.id.desc())
        .all()
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateRead)
def get_staff_candidate(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return get_candidate_or_404(candidate_id, db)


@router.get("/candidates/{candidate_id}/photos", response_model=list[CandidatePhotoRead])
def list_staff_candidate_photos(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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
    candidate_id: int,
    photo_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
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
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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
    candidate_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .order_by(Vacancy.id.desc())
        .all()
    )


@router.get("/vacancies/{vacancy_id}", response_model=VacancyRead)
def get_staff_vacancy(
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return get_vacancy_or_404(vacancy_id, db)


@router.get("/vacancies/{vacancy_id}/photos", response_model=list[VacancyPhotoRead])
def list_staff_vacancy_photos(
    vacancy_id: int,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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
    vacancy_id: int,
    photo_id: int,
    current_user: CurrentUserContext = Depends(require_admin_or_moderator),
    db: Session = Depends(get_db),
):
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


@router.get("/matches", response_model=list[VacancyCandidateMatchWithCandidateRead])
def list_staff_matches(
    vacancy_id: int | None = None,
    candidate_id: int | None = None,
    employer_id: int | None = None,
    status: str | None = None,
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
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


@router.get("/events", response_model=list[FunnelEventRead])
def list_staff_events(
    current_user: CurrentUserContext = Depends(require_staff),
    db: Session = Depends(get_db),
):
    return db.query(FunnelEvent).order_by(FunnelEvent.id.desc()).all()