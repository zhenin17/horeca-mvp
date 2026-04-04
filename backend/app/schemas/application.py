from pydantic import BaseModel
from typing import Optional


class CandidateApplyCreate(BaseModel):
    candidate_id: int
    vacancy_id: int
    comment: Optional[str] = None