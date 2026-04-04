from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateCreate, CandidateRead

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("/", response_model=CandidateRead)
def create_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
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
    return candidate


@router.get("/", response_model=list[CandidateRead])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).order_by(Candidate.id.desc()).all()