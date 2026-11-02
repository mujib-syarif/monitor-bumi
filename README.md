# Monitor Bumi

A private-first, free-tier-first global monitoring dashboard built with React, TypeScript, Vite, MapLibre, ECharts, and Cloudflare Workers.

> **Current status:** initial scaffold. Dashboard cards are prototype placeholders. No live data collectors or production map tile provider are enabled.

## Local development

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

```bash
npm run typecheck
npm run build
```

## Stack

- React + TypeScript + Vite
- MapLibre GL JS (renderer; tile/style provider selected separately)
- Apache ECharts (visualization dependency)
- Cloudflare Workers (API and static hosting)
- Cloudflare D1 (planned persistent storage)
- GitHub Actions (CI)

## Environment

Copy `.env.example` to `.env.local`. `VITE_*` variables are public browser values. Never put secrets in them.

## Cloudflare setup

Before deployment, create a D1 database and replace the placeholder database ID in `wrangler.jsonc`. Review current Cloudflare quotas, provider terms, and `docs/SECURITY.md`. Deployment credentials and production deployment are intentionally not configured yet.

## Documentation

- [Project plan](docs/PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Threat model](docs/THREAT_MODEL.md)
- [Security](docs/SECURITY.md)
- [Data sources](docs/DATA_SOURCES.md)

## Important

Demo entries and the map illustration are not live reports. Every live item must retain its source URL and timestamps. Do not enable a provider until its terms, attribution, rate limits, and reuse permissions have been reviewed.
