/// <reference types="mdast" />
import { h } from "hastscript";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Creates a Friend Links component.
 *
 * @param {Object} properties - The properties of the component.
 * @param {import('mdast').RootContent[]} children - The children elements of the component.
 * @returns {import('mdast').Parent} The created Friend Links component.
 */
export function FriendLinksComponent(properties, children) {
	try {
		const __dirname = path.dirname(fileURLToPath(import.meta.url));
		const linksDir = path.join(__dirname, "..", "links");
		const files = fs.readdirSync(linksDir).filter((f) => f.endsWith(".json"));

		const links = files
			.map((file) => {
				const content = fs.readFileSync(path.join(linksDir, file), "utf-8");
				return JSON.parse(content);
			})
			.sort((a, b) => a.name.localeCompare(b.name));

		const items = links.map((link) => {
			const initial = link.name ? link.name.charAt(0) : "?";
			const hasIcon = link.icon && link.icon.trim();

			return h(
				"a",
				{
					href: link.url,
					target: "_blank",
					rel: "noopener noreferrer",
					class: "btn-card no-styling !no-underline rounded-2xl p-4 flex items-start gap-4 group",
				},
				[
					h(
						"div",
						{
							class: "w-12 h-12 flex-shrink-0 relative rounded-lg overflow-hidden border border-[var(--line-divider)]",
						},
						[
							h(
								"div",
								{
									class: "absolute inset-0 flex items-center justify-center text-xl font-bold text-50 bg-[var(--btn-regular-bg)]",
								},
								initial,
							),
							...(hasIcon
								? [
										h("img", {
											src: link.icon,
											alt: "",
											loading: "lazy",
											referrerpolicy: "no-referrer",
											class: "absolute inset-0 w-full h-full object-cover !m-0 img-fade",
										}),
									]
								: []),
						],
					),
					h("div", { class: "flex-1 min-w-0 overflow-hidden" }, [
						h("div", { class: "flex items-center gap-2 mb-1" }, [
							h(
								"span",
								{
									class: "font-bold text-90 truncate group-hover:text-[var(--primary)] transition-colors",
								},
								link.name,
							),
						]),
						h(
							"p",
							{
								class: link.description
									? "text-xs text-50 line-clamp-2 leading-relaxed !m-0"
									: "text-xs text-30 italic !m-0",
							},
							link.description || "暂无描述",
						),
					]),
				],
			);
		});

		return h(
			"div",
			{
				class: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
			},
			items,
		);
	} catch (e) {
		console.error("[FriendLinks] Error:", e);
		return h("div", { class: "text-red-500" }, ["友链加载失败: " + e.message]);
	}
}
