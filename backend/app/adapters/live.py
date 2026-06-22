from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable

import httpx

from app.models import Confidence, EvidenceKind, Freshness, RefreshSourceResult, SignalObservation
from app.source_registry import SourceConfig, SourceRegistry


MONTEREY_TERMS = (
    "monterey",
    "santa cruz",
    "moss landing",
    "pacific grove",
    "seaside",
    "marina",
    "carmel",
    "big sur",
    "salinas",
)


class LiveSignalFetcher:
    def __init__(self, registry: SourceRegistry) -> None:
        self.registry = registry

    async def fetch_all(self) -> list[RefreshSourceResult]:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
            headers={"User-Agent": "monterey-bay-today/0.1 (local public-interest app)"},
        ) as client:
            jobs: list[tuple[SourceConfig, Callable[[httpx.AsyncClient, SourceConfig], Awaitable[RefreshSourceResult]]]] = [
                (source, self._fetch_for_kind(source.kind))
                for source in self.registry.live_sources
            ]
            results: list[RefreshSourceResult] = []
            for source, fetcher in jobs:
                results.append(await self._safe_fetch(client, source, fetcher))
            return results

    def _fetch_for_kind(
        self, kind: str
    ) -> Callable[[httpx.AsyncClient, SourceConfig], Awaitable[RefreshSourceResult]]:
        if kind == "nws_alerts":
            return self._fetch_nws_alerts
        if kind == "coops_water_level":
            return self._fetch_coops_water_level
        if kind == "ndbc_realtime":
            return self._fetch_ndbc_realtime
        return self._unsupported

    async def _safe_fetch(
        self,
        client: httpx.AsyncClient,
        source: SourceConfig,
        fetcher: Callable[[httpx.AsyncClient, SourceConfig], Awaitable[RefreshSourceResult]],
    ) -> RefreshSourceResult:
        try:
            return await fetcher(client, source)
        except Exception as exc:  # network feeds should fail closed into the brief
            now = datetime.now(timezone.utc).isoformat()
            return RefreshSourceResult(
                source_id=source.id,
                ok=False,
                checked_at=now,
                message=f"feed unavailable: {exc.__class__.__name__}: {exc}",
            )

    async def _fetch_nws_alerts(
        self, client: httpx.AsyncClient, source: SourceConfig
    ) -> RefreshSourceResult:
        response = await client.get(source.url or "")
        response.raise_for_status()
        payload = response.json()
        features = payload.get("features", [])
        matches = []
        for feature in features:
            props = feature.get("properties", {})
            area = f"{props.get('areaDesc', '')} {props.get('headline', '')} {props.get('description', '')}".lower()
            if any(term in area for term in MONTEREY_TERMS):
                matches.append(props)

        observations = [
            SignalObservation(
                source_id=source.id,
                label=props.get("event") or "Weather alert",
                value=props.get("headline") or props.get("areaDesc") or "active alert",
                observed_at=props.get("sent") or props.get("effective"),
                freshness=Freshness.live,
                evidence_kind=EvidenceKind.observed,
                confidence=Confidence.high,
                details={
                    "severity": props.get("severity"),
                    "certainty": props.get("certainty"),
                    "urgency": props.get("urgency"),
                    "area": props.get("areaDesc"),
                    "ends": props.get("ends"),
                },
            )
            for props in matches[:6]
        ]
        now = datetime.now(timezone.utc).isoformat()
        return RefreshSourceResult(
            source_id=source.id,
            ok=True,
            checked_at=now,
            observed_at=observations[0].observed_at if observations else now,
            message=f"{len(observations)} Monterey Bay area alerts",
            observations=observations,
            raw={"count": len(matches)},
        )

    async def _fetch_coops_water_level(
        self, client: httpx.AsyncClient, source: SourceConfig
    ) -> RefreshSourceResult:
        params = {
            "date": "latest",
            "station": source.station,
            "product": "water_level",
            "datum": "MLLW",
            "time_zone": "lst_ldt",
            "units": "english",
            "format": "json",
            "application": "monterey_bay_today",
        }
        response = await client.get(source.url or "", params=params)
        response.raise_for_status()
        payload = response.json()
        row = (payload.get("data") or [{}])[0]
        observed_at = row.get("t")
        value = _safe_float(row.get("v"))
        obs = SignalObservation(
            source_id=source.id,
            label="Monterey water level",
            value=value,
            units="ft MLLW",
            observed_at=observed_at,
            freshness=Freshness.live,
            evidence_kind=EvidenceKind.observed,
            confidence=Confidence.high,
            details={"station": source.station, "sigma": row.get("s"), "quality": row.get("q")},
        )
        now = datetime.now(timezone.utc).isoformat()
        return RefreshSourceResult(
            source_id=source.id,
            ok=value is not None,
            checked_at=now,
            observed_at=observed_at,
            message="latest Monterey tide gauge water level" if value is not None else "no latest water level returned",
            observations=[obs] if value is not None else [],
            raw={"station": source.station},
        )

    async def _fetch_ndbc_realtime(
        self, client: httpx.AsyncClient, source: SourceConfig
    ) -> RefreshSourceResult:
        response = await client.get(source.url or "")
        response.raise_for_status()
        lines = [line for line in response.text.splitlines() if line.strip()]
        if len(lines) < 3:
            raise ValueError("NDBC response did not include observations")
        header = re.sub(r"^#\s*", "", lines[0]).split()
        units = re.sub(r"^#\s*", "", lines[1]).split()
        values = lines[2].split()
        row = dict(zip(header, values, strict=False))
        unit_row = dict(zip(header, units, strict=False))
        observed_at = _ndbc_time(row)
        wave_height = _safe_float(row.get("WVHT"))
        wind_speed = _safe_float(row.get("WSPD"))
        water_temp = _safe_float(row.get("WTMP"))
        observations = [
            SignalObservation(
                source_id=source.id,
                label="Significant wave height",
                value=wave_height,
                units=unit_row.get("WVHT") or "m",
                observed_at=observed_at,
                freshness=Freshness.live,
                evidence_kind=EvidenceKind.observed,
                confidence=Confidence.high if wave_height is not None else Confidence.unknown,
                details={"station": source.station},
            ),
            SignalObservation(
                source_id=source.id,
                label="Wind speed",
                value=wind_speed,
                units=unit_row.get("WSPD") or "m/s",
                observed_at=observed_at,
                freshness=Freshness.live,
                evidence_kind=EvidenceKind.observed,
                confidence=Confidence.high if wind_speed is not None else Confidence.unknown,
                details={"station": source.station},
            ),
            SignalObservation(
                source_id=source.id,
                label="Water temperature",
                value=water_temp,
                units=unit_row.get("WTMP") or "deg C",
                observed_at=observed_at,
                freshness=Freshness.live,
                evidence_kind=EvidenceKind.observed,
                confidence=Confidence.high if water_temp is not None else Confidence.unknown,
                details={"station": source.station},
            ),
        ]
        now = datetime.now(timezone.utc).isoformat()
        return RefreshSourceResult(
            source_id=source.id,
            ok=True,
            checked_at=now,
            observed_at=observed_at,
            message="latest Monterey Bay buoy observation",
            observations=[obs for obs in observations if obs.value is not None],
            raw={"station": source.station},
        )

    async def _unsupported(
        self, _client: httpx.AsyncClient, source: SourceConfig
    ) -> RefreshSourceResult:
        now = datetime.now(timezone.utc).isoformat()
        return RefreshSourceResult(
            source_id=source.id,
            ok=False,
            checked_at=now,
            message=f"unsupported live source kind: {source.kind}",
        )


def _safe_float(value: Any) -> float | None:
    try:
        if value in (None, "MM", ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _ndbc_time(row: dict[str, str]) -> str | None:
    keys = ("#YY", "YY", "MM", "DD", "hh", "mm")
    if not all(key in row for key in keys[1:]):
        return None
    year = row.get("#YY") or row.get("YY")
    try:
        dt = datetime(
            int(year or "0"),
            int(row["MM"]),
            int(row["DD"]),
            int(row["hh"]),
            int(row["mm"]),
            tzinfo=timezone.utc,
        )
    except ValueError:
        return None
    return dt.isoformat()

