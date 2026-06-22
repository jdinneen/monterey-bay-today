from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from app.adapters.lakehouse import LakehouseReader  # noqa: E402
from app.adapters.live import LiveSignalFetcher  # noqa: E402
from app.services.brief import BriefService  # noqa: E402
from app.services.refresh import RefreshService  # noqa: E402
from app.settings import get_settings  # noqa: E402
from app.source_registry import SourceRegistry  # noqa: E402


def main() -> None:
    settings = get_settings()
    registry = SourceRegistry.load(settings)
    lakehouse = LakehouseReader(registry)
    refresh_service = RefreshService(settings, LiveSignalFetcher(registry))
    brief = BriefService(registry, lakehouse, refresh_service.latest()).today()

    out_dir = ROOT / "frontend" / "public" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "brief.json"
    out_path.write_text(json.dumps(brief.model_dump(), indent=2), encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    main()
