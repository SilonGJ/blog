export default function rehypeLinksNewTab() {
	return (tree) => walk(tree);
}

function walk(node) {
	if (!node || typeof node !== "object") return;
	if (node.tagName === "a" && node.properties) {
		const href = node.properties.href;
		// Skip in-page anchors (#xxx), open everything else in a new tab
		if (typeof href === "string" && !href.startsWith("#")) {
			node.properties.target = "_blank";
			node.properties.rel = "noopener noreferrer";
		}
	}
	if (Array.isArray(node.children)) {
		for (const child of node.children) walk(child);
	}
}
