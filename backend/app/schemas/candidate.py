from datetime import date
from typing import Optional

from pydantic import BaseModel


class CandidateAvailabilityCreate(BaseModel):
    available_date: date
    slot_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: bool = True


class CandidateAvailabilityRead(BaseModel):
    id: int
    candidate_id: int
    available_date: date
    slot_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class CandidatePhotoCreate(BaseModel):
    photo_url: str
    sort_order: int = 0
    is_cover: bool = False


class CandidatePhotoRead(BaseModel):
    id: int
    candidate_id: int
    photo_url: str
    sort_order: int
    is_cover: bool

    class Config:
        from_attributes = True


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
    photos: list[CandidatePhotoRead] = []

    class Config:
        from_attributes = True