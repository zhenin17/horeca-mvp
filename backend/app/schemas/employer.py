from pydantic import BaseModel


class EmployerCreate(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    website: str | None = None


class EmployerRead(BaseModel):
    id: int
    company_name: str
    contact_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    website: str | None = None

    class Config:
        from_attributes = True