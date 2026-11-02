import { collectUsgsEarthquakes, type D1Statement, type EarthquakeDatabase } from "./usgs";
import { collectGdacsDisasters, type DisasterDatabase } from "./gdacs";

interface D1Database extends EarthquakeDatabase, DisasterDatabase {
  prepare(query: string): D1Statement;
}
interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: D1Database;
}
interface ScheduledController { cron: string; scheduledTime: number }
interface ExecutionContext { waitUntil(promise: Promise<unknown>): void }
const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers });
}
function getLimit(url: URL): number {
  const requested = Number(url.searchParams.get("limit") ?? 100);
  return Number.isFinite(requested) ? Math.min(200, Math.max(1, Math.floor(requested))) : 100;
}
async function latestRun(db: D1Database, sourceId: string) {
  const result = await db.prepare(`
    SELECT finished_at, status FROM collector_runs
    WHERE source_id = ? AND status = 'success'
    ORDER BY started_at DESC LIMIT 1
  `).bind(sourceId).all<{ finished_at: string | null; status: string }>();
  return result.results[0]?.finished_at ?? null;
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "monitor-bumi-api", status: "operational", mode: "prototype", generatedAt: new Date().toISOString() });
      }
      if (url.pathname === "/api/overview") {
        return json({ ok: true, mode: "prototype", liveDataEnabled: true, message: "USGS and GDACS ingestion are configured.", totals: { events: null, earthquakes: null, disasters: null, newsSources: null } });
      }
      if (url.pathname === "/api/sources") {
        return json({ ok: true, sources: [
          { id: "usgs", name: "USGS Earthquakes", status: "configured", attribution: "Credit: U.S. Geological Survey" },
          { id: "gdacs", name: "GDACS Disasters", status: "configured", attribution: "Global Disaster Awareness and Coordination System, GDACS" },
          { id: "rss", name: "Approved RSS feeds", status: "not_configured" }
        ] });
      }
      if (url.pathname === "/api/earthquakes" || url.pathname === "/api/disasters") {
        const isDisaster = url.pathname === "/api/disasters";
        const sourceId = isDisaster ? "gdacs" : "usgs";
        const eventFilter = isDisaster ? "source_id = 'gdacs'" : "source_id = 'usgs' AND event_type = 'earthquake'";
        const [events, lastCollectedAt] = await Promise.all([
          env.DB.prepare(`
            SELECT id, external_id, event_type, title, summary, location_name, latitude, longitude,
              magnitude, severity, occurred_at, published_at, collected_at, source_updated_at, source_url
            FROM events WHERE ${eventFilter}
            ORDER BY occurred_at DESC LIMIT ?
          `).bind(getLimit(url)).all<Record<string, unknown>>(),
          latestRun(env.DB, sourceId)
        ]);
        const staleAfter = isDisaster ? 45 : 15;
        const stale = !lastCollectedAt || Date.now() - Date.parse(lastCollectedAt) > staleAfter * 60 * 1000;
        return json({
          ok: true,
          source: isDisaster
            ? { id: "gdacs", name: "Global Disaster Awareness and Coordination System", attribution: "Global Disaster Awareness and Coordination System, GDACS" }
            : { id: "usgs", name: "U.S. Geological Survey", attribution: "Credit: U.S. Geological Survey" },
          freshness: { lastCollectedAt, stale },
          count: events.results.length,
          events: events.results
        });
      }
      return json({ ok: false, error: "not_found" }, 404);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(controller: ScheduledController, env: Env, context: ExecutionContext): Promise<void> {
    if (controller.cron === "*/15 * * * *") {
      context.waitUntil(collectGdacsDisasters(env.DB));
      return;
    }
    context.waitUntil(collectUsgsEarthquakes(env.DB));
  }
};
