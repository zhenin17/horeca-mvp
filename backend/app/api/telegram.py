from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.candidate import Candidate
from app.models.employer import Employer
from app.models.telegram_user import TelegramUser
from app.schemas.telegram import (
    TelegramAuthRequest,
    TelegramAuthResponse,
    TelegramCreateCandidateProfileRequest,
    TelegramCreateEmployerProfileRequest,
)
from app.schemas.candidate import CandidateRead
from app.schemas.employer import EmployerRead

router = APIRouter(prefix="/telegram", tags=["Telegram"])


def get_or_create_telegram_user(payload: TelegramAuthRequest, db: Session) -> TelegramUser:
    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == payload.telegram_user_id)
        .first()
    )

    if telegram_user:
        telegram_user.telegram_username = payload.telegram_username
        telegram_user.first_name = payload.first_name
        telegram_user.last_name = payload.last_name
        db.commit()
        db.refresh(telegram_user)
        return telegram_user

    telegram_user = TelegramUser(
        telegram_user_id=payload.telegram_user_id,
        telegram_username=payload.telegram_username,
        first_name=payload.first_name,
        last_name=payload.last_name,
    )
    db.add(telegram_user)
    db.commit()
    db.refresh(telegram_user)
    return telegram_user


@router.post("/auth", response_model=TelegramAuthResponse)
def telegram_auth(payload: TelegramAuthRequest, db: Session = Depends(get_db)):
    telegram_user = get_or_create_telegram_user(payload, db)

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


@router.get("/me/{telegram_user_id}", response_model=TelegramAuthResponse)
def get_telegram_me(telegram_user_id: int, db: Session = Depends(get_db)):
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
    db: Session = Depends(get_db),
):
    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == payload.telegram_user_id)
        .first()
    )
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram user not found")

    existing_candidate = (
        db.query(Candidate)
        .filter(Candidate.telegram_user_id == payload.telegram_user_id)
        .first()
    )
    if existing_candidate:
        raise HTTPException(status_code=400, detail="Candidate profile already exists")

    candidate = Candidate(
        telegram_user_id=payload.telegram_user_id,
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
    return candidate


@router.post("/create-employer-profile", response_model=EmployerRead)
def create_employer_profile(
    payload: TelegramCreateEmployerProfileRequest,
    db: Session = Depends(get_db),
):
    telegram_user = (
        db.query(TelegramUser)
        .filter(TelegramUser.telegram_user_id == payload.telegram_user_id)
        .first()
    )
    if not telegram_user:
        raise HTTPException(status_code=404, detail="Telegram user not found")

    existing_employer = (
        db.query(Employer)
        .filter(Employer.telegram_user_id == payload.telegram_user_id)
        .first()
    )
    if existing_employer:
        raise HTTPException(status_code=400, detail="Employer profile already exists")

    employer = Employer(
        telegram_user_id=payload.telegram_user_id,
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