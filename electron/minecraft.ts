import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

export type ModLoader = "Vanilla" | "Forge" | "Fabric" | "Quilt" | "NeoForge";
export type LoginType = "offline" | "msa" | "other";

export interface ModLoaderInfo {
    loader: ModLoader;
    loaderVersion?: string;
}

export interface LoginInfo {
    username?: string;
    uuid?: string;
    loginType?: LoginType;
}

export interface MinecraftProcessInfo {
    pid: number;
    java: string;
    version?: string;
    loader: ModLoader;
    loaderVersion?: string;
    username?: string;
    uuid?: string;
    loginType?: LoginType;
    lanPorts: number[];
}

interface WinProcess {
    ProcessId: number;
    Name: string;
    CommandLine: string;
}

interface TcpConnection {
    LocalPort: number;
    OwningProcess: number;
}

export class MinecraftDetector {
    static MC_MAIN_CLASSES = [
        "net.minecraft.client.main.Main",
        "net.minecraft.client.Minecraft",
        "cpw.mods.fml.client.FMLClientTweaker",
        "net.minecraftforge.fml.loading.FMLClientLaunchProvider",
        "net.neoforged.fml.loading.FMLClientLaunchProvider",
        "cpw.mods.bootstraplauncher.BootstrapLauncher",
        "net.fabricmc.loader.launch.knot.KnotClient",
        "net.fabricmc.loader.impl.launch.knot.KnotClient",
        "org.quiltmc.loader.impl.launch.knot.KnotClient",
        "net.minecraftforge.userdev.LaunchTesting",
        "net.minecraft.launchwrapper.Launch",
        "org.multimc.Entry",
    ];

    static MINECRAFT_DIR = path.join(os.homedir(), ".minecraft");

