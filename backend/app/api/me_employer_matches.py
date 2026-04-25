from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_employer
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import VacancyCandidateMatchWithCandidateRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/employer", tags=["Me Employer Matches"])


@router.get("/matches", response_model=list[VacancyCandidateMatchWithCandidateRead])
def get_my_employer_matches(
    current_user: CurrentUserContext = Depends(require_employer),
    db: Session = Depends(get_db),
):
    return (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.employer_id == current_user.employer_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )