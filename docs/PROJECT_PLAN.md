# Project Plan

Status: approved planning baseline; initial scaffold in progress.

## Purpose
A source-traceable global monitoring dashboard for public information about global events. First release is for private/personal use.

## MVP
1. Global overview.
2. Interactive world map.
3. Global news from permitted RSS feeds.
4. Earthquake monitoring using USGS GeoJSON.
5. Disaster monitoring using an approved GDACS feed/API.
6. Event timeline with category and time filters.

## Out of scope initially
- Public multi-user accounts.
- Paid data providers.
- Flight tracking until access and terms are verified.
- Automated geopolitical claims presented as facts.
- AI-generated conclusions without source references and human review.
- Native Android app.

## Delivery sequence
1. Repository foundation and CI.
2. Responsive dashboard shell.
3. Map tile provider review and MapLibre integration.
4. D1 schema and read-only API.
5. USGS collector.
6. GDACS collector.
7. RSS collectors with a server-side allowlist.
8. Timeline, filters, and source status.
9. Security/reliability testing.
10. Private deployment after explicit approval.

## Definition of done
- CI build and typecheck pass.
- Live items show source, source URL, event/publication time, and collection time.
- Demo data is never mixed with live data.
- Duplicate records are prevented.
- Provider outages do not break the dashboard.
- API routes validate parameters and cap pagination.
- No secrets are committed or shipped to browsers.
- No unresolved critical/high security findings.
- Private access protection is tested before sharing a deployment URL.

## Principles
Preserve provenance. Keep publication time separate from collection time. Treat official-source status as provenance, not absolute truth. AI annotations never replace source data. Recheck provider terms, quotas, and licensing before activation.
