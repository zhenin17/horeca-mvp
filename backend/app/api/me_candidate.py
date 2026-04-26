from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate"])


class CandidateUpdateMe(BaseModel):
    full_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    district: str | None = None
    primary_role: str
    horeca_experience_months: int = 0
    ready_to_start: str
    expected_income: str | None = None


@router.get("", response_model=CandidateRead)
def get_my_candidate_profile(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == current_user.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("", response_model=CandidateRead)
def update_my_candidate_profile(
    payload: CandidateUpdateMe,
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == current_user.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.full_name = payload.full_name.strip()
    candidate.phone = payload.phone.strip()
    candidate.telegram_username = (
        payload.telegram_username.strip() if payload.telegram_username else None
    )
    candidate.city = payload.city.strip()
    candidate.district = payload.district.strip() if payload.district else None
    candidate.primary_role = payload.primary_role.strip()
    candidate.horeca_experience_months = max(0, int(payload.horeca_experience_months or 0))
    candidate.ready_to_start = payload.ready_to_start.strip()
    candidate.expected_income = (
        payload.expected_income.strip() if payload.expected_income else None
    )

    db.commit()
    db.refresh(candidate)

    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == current_user.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    return candidate