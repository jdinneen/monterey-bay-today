from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.adapters.lakehouse import LakehouseReader
from app.adapters.live import LiveSignalFetcher
from app.services.brief import BriefService
from app.services.refresh import RefreshService
from app.settings import get_settings
from app.source_registry import SourceRegistry


settings = get_settings()
registry = SourceRegistry.load(settings)
lakehouse = LakehouseReader(registry)
refresh_service = RefreshService(settings, LiveSignalFetcher(registry))

app = FastAPI(title="Monterey Bay Today", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "project_root": str(settings.project_root),
        "mbal_project_root": str(settings.mbal_project_root),
        "cache_dir": str(settings.cache_dir),
    }


@app.get("/api/sources")
def sources():
    return BriefService(registry, lakehouse, refresh_service.latest()).today().sources


@app.get("/api/brief/today")
def today(region: str = "monterey_bay"):
    return BriefService(registry, lakehouse, refresh_service.latest()).today(region=region)


@app.post("/api/refresh")
async def refresh():
    return await refresh_service.refresh()

