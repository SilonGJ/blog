const SESSION_KEY_PREFIX = "viewed_";

export async function incrementViews(slug: string): Promise<number | null> {
	if (
		typeof sessionStorage !== "undefined" &&
		sessionStorage.getItem(SESSION_KEY_PREFIX + slug)
	) {
		const res = await fetch(`/api/views/${encodeURIComponent(slug)}`);
		if (!res.ok) return null;
		const data = (await res.json()) as { count: number };
		return data.count;
	}

	const res = await fetch(`/api/views/${encodeURIComponent(slug)}`, {
		method: "POST",
	});
	if (!res.ok) return null;
	const data = (await res.json()) as { count: number };

	if (typeof sessionStorage !== "undefined") {
		sessionStorage.setItem(SESSION_KEY_PREFIX + slug, "1");
	}

	return data.count;
}

export async function getViewsBatch(
	slugs: string[],
): Promise<Record<string, number>> {
	if (slugs.length === 0) return {};

	const res = await fetch("/api/views/batch", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ slugs }),
	});
	if (!res.ok) return {};

	const data = (await res.json()) as { data: Record<string, number> };
	return data.data ?? {};
}
