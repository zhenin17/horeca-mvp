import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from urllib.parse import parse_qsl

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.telegram_user import TelegramUser


@dataclass
class CurrentUserContext:
    telegram_user_id: int
    telegram_username: str | None
    first_name: str | None
    last_name: str | None
    candidate_id: int | None
    employer_id: int | None
    is_candidate: bool
    is_employer: bool
    is_admin: bool
    is_moderator: bool
    is_support: bool


def build_current_user_context(telegram_user: TelegramUser, db: Session) -> CurrentUserContext:
    candidate = (
        db.query(Candidate)
        .filter(Candidate.telegram_user_id == telegram_user.telegram_user_id)
        .first()
    )
    employer = (
        db.query(Employer)
        .filter(Employer.telegram_user_id == telegram_user.telegram_user_id)
        .first()
    )

    telegram_user_id = telegram_user.telegram_user_id

    is_admin = telegram_user_id in settings.admin_telegram_user_ids_list
    is_moderator = is_admin or (
        telegram_user_id in settings.moderator_telegram_user_ids_list
    )
    is_support = is_admin or is_moderator or (
        telegram_user_id in settings.support_telegram_user_ids_list
    )

    return CurrentUserContext(
        telegram_user_id=telegram_user_id,
        telegram_username=telegram_user.telegram_username,
        first_name=telegram_user.first_name,
        last_name=telegram_user.last_name,
        candidate_id=candidate.id if candidate else None,
        employer_id=employer.id if employer else None,
        is_candidate=candidate is not None,
        is_employer=employer is not None,
        is_admin=is_admin,
        is_moderator=is_moderator,
        is_support=is_support,
    )


def get_telegram_user_by_telegram_id(telegram_user_id: int, db: Session) -> TelegramUser | None:
    return (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == telegram_user_id)
        .first()
    )


def get_current_user_context_by_telegram_id(
    telegram_user_id: int,
    db: Session,
) -> CurrentUserContext:
    telegram_user = get_telegram_user_by_telegram_id(telegram_user_id, db)
    if not telegram_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user not found",
        )
    return build_current_user_context(telegram_user, db)


def get_or_create_telegram_user_from_init_data(init_data: str, db: Session) -> CurrentUserContext:
    parsed = parse_init_data(init_data)
    validate_telegram_init_data(parsed)
    telegram_user_data = extract_user_from_init_data(parsed)
    validate_auth_date(parsed)

    telegram_user_id = telegram_user_data.get("id")
    if not isinstance(telegram_user_id, int):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram user id",
        )

    telegram_user = get_telegram_user_by_telegram_id(telegram_user_id, db)

    if telegram_user:
        telegram_user.telegram_username = telegram_user_data.get("username")
        telegram_user.first_name = telegram_user_data.get("first_name")
        telegram_user.last_name = telegram_user_data.get("last_name")
        db.commit()
        db.refresh(telegram_user)
        return build_current_user_context(telegram_user, db)

    telegram_user = TelegramUser(
        telegram_user_id=telegram_user_id,
        telegram_username=telegram_user_data.get("username"),
        first_name=telegram_user_data.get("first_name"),
        last_name=telegram_user_data.get("last_name"),
    )
    db.add(telegram_user)
    db.commit()
    db.refresh(telegram_user)
    return build_current_user_context(telegram_user, db)


def parse_init_data(init_data: str) -> dict[str, str]:
    if not init_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="init_data is required",
        )

    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid init_data",
        )
    return parsed


def validate_telegram_init_data(parsed: dict[str, str]) -> None:
    if not settings.telegram_bot_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Telegram bot token is not configured",
        )

    received_hash = parsed.get("hash")
    if not received_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram hash is missing",
        )

    data_check_string = build_data_check_string(parsed)

    secret_key = hmac.new(
        key=b"WebAppData",
        msg=settings.telegram_bot_token.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()

    calculated_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(calculated_hash, received_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram signature",
        )


def build_data_check_string(parsed: dict[str, str]) -> str:
    items = []
    for key in sorted(parsed.keys()):
        if key == "hash":
            continue
        items.append(f"{key}={parsed[key]}")
    return "\n".join(items)


def extract_user_from_init_data(parsed: dict[str, str]) -> dict:
    user_raw = parsed.get("user")
    if not user_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram user payload is missing",
        )

    try:
        user_data = json.loads(user_raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram user payload",
        ) from exc

    if not isinstance(user_data, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Telegram user payload",
        )

    return user_data


def validate_auth_date(parsed: dict[str, str]) -> None:
    auth_date_raw = parsed.get("auth_date")
    if not auth_date_raw:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="auth_date is missing",
        )

    try:
        auth_date = int(auth_date_raw)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid auth_date",
        ) from exc

    now_ts = int(datetime.now(timezone.utc).timestamp())
    age = now_ts - auth_date
    if age < 0 or age > settings.telegram_auth_max_age_seconds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telegram auth data is too old",
        )