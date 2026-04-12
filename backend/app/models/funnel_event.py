from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class FunnelEvent(Base):
    __tablename__ = "funnel_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[Optional[int]] = mapped_column(ForeignKey("candidates.id"), nullable=True)
    employer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("employers.id"), nullable=True)
    vacancy_id: Mapped[Optional[int]] = mapped_column(ForeignKey("vacancies.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)

    candidate = relationship("Candidate", back_populates="funnel_events")
    employer = relationship("Employer", back_populates="funnel_events")
    vacancy = relationship("Vacancy", back_populates="funnel_events")