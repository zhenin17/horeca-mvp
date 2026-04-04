from pydantic import BaseModel
from typing import Optional


class CandidateMatchItem(BaseModel):
    match_id: int
    vacancy_id: int
    employer_id: int
    role: str
    venue_name: str
    city: str
    district: Optional[str] = None
    match_score: Optional[int] = None
    status: str
    comment: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateDashboardRead(BaseModel):
    candidate_id: int
    full_name: str
    primary_role: str
    city: str
    district: Optional[str] = None
    ready_to_start: str
    total_matches: int
    active_matches: int
    hired_matches: int
    rejected_matches: int
    items: list[CandidateMatchItem]