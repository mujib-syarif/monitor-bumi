INSERT OR IGNORE INTO sources (
  id, name, source_type, homepage_url, terms_url, attribution, enabled, reviewed_at
) VALUES (
  'gdacs',
  'GDACS Disaster Alerts',
  'geojson',
  'https://www.gdacs.org/',
  'https://www.gdacs.org/Documents/2025/GDACS_Terms_of_use_Mar_25.pdf',
  'Global Disaster Awareness and Coordination System, GDACS',
  1,
  '2026-11-03'
);
