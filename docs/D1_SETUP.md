# Cloudflare D1 Setup

This guide connects the Monitor Bumi Worker to its Cloudflare D1 database. It separates local development from changes to the real Cloudflare account.

## Current state

- The Worker expects a D1 binding named `DB`.
- The database name in `wrangler.jsonc` is `monitor-bumi`.
- The migration files are stored in `database/migrations/`.
- The `database_id` value is intentionally a placeholder until a D1 database is created.
- The Worker has a five-minute Cron Trigger configured. It will only collect data after the Worker is deployed with a working D1 binding.

## Requirements

1. Node.js and npm installed.
2. The repository cloned locally.
3. Dependencies installed with `npm install`.
4. A Cloudflare account only if you intend to create or use a remote D1 database.

Do not put Cloudflare API tokens in source files, GitHub commits, chat messages, or `.env` files committed to the repository. Wrangler authentication should be handled through its supported login flow.

## Step 1 - Create the D1 database

From the repository root, authenticate with Wrangler:

```bash
npx wrangler login
```

Then create the database:

```bash
npx wrangler d1 create monitor-bumi
```

Wrangler prints a database ID. Copy that ID; it is not a secret, but it is specific to your Cloudflare account.

## Step 2 - Configure the binding

Open `wrangler.jsonc` and replace:

```jsonc
"database_id": "REPLACE_AFTER_CREATING_D1_DATABASE"
```

with the database ID returned by the create command. Keep the binding name `DB`, database name `monitor-bumi`, and migrations directory unchanged.

Do not commit credentials or account tokens. The database ID can be committed as deployment configuration once you have confirmed it belongs to the intended account.

## Step 3 - Apply migrations locally first

Install dependencies if needed:

```bash
npm install
```

Apply the schema to Wrangler's local D1 database:

```bash
npx wrangler d1 migrations apply monitor-bumi --local
```

This creates the local schema used for development. It does not change the remote Cloudflare database.

## Step 4 - Run the app locally

Build the frontend:

```bash
npm run build
```

Start the Worker with the local D1 database and built assets:

```bash
npx wrangler dev
```

Check these endpoints in the local address printed by Wrangler:

- `/api/health` - Worker health.
- `/api/sources` - configured data sources.
- `/api/earthquakes` - stored USGS earthquake records and collection freshness.

The local earthquake endpoint may return zero records until the collector has run successfully. A successful build alone does not prove that remote ingestion works.

## Step 5 - Remote migration and deployment

**Pause here until the database ID, account, and deployment target have been reviewed.** These commands change Cloudflare resources.

When explicitly ready, apply migrations to the remote database:

```bash
npx wrangler d1 migrations apply monitor-bumi --remote
```

Then, after reviewing the Worker configuration and access protection:

```bash
npm run build
npx wrangler deploy
```

Do not deploy a public monitoring dashboard until its access policy and operational safeguards have been reviewed. The current project plan requires private access protection before public deployment.

## Troubleshooting

### Wrangler says the database cannot be found

Confirm that the database ID in `wrangler.jsonc` belongs to the Cloudflare account selected by Wrangler. Confirm the database name is exactly `monitor-bumi`.

### `/api/earthquakes` returns a database error

Check that migrations were applied to the same database referenced by the `DB` binding. For local development, use `--local`; for the real account, use `--remote` only after review.

### No earthquake records appear

The scheduled collector runs from the deployed Worker's Cron Trigger. A local development session does not prove that the remote schedule is active. Check collector run records and Worker logs before diagnosing the upstream USGS feed.

### The map has no basemap

Earthquake records and the basemap are separate systems. A map style provider URL still needs to be selected and configured, with its attribution and usage terms reviewed.

## Safety checklist

- [ ] Confirm the intended Cloudflare account.
- [ ] Create the D1 database and copy its ID into `wrangler.jsonc`.
- [ ] Apply migrations locally and test the Worker locally.
- [ ] Review remote migration output before confirming it.
- [ ] Review authentication/access protection before deployment.
- [ ] Confirm map tile provider attribution and usage limits.
- [ ] Verify collector success and data freshness after deployment.
