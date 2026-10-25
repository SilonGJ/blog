import { getFreshPostPaths } from "./posts-registry";
import type { Env } from "./types";

// D1 单条查询最多 100 个绑定参数
const MAX_BIND_PARAMS = 100;

/** 删除超过 14 天的访问去重记录，由每日 Cron Trigger 调用 */
export async function cleanupExpiredVisits(env: Env): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	await env.DB.prepare("DELETE FROM visit_log WHERE expires_at <= ?1")
		.bind(now)
		.run();
}

/** 兜底清扫 post_views 里不在 sitemap 中的垃圾计数行；sitemap 不可用时跳过，绝不误删 */
export async function cleanupUnknownPostViews(env: Env): Promise<void> {
	const knownPaths = await getFreshPostPaths(env);
	if (!knownPaths || knownPaths.size === 0) return;

	const { results } = await env.DB.prepare("SELECT path FROM post_views").all<{
		path: string;
	}>();
	const stale = results
		.map((row) => row.path)
		.filter((path) => !knownPaths.has(path));

	for (let i = 0; i < stale.length; i += MAX_BIND_PARAMS) {
		const chunk = stale.slice(i, i + MAX_BIND_PARAMS);
		const placeholders = chunk.map(() => "?").join(", ");
		await env.DB.prepare(
			`DELETE FROM post_views WHERE path IN (${placeholders})`,
		)
			.bind(...chunk)
			.run();
	}
}
