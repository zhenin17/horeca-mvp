from pydantic import BaseModel
from typing import Optional


class VacancyCreate(BaseModel):
    employer_id: int
    role: str
    venue_name: str
    city: str
    district: Optional[str] = None
    salary_text: Optional[str] = None
    schedule_text: Optional[str] = None
    needed_start: Optional[str] = None
    status: str = "new"


class VacancyRead(BaseModel):
    id: int
    employer_id: int
    role: str
    venue_name: str
    city: str
    district: Optional[str] = None
    salary_text: Optional[str] = None
    schedule_text: Optional[str] = None
    needed_start: Optional[str] = None
    status: str

    class Config:
        from_attributes = True