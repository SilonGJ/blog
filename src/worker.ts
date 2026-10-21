import { handle } from "@astrojs/cloudflare/handler";
import { routeViews } from "./server/routes";
import { cleanupDedup } from "./server/views";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const { pathname } = new URL(request.url);
		if (pathname.startsWith("/api/views/")) {
			return routeViews(request, env);
		}
		return handle(request, env, ctx);
	},

	async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
		ctx.waitUntil(cleanupDedup(env.D1));
	},
} satisfies ExportedHandler<Env>;
