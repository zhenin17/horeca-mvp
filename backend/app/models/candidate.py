from sqlalchemy import BigInteger, Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    telegram_user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    telegram_username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_role: Mapped[str] = mapped_column(String(255), nullable=False)
    horeca_experience_months: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    ready_to_start: Mapped[str] = mapped_column(String(255), nullable=False)
    expected_income: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    matches = relationship("VacancyCandidateMatch", back_populates="candidate")
    funnel_events = relationship("FunnelEvent", back_populates="candidate")