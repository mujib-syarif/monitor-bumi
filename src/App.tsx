import { useCallback, useEffect, useState } from "react";
import { WorldMapPanel } from "./components/WorldMapPanel";

type Health = "checking" | "online" | "offline";
type Quake = { id: string; title: string; location_name: string | null; latitude: number; longitude: number; magnitude: number | null; occurred_at: string; source_url: string };
type Feed = { ok: boolean; count: number; events: Quake[]; freshness: { lastCollectedAt: string | null; stale: boolean } };
type Disaster = { id: string; title: string; event_type: string; location_name: string | null; latitude: number; longitude: number; severity: string; occurred_at: string; source_url: string };
type DisasterFeed = { ok: boolean; count: number; events: Disaster[]; freshness: { lastCollectedAt: string | null; stale: boolean } };
type Source = { id: string; name: string; status: string; attribution?: string };
const navItems = [{label:"Overview",icon:"◫"},{label:"World Map",icon:"◎"},{label:"Global News",icon:"▤"},{label:"Earthquakes",icon:"⌁"},{label:"Disasters",icon:"△"},{label:"Timeline",icon:"◷"}];

function formatUtc(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : new Intl.DateTimeFormat("en",{dateStyle:"medium",timeStyle:"short",timeZone:"UTC"}).format(date) + " UTC";
}

