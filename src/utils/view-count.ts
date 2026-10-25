import { siteConfig } from "@/config";

const COUNT_SELECTOR = "[data-view-count]";
const STATE_ATTRIBUTE = "data-view-count-state";

// swup 切页间复用的内存缓存；刷新页面后清空、重新拉取
const countCache = new Map<string, number>();
// 本会话已 POST 过的文章：服务端按访客去重，重复进入不会 +1，无需再请求
const postedPaths = new Set<string>();

function apiUrl(endpoint: string): string {
	const base = (siteConfig.viewCount.apiBase || "/api").replace(/\/+$/, "");
	// 尾斜杠与站点 trailingSlash: "always" 一致，本地 Vite 代理才能接管请求
	return `${base}/${endpoint}/`;
}

function formatCount(count: number): string {
	if (count >= 10000) {
		return `${(count / 10000).toFixed(1).replace(/\.0$/, "")}万`;
	}
	return String(count);
}

function applyCount(element: HTMLElement, count: number): void {
	element.textContent = formatCount(count);
}

function setState(element: HTMLElement, state: string): void {
	element.setAttribute(STATE_ATTRIBUTE, state);
}

function hideGroup(element: HTMLElement): void {
	// Tailwind 的 flex 类会覆盖 [hidden]，必须直接改 display
	(element.closest<HTMLElement>("[data-view-group]") ?? element).style.display =
		"none";
}

async function fetchCounts(paths: string[]): Promise<Record<string, number>> {
	const response = await fetch(apiUrl("views/batch"), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ paths }),
	});
	if (!response.ok) {
		throw new Error(`view count API responded ${response.status}`);
	}
	const data = (await response.json()) as { counts?: Record<string, number> };
	return data.counts ?? {};
}

async function fetchHit(path: string): Promise<number> {
	const response = await fetch(apiUrl("views"), {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ path }),
	});
	if (!response.ok) {
		throw new Error(`view count API responded ${response.status}`);
	}
	const data = (await response.json()) as { count?: number };
	return data.count ?? 0;
}

/**
 * 填充当前页面的浏览量：列表页优先读内存缓存，只有未缓存的路径才发请求。
 * 文章页（data-view-hit）每次都 POST 计数，返回值回写缓存供切回列表页时复用。
 */
export async function initViewCounts(): Promise<void> {
	if (!siteConfig.viewCount.enable) return;

	const pending = Array.from(
		document.querySelectorAll<HTMLElement>(COUNT_SELECTOR),
	).filter((element) => !element.hasAttribute(STATE_ATTRIBUTE));

	const batch: Array<[HTMLElement, string]> = [];
	const hits: HTMLElement[] = [];
	for (const element of pending) {
		const path = element.dataset.path;
		if (path === undefined) {
			setState(element, "error");
			hideGroup(element);
			continue;
		}
		if (element.hasAttribute("data-view-hit")) {
			// 已计数过的直接用上次 POST 的返回值展示，数值与服务端一致
			if (postedPaths.has(path)) {
				applyCount(element, countCache.get(path) ?? 0);
				setState(element, "loaded");
			} else {
				hits.push(element);
				setState(element, "loading");
			}
			continue;
		}
		const cached = countCache.get(path);
		if (cached !== undefined) {
			applyCount(element, cached);
			setState(element, "loaded");
		} else {
			batch.push([element, path]);
			setState(element, "loading");
		}
	}

	await Promise.all([
		batch.length > 0 &&
			fetchCounts([...new Set(batch.map(([, path]) => path))])
				.then((counts) => {
					for (const [, path] of batch) {
						countCache.set(path, counts[path] ?? 0);
					}
					for (const [element, path] of batch) {
						applyCount(element, countCache.get(path) ?? 0);
						setState(element, "loaded");
					}
				})
				.catch(() => {
					for (const [element] of batch) {
						setState(element, "error");
						hideGroup(element);
					}
				}),
		...hits.map((element) => {
			const path = element.dataset.path ?? "";
			return fetchHit(path)
				.then((count) => {
					countCache.set(path, count);
					postedPaths.add(path);
					applyCount(element, count);
					setState(element, "loaded");
				})
				.catch(() => {
					setState(element, "error");
					hideGroup(element);
				});
		}),
	]);
}
