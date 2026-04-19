from typing import Optional

from pydantic import BaseModel


class VacancyPhotoCreate(BaseModel):
    photo_url: str
    sort_order: int = 0
    is_cover: bool = False


class VacancyPhotoRead(BaseModel):
    id: int
    vacancy_id: int
    photo_url: str
    sort_order: int
    is_cover: bool

    class Config:
        from_attributes = True


class VacancyCreate(BaseModel):
    employer_id: int
    role: str
    venue_name: str
    city: str
    district: Optional[str] = None
    salary_text: Optional[str] = None
    schedule_text: Optional[str] = None
    needed_start: Optional[str] = None

    listing_type: str = "job"
    shift_date: Optional[str] = None
    shift_start_time: Optional[str] = None
    shift_end_time: Optional[str] = None
    urgent_flag: bool = False
    slots_count: Optional[int] = None

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

    listing_type: str
    shift_date: Optional[str] = None
    shift_start_time: Optional[str] = None
    shift_end_time: Optional[str] = None
    urgent_flag: bool
    slots_count: Optional[int] = None

    status: str
    photos: list[VacancyPhotoRead] = []

    class Config:
        from_attributes = True