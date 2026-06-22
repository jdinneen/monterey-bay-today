# Monterey Bay Today

A public-first "what is happening in Monterey Bay today" app. It reads the existing Monterey Bay AI Lab lakehouse and semantic-shadow outputs as read-only inputs, then keeps its own refresh cache in this project.

## Run Locally

Backend:

```powershell
cd C:\Users\jondi\Desktop\monterey-bay-today\backend
$env:MBAL_PROJECT_ROOT="C:\Users\jondi\AI-Machine\projects"
uvicorn app.main:app --host 127.0.0.1 --port 8787 --reload
```

Frontend:

```powershell
cd C:\Users\jondi\Desktop\monterey-bay-today\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173`.

## Contract

- Reads from `MBAL_PROJECT_ROOT`, `MBAL_LAKEHOUSE_DIR`, and `MBAL_SHADOW_DIR`.
- Writes only to `data/cache/` inside this project.
- Labels every item as observed, model-derived, imputed, digest-only, or blocked.
- Shows freshness so stale data is visible instead of silently treated as live.

