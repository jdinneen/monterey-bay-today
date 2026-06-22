# Architecture

## Boundary

`monterey-bay-today` is a consumer project. It reads the lab lakehouse and shadow outputs but never writes into them. Refresh state, live-feed cache, and app metadata live under this project's `data/cache/`.

## Data Flow

1. `SourceRegistry` loads `configs/sources.yaml` and expands environment-backed paths.
2. `LakehouseReader` reads local evidence snapshots and source metadata.
3. `RefreshService` fetches live public feeds and stores the latest raw normalized cache.
4. `BriefService` assembles a public `TodayBrief` with confidence and freshness labels.
5. React renders the brief, map points, and source evidence.

## Evidence Labels

- `observed`: direct measurement or active public alert.
- `model`: validated model or retrospective/pilot evidence from the lakehouse snapshot.
- `imputed`: inferred signal, not a direct observation.
- `digest`: human-readable operational digest, not predictive evidence.
- `blocked`: known source gap or unavailable feed.

