from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.models.vacancy import Vacancy
from app.services.auth import CurrentUserContext
from app.services.scoring import calculate_final_match_score

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Vacancies"])


@router.get("/vacancies")
def get_my_candidate_suggested_vacancies(
    limit: int = 10,
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = db.query(Candidate).filter(Candidate.id == current_user.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

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