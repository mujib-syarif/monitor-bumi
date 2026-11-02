interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
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
        return json({ ok: true, mode: "prototype", liveDataEnabled: false, message: "Live data collectors are not connected yet.", totals: { events: null, earthquakes: null, disasters: null, newsSources: null } });
      }
      if (url.pathname === "/api/sources") {
        return json({ ok: true, sources: [
          { id: "usgs", name: "USGS Earthquakes", status: "not_connected" },
          { id: "gdacs", name: "GDACS Disasters", status: "not_connected" },
          { id: "rss", name: "Approved RSS feeds", status: "not_configured" }
        ] });
      }
      return json({ ok: false, error: "not_found" }, 404);
    }

    return env.ASSETS.fetch(request);
  }
};
