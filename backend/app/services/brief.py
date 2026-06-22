from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from app.adapters.lakehouse import LakehouseReader
from app.models import (
    BriefCard,
    Confidence,
    EvidenceKind,
    Freshness,
    MapPoint,
    RefreshRun,
    Severity,
    SignalObservation,
    SourceStatus,
    TodayBrief,
)
from app.source_registry import SourceRegistry


class BriefService:
    def __init__(
        self,
        registry: SourceRegistry,
        lakehouse: LakehouseReader,
        latest_refresh: RefreshRun | None,
    ) -> None:
        self.registry = registry
        self.lakehouse = lakehouse
        self.latest_refresh = latest_refresh

    def today(self, region: str = "monterey_bay") -> TodayBrief:
        region_cfg = self.registry.region
        tz = ZoneInfo(region_cfg.get("timezone", "America/Los_Angeles"))
        generated_at = datetime.now(tz).isoformat()
        cards = [
            self._alerts_card(),
            self._ocean_card(),
            self._water_quality_card(),
            self._hab_card(),
            self._shadow_watchlist_card(),
            self._source_coverage_card(),
        ]
        active_cards = [card for card in cards if card is not None]
        sources = self._source_statuses()
        return TodayBrief(
            region_id=region,
            region_name=region_cfg["name"],
            generated_at=generated_at,
            headline=self._headline(active_cards),
            cards=active_cards,
            map_points=self._map_points(active_cards),
            sources=sources,
            notes=[
                "This is not an official beach closure, weather warning, or emergency notice.",
                "Imputed and shadow signals are labeled separately from direct observations.",
            ],
        )

    def _alerts_card(self) -> BriefCard:
        observations = self._live_observations("nws_alerts_ca")
        if observations:
            return BriefCard(
                id="active_alerts",
                title="Active Alerts",
                summary=f"{len(observations)} Monterey Bay area weather or marine alert(s) are active.",
                severity=Severity.elevated,
                confidence=Confidence.high,
                evidence_kind=EvidenceKind.observed,
                freshness=Freshness.live,
                source_ids=["nws_alerts_ca"],
                observations=observations,
                why="NWS active alerts mention Monterey Bay area places or nearby coastal zones.",
            )
        return BriefCard(
            id="active_alerts",
            title="Active Alerts",
            summary="No Monterey Bay area alert is cached right now.",
            severity=Severity.info,
            confidence=Confidence.medium if self.latest_refresh else Confidence.unknown,
            evidence_kind=EvidenceKind.observed,
            freshness=Freshness.recent_cache if self.latest_refresh else Freshness.unknown,
            source_ids=["nws_alerts_ca"],
            why="A refresh checks the NWS active-alert feed and filters to local coastal terms.",
        )

    def _ocean_card(self) -> BriefCard:
        obs = [
            *self._live_observations("ndbc_46042"),
            *self._live_observations("coops_monterey_water_level"),
        ]
        if not obs:
            return BriefCard(
                id="ocean_now",
                title="Ocean Now",
                summary="Live buoy and tide-gauge values are not cached yet.",
                severity=Severity.watch,
                confidence=Confidence.unknown,
                evidence_kind=EvidenceKind.observed,
                freshness=Freshness.blocked,
                source_ids=["ndbc_46042", "coops_monterey_water_level"],
                why="The app still keeps the local lakehouse available, but this card needs live NOAA feeds for today's conditions.",
            )
        pieces = []
        for item in obs:
            if item.value is None:
                continue
            units = f" {item.units}" if item.units else ""
            pieces.append(f"{item.label}: {item.value}{units}")
        return BriefCard(
            id="ocean_now",
            title="Ocean Now",
            summary="; ".join(pieces[:4]) if pieces else "Live ocean observations are present.",
            severity=self._ocean_severity(obs),
            confidence=Confidence.high,
            evidence_kind=EvidenceKind.observed,
            freshness=Freshness.live,
            source_ids=["ndbc_46042", "coops_monterey_water_level"],
            observations=obs,
            why="Buoy 46042 and the Monterey tide gauge are direct public observations.",
        )

    def _water_quality_card(self) -> BriefCard:
        finding = self.lakehouse.finding_by_id(
            [
                "claim_bacteria_decision_rule",
                "claim_clean_to_dirty_onset",
                "claim_bacteria_station_memory_supported",
            ]
        )
        if not finding:
            return BriefCard(
                id="beach_water_quality",
                title="Beach Water Quality",
                summary="The local bacteria model evidence snapshot is missing.",
                severity=Severity.watch,
                confidence=Confidence.unknown,
                evidence_kind=EvidenceKind.blocked,
                freshness=Freshness.blocked,
                source_ids=["mission_control_snapshot"],
            )
        headline = finding.get("headline") or finding.get("plain") or "bacteria model evidence available"
        plain = finding.get("plain") or headline
        return BriefCard(
            id="beach_water_quality",
            title="Beach Water Quality",
            summary=plain,
            severity=Severity.watch,
            confidence=Confidence.high,
            evidence_kind=EvidenceKind.model,
            freshness=Freshness.recent_cache,
            source_ids=["mission_control_snapshot", "signal_catalog"],
            observations=[
                SignalObservation(
                    source_id="mission_control_snapshot",
                    label=finding.get("title") or "Bacteria model",
                    value=headline,
                    freshness=Freshness.recent_cache,
                    evidence_kind=EvidenceKind.model,
                    confidence=Confidence.high,
                    details=finding.get("metrics") or {},
                )
            ],
            why=finding.get("note") or "The lakehouse snapshot carries the current validated bacteria-model evidence.",
        )

    def _hab_card(self) -> BriefCard:
        finding = self.lakehouse.finding_by_id(
            [
                "claim_da_toxic_onset_ci_separated",
                "claim_hab_exceed_strict_critic",
                "status_non_bacteria_night_run_tight_gate",
            ]
        )
        if not finding:
            return BriefCard(
                id="hab_domoic_acid",
                title="HAB / Domoic Acid",
                summary="The HAB evidence snapshot is missing.",
                severity=Severity.watch,
                confidence=Confidence.unknown,
                evidence_kind=EvidenceKind.blocked,
                freshness=Freshness.blocked,
                source_ids=["mission_control_snapshot"],
            )
        return BriefCard(
            id="hab_domoic_acid",
            title="HAB / Domoic Acid",
            summary=finding.get("plain") or finding.get("headline") or "HAB evidence available.",
            severity=Severity.watch,
            confidence=Confidence.medium,
            evidence_kind=EvidenceKind.model,
            freshness=Freshness.recent_cache,
            source_ids=["mission_control_snapshot", "source_inventory"],
            observations=[
                SignalObservation(
                    source_id="mission_control_snapshot",
                    label=finding.get("title") or "HAB model",
                    value=finding.get("headline"),
                    freshness=Freshness.recent_cache,
                    evidence_kind=EvidenceKind.model,
                    confidence=Confidence.medium,
                    details=finding.get("metrics") or {},
                )
            ],
            why=finding.get("note") or "The lakehouse snapshot carries the current HAB model evidence.",
        )

    def _shadow_watchlist_card(self) -> BriefCard:
        summary = self.lakehouse.shadow_summary()
        if not summary:
            return BriefCard(
                id="shadow_watchlist",
                title="Shadow Watchlist",
                summary="The semantic-shadow summary is not available.",
                severity=Severity.info,
                confidence=Confidence.unknown,
                evidence_kind=EvidenceKind.blocked,
                freshness=Freshness.blocked,
                source_ids=["semantic_shadow_summary"],
            )
        first_lead = self._first_table_signal(summary)
        return BriefCard(
            id="shadow_watchlist",
            title="Shadow Watchlist",
            summary=first_lead or "Shadow discovery has candidate leads, but they remain watchlist evidence.",
            severity=Severity.info,
            confidence=Confidence.low,
            evidence_kind=EvidenceKind.imputed,
            freshness=Freshness.imputed,
            source_ids=["semantic_shadow_summary"],
            observations=[
                SignalObservation(
                    source_id="semantic_shadow_summary",
                    label="Shadow discovery status",
                    value="watchlist only",
                    freshness=Freshness.imputed,
                    evidence_kind=EvidenceKind.imputed,
                    confidence=Confidence.low,
                )
            ],
            why="Semantic-shadow findings are useful for discovery, but they are not promoted as public safety claims.",
        )

    def _source_coverage_card(self) -> BriefCard:
        inventory = self.lakehouse.top_inventory_sources(
            [
                "monterey",
                "beachwatch",
                "beach report",
                "safe-to-swim",
                "beacon",
                "c_harm",
                "habmap",
                "calhabmap",
                "coops",
                "ndbc",
                "cdip",
                "surfrider",
            ],
            limit=6,
        )
        names = [row.get("title") or row.get("source") for row in inventory if row]
        summary = (
            f"Local lakehouse has {len(names)} relevant source families ready for the brief."
            if names
            else "Local source inventory is available, but no Monterey-specific rows were matched."
        )
        return BriefCard(
            id="source_coverage",
            title="Source Coverage",
            summary=summary,
            severity=Severity.info,
            confidence=Confidence.high if names else Confidence.medium,
            evidence_kind=EvidenceKind.status,
            freshness=Freshness.recent_cache,
            source_ids=["source_inventory"],
            observations=[
                SignalObservation(
                    source_id="source_inventory",
                    label="Matched local sources",
                    value=name,
                    freshness=Freshness.recent_cache,
                    evidence_kind=EvidenceKind.status,
                    confidence=Confidence.high,
                )
                for name in names[:5]
            ],
            why="The source inventory tells the app what local evidence exists before any live feed succeeds.",
        )

    def _source_statuses(self) -> list[SourceStatus]:
        statuses = {status.id: status for status in self.lakehouse.local_statuses()}
        for source in self.registry.live_sources:
            result = self._live_result(source.id)
            statuses[source.id] = SourceStatus(
                id=source.id,
                title=source.title,
                kind=source.kind,
                url=source.url,
                freshness=Freshness.live if result and result.ok else Freshness.blocked if result else Freshness.unknown,
                serving_allowed=source.serving_allowed,
                checked_at=result.checked_at if result else None,
                observed_at=result.observed_at if result else None,
                message=result.message if result else "not refreshed yet",
            )
        return list(statuses.values())

    def _live_result(self, source_id: str):
        if not self.latest_refresh:
            return None
        for result in self.latest_refresh.results:
            if result.source_id == source_id:
                return result
        return None

    def _live_observations(self, source_id: str) -> list[SignalObservation]:
        result = self._live_result(source_id)
        if not result or not result.ok:
            return []
        return result.observations

    def _headline(self, cards: list[BriefCard]) -> str:
        if any(card.severity == Severity.high for card in cards):
            return "High-priority Monterey Bay signals are active today."
        alert_card = next((card for card in cards if card.id == "active_alerts"), None)
        if alert_card and alert_card.severity == Severity.elevated:
            return alert_card.summary
        live_count = sum(
            1
            for card in cards
            if card.freshness in {Freshness.live, Freshness.recent_cache}
        )
        return f"Monterey Bay brief is built from {live_count} current or cached evidence cards."

    def _map_points(self, cards: list[BriefCard]) -> list[MapPoint]:
        severity = Severity.elevated if any(card.severity == Severity.elevated for card in cards) else Severity.info
        return [
            MapPoint(
                id="santa_cruz",
                label="Santa Cruz",
                lat=36.9741,
                lon=-122.0308,
                severity=severity,
                summary="North bay beaches and nearshore signals.",
            ),
            MapPoint(
                id="moss_landing",
                label="Moss Landing",
                lat=36.8044,
                lon=-121.7869,
                severity=Severity.watch,
                summary="Harbor, slough, and central bay signal point.",
            ),
            MapPoint(
                id="monterey",
                label="Monterey",
                lat=36.6002,
                lon=-121.8947,
                severity=severity,
                summary="South bay tide, beaches, and pier context.",
            ),
        ]

    def _ocean_severity(self, obs: list[SignalObservation]) -> Severity:
        wave = next((item for item in obs if item.label == "Significant wave height"), None)
        wind = next((item for item in obs if item.label == "Wind speed"), None)
        if isinstance(wave.value if wave else None, (int, float)) and float(wave.value) >= 3:
            return Severity.elevated
        if isinstance(wind.value if wind else None, (int, float)) and float(wind.value) >= 12:
            return Severity.elevated
        return Severity.info

    def _first_table_signal(self, markdown: str) -> str | None:
        for line in markdown.splitlines():
            if not line.startswith("| `"):
                continue
            cells = [cell.strip(" `") for cell in line.strip("|").split("|")]
            if len(cells) >= 4 and cells[0] not in {"domain", "---"}:
                return f"Watchlist lead: {cells[0]} target {cells[1]} is associated with {cells[2]}."
        return None
