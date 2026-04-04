from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import (
    VacancyCandidateMatchCreate,
    VacancyCandidateMatchRead,
)

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.post("/", response_model=VacancyCandidateMatchRead)
def create_match(payload: VacancyCandidateMatchCreate, db: Session = Depends(get_db)):
    match = VacancyCandidateMatch(
        candidate_id=payload.candidate_id,
        employer_id=payload.employer_id,
        vacancy_id=payload.vacancy_id,
        match_score=payload.match_score,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/", response_model=list[VacancyCandidateMatchRead])
def list_matches(db: Session = Depends(get_db)):
    return db.query(VacancyCandidateMatch).order_by(VacancyCandidateMatch.id.desc()).all()