from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.candidate_dashboard import CandidateDashboardRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Dashboard"])


@router.get("/dashboard", response_model=CandidateDashboardRead)
def get_my_candidate_dashboard(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = db.query(Candidate).filter(Candidate.id == current_user.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    matches = (
        db.query(VacancyCandidateMatch, Vacancy)
        .join(Vacancy, Vacancy.id == VacancyCandidateMatch.vacancy_id)
        .filter(VacancyCandidateMatch.candidate_id == current_user.candidate_id)
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