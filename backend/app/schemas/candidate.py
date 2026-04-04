from pydantic import BaseModel
from typing import Optional


class CandidateCreate(BaseModel):
    full_name: str
    phone: str
    telegram_username: Optional[str] = None
    city: str
    district: Optional[str] = None
    primary_role: str
    horeca_experience_months: int = 0
    ready_to_start: str
    expected_income: Optional[str] = None


class CandidateRead(BaseModel):
    id: int
    full_name: str
    phone: str
    telegram_username: Optional[str] = None
    city: str
    district: Optional[str] = None
    primary_role: str
    horeca_experience_months: int
    ready_to_start: str
    expected_income: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True