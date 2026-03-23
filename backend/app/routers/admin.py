"""Admin management endpoints."""
import sqlite3
import tempfile

from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/backup",
    summary="Download database backup",
    description="Downloads a copy of the SQLite database file. Uses the SQLite backup API to create a consistent snapshot. Admin only.",
    responses={
        200: {
            "description": "SQLite database file",
            "content": {"application/octet-stream": {}},
        },
        403: {"description": "Admin privileges required"},
    },
)
def download_backup(
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    # Create temp file for backup
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    tmp.close()

    # Get the raw dbapi connection and use SQLite's backup API
    connection = db.connection()
    raw_conn = connection.connection.dbapi_connection

    # Use sqlite3 backup API - works for both file and in-memory databases
    backup_conn = sqlite3.connect(tmp.name)
    raw_conn.backup(backup_conn)
    backup_conn.close()

    return FileResponse(
        path=tmp.name,
        filename="school_inventory_backup.db",
        media_type="application/octet-stream",
    )
