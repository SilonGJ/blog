import POST_SLUGS from "virtual:post-slugs";

const SLUG_REGEX = /^[a-zA-Z0-9\-/]+$/;
const MAX_BATCH_SIZE = 50;
const MAX_BODY_BYTES = 2 * 1024;
const DEDUP_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const KNOWN_SLUGS = new Set(POST_SLUGS);

interface ViewsEnv {
	D1: D1Database;
	VIEW_SALT: string;
}

async function computeHash(slug: string, ip: string, ua: string, salt: string): Promise<string> {
	const data = `${slug}|${ip}|${ua}|${salt}`;
	const encoder = new TextEncoder();
	const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.substring(0, 16);
}

function validateSlug(slug: string): boolean {
	return slug.length > 0 && slug.length <= 256 && SLUG_REGEX.test(slug);
}

function isKnownSlug(slug: string): boolean {
	return validateSlug(slug) && KNOWN_SLUGS.has(slug);
}

function rejectSlug(slug: string): Response | null {
	if (!validateSlug(slug)) return json({ error: "Invalid slug" }, 400);
	if (!KNOWN_SLUGS.has(slug)) return json({ error: "Not found" }, 404);
	return null;
}

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
	});
}

async function readJsonBody(request: Request): Promise<unknown | Response> {
	const contentType = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
	if (contentType !== "application/json") return json({ error: "Unsupported Media Type" }, 415);

	const contentLength = request.headers.get("Content-Length");
	if (contentLength !== null) {
		const length = Number(contentLength);
		if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);
	}

	if (!request.body) return json({ error: "Invalid JSON" }, 400);

	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let total = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			total += value.byteLength;
			if (total > MAX_BODY_BYTES) {
				await reader.cancel();
				return json({ error: "Payload too large" }, 413);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const bytes = new Uint8Array(total);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}

	try {
		return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
	} catch {
		return json({ error: "Invalid JSON" }, 400);
	}
}

export async function getViews(slug: string, d1: D1Database): Promise<Response> {
	const rejection = rejectSlug(slug);
	if (rejection) return rejection;

	const row = await d1.prepare("SELECT count FROM article_views WHERE slug = ?").bind(slug).first<{ count: number }>();
	return json({ count: row?.count ?? 0 });
}

export async function incrementViews(slug: string, request: Request, env: ViewsEnv): Promise<Response> {
	const rejection = rejectSlug(slug);
	if (rejection) return rejection;

	const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
	const ua = request.headers.get("User-Agent") ?? "unknown";
	const hash = await computeHash(slug, ip, ua, env.VIEW_SALT);
	const now = Math.floor(Date.now() / 1000);

	const results = await env.D1.batch([
		env.D1.prepare("INSERT OR IGNORE INTO view_dedup (hash, slug, created_at) VALUES (?, ?, ?)").bind(hash, slug, now),
		env.D1.prepare("SELECT count FROM article_views WHERE slug = ?").bind(slug),
	]);

	const isNew = (results[0] as any).meta?.changes > 0;
	let count = (results[1]?.results as any)?.[0]?.count ?? 0;

	if (isNew) {
		await env.D1.prepare(
			`INSERT INTO article_views (slug, count) VALUES (?, 1)
			 ON CONFLICT(slug) DO UPDATE SET count = count + 1, updated_at = CURRENT_TIMESTAMP`,
		).bind(slug).run();
		count += 1;
	}

	return json({ count });
}

export async function getViewsBatch(request: Request, d1: D1Database): Promise<Response> {
	const body = await readJsonBody(request);
	if (body instanceof Response) return body;

	if (typeof body !== "object" || body === null) return json({ data: {} });
	const slugs = (body as { slugs?: unknown }).slugs;
	if (!Array.isArray(slugs) || slugs.length === 0) return json({ data: {} });
	if (slugs.length > MAX_BATCH_SIZE) return json({ error: `Max ${MAX_BATCH_SIZE} slugs` }, 400);

	const validSlugs = [...new Set(slugs.filter((slug): slug is string => typeof slug === "string" && isKnownSlug(slug)))];
	if (validSlugs.length === 0) return json({ data: {} });

	const placeholders = validSlugs.map(() => "?").join(",");
	const { results } = await d1.prepare(`SELECT slug, count FROM article_views WHERE slug IN (${placeholders})`)
		.bind(...validSlugs)
		.all<{ slug: string; count: number }>();

	const data: Record<string, number> = {};
	for (const slug of validSlugs) data[slug] = 0;
	for (const row of results ?? []) data[row.slug] = row.count;

	return json({ data });
}

export async function cleanupDedup(d1: D1Database): Promise<void> {
	const cutoff = Math.floor(Date.now() / 1000) - DEDUP_TTL;
	await d1.prepare("DELETE FROM view_dedup WHERE created_at < ?").bind(cutoff).run();
}
