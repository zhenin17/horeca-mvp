from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Employer(Base):
    __tablename__ = "employers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    telegram_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    telegram_username: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    website: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    vacancies = relationship("Vacancy", back_populates="employer")
    matches = relationship("VacancyCandidateMatch", back_populates="employer")
    funnel_events = relationship("FunnelEvent", back_populates="employer")