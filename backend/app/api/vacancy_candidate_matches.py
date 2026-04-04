from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.funnel_event import FunnelEvent
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import (
    VacancyCandidateMatchCreate,
    VacancyCandidateMatchRead,
    VacancyCandidateMatchUpdate,
)

router = APIRouter(prefix="/matches", tags=["Matches"])


@router.post("/", response_model=VacancyCandidateMatchRead)
def create_match(payload: VacancyCandidateMatchCreate, db: Session = Depends(get_db)):
    match = VacancyCandidateMatch(
        candidate_id=payload.candidate_id,
        employer_id=payload.employer_id,
        vacancy_id=payload.vacancy_id,
        match_score=payload.match_score,
        status=payload.status,
        comment=payload.comment,
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    event = FunnelEvent(
        candidate_id=payload.candidate_id,
        employer_id=payload.employer_id,
        vacancy_id=payload.vacancy_id,
        event_type="match_created",
        event_source="api",
        comment=f"match_id={match.id}",
    )
    db.add(event)
    db.commit()

    return match


@router.get("/", response_model=list[VacancyCandidateMatchRead])
def list_matches(
    vacancy_id: Optional[int] = None,
    candidate_id: Optional[int] = None,
    db: Session = Depends(get_db),
):
    query = db.query(VacancyCandidateMatch)

    if vacancy_id is not None:
        query = query.filter(VacancyCandidateMatch.vacancy_id == vacancy_id)

    if candidate_id is not None:
        query = query.filter(VacancyCandidateMatch.candidate_id == candidate_id)

    return query.order_by(VacancyCandidateMatch.id.desc()).all()


@router.patch("/{match_id}", response_model=VacancyCandidateMatchRead)
def update_match(match_id: int, payload: VacancyCandidateMatchUpdate, db: Session = Depends(get_db)):
    match = db.query(VacancyCandidateMatch).filter(VacancyCandidateMatch.id == match_id).first()

    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    old_status = match.status

    if payload.status is not None:
        match.status = payload.status
    if payload.match_score is not None:
        match.match_score = payload.match_score
    if payload.comment is not None:
        match.comment = payload.comment

    db.commit()
    db.refresh(match)

    if payload.status is not None and payload.status != old_status:
        event = FunnelEvent(
            candidate_id=match.candidate_id,
            employer_id=match.employer_id,
            vacancy_id=match.vacancy_id,
            event_type="match_status_changed",
            event_source="api",
            comment=f"match_id={match.id}; {old_status} -> {match.status}",
        )
        db.add(event)
        db.commit()

    return match