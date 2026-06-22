from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from app.adapters.live import LiveSignalFetcher
from app.models import RefreshRun, RefreshSourceResult
from app.settings import Settings


class RefreshService:
    def __init__(self, settings: Settings, fetcher: LiveSignalFetcher) -> None:
        self.settings = settings
        self.fetcher = fetcher
        self.cache_path = settings.assert_cache_path(settings.cache_dir / "live_latest.json")
        self.db_path = settings.assert_cache_path(settings.cache_dir / "refresh_state.sqlite")
        self._init_db()

    async def refresh(self) -> RefreshRun:
        started = datetime.now(timezone.utc)
        results = await self.fetcher.fetch_all()
        finished = datetime.now(timezone.utc)
        run = RefreshRun(
            run_id=uuid4().hex,
            started_at=started.isoformat(),
            finished_at=finished.isoformat(),
            results=results,
            cache_path=str(self.cache_path),
        )
        self._write_cache(run)
        self._record_run(run)
        return run

    def latest(self) -> RefreshRun | None:
        if not self.cache_path.exists():
            return None
        with self.cache_path.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
        return RefreshRun.model_validate(payload)

    def _write_cache(self, run: RefreshRun) -> None:
        self.cache_path.write_text(run.model_dump_json(indent=2), encoding="utf-8")

    def _record_run(self, run: RefreshRun) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                insert into refresh_runs(run_id, started_at, finished_at, ok_sources, failed_sources, cache_path)
                values (?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.started_at,
                    run.finished_at,
                    sum(1 for result in run.results if result.ok),
                    sum(1 for result in run.results if not result.ok),
                    run.cache_path,
                ),
            )
            for result in run.results:
                self._record_source(conn, run.run_id, result)

    def _record_source(
        self, conn: sqlite3.Connection, run_id: str, result: RefreshSourceResult
    ) -> None:
        conn.execute(
            """
            insert into refresh_source_results(
                run_id, source_id, ok, checked_at, observed_at, message, observation_count
            )
            values (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                result.source_id,
                int(result.ok),
                result.checked_at,
                result.observed_at,
                result.message,
                len(result.observations),
            ),
        )

    def _init_db(self) -> None:
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                create table if not exists refresh_runs (
                    run_id text primary key,
                    started_at text not null,
                    finished_at text not null,
                    ok_sources integer not null,
                    failed_sources integer not null,
                    cache_path text not null
                )
                """
            )
            conn.execute(
                """
                create table if not exists refresh_source_results (
                    id integer primary key autoincrement,
                    run_id text not null,
                    source_id text not null,
                    ok integer not null,
                    checked_at text not null,
                    observed_at text,
                    message text not null,
                    observation_count integer not null
                )
                """
            )

