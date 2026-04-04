from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.candidate import Candidate
from app.models.funnel_event import FunnelEvent
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.application import CandidateApplyCreate
from app.schemas.vacancy import VacancyCreate, VacancyRead
from app.services.scoring import calculate_final_match_score

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


@router.get("/", response_model=list[VacancyRead])
def list_vacancies(db: Session = Depends(get_db)):
    return db.query(Vacancy).order_by(Vacancy.id.desc()).all()


@router.post("/{vacancy_id}/apply")
def apply_to_vacancy(vacancy_id: int, payload: CandidateApplyCreate, db: Session = Depends(get_db)):
    if payload.vacancy_id != vacancy_id:
        raise HTTPException(status_code=400, detail="vacancy_id mismatch")

    candidate = db.query(Candidate).filter(Candidate.id == payload.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    existing_match = (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.candidate_id == candidate.id)
        .filter(VacancyCandidateMatch.vacancy_id == vacancy.id)
        .first()
    )
    if existing_match:
        raise HTTPException(status_code=400, detail="Candidate already applied to this vacancy")

    score = calculate_final_match_score(candidate, vacancy)

    match = VacancyCandidateMatch(
        candidate_id=candidate.id,
        employer_id=vacancy.employer_id,
        vacancy_id=vacancy.id,
        match_score=score,
        status="shortlist",
        comment=payload.comment,
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    event = FunnelEvent(
        candidate_id=candidate.id,
        employer_id=vacancy.employer_id,
        vacancy_id=vacancy.id,
        event_type="candidate_applied",
        event_source="candidate_api",
        comment=f"match_id={match.id}",
    )
    db.add(event)
    db.commit()

    return {
        "status": "ok",
        "match_id": match.id,
        "candidate_id": candidate.id,
        "vacancy_id": vacancy.id,
        "match_score": match.match_score,
        "match_status": match.status,
    }