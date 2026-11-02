const GDACS_FEED_URL = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/EVENTS4APP";
const SOURCE_ID = "gdacs";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_FEATURES = 200;
const BATCH_SIZE = 50;
const EVENT_TYPES: Record<string, string> = {
  EQ: "earthquake", TC: "tropical_cyclone", FL: "flood",
  VO: "volcano", DR: "drought", WF: "wildfire"
};
const ALERT_LEVELS = new Set(["Green", "Orange", "Red"]);

interface D1Result { success: boolean; meta?: { changes?: number } }
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<D1Result & T>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
}
export interface DisasterDatabase {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<Array<D1Result & T>>;
}
interface GdacsFeature {
  type?: unknown;
  geometry?: { type?: unknown; coordinates?: unknown };
  properties?: Record<string, unknown>;
}
interface NormalizedDisaster {
  id: string; externalId: string; eventType: string; title: string;
  summary: string | null; locationName: string | null;
  latitude: number; longitude: number; severity: string;
  occurredAt: string; publishedAt: string | null; sourceUrl: string;
  fingerprint: string; collectedAt: string;
}
export interface GdacsCollectorResult {
  status: "success" | "skipped"; recordsSeen: number;
  recordsSaved: number; collectedAt: string;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
async function boundedText(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_RESPONSE_BYTES) throw new Error("response_too_large");
  if (!response.body) throw new Error("empty_response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error("response_too_large");
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}
async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
export async function normalizeGdacsFeature(
  feature: GdacsFeature, collectedAt: string
): Promise<NormalizedDisaster | null> {
  const p = feature.properties;
  const geometry = feature.geometry;
  if (feature.type !== "Feature" || !p || !geometry || geometry.type !== "Point") return null;
  const eventId = p.eventid;
  const episodeId = p.episodeid ?? "0";
  const eventType = typeof p.eventtype === "string" ? p.eventtype.toUpperCase() : "";
  if (!/^[0-9]{1,20}$/.test(String(eventId)) ||
      !/^[0-9]{1,20}$/.test(String(episodeId)) || !EVENT_TYPES[eventType]) return null;
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return null;
  const [longitude, latitude] = geometry.coordinates;
  if (typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  const occurredAt = toIso(p.fromdate);
  if (!occurredAt) return null;
  const alertLevel = typeof p.alertlevel === "string" && ALERT_LEVELS.has(p.alertlevel)
    ? p.alertlevel : "Unknown";
  const name = typeof p.name === "string" && p.name.trim() ? p.name.trim().slice(0, 500) : "Disaster event";
  const country = typeof p.country === "string" ? p.country.trim().slice(0, 200) : "";
  const description = typeof p.description === "string" ? p.description.trim().slice(0, 1000) : "";
  const severityData = isRecord(p.severitydata) ? p.severitydata : null;
  const severityText = severityData && typeof severityData.severitytext === "string"
    ? severityData.severitytext.slice(0, 200) : "";
  const summary = [description, country, severityText].filter(Boolean).join(" · ").slice(0, 1200) || null;
  const externalId = String(eventId) + ":" + String(episodeId);
  return {
    id: "gdacs:" + externalId, externalId, eventType: EVENT_TYPES[eventType],
    title: name, summary, locationName: country || null, latitude, longitude,
    severity: alertLevel, occurredAt, publishedAt: toIso(p.datemodified),
    sourceUrl: "https://www.gdacs.org/report.aspx?eventid=" + encodeURIComponent(String(eventId)) +
      "&episodeid=" + encodeURIComponent(String(episodeId)) + "&eventtype=" + eventType,
    fingerprint: await fingerprint(feature), collectedAt
  };
}
export async function collectGdacsDisasters(
  db: DisasterDatabase, fetcher: typeof fetch = fetch
): Promise<GdacsCollectorResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  await db.prepare(
    "INSERT INTO collector_runs (id, source_id, started_at, status) VALUES (?, ?, ?, 'running')"
  ).bind(runId, SOURCE_ID, startedAt).run();
  try {
    const source = await db.prepare("SELECT enabled FROM sources WHERE id = ?")
      .bind(SOURCE_ID).first<{ enabled?: number }>();
    if (source?.enabled !== 1) {
      await db.prepare("UPDATE collector_runs SET finished_at = ?, status = 'skipped', error_code = 'source_disabled' WHERE id = ?")
        .bind(new Date().toISOString(), runId).run();
      return { status: "skipped", recordsSeen: 0, recordsSaved: 0, collectedAt: startedAt };
    }
    const response = await fetcher(GDACS_FEED_URL, {
      headers: { accept: "application/geo+json, application/json", "user-agent": "MonitorBumi/0.1 (+https://github.com/mujib-syarif/monitor-bumi)" },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error("upstream_http_" + response.status);
    const payload: unknown = JSON.parse(await boundedText(response));
    if (!isRecord(payload) || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
      throw new Error("invalid_geojson_collection");
    }
    const collectedAt = new Date().toISOString();
    const features = payload.features.slice(0, MAX_FEATURES) as GdacsFeature[];
    const normalized: NormalizedDisaster[] = [];
    for (const feature of features) {
      const item = await normalizeGdacsFeature(feature, collectedAt);
      if (item) normalized.push(item);
    }
    let recordsSaved = 0;
    for (let offset = 0; offset < normalized.length; offset += BATCH_SIZE) {
      const statements = normalized.slice(offset, offset + BATCH_SIZE).map(item => db.prepare(`
        INSERT INTO events (
          id, source_id, external_id, event_type, title, summary, location_name,
          latitude, longitude, magnitude, severity, confidence_status,
          occurred_at, published_at, collected_at, source_url, raw_fingerprint,
          source_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'reported', ?, ?, ?, ?, ?, ?)
        ON CONFLICT(source_id, external_id) DO UPDATE SET
          title = excluded.title, summary = excluded.summary,
          location_name = excluded.location_name, latitude = excluded.latitude,
          longitude = excluded.longitude, severity = excluded.severity,
          occurred_at = excluded.occurred_at, published_at = excluded.published_at,
          collected_at = excluded.collected_at, source_url = excluded.source_url,
          raw_fingerprint = excluded.raw_fingerprint,
          source_updated_at = excluded.source_updated_at
        WHERE events.raw_fingerprint != excluded.raw_fingerprint
      `).bind(
        item.id, SOURCE_ID, item.externalId, item.eventType, item.title, item.summary,
        item.locationName, item.latitude, item.longitude, item.severity, item.occurredAt,
        item.publishedAt, item.collectedAt, item.sourceUrl, item.fingerprint, item.publishedAt
      ));
      const results = await db.batch(statements);
      recordsSaved += results.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0);
    }
    await db.prepare("UPDATE collector_runs SET finished_at = ?, status = 'success', records_seen = ?, records_saved = ? WHERE id = ?")
      .bind(collectedAt, features.length, recordsSaved, runId).run();
    return { status: "success", recordsSeen: features.length, recordsSaved, collectedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const errorCode = message.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    await db.prepare("UPDATE collector_runs SET finished_at = ?, status = 'failed', error_code = ? WHERE id = ?")
      .bind(new Date().toISOString(), errorCode, runId).run();
    throw error;
  }
}
