PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  homepage_url TEXT NOT NULL,
  terms_url TEXT,
  attribution TEXT,
  enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0, 1)),
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  location_name TEXT,
  latitude REAL,
  longitude REAL,
  magnitude REAL,
  severity TEXT,
  confidence_status TEXT NOT NULL DEFAULT 'unverified',
  occurred_at TEXT,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  source_url TEXT NOT NULL,
  raw_fingerprint TEXT NOT NULL,
  UNIQUE (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_events_occurred_at ON events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_type_occurred ON events(event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_events_collected_at ON events(collected_at);

CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  publisher TEXT NOT NULL,
  article_url TEXT NOT NULL,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  content_fingerprint TEXT NOT NULL,
  UNIQUE (source_id, external_id)
);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);

CREATE TABLE IF NOT EXISTS event_sources (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES sources(id),
  source_url TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  PRIMARY KEY (event_id, source_id)
);

CREATE TABLE IF NOT EXISTS collector_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  records_seen INTEGER NOT NULL DEFAULT 0,
  records_saved INTEGER NOT NULL DEFAULT 0,
  error_code TEXT
);
CREATE INDEX IF NOT EXISTS idx_collector_runs_source_started ON collector_runs(source_id, started_at);

CREATE TABLE IF NOT EXISTS indicators (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  indicator_code TEXT NOT NULL,
  country_code TEXT,
  value REAL,
  unit TEXT,
  period TEXT NOT NULL,
  published_at TEXT,
  collected_at TEXT NOT NULL,
  UNIQUE (source_id, indicator_code, country_code, period)
);
