# Minecraft 音频包生成器 / MC SoundsGen

一个基于浏览器端 FFmpeg（WebAssembly）的 Minecraft 音频资源包生成器：在本地把音频转成 OGG（Vorbis），生成 `sounds.json`、资源包元数据并打包下载，无需把音频上传到服务器。

> **项目迁移通知**
>
> 当前仓库是 MC SoundsGen 的旧版本代码。MCSD 2.0 已迁移到独立仓库，后续开发、问题反馈与贡献请前往 [MCSD 2.0 新版仓库](https://github.com/al01cn/mcsd2)。

---

## 中文（ZH）

### 功能

- 音频导入：支持拖拽/选择文件、列表重命名（移动端会弹窗编辑）
- OGG 合规检测：已符合 Minecraft 规格的 OGG 可自动跳过转码
- 资源包生成：自动生成 `sounds.json`、资源包元数据并打包下载
- 平台支持：Java 版 / 基岩版
- 修改原版音频：支持将音频映射到原版事件（事件列表加载 + 输入提示）
- 进度与日志：展示总进度、单文件进度与转换日志
- 命令生成：生成 `/playsound` 与 `/stopsound`，支持一键复制与导出 TXT
- 更新日志：点击界面里的版本号可打开更新日志弹窗

### 技术栈

- Next.js（App Router）
- React
- TypeScript（strict）
- Tailwind CSS
- ESLint
- FFmpeg WebAssembly：`@ffmpeg/ffmpeg`、`@ffmpeg/util`
- Zip 打包：`jszip`

### 安装与运行（推荐 bun）

```bash
bun install
bun run dev
```

浏览器打开：

```text
http://localhost:3000
```

### 常用命令

```bash
bun run lint
bun run typecheck
```

### 项目结构（简要）

```text
app/
  app/
    page.tsx                 # 页面入口
    AudioPackGenerator.tsx   # 核心功能与 UI
    layout.tsx               # 全局布局
    globals.css              # 全局样式
  lib/
    ffmpeg.ts                # FFmpeg WASM 加载/状态管理
    sounds.ts                # 原版声音/事件数据
    mcver.ts                 # Minecraft 版本与 pack_format
    config.ts                # WebConfig（版本号等）
    update_logs.ts           # 更新日志数据
  public/
    note_block.png
```

### 代码规范与注释规范

- 代码风格：遵循项目现有 TypeScript/React 写法，优先复用已有工具函数与组件结构
- 性能要求：避免不必要的重复计算与重复渲染，列表渲染要有稳定 key
- 注释规范：只在“复杂逻辑/关键边界条件/非显而易见的业务规则”处使用注释，建议使用 JSDoc（TS 友好）

### 贡献指南

- 请保持改动范围聚焦（一次 PR 解决一个问题）
- 确保通过 `bun run lint` 与 `bun run typecheck`
- 不要提交任何敏感信息（密钥、Token、私有链接等）

### 许可

本项目使用 MIT License，见 [LICENSE](./LICENSE)。

---

## English (EN)

### Overview

MC SoundsGen is a browser-based Minecraft sound pack generator powered by FFmpeg WebAssembly. It converts audio to OGG (Vorbis), generates `sounds.json` and pack metadata, then bundles everything for download — no server-side upload required.

> **Migration notice**
>
> This repository contains the legacy MC SoundsGen codebase. MCSD 2.0 has moved to a separate repository; please use the [MCSD 2.0 repository](https://github.com/al01cn/mcsd2) for future development, issues, and contributions.

### Features

- Import audio via drag & drop or file picker; rename files (mobile uses a modal editor)
- Detect Minecraft-ready OGG files and skip conversion automatically
- Generate resource packs (`sounds.json`, metadata) and download as an archive
- Supports Java Edition and Bedrock Edition outputs
- Map new sounds to vanilla events (with event list loading + input hints)
- Conversion progress + detailed logs
- Generate `/playsound` and `/stopsound` commands; copy or export as TXT
- Changelog: click the version label in UI to open the changelog modal

### Tech Stack

- Next.js (App Router)
- React
- TypeScript (strict)
- Tailwind CSS
- ESLint
- FFmpeg WebAssembly: `@ffmpeg/ffmpeg`, `@ffmpeg/util`
- Packaging: `jszip`

### Setup & Run (bun recommended)

```bash
bun install
bun run dev
```

Open:

```text
http://localhost:3000
```

### Scripts

```bash
bun run lint
bun run typecheck
```

### License

MIT License. See [LICENSE](./LICENSE).
