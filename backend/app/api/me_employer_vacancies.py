from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_employer
from app.models.vacancy import Vacancy
from app.schemas.vacancy import VacancyRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/employer", tags=["Me Employer Vacancies"])


@router.get("/vacancies", response_model=list[VacancyRead])
def list_my_employer_vacancies(
    current_user: CurrentUserContext = Depends(require_employer),
    db: Session = Depends(get_db),
):
    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.employer_id == current_user.employer_id)
        .order_by(Vacancy.id.desc())
        .all()
    )