from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.funnel_event import FunnelEvent
from app.models.vacancy_candidate_match import VacancyCandidateMatch

ALLOWED_TRANSITIONS = {
    "shortlist": {"sent", "rejected"},
    "sent": {"viewed", "invited", "rejected"},
    "viewed": {"invited", "rejected"},
    "invited": {"interviewed", "no_show", "rejected"},
    "interviewed": {"offered", "hired", "rejected"},
    "offered": {"hired", "rejected"},
    "hired": set(),
    "rejected": set(),
    "no_show": set(),
}


def change_match_status(
    db: Session,
    match: VacancyCandidateMatch,
    new_status: str,
    event_source: str = "api",
    comment: Optional[str] = None,
) -> VacancyCandidateMatch:
    old_status = match.status

    if old_status == new_status:
        return match

    allowed = ALLOWED_TRANSITIONS.get(old_status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {old_status} -> {new_status}",
        )

    match.status = new_status
    if comment is not None:
        match.comment = comment

    db.commit()
    db.refresh(match)

    event = FunnelEvent(
        candidate_id=match.candidate_id,
        employer_id=match.employer_id,
        vacancy_id=match.vacancy_id,
        event_type="match_status_changed",
        event_source=event_source,
        comment=f"match_id={match.id}; {old_status} -> {new_status}",
    )
    db.add(event)
    db.commit()

    return match