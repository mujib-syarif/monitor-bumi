import { execFileSync } from "node:child_process";

function runWrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  }).trim();
}

function collectRows(value, rows = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectRows(item, rows);
    return rows;
  }
  if (value && typeof value === "object") {
    if (Array.isArray(value.results)) {
      for (const row of value.results) {
        if (row && typeof row === "object") rows.push(row);
      }
    }
    for (const [key, child] of Object.entries(value)) {
      if (key !== "results") collectRows(child, rows);
    }
  }
  return rows;
}

console.log("Applying migrations to local D1...");
runWrangler(["d1", "migrations", "apply", "monitor-bumi", "--local"]);

console.log("Checking required tables and enabled USGS source...");
const sql = `
  SELECT 'table' AS kind, name AS item, '' AS value
  FROM sqlite_master
  WHERE type = 'table'
  UNION ALL
  SELECT 'source' AS kind, id AS item, CAST(enabled AS TEXT) AS value
  FROM sources
  WHERE id = 'usgs'
`;
const output = runWrangler([
  "d1", "execute", "monitor-bumi", "--local", "--command", sql, "--json"
]);

let parsed;
try {
  parsed = JSON.parse(output);
} catch {
  console.error("Wrangler did not return valid JSON output.");
  console.error(output);
  process.exit(1);
}

const rows = collectRows(parsed);
const tables = new Set(rows.filter((row) => row.kind === "table").map((row) => row.item));
const requiredTables = [
  "sources",
  "events",
  "articles",
  "event_sources",
  "collector_runs",
  "indicators",
  "d1_migrations"
];
const missing = requiredTables.filter((name) => !tables.has(name));
if (missing.length) {
  console.error("Missing required D1 tables:", missing.join(", "));
  process.exit(1);
}

const usgs = rows.find((row) => row.kind === "source" && row.item === "usgs");
if (!usgs || String(usgs.value) !== "1") {
  console.error("USGS source is missing or not enabled in local D1.");
  process.exit(1);
}

console.log("Local D1 smoke test passed.");
console.log(`Verified ${requiredTables.length} required tables and enabled USGS source.`);
