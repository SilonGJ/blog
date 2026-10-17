import type { AstroIntegration } from "@swup/astro";

declare global {
	interface Window {
		// type from '@swup/astro' is incorrect
		swup: AstroIntegration;
		// Loaded on demand by Search.astro; its presence also means "ready"
		pagefind?: {
			search: (query: string) => Promise<{
				results: Array<{
					data: () => Promise<SearchResult>;
				}>;
			}>;
			options: (options?: { excerptLength?: number }) => Promise<void>;
			init: () => Promise<void>;
		};
		// One-time guard for Search.astro: swup re-executes inline scripts on
		// every page view, which would otherwise stack duplicate listeners
		__searchInitialized?: boolean;
	}
}

interface SearchResult {
	url: string;
	meta: {
		title: string;
	};
	excerpt: string;
	content?: string;
	word_count?: number;
	filters?: Record<string, unknown>;
	anchors?: Array<{
		element: string;
		id: string;
		text: string;
		location: number;
	}>;
	weighted_locations?: Array<{
		weight: number;
		balanced_score: number;
		location: number;
	}>;
	locations?: number[];
	raw_content?: string;
	raw_url?: string;
	sub_results?: SearchResult[];
}
