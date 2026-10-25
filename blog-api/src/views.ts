import { getKnownPostPaths } from "./posts-registry";
import { json } from "./response";
import type { Env } from "./types";

// 只统计 /posts/<slug>/，避免任意字符串被写成 D1 行
const POST_PATH_PATTERN = /^\/posts\/[^?#\s]{1,180}\/$/;

// D1 单条查询最多 100 个绑定参数
const MAX_BATCH_PATHS = 100;

// 同一访客（IP + UA）同一篇文章的计数间隔
const VISIT_TTL_SECONDS = 14 * 24 * 60 * 60;

function isPostPath(path: string): boolean {
	return POST_PATH_PATTERN.test(path);
}

/**
 * 访客标识：只保存加盐哈希，原始 IP / UA 不落库
 */
async function hashVisitor(
	env: Env,
	request: Request,
	path: string,
): Promise<string> {
	const ip = request.headers.get("cf-connecting-ip") ?? "";
	const userAgent = request.headers.get("user-agent") ?? "";
	const input = new TextEncoder().encode(
		[env.SALT, ip, userAgent, path].join("\n"),
	);
	const digest = await crypto.subtle.digest("SHA-256", input);
	return Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("");
}

/** POST /api/views/batch/ 批量读取浏览量，供列表页单次请求使用 */
export async function batchViewCounts(
	request: Request,
	env: Env,
): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, 400);
	}

	const rawPaths = readPaths(body);
	const paths = [
		...new Set(
			rawPaths.map((path) => path.trim()).filter((path) => path.length > 0),
		),
	];

	if (paths.length > MAX_BATCH_PATHS) {
		return json({ error: `At most ${MAX_BATCH_PATHS} paths per request` }, 400);
	}
	if (paths.some((path) => !isPostPath(path))) {
		return json({ error: "Invalid path" }, 400);
	}
	if (paths.length === 0) {
		return json({ counts: {} });
	}

	const placeholders = paths.map(() => "?").join(", ");
	const { results } = await env.DB.prepare(
		`SELECT path, count FROM post_views WHERE path IN (${placeholders})`,
	)
		.bind(...paths)
		.all<{ path: string; count: number }>();

	const counts: Record<string, number> = Object.fromEntries(
		paths.map((path) => [path, 0]),
	);
	for (const row of results) {
		counts[row.path] = row.count;
	}

	return json({ counts });
}

function readPath(body: unknown): string {
	if (typeof body !== "object" || body === null) return "";
	const { path } = body as { path?: unknown };
	return typeof path === "string" ? path : "";
}

function readPaths(body: unknown): string[] {
	if (typeof body !== "object" || body === null) return [];
	const { paths } = body as { paths?: unknown };
	return Array.isArray(paths)
		? paths.filter((path): path is string => typeof path === "string")
		: [];
}

/** POST /api/views/ 一次请求完成「去重判断 → 计数 +1 → 返回最新值」 */
export async function recordView(
	request: Request,
	env: Env,
	ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Response> {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: "Invalid JSON body" }, 400);
	}

	const path = readPath(body);
	if (!isPostPath(path)) {
		return json({ error: "Invalid path" }, 400);
	}
	if (!env.SALT) {
		// 未配置盐值时不写入，避免产生无法去重的计数
		return json({ error: "Server is missing the SALT secret" }, 500);
	}

	// 不存在的文章不写任何数据；sitemap 不可用时放行
	const knownPaths = await getKnownPostPaths(env, ctx);
	if (knownPaths && !knownPaths.has(path)) {
		return json({ error: "Not Found" }, 404);
	}

	const hash = await hashVisitor(env, request, path);
	const expiresAt = Math.floor(Date.now() / 1000) + VISIT_TTL_SECONDS;

	const visit = await env.DB.prepare(
		"INSERT INTO visit_log (hash, path, expires_at) VALUES (?1, ?2, ?3) ON CONFLICT (hash) DO NOTHING",
	)
		.bind(hash, path, expiresAt)
		.run();

	const isNewVisitor = (visit.meta.changes ?? 0) > 0;
	const row = isNewVisitor
		? await env.DB.prepare(
				"INSERT INTO post_views (path, count) VALUES (?1, 1) ON CONFLICT (path) DO UPDATE SET count = count + 1 RETURNING count",
			)
				.bind(path)
				.first<{ count: number }>()
		: await env.DB.prepare("SELECT count FROM post_views WHERE path = ?1")
				.bind(path)
				.first<{ count: number }>();

	return json({ count: row?.count ?? 0 });
}
