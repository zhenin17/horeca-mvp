from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_employer
from app.models.vacancy import Vacancy
from app.schemas.vacancy import MyEmployerVacancyCreate, VacancyRead
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


@router.post("/vacancies", response_model=VacancyRead, status_code=status.HTTP_201_CREATED)
def create_my_employer_vacancy(
    payload: MyEmployerVacancyCreate,
    current_user: CurrentUserContext = Depends(require_employer),
    db: Session = Depends(get_db),
):
    if not current_user.employer_id:
        raise HTTPException(status_code=403, detail="Employer profile required")

    vacancy = Vacancy(
        employer_id=current_user.employer_id,
        role=payload.role,
        venue_name=payload.venue_name,
        city=payload.city,
        district=payload.district,
        salary_text=payload.salary_text,
        schedule_text=payload.schedule_text,
        needed_start=payload.needed_start,
        listing_type=payload.listing_type,
        shift_date=payload.shift_date,
        shift_start_time=payload.shift_start_time,
        shift_end_time=payload.shift_end_time,
        urgent_flag=payload.urgent_flag,
        slots_count=payload.slots_count,
        status=payload.status,
    )

    db.add(vacancy)
    db.commit()
    db.refresh(vacancy)

    return (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .filter(Vacancy.id == vacancy.id)
        .first()
    )