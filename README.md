# Minecraft 音频包生成器（mcsd）

用于把音频批量转换为 Minecraft 可用的 OGG，并生成 Java/基岩版资源包（支持绑定/替换原版声音事件、可选字幕等）。

## 开源与收费声明

本软件开源且免费，任何形式的收费售卖均与作者无关。若您通过收费渠道获得本软件，请立即向支付渠道申请退款，并向该平台举报相关售卖行为。

## 运行与发布

- 本仓库主要在 Windows 环境开发与测试，通常会提供 Windows 安装包/可执行文件。
- macOS / Linux 用户如需使用，请自行克隆仓库并在对应系统上打包运行（见下文“构建打包”）。

## 开发环境

推荐：
- Node.js（建议 18+）
- Bun（本仓库包含 `bun.lock`，推荐用 Bun 安装依赖）

也可以用 npm/pnpm/yarn，但请自行确保依赖一致性。

## 本地开发

```bash
bun install
bun run dev
```

## 构建打包

构建命令会依次执行类型检查、Vite 构建、以及 electron-builder 打包：

```bash
bun run build
```

产物默认输出到：
- `debug/<version>/`（由 [electron-builder.json5](electron-builder.json5) 的 `directories.output` 控制）

### 为什么只看到 Windows 产物？

electron-builder 默认只会为“当前运行的系统平台”打包：
- 在 Windows 上运行只会生成 Windows 产物
- macOS 的 dmg 通常需要在 macOS 系统上构建
- Linux 的 deb/AppImage 通常需要在 Linux 系统上构建，或在 Windows 上配置 Docker/WSL2 再进行 Linux 构建

你可以在对应系统上执行：

```bash
# Windows
bunx electron-builder -w

# macOS
bunx electron-builder -m

# Linux
bunx electron-builder -l
```

## 免责声明

本软件为第三方工具，与 Mojang Studios / Microsoft 不存在从属或授权关系；Minecraft 为其各自所有者的商标。请确保导入的音频与资源遵守版权及相关法律法规；因使用本软件导致的任何后果由使用者自行承担。

## License

见 [LICENSE](LICENSE)。
