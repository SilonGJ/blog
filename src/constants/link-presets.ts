import { LinkPreset, type NavBarLink } from "@/types/config";

export const LinkPresets: { [key in LinkPreset]: NavBarLink } = {
	[LinkPreset.Home]: {
		name: "主页",
		url: "/",
	},
	[LinkPreset.About]: {
		name: "关于",
		url: "/about/",
	},
	[LinkPreset.Archive]: {
		name: "归档",
		url: "/archive/",
	},
	[LinkPreset.FriendLinks]: {
		name: "友链",
		url: "/links/",
	},
};
