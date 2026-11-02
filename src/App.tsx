import { useEffect, useState } from "react";
import { WorldMapPanel } from "./components/WorldMapPanel";
import { demoEvents } from "./data/demo";

type HealthState = "checking" | "online" | "offline";
type Earthquake = { id: string; title: string; location_name: string | null; magnitude: number | null; occurred_at: string; source_url: string };
type EarthquakeResponse = { ok: boolean; count: number; events: Earthquake[]; freshness: { lastCollectedAt: string | null; stale: boolean }; source: { attribution: string } };
function relativeTime(value: string): string { const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60000)); if (!Number.isFinite(minutes)) return "Unknown time"; if (minutes < 1) return "Just now"; if (minutes < 60) return minutes + " min ago"; if (minutes < 1440) return Math.floor(minutes / 60) + " hr ago"; return Math.floor(minutes / 1440) + " days ago"; }


const navItems = [
  { label: "Overview", icon: "◫" },
  { label: "World Map", icon: "◎" },
  { label: "Global News", icon: "▤" },
  { label: "Earthquakes", icon: "⌁" },
  { label: "Disasters", icon: "△" },
  { label: "Timeline", icon: "◷" }
];

function App() {
  const [health, setHealth] = useState<HealthState>("checking");
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeResponse | null>(null);
  const [activeNav, setActiveNav] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [healthResponse, dataResponse] = await Promise.all([fetch("/api/health"), fetch("/api/earthquakes?limit=100")]);
        if (!healthResponse.ok || !dataResponse.ok) throw new Error("API unavailable");
        const data = await dataResponse.json() as EarthquakeResponse;
        if (!data.ok || !Array.isArray(data.events)) throw new Error("Invalid API response");
        if (active) { setHealth("online"); setEarthquakeData(data); }
      } catch { if (active) setHealth("offline"); }
    };
    void load();
    const interval = window.setInterval(() => void load(), 60000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">MB</div>
          <div><strong>MONITOR BUMI</strong><span>GLOBAL INTELLIGENCE</span></div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button className={`nav-item ${activeNav === item.label ? "active" : ""}`} key={item.label}
              onClick={() => { setActiveNav(item.label); setMobileMenuOpen(false); }} type="button">
              <span className="nav-icon">{item.icon}</span>{item.label}
              {item.label === "Overview" && <span className="nav-live-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="access-card"><span className="access-icon">◈</span><div><strong>Private workspace</strong><span>Personal monitoring</span></div></div>
          <span className="sidebar-version">MONITOR BUMI · v0.1.0</span>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)} />}

      <section className="main-content">
        <header className="topbar">
          <button className="menu-toggle" type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation">☰</button>
          <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="topbar-right">
            <span className="utc-clock">GLOBAL · UTC</span>
            <span className={`system-status ${health}`}><i />{health === "online" ? "API ONLINE" : health === "offline" ? "API OFFLINE" : "CHECKING API"}</span>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow">GLOBAL SITUATIONAL AWARENESS</div><h1>{activeNav === "Overview" ? "World overview" : activeNav}</h1><p>Monitor global developments from one connected workspace.</p></div>
            <div className="date-chip"><span className="date-dot" /> {earthquakeData ? "USGS DATA CONNECTED" : "AWAITING LIVE DATA"}</div>
          </div>

          {!earthquakeData && <div className="demo-banner"><span className="demo-badge">SETUP</span><span>Live data is waiting for database setup and the first collector run. Sample records are not shown as real events.</span></div>}

          <section className="metric-grid" aria-label="Overview metrics">
            {[
              ["EARTHQUAKES LOADED", earthquakeData ? String(earthquakeData.count) : "--", "⌁"],
              ["LAST COLLECTION", earthquakeData?.freshness.lastCollectedAt ? relativeTime(earthquakeData.freshness.lastCollectedAt) : "--", "◷"],
              ["ACTIVE ALERTS", "Disaster feed not connected", "△"],
              ["NEWS SOURCES", "RSS sources pending approval", "▤"]
            ].map(([label, detail, symbol]) => (
              <article className="metric-card" key={label}>
                <div className="metric-top"><span>{label}</span><span className="metric-symbol">{symbol}</span></div>
                <strong>--</strong><small>{detail}</small>
              </article>
            ))}
          </section>

          <section className="dashboard-grid">
            <article className="panel map-panel">
              <div className="panel-heading"><div><span className="eyebrow">GEOSPATIAL VIEW</span><h2>Global activity map</h2></div><span className="panel-tag">MAP PREVIEW</span></div>
              <WorldMapPanel />
              <div className="map-legend"><span><i className="legend-blue" /> Earthquake</span><span><i className="legend-orange" /> Disaster</span><span><i className="legend-violet" /> News</span></div>
            </article>

            <article className="panel events-panel">
              <div className="panel-heading"><div><span className="eyebrow">LATEST INTELLIGENCE</span><h2>Recent events</h2></div><button className="text-button" type="button" onClick={() => setActiveNav("Timeline")}>View timeline</button></div>
              <div className="event-list">
                {earthquakeData?.events.slice(0, 8).map((event) => (
                  <a className="event-item" href={event.source_url} key={event.id} target="_blank" rel="noreferrer">
                    <span className="event-marker marker-earthquake" />
                    <div className="event-copy"><div className="event-meta"><span>{event.magnitude === null ? "MAGNITUDE N/A" : "MAGNITUDE " + event.magnitude.toFixed(1)}</span><span>{relativeTime(event.occurred_at)}</span></div><strong>{event.title}</strong><small>{event.location_name ?? "Location unavailable"} · USGS</small></div>
                    <span className="severity severity-moderate">OPEN</span>
                  </a>
                ))}
                {(!earthquakeData || earthquakeData.events.length === 0) && <div className="empty-events"><strong>Waiting for live earthquake records</strong><small>Sample events are hidden until real data is available.</small></div>}
              </div>
              <div className="panel-footnote">{earthquakeData?.source.attribution ?? "USGS attribution pending"} · Times shown in UTC</div>
            </article>
          </section>

          <section className="panel source-panel">
            <div className="panel-heading"><div><span className="eyebrow">INGESTION PIPELINE</span><h2>Data source status</h2></div><span className="panel-tag">SETUP PHASE</span></div>
            <div className="source-grid">
              {[
                ["USGS Earthquakes", "Candidate source"],
                ["GDACS Disasters", "Candidate source"],
                ["Global RSS", "Allowlist not configured"]
              ].map(([name, detail]) => (
                <div className="source-item" key={name}><span className="source-indicator pending" /><div><strong>{name}</strong><small>{detail}</small></div><span className="source-state">NOT CONNECTED</span></div>
              ))}
            </div>
          </section>
          <footer className="page-footer"><span>MONITOR BUMI · GLOBAL MONITORING PLATFORM</span><span>{earthquakeData ? "USGS DATA · ATTRIBUTION REQUIRED" : "LIVE DATA NOT CONNECTED"}</span></footer>
        </div>
      </section>
    </main>
  );
}

export default App;
