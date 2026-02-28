import pkg from '../package.json'

export const WebConfig = {
    appVersion: pkg.version,
    appName: "在线 Minecraft 音频包生成器",
    git: {
        github: "https://github.com/al01cn/mcsd",
        gitee: "https://gitee.com/al01/mcsd"
    },
    downloadUrl: {
        github: "https://github.com/al01cn/mcsd/releases/download/app/Windows-0.0.1-Setup-x64.exe",
        gitee: "https://gitee.com/al01/mcsd/releases/download/v0.0.1/Minecraft%20%E9%9F%B3%E9%A2%91%E5%8C%85%E7%94%9F%E6%88%90%E5%99%A8-Windows-0.0.1-Setup.exe"
    },
    qq: {
        groupId: "1079344572",
        url: "https://qm.qq.com/q/qfe8r6jy2k"
    }
}
export default WebConfig