    /** CMD 版本执行 */
    static async runCMD(cmd: string): Promise<string> {
        try {
            const { stdout } = await execAsync(cmd, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 });
            return stdout;
        } catch (err: any) {
            throw err;
        }
    }

    /** 多级兼容 PowerShell 执行 */
    static async runPowerShell(script: string): Promise<string> {
        const pwshPaths = [
            `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
            `${process.env['ProgramFiles(x86)']}\\PowerShell\\7\\pwsh.exe`,
            "pwsh"
        ];
        let exe = pwshPaths.find(p => fs.existsSync(p)) || "powershell";

        const base64 = Buffer.from(script, "utf16le").toString("base64");

        try {
            const { stdout } = await execAsync(`"${exe}" -NoProfile -EncodedCommand ${base64}`, {
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 50
            });
            return stdout;
        } catch {
            // 如果 PowerShell 失败则回退 CMD
            return this.runCMD(script);
        }
    }

    static getVersionFromLogs(mcDir = MinecraftDetector.MINECRAFT_DIR): string | undefined {
        try {
            const logsDir = path.join(mcDir, "logs");
            if (!fs.existsSync(logsDir)) return undefined;
            const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith(".log"));
            for (const log of logFiles.reverse()) {
                const content = fs.readFileSync(path.join(logsDir, log), "utf-8");
                const match = content.match(/Minecraft Version: (\d+\.\d+(\.\d+)?)/);
                if (match) return match[1];
            }
        } catch { }
        return undefined;
    }

    static parseModLoader(cmd?: string, mcDir = MinecraftDetector.MINECRAFT_DIR): ModLoaderInfo {
        cmd ||= "";

        // 1. 优先识别 NeoForge (根据你提供的实例，特征非常明显)
        // 匹配 --fml.neoForgeVersion 21.2.1-beta
        const neoMatch = cmd.match(/--fml\.neoForgeVersion\s+([^\s]+)/i) ||
            cmd.match(/neoforge-([\d\.]+)/i);

        if (neoMatch || cmd.includes("net.neoforged") || cmd.includes("forgeclient")) {
            // 如果命令行包含 net.neoforged 路径或 forgeclient 目标，基本可判定为 NeoForge
            if (cmd.includes("net.neoforged") || cmd.includes("neoforge")) {
                return {
                    loader: "NeoForge",
                    loaderVersion: neoMatch?.[1]?.replace(/[\s.]+$/, "")
                };
            }
        }
        if (cmd.includes("net.fabricmc.loader.launch.knot.KnotClient") || cmd.includes("net.fabricmc.loader.impl.launch.knot.KnotClient")) {
            const m = cmd.match(/fabric-loader-([\d\.]+)/i);
            return { loader: "Fabric", loaderVersion: m?.[1] };
        }
        if (cmd.includes("org.quiltmc.loader.impl.launch.knot.KnotClient")) {
            const m = cmd.match(/quilt-loader-([\d\.]+)/i);
            return { loader: "Quilt", loaderVersion: m?.[1] };
        }
        if (cmd.includes("net.minecraftforge.fml.loading.FMLClientLaunchProvider") || /FMLClientTweaker|FMLTweaker/i.test(cmd)) {
            const m = cmd.match(/forge-(\d+\.\d+\.\d+(-\d+\.\d+\.\d+\.\d+)?)?/i);
            return { loader: "Forge", loaderVersion: m?.[1] };
        }

        // 检查文件目录作为回退方案
        const librariesDir = path.join(mcDir, "libraries");
        if (fs.existsSync(librariesDir)) {
            const libs = fs.readdirSync(librariesDir);
            for (const lib of libs) {
                const name = lib.toLowerCase();
                if (name.includes("neoforged") || name.includes("neoforge")) return { loader: "NeoForge" };
                if (name.includes("forge")) return { loader: "Forge" };
                if (name.includes("fabric")) return { loader: "Fabric" };
                if (name.includes("quilt")) return { loader: "Quilt" };
            }
        }

        return { loader: "Vanilla" };
    }

    static parseLoginInfo(cmd: string): LoginInfo {
        let username: string | undefined;
        let uuid: string | undefined;
        let loginType: LoginType | undefined;
        let accessToken: string | undefined;

        const uMatch = cmd.match(/--username\s+([^\s]+)/);
        if (uMatch) username = uMatch[1];

        const idMatch = cmd.match(/--uuid\s+([^\s]+)/);
        if (idMatch) uuid = idMatch[1];

        const tokenMatch = cmd.match(/--accessToken\s+([^\s]+)/);
        if (tokenMatch) accessToken = tokenMatch[1];

        if (accessToken) {
            const parts = accessToken.split('.');
            if (parts.length === 3) {
                try {
                    const payload = JSON.parse(Buffer.from(parts[1] ?? "", 'base64').toString('utf8'));
                    loginType = payload.sub || payload.xuid ? "msa" : "other";
                } catch {
                    loginType = "other";
                }
            } else if (/^[0-9a-f]{32,}$/i.test(accessToken.replace(/-/g, ''))) {
                loginType = "offline";
            } else {
                loginType = "other";
            }
        } else {
            loginType = "offline";
        }

        return { username, uuid, loginType };
    }

    static parseVersion(cmd: string, mcDir = MinecraftDetector.MINECRAFT_DIR): string | undefined {
        // 修改正则：允许匹配数字开头，后面跟随数字、点、中划线或字母的组合 (例如 1.21.2-NeoForge)
        let version = cmd.match(/--version\s+([\d\.\-\w]+)/)?.[1];
        const assetIndex = cmd.match(/--assetIndex\s+([^\s]+)/)?.[1];

        // 验证版本号：至少以数字开头
        if (!version || !/^\d+/.test(version)) version = assetIndex;
        if (!version) version = this.getVersionFromLogs(mcDir);

        return version || undefined;
    }

    /** CMD 回退方案 */
    static async detectAllByCMD(mcDir = MinecraftDetector.MINECRAFT_DIR): Promise<MinecraftProcessInfo[]> {
        const raw = await this.runCMD(`wmic process where "name='java.exe' or name='javaw.exe'" get ProcessId,Name,CommandLine /FORMAT:CSV`);
        if (!raw.trim()) return [];

        const lines = raw.split(/\r?\n/).filter(l => l.trim());
        const mcList: WinProcess[] = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(",");
            if (parts.length < 4) continue;
            const [, CommandLine, Name, ProcessIdStr, ...rest] = parts;
            const pid = parseInt(ProcessIdStr, 10);
            const cmdLine = [CommandLine, ...rest].filter(Boolean).join(",");
            if (!cmdLine) continue;

            if (
                this.MC_MAIN_CLASSES.some(cls => cmdLine.includes(cls)) ||
                /minecraft/i.test(cmdLine) ||
                /FMLClientTweaker|KnotClient|LaunchWrapper|FMLClientLaunchProvider|Launch|Minecraft|LaunchTesting/i.test(cmdLine)
            ) {
                mcList.push({ ProcessId: pid, Name, CommandLine: cmdLine });
            }
        }

        const portRaw = await this.runCMD(`netstat -ano -p tcp`);
        const tcpList: TcpConnection[] = [];

        portRaw.split(/\r?\n/).forEach(line => {
            const match = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
            if (match) {
                tcpList.push({
                    LocalPort: parseInt(match[1], 10),
                    OwningProcess: parseInt(match[2], 10)
                });
            }
        });

        return mcList.map(mc => {
            const version = this.parseVersion(mc.CommandLine, mcDir);
            const loaderInfo = this.parseModLoader(mc.CommandLine, mcDir);
            const loginInfo = this.parseLoginInfo(mc.CommandLine);

            const ports = tcpList
                .filter(p => p.OwningProcess === mc.ProcessId && p.LocalPort >= 1024)
                .map(p => p.LocalPort);

            return {
                pid: mc.ProcessId,
                java: mc.Name,
                version,
                loader: loaderInfo.loader,
                loaderVersion: loaderInfo.loaderVersion?.replace(/[\s.]+$/, ""),
                username: loginInfo.username,
                uuid: loginInfo.uuid,
                loginType: loginInfo.loginType,
                lanPorts: ports
            };
        });
    }

    /** 主检测方法：多级兼容 */
    static async detectAll(mcDir = MinecraftDetector.MINECRAFT_DIR): Promise<MinecraftProcessInfo[]> {
        try {
            // 优先使用 PowerShell（pwsh7 或系统 PowerShell）
            const raw = await this.runPowerShell(`
Get-CimInstance Win32_Process |
  Where-Object { $_.Name -in @('java.exe','javaw.exe') } |
  Select-Object ProcessId, Name, CommandLine |
  ConvertTo-Json
`);

            let list: WinProcess[] = [];
            if (raw.trim()) {
                const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
                list = Array.isArray(parsed) ? parsed : [parsed];
            }

            const mcList = list.filter(p =>
                p.CommandLine &&
                (this.MC_MAIN_CLASSES.some(cls => p.CommandLine.includes(cls)) ||
                    /minecraft/i.test(p.CommandLine) ||
                    /FMLClientTweaker|KnotClient|LaunchWrapper|FMLClientLaunchProvider|Launch|Minecraft|LaunchTesting/i.test(p.CommandLine))
            );

            if (!mcList.length) throw new Error("No MC processes found via PowerShell");

            const portRaw = await this.runPowerShell(`
Get-NetTCPConnection -State Listen |
  Select-Object LocalPort, OwningProcess |
  ConvertTo-Json
            `);

            let tcpList: TcpConnection[] = [];
            if (portRaw.trim()) {
                const parsed = JSON.parse(portRaw);
                tcpList = Array.isArray(parsed) ? parsed : [parsed];
            }

            return mcList.map(mc => {
                const version = this.parseVersion(mc.CommandLine, mcDir);
                const loaderInfo = this.parseModLoader(mc.CommandLine, mcDir);
                const loginInfo = this.parseLoginInfo(mc.CommandLine);

                const ports = tcpList
                    .filter(p => p.OwningProcess === mc.ProcessId && p.LocalPort >= 1024)
                    .map(p => p.LocalPort);

                return {
                    pid: mc.ProcessId,
                    java: mc.Name,
                    version,
                    loader: loaderInfo.loader,
                    loaderVersion: loaderInfo.loaderVersion?.replace(/[\s.]+$/, ""),
                    username: loginInfo.username,
                    uuid: loginInfo.uuid,
                    loginType: loginInfo.loginType,
                    lanPorts: ports
                };
            });
        } catch {
            // 回退 CMD 实现
            return this.detectAllByCMD(mcDir);
        }
    }
}

export default MinecraftDetector;
