import { collectUsgsEarthquakes, type EarthquakeDatabase } from "./usgs";

interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = unknown>(): Promise<{ results: T[] }>;
}

interface D1Database extends EarthquakeDatabase {
  prepare(query: string): D1Statement & ReturnType<EarthquakeDatabase["prepare"]>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB: D1Database;
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const headers = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (request.method !== "GET") {
        return json({ ok: false, error: "method_not_allowed" }, 405);
      }
      if (url.pathname === "/api/health") {
        return json({ ok: true, service: "monitor-bumi-api", status: "operational", mode: "prototype", generatedAt: new Date().toISOString() });
      }
      if (url.pathname === "/api/overview") {
        return json({ ok: true, mode: "prototype", liveDataEnabled: true, message: "USGS earthquake ingestion is enabled.", totals: { events: null, earthquakes: null, disasters: null, newsSources: null } });
      }
      if (url.pathname === "/api/sources") {
        return json({ ok: true, sources: [
          { id: "usgs", name: "USGS Earthquakes", status: "connected", attribution: "Credit: U.S. Geological Survey" },
          { id: "gdacs", name: "GDACS Disasters", status: "not_connected" },
          { id: "rss", name: "Approved RSS feeds", status: "not_configured" }
        ] });
      }
      if (url.pathname === "/api/earthquakes") {
        const requestedLimit = Number(url.searchParams.get("limit") ?? 100);
        const limit = Number.isFinite(requestedLimit)
          ? Math.min(200, Math.max(1, Math.floor(requestedLimit)))
          : 100;
        const [events, latestRun] = await Promise.all([
          env.DB.prepare(`
            SELECT id, external_id, title, summary, location_name, latitude, longitude,
              magnitude, severity, occurred_at, collected_at, source_updated_at, source_url
            FROM events
            WHERE source_id = 'usgs' AND event_type = 'earthquake'
            ORDER BY occurred_at DESC
            LIMIT ?
          `).bind(limit).all<Record<string, unknown>>(),
          env.DB.prepare(`
            SELECT finished_at, status FROM collector_runs
            WHERE source_id = 'usgs' ORDER BY started_at DESC LIMIT 1
          `).all<{ finished_at: string | null; status: string }>()
        ]);
        const lastCollectedAt = latestRun.results[0]?.finished_at ?? null;
        const stale = !lastCollectedAt || Date.now() - Date.parse(lastCollectedAt) > 15 * 60 * 1000;
        return json({
          ok: true,
          source: { id: "usgs", name: "U.S. Geological Survey", attribution: "Credit: U.S. Geological Survey" },
          freshness: { lastCollectedAt, stale },
          count: events.results.length,
          events: events.results
        });
      }
      return json({ ok: false, error: "not_found" }, 404);
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(
    _controller: ScheduledController,
    env: Env,
    context: ExecutionContext
  ): Promise<void> {
    context.waitUntil(collectUsgsEarthquakes(env.DB));
  }
};
