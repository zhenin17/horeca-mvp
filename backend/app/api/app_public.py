from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models.app_document import AppDocument
from app.models.app_setting import AppSetting
from app.schemas.app_public import AppDocumentRead, AppSettingItemRead, AppSettingsRead

router = APIRouter(prefix="/app", tags=["App Public"])


@router.get("/documents", response_model=list[AppDocumentRead])
def list_app_documents(db: Session = Depends(get_db)):
    return (
        db.query(AppDocument)
        .filter(AppDocument.is_active == True)
        .order_by(AppDocument.id.asc())
        .all()
    )


@router.get("/documents/{key}", response_model=AppDocumentRead)
def get_app_document(key: str, db: Session = Depends(get_db)):
    document = (
        db.query(AppDocument)
        .filter(AppDocument.key == key)
        .filter(AppDocument.is_active == True)
        .first()
    )
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.get("/settings", response_model=AppSettingsRead)
def get_app_settings(db: Session = Depends(get_db)):
    items = (
        db.query(AppSetting)
        .order_by(AppSetting.id.asc())
        .all()
    )
    return {
        "items": [
            AppSettingItemRead(key=item.key, value=item.value)
            for item in items
        ]
    }