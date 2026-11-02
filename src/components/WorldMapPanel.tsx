import { useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";

export function WorldMapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
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
          <span className="eyebrow">MAP PROVIDER NOT CONFIGURED</span>
          <strong>World map integration ready</strong>
          <p>MapLibre is installed. A tile/style provider will be connected after its terms, attribution, and usage limits are reviewed.</p>
        </div>
      </div>
    );
  }

  return <div className="map-live" ref={containerRef} aria-label="Interactive world map" />;
}
