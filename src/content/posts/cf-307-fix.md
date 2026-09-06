---
title: 解决 Cloudflare Workers 访问不带斜杠的 URL 返回 307 的问题
published: 2026-08-24
updated: 2026-08-24
description: Cloudflare Workers 在访问不带斜杠的 URL 返回 307 导致不被谷歌收录的问题修复
tags:
  - Cloudflare
  - Cloudflare Workers
  - 技术
  - 博客
category: 技术
---

# 起因

今天看 Google Search Console 时，突然发现了这个

![2026-08-24_12-35.png](/images/archive/2026-08-24_12-35.png)

于是找`Opencode`排查了下 ~~(Opencode 说的话看看就好)~~

![图片.png](/images/archive/图片.png)

终于知道为啥子目录都没被收录了😅

# 解决

知道了原因，解决起来就比较简单了

在 Cloudflare 创建这样一条重定向规则

![图片-1.png](/images/archive/图片-1.png)

```
(not ends_with(http.request.uri.path, "/")) and (not http.request.uri.path contains ".") and (http.request.uri.path != "/")
```

重定向到

```
concat("你的域名", http.request.uri.path, "/")
```

这样在 Worker 之前抢先 301 重定向

使`curl`测试

可以看到不带`/` 的链接被正确 301 重定向了

![图片-2.png](/images/archive/图片-2.png)



就这样吧，希望过几天能被谷歌正常收录

# 参考资料

[https://hitoritech.com/blog/how-to-fix-google-search-console-redirect-errors/](https://hitoritech.com/blog/how-to-fix-google-search-console-redirect-errors/)
