from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class Vacancy(Base):
    __tablename__ = "vacancies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    employer_id: Mapped[int] = mapped_column(ForeignKey("employers.id"), nullable=False)

    role: Mapped[str] = mapped_column(String(100), nullable=False)
    venue_name: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    salary_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    schedule_text: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    needed_start: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    listing_type: Mapped[str] = mapped_column(String(30), nullable=False, default="job")
    shift_date: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    shift_start_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    shift_end_time: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    urgent_flag: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    slots_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    status: Mapped[str] = mapped_column(String(50), default="new")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    employer = relationship("Employer", back_populates="vacancies")
    matches = relationship("VacancyCandidateMatch", back_populates="vacancy")
    funnel_events = relationship("FunnelEvent", back_populates="vacancy")