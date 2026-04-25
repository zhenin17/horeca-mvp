from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.models.funnel_event import FunnelEvent
from app.schemas.reliability import CandidateReliabilityRead
from app.services.auth import CurrentUserContext
from app.services.reliability import calculate_candidate_reliability

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate Reliability"])


@router.get("/reliability", response_model=CandidateReliabilityRead)
def get_my_candidate_reliability(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = db.query(Candidate).filter(Candidate.id == current_user.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    events = (
        db.query(FunnelEvent)
        .filter(FunnelEvent.candidate_id == current_user.candidate_id)
        .all()
    )

    summary = calculate_candidate_reliability(events)

    return {
        "candidate_id": candidate.id,
        **summary,
    }