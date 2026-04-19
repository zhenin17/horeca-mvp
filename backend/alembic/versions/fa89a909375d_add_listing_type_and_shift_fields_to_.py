"""add listing type and shift fields to vacancies

Revision ID: fa89a909375d
Revises: df42314f3090
Create Date: 2026-04-19 14:23:30.510590

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "fa89a909375d"
down_revision: Union[str, None] = "df42314f3090"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "vacancies",
        sa.Column("listing_type", sa.String(length=30), nullable=False, server_default="job"),
    )
    op.add_column(
        "vacancies",
        sa.Column("shift_date", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "vacancies",
        sa.Column("shift_start_time", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "vacancies",
        sa.Column("shift_end_time", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "vacancies",
        sa.Column("urgent_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "vacancies",
        sa.Column("slots_count", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("vacancies", "slots_count")
    op.drop_column("vacancies", "urgent_flag")
    op.drop_column("vacancies", "shift_end_time")
    op.drop_column("vacancies", "shift_start_time")
    op.drop_column("vacancies", "shift_date")
    op.drop_column("vacancies", "listing_type")