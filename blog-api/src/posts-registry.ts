import type { Env } from "./types";

// 已知文章路径集合，来自站点 sitemap，用于拒绝给不存在的文章计数。
// 内存缓存 + stale-while-revalidate：请求校验永不等待网络；拉取失败 fail-open（返回 null 放行）。
const CACHE_TTL_MS = 30 * 60 * 1000;
const FAILURE_TTL_MS = 2 * 60 * 1000;

type Registry = {
	paths: Set<string> | null; // null = 最近一次拉取失败
	fetchedAt: number;
};

let cache: Registry | null = null;
let refresh: Promise<Set<string> | null> | null = null;

function extractLocs(xml: string): string[] {
	return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)]
		.map((match) => match[1]?.trim() ?? "")
		.filter((loc) => loc.length > 0);
}

function extractPostPaths(xml: string): Set<string> {
	const paths = new Set<string>();
	for (const loc of extractLocs(xml)) {
		try {
			const { pathname } = new URL(loc);
			if (pathname.startsWith("/posts/")) paths.add(pathname);
		} catch {
			// 忽略无法解析的 <loc>
		}
	}
	return paths;
}

async function fetchSitemap(url: string): Promise<string | null> {
	const response = await fetch(url, {
		headers: { "user-agent": "blog-api (sitemap cache)" },
		cf: { cacheTtl: 600, cacheEverything: true },
	});
	return response.ok ? response.text() : null;
}

async function collectPostPaths(env: Env): Promise<Set<string> | null> {
	const base = env.SITE_URL?.replace(/\/+$/, "");
	if (!base) return null;

	try {
		const indexUrl = `${base}/sitemap-index.xml`;
		const indexXml = await fetchSitemap(indexUrl);
		if (!indexXml) return null;

		// sitemap 分片（如 sitemap-0.xml）；解析不到分片时把索引本身当作分片
		const shards: string[] = [];
		for (const loc of extractLocs(indexXml)) {
			try {
				const url = new URL(loc);
				if (url.pathname.endsWith(".xml")) shards.push(url.href);
			} catch {
				// 忽略无法解析的 <loc>
			}
		}

		const files = shards.length > 0 ? shards : [indexUrl];
		const paths = new Set<string>();
		for (const file of files) {
			const xml = file === indexUrl ? indexXml : await fetchSitemap(file);
			if (xml) {
				for (const path of extractPostPaths(xml)) paths.add(path);
			}
		}
		return paths.size > 0 ? paths : null;
	} catch {
		return null;
	}
}

function isFresh(registry: Registry): boolean {
	return (
		Date.now() - registry.fetchedAt <
		(registry.paths ? CACHE_TTL_MS : FAILURE_TTL_MS)
	);
}

async function fetchRegistry(env: Env): Promise<Registry> {
	return { paths: await collectPostPaths(env), fetchedAt: Date.now() };
}

/** null 表示 sitemap 不可用，调用方应放行。 */
export function getKnownPostPaths(
	env: Env,
	ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Set<string> | null> {
	const stale = cache && !isFresh(cache) ? cache : null;
	if (cache && !stale) return Promise.resolve(cache.paths);

	if (!refresh) {
		const updating = fetchRegistry(env)
			.then((next) => {
				cache = next;
				return next.paths;
			})
			.finally(() => {
				refresh = null;
			});
		refresh = updating;
		if (stale) ctx.waitUntil(updating);
	}

	// 有过期缓存时先返回旧数据，刷新在后台进行
	if (stale) return Promise.resolve(stale.paths);
	return refresh.then((paths) => paths);
}

/** 强制拉取最新集合（Cron 清扫用）；失败返回 null，调用方必须跳过清扫。 */
export async function getFreshPostPaths(env: Env): Promise<Set<string> | null> {
	const paths = await collectPostPaths(env);
	if (paths) cache = { paths, fetchedAt: Date.now() };
	return paths;
}
