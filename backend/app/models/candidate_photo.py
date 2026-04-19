from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.base import Base


class CandidatePhoto(Base):
    __tablename__ = "candidate_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    candidate_id: Mapped[int] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    photo_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_cover: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate = relationship("Candidate", back_populates="photos")