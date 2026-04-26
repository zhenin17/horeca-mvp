from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import decode_access_token
from app.services.auth import CurrentUserContext, get_current_user_context_by_telegram_id


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> CurrentUserContext:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header is missing",
        )

    token = credentials.credentials
    payload = decode_access_token(token)

    telegram_user_id = payload.get("telegram_user_id")
    if not isinstance(telegram_user_id, int):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return get_current_user_context_by_telegram_id(telegram_user_id, db)


def require_candidate(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_candidate or current_user.candidate_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Candidate access required",
        )
    return current_user


def require_employer(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_employer or current_user.employer_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Employer access required",
        )
    return current_user


def require_admin(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_moderator(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_moderator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Moderator access required",
        )
    return current_user


def require_support(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not current_user.is_support:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Support access required",
        )
    return current_user


def require_staff(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not (current_user.is_admin or current_user.is_moderator or current_user.is_support):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff access required",
        )
    return current_user


def require_admin_or_moderator(
    current_user: CurrentUserContext = Depends(get_current_user),
) -> CurrentUserContext:
    if not (current_user.is_admin or current_user.is_moderator):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or moderator access required",
        )
    return current_user