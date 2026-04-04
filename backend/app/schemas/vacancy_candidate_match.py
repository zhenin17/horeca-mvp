from pydantic import BaseModel
from typing import Optional


class VacancyCandidateMatchCreate(BaseModel):
    candidate_id: int
    employer_id: int
    vacancy_id: int
    match_score: Optional[int] = None
    status: str = "new"
    comment: Optional[str] = None


class VacancyCandidateMatchRead(BaseModel):
    id: int
    candidate_id: int
    employer_id: int
    vacancy_id: int
    match_score: Optional[int] = None
    status: str
    comment: Optional[str] = None

    class Config:
        from_attributes = True