from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.db import get_db
from app.dependencies.auth import get_current_user, require_admin
from app.models.candidate import Candidate
from app.models.candidate_availability import CandidateAvailability
from app.models.candidate_photo import CandidatePhoto
from app.models.funnel_event import FunnelEvent
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.candidate import (
    CandidateAvailabilityCreate,
    CandidateAvailabilityRead,
    CandidateCreate,
    CandidatePhotoCreate,
    CandidatePhotoRead,
    CandidateRead,
)
from app.schemas.candidate_dashboard import CandidateDashboardRead
from app.schemas.reliability import CandidateReliabilityRead
from app.services.auth import CurrentUserContext
from app.services.reliability import calculate_candidate_reliability
from app.services.scoring import calculate_final_match_score

router = APIRouter(prefix="/candidates", tags=["Candidates"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
CANDIDATE_UPLOADS_DIR = UPLOADS_DIR / "candidates"

ALLOWED_SLOT_TYPES = {"morning", "day", "evening", "night", "full_day"}


def require_candidate_owner_or_admin(
    candidate_id: int,
    current_user: CurrentUserContext,
    db: Session,
) -> Candidate:
    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    if current_user.is_admin:
        return candidate

    if not current_user.is_candidate or current_user.candidate_id is None:
        raise HTTPException(status_code=403, detail="Candidate or admin access required")

    if current_user.candidate_id != candidate_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return candidate


@router.post("/", response_model=CandidateRead)
def create_candidate(
    payload: CandidateCreate,
    current_user: CurrentUserContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    candidate = Candidate(
        full_name=payload.full_name,
        phone=payload.phone,
        telegram_username=payload.telegram_username,
        city=payload.city,
        district=payload.district,
        primary_role=payload.primary_role,
        horeca_experience_months=payload.horeca_experience_months,
        ready_to_start=payload.ready_to_start,
        expected_income=payload.expected_income,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == candidate.id)
        .first()
    )


@router.get("/", response_model=list[CandidateRead])
def list_candidates(
    current_user: CurrentUserContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .order_by(Candidate.id.desc())
        .all()
    )


@router.get("/{candidate_id}", response_model=CandidateRead)
def get_candidate(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = require_candidate_owner_or_admin(candidate_id, current_user, db)
    return candidate


@router.patch("/{candidate_id}", response_model=CandidateRead)
def update_candidate(
    candidate_id: int,
    payload: CandidateCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = require_candidate_owner_or_admin(candidate_id, current_user, db)

    candidate.full_name = payload.full_name
    candidate.phone = payload.phone
    candidate.telegram_username = payload.telegram_username
    candidate.city = payload.city
    candidate.district = payload.district
    candidate.primary_role = payload.primary_role
    candidate.horeca_experience_months = payload.horeca_experience_months
    candidate.ready_to_start = payload.ready_to_start
    candidate.expected_income = payload.expected_income

    db.commit()

    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == candidate_id)
        .first()
    )


@router.get("/{candidate_id}/availability", response_model=list[CandidateAvailabilityRead])
def list_candidate_availability(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    return (
        db.query(CandidateAvailability)
        .filter(CandidateAvailability.candidate_id == candidate_id)
        .order_by(
            CandidateAvailability.available_date.asc(),
            CandidateAvailability.id.asc(),
        )
        .all()
    )


@router.post("/{candidate_id}/availability", response_model=CandidateAvailabilityRead)
def create_candidate_availability(
    candidate_id: int,
    payload: CandidateAvailabilityCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    if payload.slot_type not in ALLOWED_SLOT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid slot_type")

    availability = CandidateAvailability(
        candidate_id=candidate_id,
        available_date=payload.available_date,
        slot_type=payload.slot_type,
        start_time=payload.start_time,
        end_time=payload.end_time,
        is_active=payload.is_active,
    )
    db.add(availability)
    db.commit()
    db.refresh(availability)
    return availability


@router.delete("/{candidate_id}/availability/{availability_id}")
def delete_candidate_availability(
    candidate_id: int,
    availability_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    availability = (
        db.query(CandidateAvailability)
        .filter(CandidateAvailability.id == availability_id)
        .filter(CandidateAvailability.candidate_id == candidate_id)
        .first()
    )
    if not availability:
        raise HTTPException(status_code=404, detail="Availability not found")

    db.delete(availability)
    db.commit()
    return {"status": "ok"}


@router.get("/{candidate_id}/photos", response_model=list[CandidatePhotoRead])
def list_candidate_photos(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    return (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .order_by(CandidatePhoto.is_cover.desc(), CandidatePhoto.sort_order.asc(), CandidatePhoto.id.asc())
        .all()
    )


@router.post("/{candidate_id}/photos", response_model=CandidatePhotoRead)
def add_candidate_photo(
    candidate_id: int,
    payload: CandidatePhotoCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    existing_count = (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .count()
    )
    if existing_count >= 1:
        raise HTTPException(status_code=400, detail="Only 1 photo is allowed for this candidate")

    if payload.is_cover:
        (
            db.query(CandidatePhoto)
            .filter(CandidatePhoto.candidate_id == candidate_id)
            .update({"is_cover": False}, synchronize_session=False)
        )

    photo = CandidatePhoto(
        candidate_id=candidate_id,
        photo_url=payload.photo_url,
        sort_order=payload.sort_order,
        is_cover=payload.is_cover,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.post("/{candidate_id}/photos/upload", response_model=CandidatePhotoRead)
async def upload_candidate_photo(
    candidate_id: int,
    file: UploadFile = File(...),
    is_cover: bool = False,
    sort_order: int = 0,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is empty")

    existing_count = (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .count()
    )
    if existing_count >= 1:
        raise HTTPException(status_code=400, detail="Only 1 photo is allowed for this candidate")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP are allowed")

    candidate_dir = CANDIDATE_UPLOADS_DIR / str(candidate_id)
    candidate_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    file_path = candidate_dir / filename

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(content) > max_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Max size is {settings.max_upload_size_mb} MB",
        )

    with open(file_path, "wb") as f:
        f.write(content)

    photo_url = f"/uploads/candidates/{candidate_id}/{filename}"

    if is_cover:
        (
            db.query(CandidatePhoto)
            .filter(CandidatePhoto.candidate_id == candidate_id)
            .update({"is_cover": False}, synchronize_session=False)
        )

    photo = CandidatePhoto(
        candidate_id=candidate_id,
        photo_url=photo_url,
        sort_order=sort_order,
        is_cover=is_cover,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{candidate_id}/photos/{photo_id}")
def delete_candidate_photo(
    candidate_id: int,
    photo_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    photo = (
        db.query(CandidatePhoto)
        .filter(CandidatePhoto.id == photo_id)
        .filter(CandidatePhoto.candidate_id == candidate_id)
        .first()
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    if photo.photo_url.startswith("/uploads/"):
        relative_path = photo.photo_url.removeprefix("/uploads/")
        file_path = UPLOADS_DIR / relative_path
        if file_path.exists() and file_path.is_file():
            file_path.unlink()

    db.delete(photo)
    db.commit()
    return {"status": "ok"}


@router.get("/{candidate_id}/matches")
def get_candidate_matches(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_candidate_owner_or_admin(candidate_id, current_user, db)

    return (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.candidate_id == candidate_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )


@router.get("/{candidate_id}/suggested-vacancies")
def get_candidate_suggested_vacancies(
    candidate_id: int,
    limit: int = 10,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = require_candidate_owner_or_admin(candidate_id, current_user, db)

    vacancies = db.query(Vacancy).all()

    scored = []
    for vacancy in vacancies:
        score = calculate_final_match_score(candidate, vacancy)
        scored.append(
            {
                "vacancy_id": vacancy.id,
                "role": vacancy.role,
                "venue_name": vacancy.venue_name,
                "city": vacancy.city,
                "district": vacancy.district,
                "status": vacancy.status,
                "score": score,
            }
        )

    scored.sort(key=lambda item: item["score"], reverse=True)
    return {
        "candidate_id": candidate.id,
        "full_name": candidate.full_name,
        "suggested_vacancies": scored[:limit],
    }


@router.get("/{candidate_id}/dashboard", response_model=CandidateDashboardRead)
def get_candidate_dashboard(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = require_candidate_owner_or_admin(candidate_id, current_user, db)

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
    active_statuses = {"shortlist", "sent", "viewed", "invited", "interviewed", "offered"}
    active_matches = len([item for item in items if item["status"] in active_statuses])
    hired_matches = len([item for item in items if item["status"] == "hired"])
    rejected_matches = len([item for item in items if item["status"] in {"rejected", "no_show"}])

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


@router.get("/{candidate_id}/reliability", response_model=CandidateReliabilityRead)
def get_candidate_reliability(
    candidate_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    candidate = require_candidate_owner_or_admin(candidate_id, current_user, db)

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