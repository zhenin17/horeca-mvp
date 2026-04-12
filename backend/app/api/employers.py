from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.employer import Employer
from app.schemas.employer import EmployerCreate, EmployerRead

router = APIRouter(prefix="/employers", tags=["Employers"])


@router.get("/", response_model=list[EmployerRead])
def list_employers(db: Session = Depends(get_db)):
    return db.query(Employer).order_by(Employer.id.desc()).all()


@router.post("/", response_model=EmployerRead)
def create_employer(payload: EmployerCreate, db: Session = Depends(get_db)):
    employer = Employer(
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


@router.get("/{employer_id}", response_model=EmployerRead)
def get_employer(employer_id: int, db: Session = Depends(get_db)):
    employer = db.query(Employer).filter(Employer.id == employer_id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer not found")
    return employer