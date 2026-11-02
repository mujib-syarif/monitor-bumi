# Monitor Bumi

A private-first, free-tier-first global monitoring dashboard built with React, TypeScript, Vite, MapLibre, ECharts, and Cloudflare Workers.

> **Current status:** USGS earthquake ingestion and dashboard integration are implemented. The D1 database has not yet been created or migrated, and no production Worker deployment has been performed. The map style provider is not configured.

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run typecheck:worker
npm run build
```

For local Worker + D1 development, follow [Cloudflare D1 setup](docs/D1_SETUP.md).

## Stack

- React + TypeScript + Vite
- MapLibre GL JS (renderer; tile/style provider selected separately)
- Apache ECharts (visualization dependency)
- Cloudflare Workers (API and static hosting)
- Cloudflare D1 (persistent event storage)
- GitHub Actions (CI)

## Environment

Copy `.env.example` to `.env.local`. `VITE_*` variables are public browser values. Never put secrets in them.

## Cloudflare setup

The Worker expects a D1 binding named `DB`. The database ID in `wrangler.jsonc` is intentionally a placeholder until a database is created in the intended Cloudflare account. Follow [the D1 setup guide](docs/D1_SETUP.md) and test locally before considering remote migrations or deployment.

## Documentation

- [Project plan](docs/PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Security](docs/SECURITY.md)
- [Data sources](docs/DATA_SOURCES.md)
- [Cloudflare D1 setup](docs/D1_SETUP.md)

## Important

The USGS collector uses the official USGS GeoJSON feed and preserves source links and collection/event timestamps. Live collection requires a configured D1 database and a deployed Worker with its Cron Trigger active. A successful frontend build does not prove that remote ingestion works.

The basemap is separate from earthquake data. A map style provider still needs to be selected, with its attribution and usage terms reviewed. Do not enable additional providers until their terms, attribution, rate limits, and reuse permissions have been reviewed.
