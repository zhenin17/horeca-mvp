from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.shortlist import VacancyShortlistRead

router = APIRouter(prefix="/shortlists", tags=["Shortlists"])


@router.get("/vacancy/{vacancy_id}", response_model=VacancyShortlistRead)
def get_vacancy_shortlist(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    matches = (
        db.query(VacancyCandidateMatch)
        .options(joinedload(VacancyCandidateMatch.candidate))
        .filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )

    return {
        "vacancy_id": vacancy.id,
        "role": vacancy.role,
        "venue_name": vacancy.venue_name,
        "city": vacancy.city,
        "district": vacancy.district,
        "status": vacancy.status,
        "matches": matches,
    }