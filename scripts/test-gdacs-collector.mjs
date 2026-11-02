import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../worker/gdacs.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { normalizeGdacsFeature, collectGdacsDisasters } = await import(moduleUrl);
const collectedAt = "2026-11-03T00:00:00.000Z";
const validFeature = (overrides = {}) => ({
  type: "Feature",
  properties: {
    eventid: 1234567, episodeid: 12, eventtype: "TC", alertlevel: "Orange",
    name: "Tropical cyclone Example", country: "Example Islands",
    description: "Cyclone alert", fromdate: "2026-11-02T10:00:00Z",
    datemodified: "2026-11-02T11:00:00Z",
    severitydata: { severitytext: "Wind 120 km/h" }
  },
  geometry: { type: "Point", coordinates: [150.2, -12.3] },
  ...overrides
});
class FakeStatement {
  constructor(db, sql) { this.db = db; this.sql = sql; this.values = []; }
  bind(...values) { this.values = values; return this; }
  async run() { this.db.runs.push({ sql: this.sql, values: this.values }); return { success: true, meta: { changes: 1 } }; }
  async first() { return this.db.enabled ? { enabled: 1 } : { enabled: 0 }; }
  async all() { return { results: [] }; }
}
class FakeDatabase {
  constructor(enabled = true) { this.enabled = enabled; this.runs = []; this.batches = []; }
  prepare(sql) { return new FakeStatement(this, sql); }
  async batch(statements) {
    this.batches.push(statements);
    return statements.map(() => ({ success: true, meta: { changes: 1 } }));
  }
}
test("normalizes a valid GDACS feature with composite event and episode ID", async () => {
  const item = await normalizeGdacsFeature(validFeature(), collectedAt);
  assert.ok(item);
  assert.equal(item.externalId, "1234567:12");
  assert.equal(item.id, "gdacs:1234567:12");
  assert.equal(item.eventType, "tropical_cyclone");
  assert.equal(item.severity, "Orange");
  assert.equal(item.latitude, -12.3);
  assert.equal(item.longitude, 150.2);
  assert.match(item.sourceUrl, /eventid=1234567/);
});
test("rejects unsupported types, malformed IDs, non-point geometry and invalid coordinates", async () => {
  assert.equal(await normalizeGdacsFeature(validFeature({ properties: { ...validFeature().properties, eventtype: "ALIEN" } }), collectedAt), null);
  assert.equal(await normalizeGdacsFeature(validFeature({ properties: { ...validFeature().properties, eventid: "bad-id" } }), collectedAt), null);
  assert.equal(await normalizeGdacsFeature(validFeature({ geometry: { type: "Polygon", coordinates: [] } }), collectedAt), null);
  assert.equal(await normalizeGdacsFeature(validFeature({ geometry: { type: "Point", coordinates: [181, 0] } }), collectedAt), null);
});
test("rejects missing or invalid event start timestamps", async () => {
  const feature = validFeature({ properties: { ...validFeature().properties, fromdate: "not-a-date" } });
  assert.equal(await normalizeGdacsFeature(feature, collectedAt), null);
});
test("unknown alert labels are preserved as Unknown, not promoted", async () => {
  const feature = validFeature({ properties: { ...validFeature().properties, alertlevel: "Critical" } });
  const item = await normalizeGdacsFeature(feature, collectedAt);
  assert.equal(item.severity, "Unknown");
});
test("skips collection when GDACS source is disabled", async () => {
  const db = new FakeDatabase(false);
  const result = await collectGdacsDisasters(db, async () => { throw new Error("fetch must not run"); });
  assert.equal(result.status, "skipped");
  assert.equal(db.batches.length, 0);
});
test("filters malformed features and persists valid events", async () => {
  const db = new FakeDatabase(true);
  const payload = { type: "FeatureCollection", features: [validFeature(), validFeature({ geometry: { type: "Point", coordinates: [300, 0] } })] };
  const result = await collectGdacsDisasters(db, async () => new Response(JSON.stringify(payload), {
    status: 200, headers: { "content-type": "application/geo+json" }
  }));
  assert.equal(result.status, "success");
  assert.equal(result.recordsSeen, 2);
  assert.equal(result.recordsSaved, 1);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].length, 1);
});
test("records failed run when GDACS API is unavailable", async () => {
  const db = new FakeDatabase(true);
  await assert.rejects(collectGdacsDisasters(db, async () => new Response("unavailable", { status: 503 })), /upstream_http_503/);
  assert.ok(db.runs.some(entry => entry.sql.includes("status = 'failed'")));
});
