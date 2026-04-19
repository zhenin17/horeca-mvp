from typing import Optional

from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.base import Base


class TelegramUser(Base):
    __tablename__ = "telegram_users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    telegram_user_id: Mapped[int] = mapped_column(
        BigInteger, unique=True, index=True, nullable=False
    )
    telegram_username: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    first_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    last_name: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )