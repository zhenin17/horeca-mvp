from pydantic import BaseModel


class TelegramAuthInitDataRequest(BaseModel):
    init_data: str


class DevAuthRequest(BaseModel):
    telegram_user_id: int


class CurrentUserRead(BaseModel):
    telegram_user_id: int
    telegram_username: str | None = None
    first_name: str | None = None
    last_name: str | None = None

    candidate_id: int | None = None
    employer_id: int | None = None

    is_candidate: bool
    is_employer: bool
    is_admin: bool
    is_moderator: bool = False
    is_support: bool = False


class AccessTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    current_user: CurrentUserRead