import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { slug as githubSlug } from "github-slugger";

const VIRTUAL_ID = "virtual:post-slugs";
const RESOLVED_ID = `\0${VIRTUAL_ID}`;
const POSTS_DIR = fileURLToPath(new URL("../content/posts", import.meta.url));

function getFrontmatter(file) {
	const raw = fs.readFileSync(file, "utf8");
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
	return match?.[1] ?? "";
}

function isDraft(frontmatter) {
	return /^\s*draft:\s*(?:true|True|TRUE)\s*(?:#.*)?$/m.test(frontmatter);
}

function collect(dir, files) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.name.startsWith(".")) continue;

		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			collect(fullPath, files);
		} else if (entry.isFile() && entry.name.endsWith(".md")) {
			files.push(fullPath);
		}
	}
}

export function postSlugsPlugin() {
	let isBuild = false;

	return {
		name: "post-slugs",
		configResolved(config) {
			isBuild = config.command === "build";
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
		},
		load(id) {
			if (id !== RESOLVED_ID) return;

			const files = [];
			collect(POSTS_DIR, files);

			const slugs = new Set();
			for (const file of files) {
				const frontmatter = getFrontmatter(file);
				if (isBuild && isDraft(frontmatter)) continue;

				const relativePath = path.relative(POSTS_DIR, file).slice(0, -3);
				const slug = relativePath
					.split(path.sep)
					.map((segment) => githubSlug(segment))
					.join("/")
					.replace(/\/index$/, "");
				if (slug) slugs.add(slug);
			}

			if (slugs.size === 0) {
				throw new Error(`No posts found in ${POSTS_DIR}`);
			}

			for (const file of files) this.addWatchFile(file);

			return `export default ${JSON.stringify([...slugs].sort())};`;
		},
		configureServer(server) {
			const invalidate = (file) => {
				if (!file.startsWith(`${POSTS_DIR}${path.sep}`) || !file.endsWith(".md")) return;

				const graphs = new Set([server.moduleGraph]);
				for (const environment of Object.values(server.environments ?? {})) {
					if (environment?.moduleGraph) graphs.add(environment.moduleGraph);
				}
				for (const graph of graphs) {
					const mod = graph?.getModuleById?.(RESOLVED_ID);
					if (mod) graph.invalidateModule(mod);
				}
			};

			server.watcher.on("add", invalidate);
			server.watcher.on("unlink", invalidate);
			server.watcher.on("change", invalidate);
		},
	};
}
