from datetime import datetime, date
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class CandidateAvailability(Base):
    __tablename__ = "candidate_availability"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    available_date: Mapped[date] = mapped_column(Date, nullable=False)
    slot_type: Mapped[str] = mapped_column(String(30), nullable=False)
    start_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    end_time: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="availability")