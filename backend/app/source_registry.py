from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from app.models import Freshness, SourceStatus
from app.settings import Settings


@dataclass(frozen=True)
class SourceConfig:
    id: str
    title: str
    kind: str
    serving_allowed: bool
    freshness_hours: float | None = None
    freshness_minutes: float | None = None
    path: Path | None = None
    url: str | None = None
    station: str | None = None


class SourceRegistry:
    def __init__(self, settings: Settings, data: dict[str, Any]) -> None:
        self.settings = settings
        self.data = data
        self.region = data["app"]["region"]
        self.local_sources = [self._parse_source(item) for item in data.get("local_sources", [])]
        self.live_sources = [self._parse_source(item) for item in data.get("live_sources", [])]

    @classmethod
    def load(cls, settings: Settings) -> "SourceRegistry":
        with settings.config_path.open("r", encoding="utf-8") as handle:
            data = yaml.safe_load(handle)
        return cls(settings, data)

    def source(self, source_id: str) -> SourceConfig:
        for source in [*self.local_sources, *self.live_sources]:
            if source.id == source_id:
                return source
        raise KeyError(source_id)

    def public_statuses(self) -> list[SourceStatus]:
        statuses: list[SourceStatus] = []
        for source in self.local_sources:
            exists = bool(source.path and source.path.exists())
            statuses.append(
                SourceStatus(
                    id=source.id,
                    title=source.title,
                    kind=source.kind,
                    path=str(source.path) if source.path else None,
                    serving_allowed=source.serving_allowed,
                    freshness=Freshness.recent_cache if exists else Freshness.blocked,
                    message="available" if exists else "missing local source",
                )
            )
        for source in self.live_sources:
            statuses.append(
                SourceStatus(
                    id=source.id,
                    title=source.title,
                    kind=source.kind,
                    url=source.url,
                    serving_allowed=source.serving_allowed,
                    freshness=Freshness.unknown,
                    message="not refreshed yet",
                )
            )
        return statuses

    def _parse_source(self, item: dict[str, Any]) -> SourceConfig:
        path_value = item.get("path")
        return SourceConfig(
            id=item["id"],
            title=item["title"],
            kind=item["kind"],
            serving_allowed=bool(item.get("serving_allowed", True)),
            freshness_hours=item.get("freshness_hours"),
            freshness_minutes=item.get("freshness_minutes"),
            path=self._expand_path(path_value) if path_value else None,
            url=item.get("url"),
            station=item.get("station"),
        )

    def _expand_path(self, value: str) -> Path:
        replacements = {
            "${MBAL_PROJECT_ROOT}": str(self.settings.mbal_project_root),
            "${MBAL_LAKEHOUSE_DIR}": str(self.settings.lakehouse_dir),
            "${MBAL_SHADOW_DIR}": str(self.settings.shadow_dir),
        }
        expanded = value
        for key, replacement in replacements.items():
            expanded = expanded.replace(key, replacement)
        return Path(expanded).resolve()

