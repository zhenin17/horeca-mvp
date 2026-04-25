from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.models.vacancy import Vacancy
from app.schemas.vacancy import VacancyPhotoRead
from app.services.auth import CurrentUserContext
from app.services.scoring import calculate_candidate_vacancy_score

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Vacancies"])


@router.get("/vacancies")
def list_my_candidate_vacancies(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(Candidate)
        .filter(Candidate.id == current_user.candidate_id)
        .first()
    )

    if not candidate:
        return {
            "candidate_id": current_user.candidate_id,
            "full_name": "",
            "suggested_vacancies": [],
        }

    vacancies = (
        db.query(Vacancy)
        .options(selectinload(Vacancy.photos))
        .order_by(Vacancy.id.desc())
        .all()
    )

    suggested_vacancies = []

    for vacancy in vacancies:
        score = calculate_candidate_vacancy_score(candidate, vacancy)

        suggested_vacancies.append(
            {
                "id": vacancy.id,
                "vacancy_id": vacancy.id,
                "employer_id": vacancy.employer_id,
                "role": vacancy.role,
                "venue_name": vacancy.venue_name,
                "city": vacancy.city,
                "district": vacancy.district,
                "salary_text": vacancy.salary_text,
                "schedule_text": vacancy.schedule_text,
                "needed_start": vacancy.needed_start,
                "listing_type": vacancy.listing_type,
                "shift_date": vacancy.shift_date,
                "shift_start_time": vacancy.shift_start_time,
                "shift_end_time": vacancy.shift_end_time,
                "urgent_flag": vacancy.urgent_flag,
                "slots_count": vacancy.slots_count,
                "status": vacancy.status,
                "score": score,
                "match_score": score,
                "photos": [
                    VacancyPhotoRead.model_validate(photo).model_dump()
                    for photo in (vacancy.photos or [])
                ],
            }
        )

    return {
        "candidate_id": candidate.id,
        "full_name": candidate.full_name,
        "suggested_vacancies": suggested_vacancies,
    }