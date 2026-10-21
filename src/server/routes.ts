import { getViews, getViewsBatch, incrementViews } from "./views";

const SINGLE_ROUTE = /^\/api\/views\/([^/]+)$/;

function jsonError(message: string, status: number): Response {
	return new Response(JSON.stringify({ error: message }), {
		status,
		headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
	});
}

export async function routeViews(request: Request, env: Env): Promise<Response> {
	try {
		if (!env.VIEW_SALT) return jsonError("Server misconfigured", 500);

		const path = new URL(request.url).pathname;
		// 兼容带/不带尾斜杠；Astro dev 会拦截无斜杠请求。
		const normalizedPath = path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

		if (normalizedPath === "/api/views/batch" && request.method === "POST") {
			return await getViewsBatch(request, env.D1);
		}

		const singleMatch = normalizedPath.match(SINGLE_ROUTE);
		if (singleMatch) {
			const slug = decodeURIComponent(singleMatch[1]);
			if (request.method === "GET") return await getViews(slug, env.D1);
			if (request.method === "POST") return await incrementViews(slug, request, env);
		}

		return new Response("Not Found", { status: 404 });
	} catch {
		return jsonError("Internal error", 500);
	}
}
