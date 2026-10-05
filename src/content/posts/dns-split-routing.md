---
title: Axisnow + Cloudflare，博客最后的分流
published: 2026-10-05
description: 由于 Cloudflare 在国内的访问速度堪称玄学，所以尝试使用了 Axisnow + Cloudflare 的分流方式，很大程度提升了国内访问体验
tags:
  - DNS
  - Cloudflare
  - Axisnow
  - 博客
category: 技术
draft: true
---
# 前言

本博客经历比较曲折，文章没多少但是各种架构换了好多次...

最初其实是在 NAS 上跑的 Halo，通过 Tunnel 开放出来，速度自然不用说，慢的离谱...

后来就迁移到了 Cloudflare Worker，一直用到现在。

这么看来其实还是挺清楚的对吧？但 Cloudflare 在国内的玄学访问速度实在是受不了，于是又做了一大堆的东西，包括但不限于：

- Cloudflare 优选
- 套其它各种 CDN
- ...

最终选择了国内走 Axisnow CDN 和国外走 Cloudflare 的架构，所以这篇文章用来记录一些东西。

# Axisnow

最初接触到 Axisnow 是好几天前，看到有免费的提供商，于是浅浅尝试了一下，发现在国内的访问速度非常不错(至少比之前好多了)

![image.png](/images/archive/image.png)

然后当时太懒了，随便套了 CDN，啥分流也没做，连 Axisnow 的拨测都没做，就上线了

果然，不出所料，第二天在下午1点左右，再次 itdog 测速，地图红红的一片红点，300多个节点，能有100多无法访问

# 分流

于是开始研究如何分流

由于我长期使用的是根域名，然而我当时并不知道根域名的各种坏处...

直到把托管在 Cloudflare 的域名 [zcx0217.qzz.io](http://zcx0217.qzz.io) CNAME 到 Axisnow，并且做了国内外的分流和拨测，然后...神奇的事情就发生了，哪怕是国内的IP，仍然全部都分流到了 Cloudflare

![image.png](/images/archive/image-1.png)

询问 Deepseek 后，最终得出的结论是：

```
不能用根域名
```

**根域名通常是没法直接配置 CNAME 解析的**，Cloudflare 之所以可以做 CNAME 是因为使用了 CNAME Flattening。

用 Deepseek 的说法就是：

```
根域名通常不能直接配置 CNAME，因为它必须存在 SOA、NS 等记录，CNAME 不能与其它记录共存。Cloudflare 是通过 CNAME Flattening 在权威 DNS 侧帮你解析目标，所以看起来像支持根域 CNAME。
在我的场景里，由于 Cloudflare 代理开启，返回的是 Cloudflare 的 Anycast IP，AxisNow 看到的是 Cloudflare 回源节点，而不是终端用户 IP，所以基于来源的分流失效。
```

也就是说，相当于 Cloudflare 的节点自己帮你走完整条 CNAME 链，然后才把 IP 返回给客户端，这导致 Axisnow 分流那边看到的是 Cloudflare 的节点，所以自然无法分流了。

要解决其实很简单，既然根域名没法分流，那就别用根域名了，用 [www.zcx0217.qzz.io](http://www.zcx0217.qzz.io) 做分流，并把 [zcx0217.qzz.io](http://zcx0217.qzz.io) 301重定向过去。

由于根域名无法分流，所以我是直接让根域名通过阿里云BGP的节点做拨测了。虽然某些地区或者运营商不是最优的，但是勉强能用吧。

![image.png](/images/archive/image-2.png)

然后 [www.zcx0217.qzz.io](http://www.zcx0217.qzz.io) 把分流做好：

![image.png](/images/archive/image-3.png)

这样，就得到了一个在中国绿油油(忽略那17个无法访问)的站点了

![image.png](/images/archive/image-4.png)

当然，由于根域名没法做分流，所以 [zcx0217.qzz.io](http://zcx0217.qzz.io) 的测速结果是比 [www.zcx0217.qzz.io](http://www.zcx0217.qzz.io) 差很多的，这一点我暂时没想到啥好的解决方法，唯一想到的就只有把域名托管到 DNSPod，或者其它的 DNS 服务商来做分流，然后通过 `自定义主机名` 接入到 Cloudflare，但是太麻烦了，还没研究明白...