from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate_availability import CandidateAvailability
from app.schemas.candidate import CandidateAvailabilityCreate, CandidateAvailabilityRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Availability"])

ALLOWED_SLOT_TYPES = {"morning", "day", "evening", "night", "full_day"}


@router.get("/availability", response_model=list[CandidateAvailabilityRead])
def list_my_candidate_availability(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    return (
        db.query(CandidateAvailability)
        .filter(CandidateAvailability.candidate_id == current_user.candidate_id)
        .order_by(
            CandidateAvailability.available_date.asc(),
            CandidateAvailability.id.asc(),
        )
        .all()
    )


@router.post("/availability", response_model=CandidateAvailabilityRead)
def create_my_candidate_availability(
    payload: CandidateAvailabilityCreate,
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    if payload.slot_type not in ALLOWED_SLOT_TYPES:
        raise HTTPException(status_code=400, detail="Invalid slot_type")

    availability = CandidateAvailability(
        candidate_id=current_user.candidate_id,
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


@router.delete("/availability/{availability_id}")
def delete_my_candidate_availability(
    availability_id: int,
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    availability = (
        db.query(CandidateAvailability)
        .filter(CandidateAvailability.id == availability_id)
        .filter(CandidateAvailability.candidate_id == current_user.candidate_id)
        .first()
    )
    if not availability:
        raise HTTPException(status_code=404, detail="Availability not found")

    db.delete(availability)
    db.commit()
    return {"status": "ok"}