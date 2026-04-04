from pydantic import BaseModel
from typing import Optional

from app.schemas.vacancy_candidate_match import VacancyCandidateMatchWithCandidateRead


class VacancyShortlistRead(BaseModel):
    vacancy_id: int
    role: str
    venue_name: str
    city: str
    district: Optional[str] = None
    status: str
    matches: list[VacancyCandidateMatchWithCandidateRead]

    class Config:
        from_attributes = True