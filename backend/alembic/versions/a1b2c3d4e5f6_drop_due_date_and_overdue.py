"""drop due_date and overdue

Revision ID: a1b2c3d4e5f6
Revises: e09d4cb3b640
Create Date: 2026-03-24 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'e09d4cb3b640'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Convert any 'overdue' status to 'active' before dropping due_date
    op.execute("UPDATE checkouts SET status = 'active' WHERE status = 'overdue'")

    with op.batch_alter_table('checkouts') as batch_op:
        batch_op.drop_column('due_date')


def downgrade() -> None:
    with op.batch_alter_table('checkouts') as batch_op:
        batch_op.add_column(sa.Column('due_date', sa.DateTime(), nullable=True))
