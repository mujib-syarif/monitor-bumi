import { useEffect, useState } from "react";
import { WorldMapPanel } from "./components/WorldMapPanel";
import { demoEvents } from "./data/demo";

type HealthState = "checking" | "online" | "offline";

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
  const [activeNav, setActiveNav] = useState("Overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then(() => active && setHealth("online"))
      .catch(() => active && setHealth("offline"));
    return () => { active = false; };
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
            <div className="date-chip"><span className="date-dot" /> PROTOTYPE ENVIRONMENT</div>
          </div>

          <div className="demo-banner"><span className="demo-badge">DEMO</span><span>Prototype preview. Cards and map markers are illustrative, not live intelligence or verified reports.</span></div>

          <section className="metric-grid" aria-label="Overview metrics">
            {[
              ["GLOBAL EVENTS", "Waiting for live data integration", "◈"],
              ["EARTHQUAKES", "USGS collector not connected", "⌁"],
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
                {demoEvents.map((event) => (
                  <div className="event-item" key={event.id}>
                    <span className={`event-marker marker-${event.category.toLowerCase()}`} />
                    <div className="event-copy"><div className="event-meta"><span>{event.category}</span><span>{event.time}</span></div><strong>{event.title}</strong><small>{event.location} · {event.source}</small></div>
                    <span className={`severity severity-${event.severity.toLowerCase()}`}>{event.severity}</span>
                  </div>
                ))}
              </div>
              <div className="panel-footnote">Illustrative entries only · No live reports loaded</div>
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
          <footer className="page-footer"><span>MONITOR BUMI · GLOBAL MONITORING PLATFORM</span><span>PROTOTYPE · DEMO DATA ONLY</span></footer>
        </div>
      </section>
    </main>
  );
}

export default App;
