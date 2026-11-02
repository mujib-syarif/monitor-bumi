# Architecture

## High-level flow

```text
Public providers
 -> source-specific scheduled collectors
 -> validation and normalization
 -> deduplication
 -> Cloudflare D1
 -> read-only Worker API
 -> cache
 -> React dashboard
```

## Frontend

React + TypeScript + Vite. The browser consumes same-origin `/api/*` routes. Never expose provider credentials through `VITE_*` variables; they are bundled into public assets.

MapLibre is a renderer, not a map tile provider. Select a tile/style provider separately after reviewing terms, attribution, limits, and production suitability. ECharts is used for charts.

## Backend

A Cloudflare Worker serves the static Vite build and handles API routes. Read-only routes include health, overview, source status, and recent earthquakes. The Worker also runs the USGS collector on a five-minute Cron Trigger.

## Ingestion

Each provider gets an independent collector and validation rules. The USGS MVP collector:
- Fetches only the fixed official all-day GeoJSON feed.
- Uses a timeout and strict response/record limits.
- Validates event IDs, timestamps, magnitudes, and coordinates.
- Deduplicates by `(source_id, external_id)` and updates changed records.
- Records collector run status and collection time.
- Does not expose any public endpoint that can trigger an upstream fetch.

Next candidate providers:
- GDACS feed/API for disaster alerts.
- Approved RSS feeds for news.
- World Bank API for later economic indicators.

A public endpoint is not automatically approved for redistribution. Review terms, license, attribution, quotas, and reuse rights first.

## Storage

Cloudflare D1 is the primary store; cache is acceleration only. Entities: sources, events, articles, event_sources, collector_runs, indicators.

## API conventions

- Same-origin JSON under `/api`.
- Read-only MVP routes.
- Strict pagination and maximum page sizes.
- UTC ISO 8601 timestamps.
- Consistent error responses.
- No arbitrary URL-fetch endpoint.
- No public write/delete endpoints.

## Runtime

Collectors use timeouts, bounded payloads, deduplication, and stale-data indicators. Recheck Cloudflare quotas and provider terms before deployment.
