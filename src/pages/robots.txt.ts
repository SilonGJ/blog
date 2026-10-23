import type { APIRoute } from "astro";
import { siteUrl } from "@/config";

export const GET: APIRoute = () => {
	const sitemapUrl = new URL("sitemap-index.xml", siteUrl).href;
	const body = [
		"User-agent: *",
		"Allow: /",
		"",
		`Sitemap: ${sitemapUrl}`,
		"",
	].join("\n");

	return new Response(body, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};
