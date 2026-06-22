from __future__ import annotations

from app.settings import get_settings
from app.source_registry import SourceRegistry


def test_registry_expands_existing_lakehouse_paths() -> None:
    settings = get_settings()
    registry = SourceRegistry.load(settings)
    mission = registry.source("mission_control_snapshot")
    inventory = registry.source("source_inventory")
    assert mission.path is not None
    assert inventory.path is not None
    assert str(mission.path).endswith("mbal-mission-control\\data.json")
    assert str(inventory.path).endswith("lakehouse\\silver\\source_inventory\\source_inventory.json")


def test_registry_has_live_refresh_sources() -> None:
    settings = get_settings()
    registry = SourceRegistry.load(settings)
    kinds = {source.kind for source in registry.live_sources}
    assert {"nws_alerts", "coops_water_level", "ndbc_realtime"}.issubset(kinds)

