"""add returned_quantity to checkouts

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-24 00:00:01.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('checkouts') as batch_op:
        batch_op.add_column(sa.Column('returned_quantity', sa.Integer(), nullable=False, server_default='0'))

    # Set returned_quantity = quantity for already-returned checkouts
    op.execute("UPDATE checkouts SET returned_quantity = quantity WHERE status = 'returned'")


def downgrade() -> None:
    with op.batch_alter_table('checkouts') as batch_op:
        batch_op.drop_column('returned_quantity')
