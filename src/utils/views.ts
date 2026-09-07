const CACHE_KEY = "views_data";
const CACHE_TS_KEY = "views_ts";
const CACHE_TTL = 30 * 60 * 1000;

interface ViewCache {
	[slug: string]: number;
}

function getCache(): ViewCache | null {
	if (typeof localStorage === "undefined") return null;
	const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
	if (Date.now() - ts > CACHE_TTL) return null;
	const raw = localStorage.getItem(CACHE_KEY);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

function setCache(data: ViewCache): void {
	if (typeof localStorage === "undefined") return;
	localStorage.setItem(CACHE_KEY, JSON.stringify(data));
	localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
}

async function fetchViewsBatch(slugs: string[]): Promise<ViewCache> {
	if (slugs.length === 0) return {};
	const res = await fetch("/api/views/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ slugs }),
	});
	if (!res.ok) return {};
	const { data } = (await res.json()) as { data: ViewCache };
	return data ?? {};
}

async function fetchIncrementViews(slug: string): Promise<number | null> {
	const res = await fetch(`/api/views/${encodeURIComponent(slug)}`, {
		method: "POST",
	});
	if (!res.ok) return null;
	const { count } = (await res.json()) as { count: number };
	return count;
}

export async function getViewsForSlugs(slugs: string[]): Promise<ViewCache> {
	const cache = getCache();
	const uncached = slugs.filter((s) => cache === null || !(s in cache));

	if (uncached.length === 0) return cache ?? {};

	const fresh = await fetchViewsBatch(uncached);
	const merged = { ...(cache ?? {}), ...fresh };
	setCache(merged);

	const result: ViewCache = {};
	for (const s of slugs) result[s] = merged[s] ?? 0;
	return result;
}

export async function incrementAndCacheViews(
	slug: string,
): Promise<number | null> {
	const count = await fetchIncrementViews(slug);
	if (count === null) return null;

	const cache = getCache() ?? {};
	cache[slug] = count;
	setCache(cache);

	return count;
}
