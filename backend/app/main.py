import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.utils.seed import run_seed
from app.routers import admin, auth, users, locators, sublocators, items, inventory, checkouts


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
app.include_router(inventory.router, prefix="/api/v1")
app.include_router(checkouts.router, prefix="/api/v1")


# Serve uploaded images (create dir eagerly so StaticFiles doesn't fail)
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/api/v1/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "healthy"}
