from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import require_candidate
from app.models.candidate import Candidate
from app.schemas.candidate import CandidateRead
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/candidate", tags=["Me Candidate"])


@router.get("", response_model=CandidateRead)
def get_my_candidate_profile(
    current_user: CurrentUserContext = Depends(require_candidate),
    db: Session = Depends(get_db),
):
    candidate = (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == current_user.candidate_id)
        .first()
    )
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate