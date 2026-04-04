from pydantic import BaseModel
from typing import Optional


class FunnelEventCreate(BaseModel):
    candidate_id: Optional[int] = None
    employer_id: Optional[int] = None
    vacancy_id: Optional[int] = None
    event_type: str
    event_source: Optional[str] = None
    comment: Optional[str] = None


class FunnelEventRead(BaseModel):
    id: int
    candidate_id: Optional[int] = None
    employer_id: Optional[int] = None
    vacancy_id: Optional[int] = None
    event_type: str
    event_source: Optional[str] = None
    comment: Optional[str] = None

    class Config:
        from_attributes = True