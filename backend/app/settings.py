from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _resolve_path(value: str | Path) -> Path:
    return Path(value).expanduser().resolve()


@dataclass(frozen=True)
class Settings:
    project_root: Path
    backend_root: Path
    cache_dir: Path
    config_path: Path
    mbal_project_root: Path
    lakehouse_dir: Path
    shadow_dir: Path
    timezone: str = "America/Los_Angeles"

    def ensure_cache_dir(self) -> None:
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def assert_cache_path(self, path: Path) -> Path:
        resolved = path.resolve()
        cache_root = self.cache_dir.resolve()
        if resolved != cache_root and cache_root not in resolved.parents:
            raise ValueError(f"Refusing to write outside app cache: {resolved}")
        return resolved


def get_settings() -> Settings:
    backend_root = Path(__file__).resolve().parents[1]
    project_root = backend_root.parent
    mbal_project_root = _resolve_path(
        os.getenv("MBAL_PROJECT_ROOT", r"C:\Users\jondi\AI-Machine\projects")
    )
    lakehouse_dir = _resolve_path(os.getenv("MBAL_LAKEHOUSE_DIR", mbal_project_root / "lakehouse"))
    shadow_dir = _resolve_path(
        os.getenv("MBAL_SHADOW_DIR", lakehouse_dir / "semantic_shadow")
    )
    settings = Settings(
        project_root=project_root,
        backend_root=backend_root,
        cache_dir=project_root / "data" / "cache",
        config_path=project_root / "configs" / "sources.yaml",
        mbal_project_root=mbal_project_root,
        lakehouse_dir=lakehouse_dir,
        shadow_dir=shadow_dir,
    )
    settings.ensure_cache_dir()
    return settings

