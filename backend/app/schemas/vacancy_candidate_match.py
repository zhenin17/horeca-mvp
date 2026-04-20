from typing import Optional

from pydantic import BaseModel

from app.schemas.candidate import CandidateRead


class VacancyCandidateMatchCreate(BaseModel):
    candidate_id: int
    employer_id: int
    vacancy_id: int
    match_score: Optional[int] = None
    status: str = "shortlist"
    comment: Optional[str] = None


class VacancyCandidateMatchUpdate(BaseModel):
    status: Optional[str] = None
    match_score: Optional[int] = None
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


class VacancyCandidateMatchWithCandidateRead(BaseModel):
    id: int
    candidate_id: int
    employer_id: int
    vacancy_id: int
    match_score: Optional[int] = None
    status: str
    comment: Optional[str] = None
    candidate: CandidateRead

    class Config:
        from_attributes = True