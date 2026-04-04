from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.vacancy import Vacancy
from app.schemas.vacancy import VacancyCreate, VacancyRead

router = APIRouter(prefix="/vacancies", tags=["Vacancies"])


@router.post("/", response_model=VacancyRead)
def create_vacancy(payload: VacancyCreate, db: Session = Depends(get_db)):
    vacancy = Vacancy(
        employer_id=payload.employer_id,
        role=payload.role,
        venue_name=payload.venue_name,
        city=payload.city,
        district=payload.district,
        salary_text=payload.salary_text,
        schedule_text=payload.schedule_text,
        needed_start=payload.needed_start,
        status=payload.status,
    )
    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)
    return vacancy