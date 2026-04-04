from pydantic import BaseModel
from typing import Optional


class EmployerCreate(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    telegram_username: Optional[str] = None
    city: str


class EmployerRead(BaseModel):
    id: int
    company_name: str
    contact_name: str
    phone: str
    telegram_username: Optional[str] = None
    city: str

    class Config:
        from_attributes = True