export interface Env {
	DB: D1Database;
	/** 访客身份哈希盐值，生产环境通过 `wrangler secret put SALT` 设置 */
	SALT: string;
	/** 站点地址，用于从 sitemap 校验文章路径是否存在 */
	SITE_URL: string;
}