function App() {
  const [health,setHealth] = useState<Health>("checking");
  const [activeNav,setActiveNav] = useState("Overview");
  const [mobileMenuOpen,setMobileMenuOpen] = useState(false);
  const [events,setEvents] = useState<Quake[]>([]);
  const [disasters,setDisasters] = useState<Disaster[]>([]);
  const [disasterStale,setDisasterStale] = useState(true);
  const [sources,setSources] = useState<Source[]>([]);
  const [lastCollected,setLastCollected] = useState<string|null>(null);
  const [stale,setStale] = useState(true);
  const [dataError,setDataError] = useState(false);
  const [updatedAt,setUpdatedAt] = useState<string|null>(null);

  const refresh = useCallback(async () => {
    try {
      const [healthRes,quakeRes,disasterRes,sourceRes] = await Promise.all([fetch("/api/health"),fetch("/api/earthquakes?limit=100"),fetch("/api/disasters?limit=100"),fetch("/api/sources")]);
      if (!healthRes.ok) throw new Error("API unavailable");
      setHealth("online");
      if (!quakeRes.ok || !disasterRes.ok || !sourceRes.ok) throw new Error("Dashboard API unavailable");
      const feed = await quakeRes.json() as Feed;
      const disasterFeed = await disasterRes.json() as DisasterFeed;
      const registry = await sourceRes.json() as {sources?:Source[]};
      if (!feed.ok || !Array.isArray(feed.events) || !disasterFeed.ok || !Array.isArray(disasterFeed.events)) throw new Error("Invalid dashboard response");
      setEvents(feed.events);
      setDisasters(disasterFeed.events);
      setDisasterStale(disasterFeed.freshness?.stale ?? true);
      setSources(Array.isArray(registry.sources) ? registry.sources : []);
      setLastCollected(feed.freshness?.lastCollectedAt ?? null);
      setStale(feed.freshness?.stale ?? true);
      setDataError(false);
      setUpdatedAt(new Date().toISOString());
    } catch {
      setHealth("offline");
      setDataError(true);
    }
  },[]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(),60000);
    return () => window.clearInterval(timer);
  },[refresh]);

  const usgsState = stale ? "WAITING FOR DATA" : "COLLECTING";
  return (
    <main className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark">MB</div><div><strong>MONITOR BUMI</strong><span>GLOBAL INTELLIGENCE</span></div></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeNav === item.label ? "active" : ""}`}
              key={item.label}
              onClick={() => {
                setActiveNav(item.label);
                setMobileMenuOpen(false);
              }}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.label === "Overview" ? <span className="nav-live-dot" /> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom"><div className="access-card"><span className="access-icon">◈</span><div><strong>Private workspace</strong><span>Personal monitoring</span></div></div><span className="sidebar-version">MONITOR BUMI · v0.1.0</span></div>
      </aside>
      {mobileMenuOpen&&<button className="mobile-scrim" aria-label="Close menu" onClick={()=>setMobileMenuOpen(false)}/>}
      <section className="main-content">
        <header className="topbar"><button className="menu-toggle" type="button" onClick={()=>setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation">☰</button><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="topbar-right"><span className="utc-clock">GLOBAL · UTC</span><span className={`system-status ${health}`}><i/>{health==="online"?"API ONLINE":health==="offline"?"API OFFLINE":"CHECKING API"}</span></div></header>
        <div className="page-content">
          <div className="page-heading"><div><div className="eyebrow">GLOBAL SITUATIONAL AWARENESS</div><h1>{activeNav==="Overview"?"World overview":activeNav}</h1><p>Monitor global developments from one connected workspace.</p></div><div className="date-chip"><span className="date-dot"/>{stale?"USGS DATA PENDING":"USGS DATA FRESH"}</div></div>
          <div className={`data-banner ${dataError?"data-banner-error":""}`}><span className="data-banner-label">{dataError?"DATA UNAVAILABLE":"PIPELINE STATUS"}</span><span>{dataError?"Dashboard data could not be loaded. Check API availability and D1 database setup.":stale?"USGS collector is configured, but no recent successful collection is recorded. Local/remote database setup may still be pending.":"Earthquake records are served from the USGS collector database. GDACS disaster monitoring is configured separately; global news feeds are not enabled yet."}</span></div>
          <section className="metric-grid" aria-label="Overview metrics">
            {[["EARTHQUAKES",String(events.length),stale?"No recent successful collection":"Stored USGS records","⌁"],["ACTIVE ALERTS",String(disasters.filter(event=>event.severity==="Red"||event.severity==="Orange").length),disasterStale?"GDACS data pending":"Red and orange GDACS alerts","△"],["NEWS SOURCES",String(sources.filter(s=>s.id==="rss"&&s.status==="connected").length),"Approved RSS feeds","▤"],["LAST COLLECTION",formatUtc(lastCollected),"USGS collector","◷"]].map(([label,value,detail,symbol])=><article className="metric-card" key={label}><div className="metric-top"><span>{label}</span><span className="metric-symbol">{symbol}</span></div><strong className={label==="LAST COLLECTION"?"metric-time":""}>{value}</strong><small>{detail}</small></article>)}
          </section>
          <section className="dashboard-grid">
            <article className="panel map-panel"><div className="panel-heading"><div><span className="eyebrow">GEOSPATIAL VIEW</span><h2>Global activity map</h2></div><span className="panel-tag">MAP PREVIEW</span></div><WorldMapPanel/><div className="map-legend"><span><i className="legend-blue"/> Earthquake</span><span><i className="legend-orange"/> Disaster</span><span><i className="legend-violet"/> News</span></div></article>
            <article className="panel events-panel"><div className="panel-heading"><div><span className="eyebrow">USGS EARTHQUAKE FEED</span><h2>Recent earthquakes</h2></div><button className="text-button" type="button" onClick={()=>void refresh()}>Refresh</button></div>
              {dataError?<div className="empty-state">Earthquake records could not be loaded. Verify API and database setup.</div>:events.length===0?<div className="empty-state">{stale?"Waiting for the first successful USGS collection.":"No earthquake records are available."}</div>:<div className="event-list">{events.slice(0,8).map(event=><div className="event-item" key={event.id}><span className="event-marker"/><div className="event-copy"><div className="event-meta"><span>{event.magnitude===null?"MAGNITUDE N/A":`MAGNITUDE ${event.magnitude.toFixed(1)}`}</span><span>{formatUtc(event.occurred_at)}</span></div><strong>{event.title}</strong><small>{event.location_name??"Location not provided"} · {event.latitude.toFixed(2)}, {event.longitude.toFixed(2)}</small></div><a className="event-link" href={event.source_url} target="_blank" rel="noreferrer">USGS</a></div>)}</div>}
              <div className="panel-footnote">{events.length} stored record(s) · Credit: U.S. Geological Survey</div>
            </article>
          </section>
          <section className="panel source-panel"><div className="panel-heading"><div><span className="eyebrow">INGESTION PIPELINE</span><h2>Data source status</h2></div><span className="panel-tag">SOURCE REGISTRY</span></div><div className="source-grid">{sources.map(source=><div className="source-item" key={source.id}><span className={`source-indicator ${source.id==="usgs"&&!stale?"source-active":"pending"}`}/><div><strong>{source.name}</strong><small>{source.attribution??"Status from source registry"}</small></div><span className="source-state">{source.id==="usgs"?usgsState:source.status==="connected"?"CONNECTED":source.status==="not_configured"?"NOT CONFIGURED":source.status==="configured"?"CONFIGURED":"NOT CONNECTED"}</span></div>)}</div></section>
          <footer className="page-footer"><span>MONITOR BUMI · GLOBAL MONITORING PLATFORM</span><span>{updatedAt? `UPDATED ${formatUtc(updatedAt)}`:"WAITING FOR API"}</span></footer>
        </div>
      </section>
    </main>
  );
}
export default App;
