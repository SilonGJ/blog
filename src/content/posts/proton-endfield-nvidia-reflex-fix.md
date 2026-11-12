---
title: 修复 Proton 环境下部分游戏无 Nvidia-Reflex 选项的问题
published: 2026-11-12
description: 记录在 Steam + DWProton 环境下，明日方舟终末地无 Nvidia-Reflex 设置项的修复方法
tags:
  - 技术
  - 杂谈
  - Linux
  - 终末地
category: 技术
draft: false
---
# 环境

GPU: NVIDIA GeForce GTX 1050 Ti

兼容层: DWProton 11.0-16

启动器: Steam

游戏名: 明日方舟:终末地 (使用默认 Vulkan 运行)

# 方法

在 Steam 的 **启动选项** 中，设置以下环境变量

```bash
DXVK_NVAPI_VKREFLEX=1 %command%
```

- 如果原先有多个参数，请将变量并排放置，例如:  

  DXVK_NVAPI_VKREFLEX=1 SECOND_VER=x %command%
- 如果需要附加其它应用程序，例如 MangoHud，请使用类似组合:  
DXVK_NVAPI_VKREFLEX=1 mangohud %command%

重新启动游戏即可

![设置环境变量后出现的 Nvidia Reflex 选项](/images/archive/image-6.png)

# 杂谈

加入以下选项还可以伪装显卡，以达到解锁某些选项的目的:

```bash
LOW_LATENCY_LAYER=1
LOW_LATENCY_LAYER_SPOOF_NVIDIA=1
```

:::warning
DXVK_NVAPI_VKREFLEX=1 似乎无法与 LOW_LATENCY_LAYER 并存，会使其中一个失效
:::

LOW_LATENCY_LAYER_SPOOF_NVIDIA 原本是给 **AMD** 显卡伪装成 **Nvidia** 显卡用的，不过我发现可以解锁某些选项的极高画质

low latency layer 貌似还能设置 LOW_LATENCY_LAYER_REFLEX=1 来实现开启 Reflex，不过在我的环境下无效