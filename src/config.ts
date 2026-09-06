import type {
	ExpressiveCodeConfig,
	FriendLink,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "SilonGJ",
	subtitle: "主站",
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		hue: 240, // Default hue for the theme color, from 0 to 360. e.g. red: 0, teal: 200, cyan: 250, pink: 345
		fixed: true, // Hide the theme color picker for visitors
	},
	banner: {
		enable: false,
		src: "", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: "", // Credit text to be displayed
			url: "", // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		{
			src: "/images/favicon.png",
			sizes: "32x32",
		},
	],
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		LinkPreset.FriendLinks,
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "/images/avatar.webp",
	name: "孤久きりのなか",
	bio: "",
	links: [
		{
			name: "QQ",
			icon: "simple-icons:qq",
			url: "https://qm.qq.com/cgi-bin/qm/qr?k=1910115941",
		},
		{
			name: "GitHub",
			icon: "simple-icons:github",
			url: "https://github.com/SilonGJ",
		},
		{
			name: "BiliBili",
			icon: "simple-icons:bilibili",
			url: "https://space.bilibili.com/1038766354",
		},
		{
			name: "Email",
			icon: "simple-icons:maildotru",
			url: "mailto:blog@silongj.cc.cd",
		},
		{
			name: "NameMC",
			icon: "simple-icons:namemc",
			url: "https://namemc.com/profile/ZCX0217",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};

const linkModules = import.meta.glob("./links/*.json", {
	eager: true,
}) as Record<string, { default: FriendLink }>;

const friendLinks: FriendLink[] = Object.values(linkModules).map(
	(m) => m.default,
);

export const siteUrl = "https://zcx0217.qzz.io/";

export const codeFontFamily =
	"'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
