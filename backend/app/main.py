import os
import re
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError

from app.config import settings
from app.database import SessionLocal
from app.utils.seed import run_seed
from app.routers import admin, auth, users, locators, sublocators, items, inventory, checkouts, csv_io


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create uploads dir and run seed
    os.makedirs(settings.upload_dir, exist_ok=True)
    db = SessionLocal()
    try:
        run_seed(db)
    finally:
        db.close()
    yield
    # Shutdown


app = FastAPI(
    title="School Supply Inventory Management System",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
)

class NoCacheAPIMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        if request.url.path.startswith("/api/") and "/uploads" not in request.url.path:
            response.headers["Cache-Control"] = "no-store"
        return response


app.add_middleware(NoCacheAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api/v1
app.include_router(admin.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(locators.router, prefix="/api/v1")
app.include_router(sublocators.router, prefix="/api/v1")
app.include_router(items.router, prefix="/api/v1")
app.include_router(csv_io.router, prefix="/api/v1")
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(checkouts.router, prefix="/api/v1")


# Serve uploaded images (create dir eagerly so StaticFiles doesn't fail)
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


_UNIQUE_RE = re.compile(r"UNIQUE constraint failed: (\w+)\.(\w+)")
_FRIENDLY_NAMES = {
    "items.name": "An item with this name already exists. Please choose a different name.",
    "categories.name": "A category with this name already exists.",
    "users.username": "This username is already taken.",
    "locators.name": "You already have a location with this name.",
    "sublocators.name": "A shelf with this name already exists in this location.",
    "inventory.item_id": "This item already has an inventory record for this location and shelf.",
}


@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    detail = "A record with this value already exists. Please use a different value."
    match = _UNIQUE_RE.search(str(exc.orig))
    if match:
        table, column = match.group(1), match.group(2)
        detail = _FRIENDLY_NAMES.get(f"{table}.{column}", detail)
    return JSONResponse(status_code=409, content={"detail": detail})


@app.get("/health")
def health_check():
    return {"status": "healthy"}
