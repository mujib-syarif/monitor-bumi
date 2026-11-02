import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, NavigationControl, Popup } from "maplibre-gl";
type EarthquakePoint = { id: string; title: string; latitude: number; longitude: number; magnitude: number | null; source_url: string };
type WorldMapPanelProps = { earthquakes?: EarthquakePoint[] };

export function WorldMapPanel({ earthquakes = [] }: WorldMapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const styleUrl = import.meta.env.VITE_MAP_STYLE_URL;

  useEffect(() => {
    if (!containerRef.current || !styleUrl || mapRef.current) return;
    const map = new MapLibreMap({
      container: containerRef.current,
      style: styleUrl,
      center: [15, 22],
      zoom: 1.15
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = earthquakes.slice(0, 100).map((event) => {
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = event.title;
      const magnitude = document.createElement("p");
      magnitude.textContent = event.magnitude === null ? "Magnitude unavailable" : "Magnitude " + event.magnitude.toFixed(1);
      const link = document.createElement("a");
      link.href = event.source_url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = "Open USGS event";
      content.append(title, magnitude, link);
      const element = document.createElement("button");
      element.type = "button";
      element.className = "earthquake-map-marker";
      element.setAttribute("aria-label", event.title);
      return new Marker({ element, color: "#67b7f5" }).setLngLat([event.longitude, event.latitude])
        .setPopup(new Popup({ offset: 18 }).setDOMContent(content)).addTo(map);
    });
  }, [earthquakes]);

  if (!styleUrl) {
    return (
      <div className="map-placeholder">
        <div className="map-grid" />
        <div className="globe-orbit orbit-one" />
        <div className="globe-orbit orbit-two" />
        <div className="globe-core">
          <span className="globe-latitude" />
          <span className="globe-longitude" />
          <span className="globe-point point-one" />
          <span className="globe-point point-two" />
          <span className="globe-point point-three" />
        </div>
        <div className="map-placeholder-copy">
          <span className="eyebrow">{earthquakes.length > 0 ? "EARTHQUAKE DATA RECEIVED" : "MAP PROVIDER NOT CONFIGURED"}</span>
          <strong>{earthquakes.length > 0 ? earthquakes.length + " earthquake records loaded" : "World map integration ready"}</strong>
          <p>{earthquakes.length > 0 ? "Live records are connected. Configure an approved map style provider to plot event coordinates." : "MapLibre is installed. A tile/style provider will be connected after its terms, attribution, and usage limits are reviewed."}</p>
        </div>
      </div>
    );
  }

  return <div className="map-live" ref={containerRef} aria-label="Interactive world map" />;
}
