from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.funnel_event import FunnelEvent
from app.models.vacancy_candidate_match import VacancyCandidateMatch
from app.schemas.vacancy_candidate_match import (
    VacancyCandidateMatchCreate,
    VacancyCandidateMatchRead,
    VacancyCandidateMatchUpdate,
    VacancyCandidateMatchWithCandidateRead,
)

router = APIRouter(prefix="/matches", tags=["Matches"])


def can_transition_to(current_status: str, new_status: str) -> bool:
    allowed_transitions = {
        "shortlist": {"sent", "viewed", "invited", "rejected"},
        "sent": {"viewed", "invited", "rejected"},
        "viewed": {"invited", "rejected"},
        "invited": {"interviewed", "rejected", "no_show"},
        "interviewed": {"hired", "rejected", "no_show"},
        "offered": {"hired", "rejected"},
        "hired": set(),
        "rejected": set(),
        "no_show": set(),
    }

    return new_status in allowed_transitions.get(current_status, set())


def create_status_event(
    db: Session,
    match: VacancyCandidateMatch,
    old_status: str,
    new_status: str,
) -> None:
    event = FunnelEvent(
        candidate_id=match.candidate_id,
        employer_id=match.employer_id,
        vacancy_id=match.vacancy_id,
        event_type="match_status_changed",
        event_source="api",
        comment=f"match_id={match.id}; {old_status} -> {new_status}",
    )
    db.add(event)


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
        candidate_id=match.candidate_id,
        employer_id=match.employer_id,
        vacancy_id=match.vacancy_id,
        event_type="match_created",
        event_source="api",
        comment=f"match_id={match.id}; score={match.match_score or 0}",
    )
    db.add(event)
    db.commit()

    return match


@router.get("/", response_model=list[VacancyCandidateMatchWithCandidateRead])
def list_matches(
    vacancy_id: int | None = None,
    candidate_id: int | None = None,
    employer_id: int | None = None,
    status: str | None = None,
    db: Session = Depends(get_db),
):
    query = db.query(VacancyCandidateMatch)

    if vacancy_id is not None:
        query = query.filter(VacancyCandidateMatch.vacancy_id == vacancy_id)
    if candidate_id is not None:
        query = query.filter(VacancyCandidateMatch.candidate_id == candidate_id)
    if employer_id is not None:
        query = query.filter(VacancyCandidateMatch.employer_id == employer_id)
    if status is not None:
        query = query.filter(VacancyCandidateMatch.status == status)

    return query.order_by(VacancyCandidateMatch.id.desc()).all()


@router.patch("/{match_id}", response_model=VacancyCandidateMatchRead)
def update_match(
    match_id: int,
    payload: VacancyCandidateMatchUpdate,
    db: Session = Depends(get_db),
):
    match = db.query(VacancyCandidateMatch).filter(VacancyCandidateMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    old_status = match.status

    if payload.status is not None:
        if not can_transition_to(match.status, payload.status):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid transition: {match.status} -> {payload.status}",
            )
        match.status = payload.status

    if payload.match_score is not None:
        match.match_score = payload.match_score

    if payload.comment is not None:
        match.comment = payload.comment

    db.commit()
    db.refresh(match)

    if payload.status is not None and old_status != match.status:
        create_status_event(db, match, old_status, match.status)
        db.commit()

    return match


def apply_status_transition(
    match_id: int,
    new_status: str,
    db: Session,
) -> VacancyCandidateMatch:
    match = db.query(VacancyCandidateMatch).filter(VacancyCandidateMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    old_status = match.status

    if not can_transition_to(old_status, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {old_status} -> {new_status}",
        )

    match.status = new_status
    db.commit()
    db.refresh(match)

    create_status_event(db, match, old_status, new_status)
    db.commit()

    return match


@router.post("/{match_id}/send", response_model=VacancyCandidateMatchRead)
def send_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "sent", db)


@router.post("/{match_id}/view", response_model=VacancyCandidateMatchRead)
def view_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "viewed", db)


@router.post("/{match_id}/invite", response_model=VacancyCandidateMatchRead)
def invite_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "invited", db)


@router.post("/{match_id}/interview", response_model=VacancyCandidateMatchRead)
def interview_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "interviewed", db)


@router.post("/{match_id}/hire", response_model=VacancyCandidateMatchRead)
def hire_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "hired", db)


@router.post("/{match_id}/reject", response_model=VacancyCandidateMatchRead)
def reject_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "rejected", db)


@router.post("/{match_id}/no-show", response_model=VacancyCandidateMatchRead)
def no_show_match(match_id: int, db: Session = Depends(get_db)):
    return apply_status_transition(match_id, "no_show", db)


@router.post("/{match_id}/reopen", response_model=VacancyCandidateMatchRead)
def reopen_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(VacancyCandidateMatch).filter(VacancyCandidateMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    old_status = match.status

    if old_status not in {"rejected", "no_show", "hired"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {old_status} -> shortlist",
        )

    match.status = "shortlist"
    db.commit()
    db.refresh(match)

    create_status_event(db, match, old_status, "shortlist")
    db.commit()

    return match