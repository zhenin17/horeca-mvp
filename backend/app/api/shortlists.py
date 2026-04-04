from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.models.vacancy import Vacancy
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.shortlist import VacancyFunnelRead, VacancyShortlistRead

ACTIVE_MATCH_STATUSES = {"shortlist", "sent", "viewed", "invited", "interviewed", "offered"}

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


@router.get("/vacancy/{vacancy_id}/active", response_model=VacancyShortlistRead)
def get_active_vacancy_shortlist(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    matches = (
        db.query(VacancyCandidateMatch)
        .options(joinedload(VacancyCandidateMatch.candidate))
        .filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
        .filter(VacancyCandidateMatch.status.in_(ACTIVE_MATCH_STATUSES))
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


@router.get("/vacancy/{vacancy_id}/funnel", response_model=VacancyFunnelRead)
def get_vacancy_funnel(vacancy_id: int, db: Session = Depends(get_db)):
    vacancy = db.query(Vacancy).filter(Vacancy.id == vacancy_id).first()
    if not vacancy:
        raise HTTPException(status_code=404, detail="Vacancy not found")

    matches = (
        db.query(VacancyCandidateMatch)
        .filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
        .all()
    )

    by_status = dict(Counter(match.status for match in matches))

    return {
        "vacancy_id": vacancy.id,
        "role": vacancy.role,
        "venue_name": vacancy.venue_name,
        "total_matches": len(matches),
        "by_status": by_status,
    }


@router.get("/employer/{employer_id}")
def get_employer_shortlists(employer_id: int, db: Session = Depends(get_db)):
    vacancies = db.query(Vacancy).filter(Vacancy.employer_id == employer_id).order_by(Vacancy.id.desc()).all()

    result = []
    for vacancy in vacancies:
        matches = (
            db.query(VacancyCandidateMatch)
            .options(joinedload(VacancyCandidateMatch.candidate))
            .filter(VacancyCandidateMatch.vacancy_id == vacancy.id)
            .order_by(VacancyCandidateMatch.id.desc())
            .all()
        )

        result.append(
            {
                "vacancy_id": vacancy.id,
                "role": vacancy.role,
                "venue_name": vacancy.venue_name,
                "city": vacancy.city,
                "district": vacancy.district,
                "status": vacancy.status,
                "matches": matches,
            }
        )

    return result