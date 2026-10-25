import { json } from "./response";
import type { Env } from "./types";
import { batchViewCounts, recordView } from "./views";

// 通过 `域名/api*` 路由接入，请求路径保留 /api 前缀；
// 未匹配的路径直接 404，不触碰 D1
export async function handleRequest(
	request: Request,
	env: Env,
	ctx: Pick<ExecutionContext, "waitUntil">,
): Promise<Response> {
	const { pathname } = new URL(request.url);
	// 站点约定 URL 以 / 结尾，API 同样接受带与不带尾斜杠的写法
	const route = pathname.replace(/\/+$/, "") || "/";

	if (route === "/api/views/batch") {
		if (request.method === "POST") return batchViewCounts(request, env);
		return json({ error: "Method Not Allowed" }, 405);
	}

	if (route === "/api/views") {
		if (request.method === "POST") return recordView(request, env, ctx);
		return json({ error: "Method Not Allowed" }, 405);
	}

	return json({ error: "Not Found" }, 404);
}
