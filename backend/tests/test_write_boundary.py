from __future__ import annotations

import pytest

from app.settings import get_settings


def test_cache_writes_are_limited_to_desktop_project() -> None:
    settings = get_settings()
    ok_path = settings.cache_dir / "example.json"
    assert settings.assert_cache_path(ok_path) == ok_path.resolve()

    with pytest.raises(ValueError):
        settings.assert_cache_path(settings.mbal_project_root / "lakehouse" / "should_not_write.json")

