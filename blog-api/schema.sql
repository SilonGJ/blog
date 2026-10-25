-- 本地: pnpm db:init:local
-- 远程: pnpm db:init:remote

-- 文章浏览量
CREATE TABLE IF NOT EXISTS post_views (
	path  TEXT    PRIMARY KEY,
	count INTEGER NOT NULL DEFAULT 0
) WITHOUT ROWID;

-- 去重
CREATE TABLE IF NOT EXISTS visit_log (
	hash       TEXT    PRIMARY KEY,
	path       TEXT    NOT NULL,
	expires_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_visit_log_expires_at ON visit_log (expires_at);
