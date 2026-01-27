export const update_logs = {
    "0.0.1": {
        "date": "2026-01-27",
        "logs": `网站核心功能已全部成功实现，并完成测试。

- 纯前端本地处理：使用 FFmpeg WebAssembly 在浏览器端完成转码，无需上传服务器
- 音频导入与管理：支持拖拽/选择文件、列表重命名、移动端弹窗重命名
- OGG 合规检测：检测到符合 Minecraft 规格的 OGG 自动跳过转码
- 资源包生成：自动生成 sounds.json、pack.mcmeta 等元数据并打包下载
- 双平台支持：可生成 Java 版与基岩版资源包（含对应的下载格式）
- 修改原版音频：支持将新音频映射到原版事件（带事件列表加载与输入提示）
- 转换进度与日志：展示单文件进度、总进度与可追溯的转换日志
- 命令生成：生成 /playsound 与 /stopsound 命令，并支持复制 与一键导出 TXT
- 新手引导：提供沉浸式引导模式，帮助快速上手`
    }
}
export default update_logs
