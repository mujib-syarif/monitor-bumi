# Cloudflare D1 Setup

This guide connects the Monitor Bumi Worker to its Cloudflare D1 database. It separates local development from changes to the real Cloudflare account.

## Current state

- The Worker expects a D1 binding named `DB`.
- The database name in `wrangler.jsonc` is `monitor-bumi`.
- Migrations are stored in `database/migrations/`.
- Migration `0002_usgs_earthquakes.sql` adds the USGS update timestamp and registers/enables the USGS source.
- The `database_id` value is intentionally a placeholder until a D1 database is created.
- A five-minute Cron Trigger is configured. It only collects data after deployment with a working D1 binding.

## Requirements

1. Node.js and npm installed.
2. The repository cloned locally.
3. Dependencies installed with `npm install`.
4. A Cloudflare account only if you intend to create or use a remote D1 database.

Never put Cloudflare API tokens in source files, GitHub commits, chat messages, or committed `.env` files. Use Wrangler's supported login flow.

## Step 1 - Create the D1 database

Authenticate with Wrangler:

```bash
npx wrangler login
```

Create the database in the intended Cloudflare account:

```bash
npx wrangler d1 create monitor-bumi
```

Wrangler prints a database ID. Copy it; it is account-specific configuration, not an API secret.

## Step 2 - Configure the binding

In `wrangler.jsonc`, replace:

```jsonc
"database_id": "REPLACE_AFTER_CREATING_D1_DATABASE"
```

with the ID returned by Wrangler. Keep the binding name `DB`, database name `monitor-bumi`, and migrations directory unchanged.

## Step 3 - Apply migrations locally

Install dependencies:

```bash
npm install
```

Apply all migrations to Wrangler's local D1 database:

```bash
npm run db:migrate:local
```

Check which migrations were applied:

```bash
npm run db:migrations:list:local
```

Inspect the local schema:

```bash
npm run db:check:local
```

These commands use local storage only. They do not create or modify a remote Cloudflare database.

## Step 4 - Run the Worker locally

Build the frontend assets:

```bash
npm run build
```

Start the Worker with its local D1 binding:

```bash
npm run dev:worker
```

Open the local address printed by Wrangler and inspect:

- `/api/health` - Worker health.
- `/api/sources` - configured source list.
- `/api/earthquakes` - stored USGS records and collection freshness.

The local earthquake endpoint can legitimately return zero records until a scheduled collection has run. The normal frontend Vite command (`npm run dev`) is not a substitute for running the Worker with its D1 binding.

## Step 5 - Remote migration and deployment

**Stop here until the Cloudflare account, database ID, access policy, and deployment target have been reviewed.** The following commands change remote resources.

When explicitly approved, apply migrations to the remote database:

```bash
npx wrangler d1 migrations apply monitor-bumi --remote
```

After reviewing access protection and Worker configuration, deployment can be performed separately:

```bash
npm run build
npm run deploy:worker
```

Do not deploy a public monitoring dashboard until its access policy and operational safeguards have been reviewed.

## Troubleshooting

### Wrangler cannot find the database

Confirm that the configured database ID belongs to the account selected by Wrangler and that the database name is exactly `monitor-bumi`.

### `/api/earthquakes` returns a database error

Confirm migrations were applied to the same database referenced by binding `DB`. Use the local scripts for local development. Use `--remote` only after review.

### No earthquake records appear

The collector is invoked by the deployed Worker's Cron Trigger. A successful local build does not prove remote ingestion. Check collector run records and Worker logs before diagnosing the USGS feed.

### The map has no basemap

Earthquake records and the basemap are separate systems. A map style provider URL still needs to be selected and its attribution and usage terms reviewed.

## Safety checklist

- [ ] Confirm the intended Cloudflare account.
- [ ] Create the D1 database and configure its ID.
- [ ] Apply and inspect migrations locally.
- [ ] Test the Worker locally.
- [ ] Review remote migration output before confirming it.
- [ ] Review authentication/access protection before deployment.
- [ ] Confirm map tile provider attribution and usage limits.
- [ ] Verify collector success and data freshness after deployment.
