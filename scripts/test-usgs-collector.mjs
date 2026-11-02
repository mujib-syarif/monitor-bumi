import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../worker/usgs.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022
  }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { normalizeUsgsFeature, collectUsgsEarthquakes } = await import(moduleUrl);

const collectedAt = "2026-11-03T00:00:00.000Z";
const validFeature = (overrides = {}) => ({
  type: "Feature",
  id: "us7000abcd",
  properties: {
    mag: 4.5,
    place: "10 km NE of Example",
    title: "M 4.5 - 10 km NE of Example",
    time: 1793664000000,
    updated: 1793665000000,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd",
    alert: null
  },
  geometry: { type: "Point", coordinates: [120.5, -3.2, 10] },
  ...overrides
});

class FakeStatement {
  constructor(db, sql) {
    this.db = db;
    this.sql = sql;
    this.values = [];
  }
  bind(...values) {
    this.values = values;
    return this;
  }
  async run() {
    this.db.runs.push({ sql: this.sql, values: this.values });
    return { success: true, meta: { changes: 1 } };
  }
  async first() {
    return this.db.enabled ? { enabled: 1 } : { enabled: 0 };
  }
  async all() {
    return { results: [] };
  }
}

class FakeDatabase {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.runs = [];
    this.batches = [];
  }
  prepare(sql) {
    return new FakeStatement(this, sql);
  }
  async batch(statements) {
    this.batches.push(statements);
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}

test("normalizes a valid USGS feature and preserves its coordinates", async () => {
  const result = await normalizeUsgsFeature(validFeature(), collectedAt);
  assert.ok(result);
  assert.equal(result.id, "us7000abcd");
  assert.equal(result.latitude, -3.2);
  assert.equal(result.longitude, 120.5);
  assert.equal(result.magnitude, 4.5);
  assert.equal(result.occurredAt, new Date(1793664000000).toISOString());
  assert.match(result.fingerprint, /^[a-f0-9]{64}$/);
});

test("rejects invalid coordinates and invalid event timestamps", async () => {
  const badCoordinates = validFeature({
    geometry: { type: "Point", coordinates: [181, 95] }
  });
  const badTimestamp = validFeature({
    properties: { ...validFeature().properties, time: "not-a-number" }
  });
  assert.equal(await normalizeUsgsFeature(badCoordinates, collectedAt), null);
  assert.equal(await normalizeUsgsFeature(badTimestamp, collectedAt), null);
});

test("uses canonical USGS URL when upstream URL points elsewhere", async () => {
  const feature = validFeature({
    properties: { ...validFeature().properties, url: "https://evil.example/track" }
  });
  const result = await normalizeUsgsFeature(feature, collectedAt);
  assert.equal(
    result.sourceUrl,
    "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abcd/executive"
  );
});

test("ignores out-of-range magnitude instead of storing it", async () => {
  const feature = validFeature({
    properties: { ...validFeature().properties, mag: 99, title: "" }
  });
  const result = await normalizeUsgsFeature(feature, collectedAt);
  assert.equal(result.magnitude, null);
  assert.equal(result.title, "Earthquake");
});

test("skips collection when the USGS source is disabled", async () => {
  const db = new FakeDatabase(false);
  const result = await collectUsgsEarthquakes(db, async () => {
    throw new Error("fetch must not be called");
  });
  assert.equal(result.status, "skipped");
  assert.equal(db.batches.length, 0);
  assert.ok(db.runs.some((entry) => entry.sql.includes("status = 'skipped'")));
});

test("filters malformed features and batches valid events", async () => {
  const db = new FakeDatabase(true);
  const payload = {
    type: "FeatureCollection",
    features: [
      validFeature(),
      validFeature({ id: "bad id" }),
      validFeature({ geometry: { type: "Point", coordinates: [200, 0] } })
    ]
  };
  const result = await collectUsgsEarthquakes(
    db,
    async () => new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/geo+json" }
    })
  );
  assert.equal(result.status, "success");
  assert.equal(result.recordsSeen, 3);
  assert.equal(result.recordsSaved, 1);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 1);
});

test("records a failed collector run when the upstream feed is unavailable", async () => {
  const db = new FakeDatabase(true);
  await assert.rejects(
    collectUsgsEarthquakes(db, async () => new Response("unavailable", { status: 503 })),
    /upstream_http_503/
  );
  assert.ok(db.runs.some((entry) => entry.sql.includes("status = 'failed'")));
});
