from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.db import get_db
from app.models.candidate import Candidate
from app.models.funnel_event import FunnelEvent
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.models.vacancy_photo import VacancyPhoto
from app.schemas.application import CandidateApplyCreate
from app.schemas.vacancy import VacancyCreate, VacancyPhotoCreate, VacancyPhotoRead, VacancyRead
from app.services.scoring import calculate_final_match_score

router = APIRouter(prefix="/vacancies", tags=["Vacancies"])

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
VACANCY_UPLOADS_DIR = UPLOADS_DIR / "vacancies"


@router.post("/", response_model=VacancyRead)
def create_vacancy(payload: VacancyCreate, db: Session = Depends(get_db)):
    vacancy = Vacancy(
        employer_id=payload.employer_id,
        role=payload.role,
        venue_name=payload.venue_name,
        city=payload.city,
        district=payload.district,
        salary_text=payload.salary_text,
        schedule_text=payload.schedule_text,
        needed_start=payload.needed_start,
        listing_type=payload.listing_type,
        shift_date=payload.shift_date,
        shift_start_time=payload.shift_start_time,
        shift_end_time=payload.shift_end_time,
        urgent_flag=payload.urgent_flag,
        slots_count=payload.slots_count,
        status=payload.status,
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy.id)
        .first()
    )


@router.get("/", response_model=list[VacancyRead])
def list_vacancies(db: Session = Depends(get_db)):
    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .order_by(Vacancy.id.desc())
        .all()
    )


@router.get("/{vacancy_id}", response_model=VacancyRead)
def get_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy_id)
        .first()
    )
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")
    return vacancy


@router.post("/{vacancy_id}/close", response_model=VacancyRead)
def close_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    vacancy.status = "closed"
    db.commit()

    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy_id)
        .first()
    )


@router.post("/{vacancy_id}/archive", response_model=VacancyRead)
def archive_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    vacancy.status = "archived"
    db.commit()

    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy_id)
        .first()
    )


@router.post("/{vacancy_id}/reopen", response_model=VacancyRead)
def reopen_vacancy(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    vacancy.status = "in_progress"
    db.commit()

    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy_id)
        .first()
    )


@router.get("/{vacancy_id}/photos", response_model=list[VacancyPhotoRead])
def list_vacancy_photos(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    return (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
        .order_by(VacancyPhoto.is_cover.desc(), VacancyPhoto.sort_order.asc(), VacancyPhoto.id.asc())
        .all()
    )


@router.post("/{vacancy_id}/photos", response_model=VacancyPhotoRead)
def add_vacancy_photo(vacancy_id: int, payload: VacancyPhotoCreate, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    existing_count = (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
        .count()
    )
    if existing_count >= 1:
        raise HTTPException(status_code=400, detail="Only 1 photo is allowed for this vacancy")

    if payload.is_cover:
        (
            db.query(VacancyPhoto)
            .filter(VacancyPhoto.vacancy_id == vacancy_id)
            .update({"is_cover": False}, synchronize_session=False)
        )

    photo = VacancyPhoto(
        vacancy_id=vacancy_id,
        photo_url=payload.photo_url,
        sort_order=payload.sort_order,
        is_cover=payload.is_cover,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.post("/{vacancy_id}/photos/upload", response_model=VacancyPhotoRead)
async def upload_vacancy_photo(
    vacancy_id: int,
    file: UploadFile = File(...),
    is_cover: bool = False,
    sort_order: int = 0,
    db: Session = Depends(get_db),
):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is empty")

    existing_count = (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
        .count()
    )
    if existing_count >= 1:
        raise HTTPException(status_code=400, detail="Only 1 photo is allowed for this vacancy")

    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/jpg"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WEBP are allowed")

    vacancy_dir = VACANCY_UPLOADS_DIR / str(vacancy_id)
    vacancy_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename).suffix.lower() or ".jpg"
    filename = f"{uuid4().hex}{ext}"
    file_path = vacancy_dir / filename

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

    photo_url = f"/uploads/vacancies/{vacancy_id}/{filename}"

    if is_cover:
        (
            db.query(VacancyPhoto)
            .filter(VacancyPhoto.vacancy_id == vacancy_id)
            .update({"is_cover": False}, synchronize_session=False)
        )

    photo = VacancyPhoto(
        vacancy_id=vacancy_id,
        photo_url=photo_url,
        sort_order=sort_order,
        is_cover=is_cover,
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return photo


@router.delete("/{vacancy_id}/photos/{photo_id}")
def delete_vacancy_photo(vacancy_id: int, photo_id: int, db: Session = Depends(get_db)):
    photo = (
        db.query(VacancyPhoto)
        .filter(VacancyPhoto.id == photo_id)
        .filter(VacancyPhoto.vacancy_id == vacancy_id)
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


@router.post("/{vacancy_id}/apply")
def apply_to_vacancy(
    vacancy_id: int,
    payload: CandidateApplyCreate,
    db: Session = Depends(get_db),
):
    if payload.vacancy_id != vacancy_id:
        raise HTTPException(status_code=400, detail="vacancy_id mismatch")

    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    if vacancy.status in {"closed", "archived"}:
        raise HTTPException(
            status_code=400,
            detail="Vacancy is not accepting applications",
        )

    existing_match = (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.candidate_id == candidate.id)
        .filter(VacancyCandidateMatch.vacancy_id == vacancy.id)
        .first()
    )
    if existing_match:
        raise HTTPException(status_code=400, detail="Candidate already applied to this vacancy")

    score = calculate_final_match_score(candidate, vacancy)

    match = VacancyCandidateMatch(
        candidate_id=candidate.id,
        employer_id=vacancy.employer_id,
        vacancy_id=vacancy.id,
        match_score=score,
        status="shortlist",
        comment=payload.comment,
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    event = FunnelEvent(
        candidate_id=candidate.id,
        employer_id=vacancy.employer_id,
        vacancy_id=vacancy.id,
        event_type="candidate_applied",
        event_source="candidate_api",
        comment=f"match_id={match.id}",
    )
    db.add(event)
    db.commit()

    return {
        "status": "ok",
        "match_id": match.id,
        "candidate_id": candidate.id,
        "vacancy_id": vacancy.id,
        "match_score": match.match_score,
        "match_status": match.status,
    }