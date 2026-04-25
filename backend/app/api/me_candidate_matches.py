from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import VacancyCandidateMatchRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Matches"])


@router.get("/matches", response_model=list[VacancyCandidateMatchRead])
def get_my_candidate_matches(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    return (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.candidate_id == current_user.candidate_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )