const USGS_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";
const SOURCE_ID = "usgs";
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const MAX_FEATURES = 1000;
const BATCH_SIZE = 50;

interface D1Result {
  success: boolean;
  meta?: { changes?: number };
}

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run<T = unknown>(): Promise<D1Result & T>;
}

export interface EarthquakeDatabase {
  prepare(query: string): D1Statement;
  batch<T = unknown>(statements: D1Statement[]): Promise<Array<D1Result & T>>;
}

interface UsgsFeature {
  id?: unknown;
  properties?: {
    mag?: unknown;
    place?: unknown;
    title?: unknown;
    time?: unknown;
    updated?: unknown;
    url?: unknown;
    alert?: unknown;
    type?: unknown;
  };
  geometry?: {
    type?: unknown;
    coordinates?: unknown;
  };
}

interface NormalizedEarthquake {
  id: string;
  title: string;
  summary: string | null;
  locationName: string | null;
  latitude: number;
  longitude: number;
  magnitude: number | null;
  severity: string | null;
  occurredAt: string;
  sourceUpdatedAt: string | null;
  sourceUrl: string;
  fingerprint: string;
  collectedAt: string;
}

export interface CollectorResult {
  status: "success" | "skipped";
  recordsSeen: number;
  recordsSaved: number;
  collectedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBoundedText(response: Response): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_RESPONSE_BYTES) {
    throw new Error("response_too_large");
  }
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

function toIsoTimestamp(value: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function normalizeFeature(
  feature: UsgsFeature,
  collectedAt: string
): Promise<NormalizedEarthquake | null> {
  const properties = feature.properties;
  const geometry = feature.geometry;
  if (!properties || !geometry || geometry.type !== "Point") return null;
  if (typeof feature.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(feature.id)) return null;
  if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) return null;

  const longitude = geometry.coordinates[0];
  const latitude = geometry.coordinates[1];
  if (
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
  ) return null;

  const occurredAt = toIsoTimestamp(properties.time);
  if (!occurredAt) return null;

  const rawMagnitude = properties.mag;
  const magnitude = typeof rawMagnitude === "number" && Number.isFinite(rawMagnitude) &&
    rawMagnitude >= -2 && rawMagnitude <= 10 ? rawMagnitude : null;
  const place = typeof properties.place === "string" ? properties.place.slice(0, 300) : null;
  const title = typeof properties.title === "string" && properties.title.trim()
    ? properties.title.slice(0, 500)
    : magnitude === null ? "Earthquake" : `Magnitude ${magnitude.toFixed(1)} earthquake`;

  const candidateUrl = typeof properties.url === "string" ? properties.url : "";
  let sourceUrl = `https://earthquake.usgs.gov/earthquakes/eventpage/${feature.id}/executive`;
  if (candidateUrl.startsWith("https://")) {
    try {
      const parsedUrl = new URL(candidateUrl);
      if (parsedUrl.hostname === "earthquake.usgs.gov") sourceUrl = parsedUrl.toString();
    } catch {
      // Ignore malformed upstream links and use the canonical event URL.
    }
  }

  return {
    id: feature.id,
    title,
    summary: place,
    locationName: place,
    latitude,
    longitude,
    magnitude,
    severity: typeof properties.alert === "string" ? properties.alert.slice(0, 30) : null,
    occurredAt,
    sourceUpdatedAt: toIsoTimestamp(properties.updated),
    sourceUrl,
    fingerprint: await fingerprint(feature),
    collectedAt
  };
}

export async function collectUsgsEarthquakes(
  db: EarthquakeDatabase,
  fetcher: typeof fetch = fetch
): Promise<CollectorResult> {
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  await db.prepare(
    "INSERT INTO collector_runs (id, source_id, started_at, status) VALUES (?, ?, ?, 'running')"
  ).bind(runId, SOURCE_ID, startedAt).run();

  try {
    const source = await db.prepare("SELECT enabled FROM sources WHERE id = ?")
      .bind(SOURCE_ID).first<{ enabled?: number }>();
    if (source?.enabled !== 1) {
      await db.prepare(
        "UPDATE collector_runs SET finished_at = ?, status = 'skipped', error_code = 'source_disabled' WHERE id = ?"
      ).bind(new Date().toISOString(), runId).run();
      return { status: "skipped", recordsSeen: 0, recordsSaved: 0, collectedAt: startedAt };
    }

    const response = await fetcher(USGS_FEED_URL, {
      headers: { accept: "application/geo+json, application/json", "user-agent": "MonitorBumi/0.1 (+https://github.com/mujib-syarif/monitor-bumi)" },
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) throw new Error(`upstream_http_${response.status}`);

    const payload: unknown = JSON.parse(await readBoundedText(response));
    if (!isRecord(payload) || payload.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
      throw new Error("invalid_geojson_collection");
    }

    const collectedAt = new Date().toISOString();
    const features = payload.features.slice(0, MAX_FEATURES) as UsgsFeature[];
    const normalized: NormalizedEarthquake[] = [];

    for (const feature of features) {
      const item = await normalizeFeature(feature, collectedAt);
      if (item) normalized.push(item);
    }

    let recordsSaved = 0;
    for (let offset = 0; offset < normalized.length; offset += BATCH_SIZE) {
      const chunk = normalized.slice(offset, offset + BATCH_SIZE);
      const statements = chunk.map((item) => db.prepare(`
        INSERT INTO events (
          id, source_id, external_id, event_type, title, summary, location_name,
          latitude, longitude, magnitude, severity, confidence_status,
          occurred_at, published_at, collected_at, source_url, raw_fingerprint,
          source_updated_at
        ) VALUES (?, ?, ?, 'earthquake', ?, ?, ?, ?, ?, ?, ?, 'reported', ?, NULL, ?, ?, ?, ?)
        ON CONFLICT(source_id, external_id) DO UPDATE SET
          title = excluded.title,
          summary = excluded.summary,
          location_name = excluded.location_name,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          magnitude = excluded.magnitude,
          severity = excluded.severity,
          occurred_at = excluded.occurred_at,
          collected_at = excluded.collected_at,
          source_url = excluded.source_url,
          raw_fingerprint = excluded.raw_fingerprint,
          source_updated_at = excluded.source_updated_at
        WHERE events.raw_fingerprint != excluded.raw_fingerprint
      `).bind(
        `usgs:${item.id}`, SOURCE_ID, item.id, item.title, item.summary, item.locationName,
        item.latitude, item.longitude, item.magnitude, item.severity, item.occurredAt,
        item.collectedAt, item.sourceUrl, item.fingerprint, item.sourceUpdatedAt
      ));
      const results = await db.batch(statements);
      recordsSaved += results.reduce((sum, result) => sum + (result.meta?.changes ?? 0), 0);
    }

    await db.prepare(
      "UPDATE collector_runs SET finished_at = ?, status = 'success', records_seen = ?, records_saved = ? WHERE id = ?"
    ).bind(collectedAt, features.length, recordsSaved, runId).run();

    return { status: "success", recordsSeen: features.length, recordsSaved, collectedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const errorCode = message.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
    await db.prepare(
      "UPDATE collector_runs SET finished_at = ?, status = 'failed', error_code = ? WHERE id = ?"
    ).bind(new Date().toISOString(), errorCode, runId).run();
    throw error;
  }
}
