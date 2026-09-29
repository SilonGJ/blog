import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

/* ===== Animation preference =====
 * Default: animations enabled (no entry in localStorage at all).
 * The key is only written when the user disables animations, and removed
 * when they enable them again, so nothing is stored needlessly. */
const ANIMATION_KEY = "animations";
const ANIMATION_OFF_VALUE = "off";
export const ANIMATION_CHANGE_EVENT = "animation-preference-changed";

export function isAnimationsEnabled(): boolean {
	return localStorage.getItem(ANIMATION_KEY) !== ANIMATION_OFF_VALUE;
}

export function applyAnimationPreference(): void {
	document.documentElement.classList.toggle(
		"no-animations",
		!isAnimationsEnabled(),
	);
}

export function setAnimationsEnabled(enabled: boolean): void {
	if (enabled) {
		// Release the local storage slot instead of storing "on"
		localStorage.removeItem(ANIMATION_KEY);
	} else {
		localStorage.setItem(ANIMATION_KEY, ANIMATION_OFF_VALUE);
	}
	applyAnimationPreference();
	document.dispatchEvent(new CustomEvent(ANIMATION_CHANGE_EVENT));
}
