# Data Source Register

Status: USGS earthquake feed approved for ingestion with attribution. Other sources remain candidates pending review.

| Provider | Intended use | Initial status | Notes |
|---|---|---|---|
| USGS GeoJSON | Earthquakes | Enabled for MVP | Public-domain USGS data; credit the U.S. Geological Survey; five-minute polling |
| GDACS | Disaster alerts | MVP candidate | Review terms, alert semantics, attribution, and update cadence |
| RSS publishers/institutions | Global news | MVP candidate | Explicit allowlist; show headline, publisher, time, and link; do not republish full articles |
| World Bank API | Economic indicators | Later phase | Historical indicators, not real-time market prices |
| CISA advisories | Cyber alerts | Later phase | Review format, cadence, and attribution |
| OpenSky Network | Aviation | Deferred | Do not activate until access permission, rate limits, and terms are confirmed |

## USGS implementation

- Feed: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson`
- Poll interval: every five minutes.
- Source attribution: **Credit: U.S. Geological Survey**.
- Keep event origin time, source update time, and collection time separate.
- Use the USGS event ID for deduplication; update changed events instead of inserting duplicates.
- Reject malformed IDs, coordinates, timestamps, and unexpected payloads.
- The collector uses a fixed upstream URL, a timeout, a 4 MiB response cap, and a 1,000-feature processing cap.
- Dashboard reads are limited to 200 events per request and expose the last successful collection time.

USGS states that most USGS-produced data is public domain and requests credit. Some third-party media on USGS pages may have separate rights; Monitor Bumi stores earthquake feed metadata only and links to the original event page.

References:
- [USGS GeoJSON Summary Format](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)
- [USGS Copyrights and Credits](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)
- [USGS Acknowledging or Crediting USGS](https://www.usgs.gov/information-policies-and-instructions/acknowledging-or-crediting-usgs)

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
