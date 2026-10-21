-- 仅用于本地：生产库已有表，勿对 remote 执行。
CREATE TABLE IF NOT EXISTS article_views (
	slug TEXT PRIMARY KEY,
	count INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS view_dedup (
	hash TEXT PRIMARY KEY,
	slug TEXT NOT NULL,
	created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_view_dedup_created_at ON view_dedup (created_at);
