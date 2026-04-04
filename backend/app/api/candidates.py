from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.candidate import Candidate
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.candidate import CandidateCreate, CandidateRead
from app.services.scoring import calculate_final_match_score

router = APIRouter(prefix="/candidates", tags=["Candidates"])


@router.post("/", response_model=CandidateRead)
def create_candidate(payload: CandidateCreate, db: Session = Depends(get_db)):
    candidate = Candidate(
        full_name=payload.full_name,
        phone=payload.phone,
        telegram_username=payload.telegram_username,
        city=payload.city,
        district=payload.district,
        primary_role=payload.primary_role,
        horeca_experience_months=payload.horeca_experience_months,
        ready_to_start=payload.ready_to_start,
        expected_income=payload.expected_income,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/", response_model=list[CandidateRead])
def list_candidates(db: Session = Depends(get_db)):
    return db.query(Candidate).order_by(Candidate.id.desc()).all()


@router.get("/{candidate_id}", response_model=CandidateRead)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("/{candidate_id}", response_model=CandidateRead)
def update_candidate(candidate_id: int, payload: CandidateCreate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    candidate.full_name = payload.full_name
    candidate.phone = payload.phone
    candidate.telegram_username = payload.telegram_username
    candidate.city = payload.city
    candidate.district = payload.district
    candidate.primary_role = payload.primary_role
    candidate.horeca_experience_months = payload.horeca_experience_months
    candidate.ready_to_start = payload.ready_to_start
    candidate.expected_income = payload.expected_income

    db.commit()
    db.refresh(candidate)
    return candidate


@router.get("/{candidate_id}/matches")
def get_candidate_matches(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    matches = (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.candidate_id == candidate_id)
        .order_by(VacancyCandidateMatch.id.desc())
        .all()
    )

    return matches


@router.get("/{candidate_id}/suggested-vacancies")
def get_candidate_suggested_vacancies(candidate_id: int, limit: int = 10, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
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