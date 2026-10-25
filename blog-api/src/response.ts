export const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
	// 禁止缓存
	"cache-control": "no-store",
} as const;

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}
