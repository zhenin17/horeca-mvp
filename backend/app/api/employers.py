from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.employer import Employer
from app.schemas.employer import EmployerCreate, EmployerRead

router = APIRouter(prefix="/employers", tags=["Employers"])


@router.post("/", response_model=EmployerRead)
def create_employer(payload: EmployerCreate, db: Session = Depends(get_db)):
    employer = Employer(
        company_name=payload.company_name,
        contact_name=payload.contact_name,
        phone=payload.phone,
        telegram_username=payload.telegram_username,
        city=payload.city,
    )
    db.add(employer)
    db.commit()
    db.refresh(employer)
    return employer