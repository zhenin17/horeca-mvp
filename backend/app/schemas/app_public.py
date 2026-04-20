from typing import Optional

from pydantic import BaseModel


class AppDocumentRead(BaseModel):
    id: int
    key: str
    title: str
    content: str
    version: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class AppSettingItemRead(BaseModel):
    key: str
    value: str


class AppSettingsRead(BaseModel):
    items: list[AppSettingItemRead]