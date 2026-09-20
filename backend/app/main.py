import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import get_settings
from app.database import init_db


settings = get_settings()

# Path to the built frontend assets (populated by the Docker build).
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and optionally seed demo data."""
    init_db()

    if settings.SEED_DEMO:
        # Import here to avoid circular imports; seed only runs when table is empty.
        from app.seed import seed_demo_data
        seed_demo_data()

    yield


app = FastAPI(
    title="TicketDesk API",
    version="1.0.0",
    lifespan=lifespan,
)


# CORS — only enabled when CORS_ORIGINS is set (development).
if settings.cors_origin_list:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ── API routes ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"ok": True}


# Import and include the ticket router (will be created in Phase 1).
# Wrapped in try/except so scaffold boots even before the router exists.
try:
    from app.routers.tickets import router as tickets_router
    app.include_router(tickets_router, prefix="/api")
except ImportError:
    pass


# ── Static file serving (production) ─────────────────────────────────────────

if STATIC_DIR.is_dir():
    # Serve hashed assets at /assets
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA fallback: return index.html for any non-/api route so React Router
    # handles client-side navigation on page refresh / deep links.
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept /api or /docs or /openapi.json
        if full_path.startswith("api") or full_path in ("docs", "redoc", "openapi.json"):
            return JSONResponse({"detail": "Not found"}, status_code=404)

        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))

        return FileResponse(str(STATIC_DIR / "index.html"))
