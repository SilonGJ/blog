import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants";
import { expressiveCodeConfig, siteConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	// When the theme color is fixed, the stored value is never used
	if (siteConfig.themeColor.fixed) return getDefaultHue();
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	// When the theme color is fixed, never persist it
	if (!siteConfig.themeColor.fixed) {
		localStorage.setItem("hue", String(hue));
	}
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE): void {
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

/* ===== Boolean UI preferences (animations / rounded corners) =====
 * Default: the feature is enabled, i.e. there is no entry in localStorage
 * at all. The key is only written when the user turns the feature off, and
 * removed when they turn it back on, so nothing is stored needlessly. */
const PREFERENCE_OFF_VALUE = "off";

function isPreferenceEnabled(key: string): boolean {
	return localStorage.getItem(key) !== PREFERENCE_OFF_VALUE;
}

function storePreference(key: string, enabled: boolean): void {
	if (enabled) {
		// Release the local storage slot instead of storing "on"
		localStorage.removeItem(key);
	} else {
		localStorage.setItem(key, PREFERENCE_OFF_VALUE);
	}
}

/* ===== Animation preference ===== */
const ANIMATION_KEY = "animations";
export const ANIMATION_CHANGE_EVENT = "animation-preference-changed";

export function isAnimationsEnabled(): boolean {
	return isPreferenceEnabled(ANIMATION_KEY);
}

export function applyAnimationPreference(): void {
	document.documentElement.classList.toggle(
		"no-animations",
		!isAnimationsEnabled(),
	);
}

export function setAnimationsEnabled(enabled: boolean): void {
	storePreference(ANIMATION_KEY, enabled);
	applyAnimationPreference();
	document.dispatchEvent(new CustomEvent(ANIMATION_CHANGE_EVENT));
}

/* ===== Rounded corners preference (pure CSS, no change event needed) ===== */
const ROUNDED_KEY = "rounded";

export function isRoundedEnabled(): boolean {
	return isPreferenceEnabled(ROUNDED_KEY);
}

export function applyRoundedPreference(): void {
	document.documentElement.classList.toggle("no-rounded", !isRoundedEnabled());
}

export function setRoundedEnabled(enabled: boolean): void {
	storePreference(ROUNDED_KEY, enabled);
	applyRoundedPreference();
}
