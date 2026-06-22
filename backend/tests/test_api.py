from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_exposes_read_only_roots() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["cache_dir"].endswith("monterey-bay-today\\data\\cache")
    assert payload["mbal_project_root"].endswith("AI-Machine\\projects")


def test_today_brief_has_core_cards() -> None:
    response = client.get("/api/brief/today")
    assert response.status_code == 200
    payload = response.json()
    card_ids = {card["id"] for card in payload["cards"]}
    assert "active_alerts" in card_ids
    assert "ocean_now" in card_ids
    assert "beach_water_quality" in card_ids
    assert "hab_domoic_acid" in card_ids
    assert "shadow_watchlist" in card_ids
    assert payload["map_points"]
    assert payload["sources"]

