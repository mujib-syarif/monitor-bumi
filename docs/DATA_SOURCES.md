# Data Source Register

Status: candidate register. Review each source before production activation.

| Provider | Intended use | Initial status | Notes |
|---|---|---|---|
| USGS GeoJSON | Earthquakes | MVP candidate | Preserve event ID, origin time, magnitude, coordinates, and source URL |
| GDACS | Disaster alerts | MVP candidate | Review terms, alert semantics, attribution, and update cadence |
| RSS publishers/institutions | Global news | MVP candidate | Explicit allowlist; show headline, publisher, time, and link; do not republish full articles |
| World Bank API | Economic indicators | Later phase | Historical indicators, not real-time market prices |
| CISA advisories | Cyber alerts | Later phase | Review format, cadence, and attribution |
| OpenSky Network | Aviation | Deferred | Do not activate until access permission, rate limits, and terms are confirmed |

## Provider approval checklist
- Official documentation and endpoint identified.
- Terms and license reviewed.
- Display, redistribution, and attribution rights understood.
- Rate limits and expected volume documented.
- Fields and timestamp semantics understood.
- Format and maximum payload size known.
- Failure behavior and stale-data policy defined.
- Owner and review date recorded.

## RSS policy
Only fetch domains in a server-side allowlist. Prefer publisher-provided feeds. Do not accept feed URLs from public users. Store metadata and excerpts only where permitted. Link to the original publisher. Treat feed content as untrusted.

## Map tiles
MapLibre is a renderer and does not host tiles. Select a tile/style provider separately. Review attribution, caching, limits, and production terms. Public OpenStreetMap tile infrastructure is not an unlimited free production CDN.

## Freshness
Store provider publication/event time separately from collection time. Show stale status when data is older than the expected window. Never imply real-time coverage if upstream data is delayed.
