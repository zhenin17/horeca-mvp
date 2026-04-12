from pydantic import BaseModel


class TelegramAuthRequest(BaseModel):
    telegram_user_id: int
    telegram_username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class TelegramAuthResponse(BaseModel):
    telegram_user_id: int
    telegram_username: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    candidate_id: int | None = None
    employer_id: int | None = None


class TelegramCreateCandidateProfileRequest(BaseModel):
    telegram_user_id: int
    full_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    district: str | None = None
    primary_role: str
    horeca_experience_months: int = 0
    ready_to_start: str
    expected_income: str | None = None


class TelegramCreateEmployerProfileRequest(BaseModel):
    telegram_user_id: int
    company_name: str
    contact_name: str
    phone: str
    telegram_username: str | None = None
    city: str
    website: str | None = None