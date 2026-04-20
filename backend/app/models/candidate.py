from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    telegram_user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    telegram_username: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    primary_role: Mapped[str] = mapped_column(String(255), nullable=False)
    horeca_experience_months: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )
    ready_to_start: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_income: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    matches = relationship("VacancyCandidateMatch", back_populates="candidate")
    funnel_events = relationship("FunnelEvent", back_populates="candidate")
    photos = relationship(
        "CandidatePhoto",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="CandidatePhoto.sort_order.asc()",
    )
    availability = relationship(
        "CandidateAvailability",
        back_populates="candidate",
        cascade="all, delete-orphan",
        order_by="CandidateAvailability.available_date.asc()",
    )