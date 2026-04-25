from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_admin
from app.models.funnel_event import FunnelEvent
from app.schemas.funnel_event import FunnelEventCreate, FunnelEventRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/funnel-events", tags=["Funnel Events"])


@router.post("/", response_model=FunnelEventRead)
def create_funnel_event(
    payload: FunnelEventCreate,
    current_user: CurrentUserContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    event = FunnelEvent(
        candidate_id=payload.candidate_id,
        employer_id=payload.employer_id,
        vacancy_id=payload.vacancy_id,
        event_type=payload.event_type,
        event_source=payload.event_source,
        comment=payload.comment,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("/", response_model=list[FunnelEventRead])
def list_funnel_events(
    current_user: CurrentUserContext = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return db.query(FunnelEvent).order_by(FunnelEvent.id.desc()).all()