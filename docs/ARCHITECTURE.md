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
A Cloudflare Worker serves the static Vite build and handles API routes. The initial scaffold exposes health, overview, and source-status endpoints only. Collectors and database operations are not yet implemented.

## Ingestion
Each provider gets an independent collector and validation rules. A dispatcher schedules bounded tasks. Candidate providers:
- USGS GeoJSON for earthquakes.
- GDACS feed/API for disaster alerts.
- Approved RSS feeds for news.
- World Bank API for later economic indicators.

A public endpoint is not automatically approved for redistribution. Review terms, license, attribution, quotas, and reuse rights first.

## Storage
Cloudflare D1 is the planned primary store; cache is acceleration only. Initial entities: sources, events, articles, event_sources, collector_runs, indicators.

## API conventions
- Same-origin JSON under `/api`.
- Read-only MVP routes.
- Strict pagination and maximum page sizes.
- UTC ISO 8601 timestamps.
- Consistent error responses.
- No arbitrary URL-fetch endpoint.
- No public write/delete endpoints.

## Runtime
Collectors must use timeouts, bounded retries, response-size limits, cache, and stale-data indicators. Recheck Cloudflare quotas and provider terms before deployment.
