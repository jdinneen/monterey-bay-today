from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Freshness(str, Enum):
    live = "live"
    recent_cache = "recent-cache"
    stale = "stale"
    imputed = "imputed"
    blocked = "blocked"
    unknown = "unknown"


class EvidenceKind(str, Enum):
    observed = "observed"
    model = "model"
    imputed = "imputed"
    digest = "digest"
    status = "status"
    blocked = "blocked"


class Severity(str, Enum):
    info = "info"
    watch = "watch"
    elevated = "elevated"
    high = "high"


class Confidence(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"
    unknown = "unknown"


class SourceStatus(BaseModel):
    id: str
    title: str
    kind: str
    freshness: Freshness
    serving_allowed: bool = True
    path: str | None = None
    url: str | None = None
    checked_at: str | None = None
    observed_at: str | None = None
    age_minutes: float | None = None
    message: str | None = None


class SignalObservation(BaseModel):
    source_id: str
    label: str
    value: str | float | int | bool | None
    units: str | None = None
    observed_at: str | None = None
    freshness: Freshness = Freshness.unknown
    evidence_kind: EvidenceKind = EvidenceKind.observed
    confidence: Confidence = Confidence.unknown
    details: dict[str, Any] = Field(default_factory=dict)


class MapPoint(BaseModel):
    id: str
    label: str
    lat: float
    lon: float
    severity: Severity = Severity.info
    summary: str


class BriefCard(BaseModel):
    id: str
    title: str
    summary: str
    severity: Severity
    confidence: Confidence
    evidence_kind: EvidenceKind
    freshness: Freshness
    source_ids: list[str] = Field(default_factory=list)
    observations: list[SignalObservation] = Field(default_factory=list)
    why: str | None = None


class TodayBrief(BaseModel):
    region_id: str
    region_name: str
    generated_at: str
    headline: str
    cards: list[BriefCard]
    map_points: list[MapPoint]
    sources: list[SourceStatus]
    notes: list[str] = Field(default_factory=list)


class RefreshSourceResult(BaseModel):
    source_id: str
    ok: bool
    checked_at: str
    observed_at: str | None = None
    message: str
    observations: list[SignalObservation] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)


class RefreshRun(BaseModel):
    run_id: str
    started_at: str
    finished_at: str
    results: list[RefreshSourceResult]
    cache_path: str

