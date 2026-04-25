from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.db import get_db
from app.dependencies.auth import get_current_user
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.telegram_user import TelegramUser
from app.schemas.candidate import CandidateRead
from app.schemas.employer import EmployerRead
from app.schemas.telegram import (
    TelegramAuthRequest,
    TelegramAuthResponse,
    TelegramCreateCandidateProfileRequest,
    TelegramCreateEmployerProfileRequest,
)
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/telegram", tags=["Telegram"])


@router.post("/auth", response_model=TelegramAuthResponse)
def telegram_auth_legacy_disabled(
    payload: TelegramAuthRequest,
    db: Session = Depends(get_db),
):
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Use /auth/telegram with Telegram initData instead of /telegram/auth",
    )


@router.get("/me/{telegram_user_id}", response_model=TelegramAuthResponse)
def get_telegram_me(
    telegram_user_id: int,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not current_user.is_admin and current_user.telegram_user_id != telegram_user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == telegram_user_id)
        .first()
    )
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram user not found")

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

    return TelegramAuthResponse(
        telegram_user_id=telegram_user.telegram_user_id,
        telegram_username=telegram_user.telegram_username,
        first_name=telegram_user.first_name,
        last_name=telegram_user.last_name,
        candidate_id=candidate.id if candidate else None,
        employer_id=employer.id if employer else None,
    )


@router.post("/create-candidate-profile", response_model=CandidateRead)
def create_candidate_profile(
    payload: TelegramCreateCandidateProfileRequest,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == current_user.telegram_user_id)
        .first()
    )
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram user not found")

    existing_candidate = (
        db.query(Candidate)
        .filter(Candidate.telegram_user_id == current_user.telegram_user_id)
        .first()
    )
    if existing_candidate:
        raise HTTPException(status_code=400, detail="Candidate profile already exists")

    candidate = Candidate(
        telegram_user_id=current_user.telegram_user_id,
        full_name=payload.full_name,
        phone=payload.phone,
        telegram_username=payload.telegram_username,
        city=payload.city,
        district=payload.district,
        primary_role=payload.primary_role,
        horeca_experience_months=payload.horeca_experience_months,
        ready_to_start=payload.ready_to_start,
        expected_income=payload.expected_income,
        is_active=True,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)

    return (
        db.query(Candidate)
        .options(selectinload(Candidate.photos))
        .filter(Candidate.id == candidate.id)
        .first()
    )


@router.post("/create-employer-profile", response_model=EmployerRead)
def create_employer_profile(
    payload: TelegramCreateEmployerProfileRequest,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == current_user.telegram_user_id)
        .first()
    )
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram user not found")

    existing_employer = (
        db.query(Employer)
        .filter(Employer.telegram_user_id == current_user.telegram_user_id)
        .first()
    )
    if existing_employer:
        raise HTTPException(status_code=400, detail="Employer profile already exists")

    employer = Employer(
        telegram_user_id=current_user.telegram_user_id,
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        telegram_username=payload.telegram_username,
        city=payload.city,
        website=payload.website,
    )
    db.add(employer)
    db.commit()
    db.refresh(employer)
    return employer