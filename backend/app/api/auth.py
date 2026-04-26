from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import create_access_token
from app.dependencies.auth import get_current_user
from app.schemas.auth import (
    AccessTokenResponse,
    CurrentUserRead,
    DevAuthRequest,
    TelegramAuthInitDataRequest,
)
from app.services.auth import (
    CurrentUserContext,
    get_current_user_context_by_telegram_id,
    get_or_create_telegram_user_from_init_data,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


def serialize_current_user(current_user: CurrentUserContext) -> CurrentUserRead:
    return CurrentUserRead(
        telegram_user_id=current_user.telegram_user_id,
        telegram_username=current_user.telegram_username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        candidate_id=current_user.candidate_id,
        employer_id=current_user.employer_id,
        is_candidate=current_user.is_candidate,
        is_employer=current_user.is_employer,
        is_admin=current_user.is_admin,
        is_moderator=current_user.is_moderator,
        is_support=current_user.is_support,
    )


@router.post("/telegram", response_model=AccessTokenResponse)
def auth_with_telegram(
    payload: TelegramAuthInitDataRequest,
    db: Session = Depends(get_db),
):
    current_user = get_or_create_telegram_user_from_init_data(payload.init_data, db)

    access_token = create_access_token(
        {
            "telegram_user_id": current_user.telegram_user_id,
        }
    )

    return AccessTokenResponse(
        access_token=access_token,
        current_user=serialize_current_user(current_user),
    )


@router.post("/dev", response_model=AccessTokenResponse)
def auth_with_dev_user(
    payload: DevAuthRequest,
    db: Session = Depends(get_db),
):
    if not settings.enable_dev_auth:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dev auth is disabled",
        )

    current_user = get_current_user_context_by_telegram_id(payload.telegram_user_id, db)

    access_token = create_access_token(
        {
            "telegram_user_id": current_user.telegram_user_id,
        }
    )

    return AccessTokenResponse(
        access_token=access_token,
        current_user=serialize_current_user(current_user),
    )


@router.get("/me", response_model=CurrentUserRead)
def get_me(
    current_user: CurrentUserContext = Depends(get_current_user),
):
    return serialize_current_user(current_user)