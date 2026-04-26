from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.dependencies.auth import get_current_user, require_employer
from app.models.employer import Employer
from app.schemas.employer import EmployerCreate, EmployerRead, EmployerUpdate
from app.services.auth import CurrentUserContext

router = APIRouter(prefix="/me/employer", tags=["Me Employer"])


@router.get("", response_model=EmployerRead)
def get_my_employer_profile(
    current_user: CurrentUserContext = Depends(require_employer),
    db: Session = Depends(get_db),
):
    employer = (
        db.query(Employer)
        .filter(Employer.id == current_user.employer_id)
        .first()
    )
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    return employer


@router.post("", response_model=EmployerRead)
def create_my_employer_profile(
    payload: EmployerCreate,
    current_user: CurrentUserContext = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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


@router.patch("", response_model=EmployerRead)
def update_my_employer_profile(
    payload: EmployerUpdate,
    current_user: CurrentUserContext = Depends(require_employer),
    db: Session = Depends(get_db),
):
    employer = (
        db.query(Employer)
        .filter(Employer.id == current_user.employer_id)
        .first()
    )

    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(employer, field, value)

    db.commit()
    db.refresh(employer)

    return employer