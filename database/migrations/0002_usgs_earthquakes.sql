ALTER TABLE events ADD COLUMN source_updated_at TEXT;
CREATE INDEX IF NOT EXISTS idx_events_source_updated_at ON events(source_updated_at);

INSERT OR IGNORE INTO sources (
  id, name, source_type, homepage_url, terms_url, attribution, enabled, reviewed_at
) VALUES (
  'usgs',
  'USGS Earthquakes',
  'geojson',
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/index.php',
  'https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits',
  'Credit: U.S. Geological Survey',
  1,
  '2026-11-03'
);
