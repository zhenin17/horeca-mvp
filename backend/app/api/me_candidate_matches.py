from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import (
    CandidateEmployerContactRead,
    VacancyCandidateMatchWithVacancyRead,
)
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Matches"])

CONTACT_OPEN_STATUSES = {
    "invited",
    "contact_opened",
    "interviewed",
    "offered",
    "hired",
}


def should_show_employer_contact(status: str) -> bool:
    return status in CONTACT_OPEN_STATUSES


@router.get("/matches", response_model=list[VacancyCandidateMatchWithVacancyRead])
def get_my_candidate_matches(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    matches = (
        db.query(VacancyCandidateMatch)
        .options(
            joinedload(VacancyCandidateMatch.vacancy),
            joinedload(VacancyCandidateMatch.employer),
        )
        .filter(VacancyCandidateMatch.candidate_id == current_user.candidate_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )

    result: list[VacancyCandidateMatchWithVacancyRead] = []

    for match in matches:
        employer_contact = None

        if should_show_employer_contact(match.status) and match.employer:
            employer_contact = CandidateEmployerContactRead(
                company_name=match.employer.company_name,
                contact_name=match.employer.contact_name,
                phone=match.employer.phone,
                telegram_username=match.employer.telegram_username,
            )

        result.append(
            VacancyCandidateMatchWithVacancyRead(
                id=match.id,
                candidate_id=match.candidate_id,
                employer_id=match.employer_id,
                vacancy_id=match.vacancy_id,
                match_score=match.match_score,
                status=match.status,
                comment=match.comment,
                vacancy=match.vacancy,
                employer_contact=employer_contact,
            )
        )

    return result