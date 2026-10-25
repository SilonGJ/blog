import { cleanupExpiredVisits, cleanupUnknownPostViews } from "./cleanup";
import { handleRequest } from "./router";
import type { Env } from "./types";

export default {
	fetch: handleRequest,
	scheduled(_controller, env, ctx) {
		ctx.waitUntil(cleanupExpiredVisits(env));
		ctx.waitUntil(cleanupUnknownPostViews(env));
	},
} satisfies ExportedHandler<Env>;
