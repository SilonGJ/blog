# AGENTS.md — blog-fuwari

## 沟通 & 开发规范

- 请详细遵守系统提示词约束
- 遇到不会/没有见过的问题，请从互联网中搜索及查询相关文档，而不是基于各种幻觉瞎编
- 计划模式(Plan Mode)仅供规划下一步的执行框架、步骤使用，严禁在计划模式(Plan Mode)下尝试各种手段绕过限制修改文件，或间接对项目文件产生影响
- 如需扫描项目框架、理解某个功能的具体实现，请使用子代理(Sub Agent)以获取更准确的信息并降低上下文长度
- 若开发服务器正在运行，禁止私自杀死开发服务器进程
- 禁止对Git进行任何诸如提交、推送、撤回、变基等操作，但可以查看历史文件等

---

## 项目概述

基于 [Astro](https://astro.build/) 的静态博客，使用 fuwari 主题并进行深度魔改。部署在 Cloudflare Workers。

包管理器：**pnpm**（`preinstall` 脚本禁止使用 npm/yarn）。

---

## 常用命令

```bash
pnpm dev          # 启动开发服务器（不含浏览量 API）
pnpm dev:all      # 同时启动站点 + blog-api Worker，/api 自动代理到 8787
pnpm dev:api      # 仅启动 blog-api Worker（wrangler dev）
pnpm build        # 构建 + pagefind 搜索索引
pnpm check        # Astro 类型检查 + 根 tsc + blog-api 类型检查
pnpm lint         # Biome 检查并自动修复
pnpm deploy:api   # 部署 blog-api Worker
pnpm db:init:local   # 本地 D1 初始化（幂等，可重复执行）
pnpm db:init:remote  # 远程 D1 初始化（首次部署手动执行一次）
```

---

## 路径别名（tsconfig.json）

| 别名 | 指向 |
|------|------|
| `@components/*` | `src/components/*` |
| `@utils/*` | `src/utils/*` |
| `@constants/*` | `src/constants/*` |
| `@layouts/*` | `src/layouts/*` |
| `@/*` | `src/*` |

---

## 架构要点

**内容集合**（`src/content.config.ts`）：
- `posts`：`src/content/posts/*.md`，由 Astro Content Loader 驱动
- `spec`：`src/content/spec/*.{md,mdx}`，用于 About/Links 等页面

**配置入口**（`src/config.ts`）：
- `siteConfig`：站点标题、语言、主题色、Banner、Toc 等
- `navBarConfig`：导航栏链接（混合使用 `LinkPreset` 枚举和自定义 `NavBarLink`）
- `profileConfig`：头像、名称、社交链接
- `licenseConfig`：文章版权信息
- `expressiveCodeConfig`：代码高亮主题（仅支持深色背景）

**友链**：`src/links/1.json`, `src/links/2.json`… 按文件名顺序排列。

**浏览量 API**（`blog-api/`，pnpm workspace 子包）：
- 独立 Worker `blog-api`，通过 `域名/api*` 路由接入；D1 绑定 `DB`，每日 Cron 清理过期去重记录
- 端点只有两个：`POST /api/views/batch/`（列表页批量读取，body `{ "paths": [...] }`）与 `POST /api/views/`（文章页去重计数 + 读取，单次请求完成）
- 去重：`SHA-256(SALT + IP + UA + path)` 存 D1，14 天有效；盐值生产用 `wrangler secret put SALT`，本地放 `blog-api/.dev.vars`
- 文章存在性：POST 前用站点 sitemap（`SITE_URL` 变量）校验 path，不存在的文章 404 不写库；路径集合缓存于 isolate 内存（见 `src/posts-registry.ts`）
- **新增接口或表结构时同步更新本节说明**，本 Worker 不使用框架，路由在 `src/router.ts` 中显式匹配
