from pydantic import BaseModel


class EmployerCreate(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    website: str | None = None


class EmployerUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    telegram_username: str | None = None
    city: str | None = None
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