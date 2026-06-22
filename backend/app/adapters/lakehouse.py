from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.models import Freshness, SourceStatus
from app.source_registry import SourceConfig, SourceRegistry


class LakehouseReader:
    def __init__(self, registry: SourceRegistry) -> None:
        self.registry = registry

    def mission_snapshot(self) -> dict[str, Any]:
        source = self.registry.source("mission_control_snapshot")
        return self._read_json(source.path)

    def source_inventory(self) -> list[dict[str, Any]]:
        source = self.registry.source("source_inventory")
        data = self._read_json(source.path)
        return data if isinstance(data, list) else []

    def shadow_summary(self) -> str:
        source = self.registry.source("semantic_shadow_summary")
        if not source.path or not source.path.exists():
            return ""
        return source.path.read_text(encoding="utf-8", errors="replace")

    def local_statuses(self) -> list[SourceStatus]:
        statuses: list[SourceStatus] = []
        now = datetime.now(timezone.utc)
        for source in self.registry.local_sources:
            if not source.path or not source.path.exists():
                statuses.append(
                    SourceStatus(
                        id=source.id,
                        title=source.title,
                        kind=source.kind,
                        path=str(source.path) if source.path else None,
                        freshness=Freshness.blocked,
                        serving_allowed=source.serving_allowed,
                        checked_at=now.isoformat(),
                        message="missing local source",
                    )
                )
                continue
            mtime = datetime.fromtimestamp(source.path.stat().st_mtime, timezone.utc)
            age_minutes = (now - mtime).total_seconds() / 60
            freshness = self._freshness_from_age(source, age_minutes)
            statuses.append(
                SourceStatus(
                    id=source.id,
                    title=source.title,
                    kind=source.kind,
                    path=str(source.path),
                    freshness=freshness,
                    serving_allowed=source.serving_allowed,
                    checked_at=now.isoformat(),
                    observed_at=mtime.isoformat(),
                    age_minutes=round(age_minutes, 1),
                    message="available",
                )
            )
        return statuses

    def finding_by_id(self, finding_ids: list[str]) -> dict[str, Any] | None:
        data = self.mission_snapshot()
        findings = data.get("state", {}).get("findings", [])
        for finding_id in finding_ids:
            for finding in findings:
                if finding.get("id") == finding_id:
                    return finding
        return None

    def top_inventory_sources(self, terms: list[str], limit: int = 8) -> list[dict[str, Any]]:
        rows = self.source_inventory()
        matches: list[dict[str, Any]] = []
        lowered = [term.lower() for term in terms]
        for row in rows:
            haystack = " ".join(
                str(row.get(key, "")) for key in ("source", "title", "status", "curated_path")
            ).lower()
            if any(term in haystack for term in lowered):
                matches.append(row)
        return matches[:limit]

    def _read_json(self, path: Path | None) -> Any:
        if not path or not path.exists():
            return {}
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _freshness_from_age(self, source: SourceConfig, age_minutes: float) -> Freshness:
        limit = source.freshness_minutes
        if limit is None and source.freshness_hours is not None:
            limit = source.freshness_hours * 60
        if limit is None:
            return Freshness.unknown
        if age_minutes <= limit:
            return Freshness.recent_cache
        return Freshness.stale

