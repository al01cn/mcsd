import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

// --- 接口定义 ---

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

export interface WinProcess {
    ProcessId: number;
    Name: string;
    CommandLine: string | null; // PowerShell 有时可能返回 null
}

export interface TcpConnection {
    LocalPort: number;
    OwningProcess: number;
}

// --- 主类 ---

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

    private static async runCMD(cmd: string): Promise<string> {
        try {
            const { stdout } = await execAsync(cmd, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 });
            return stdout;
        } catch (err) {
            return ""; // 发生错误时返回空字符串以防后续 JSON 解析崩溃
        }
    }

    private static async runPowerShell(script: string): Promise<string> {
        const pwshPaths = [
            `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
            `${process.env['ProgramFiles(x86)']}\\PowerShell\\7\\pwsh.exe`,
            "pwsh"
        ];
        const exe = pwshPaths.find(p => fs.existsSync(p)) || "powershell";
        const base64 = Buffer.from(script, "utf16le").toString("base64");
        
        try {
            const { stdout } = await execAsync(`"${exe}" -NoProfile -EncodedCommand ${base64}`, {
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 50
            });
            return stdout;
        } catch {
            return "";
        }
    }

    static parseModLoader(cmd: string = ""): ModLoaderInfo {
        const neoMatch = cmd.match(/--fml\.neoForgeVersion\s+([^\s]+)/i) || cmd.match(/neoforge-([\d\.]+)/i);
        if (neoMatch || cmd.includes("net.neoforged")) {
            return { loader: "NeoForge", loaderVersion: neoMatch?.[1]?.replace(/[\s.]+$/, "") };
        }
        if (cmd.includes("net.fabricmc.loader")) {
            const m = cmd.match(/fabric-loader-([\d\.]+)/i);
            return { loader: "Fabric", loaderVersion: m?.[1] };
        }
        if (cmd.includes("org.quiltmc.loader")) {
            const m = cmd.match(/quilt-loader-([\d\.]+)/i);
            return { loader: "Quilt", loaderVersion: m?.[1] };
        }
        if (cmd.includes("fml.loading.FMLClientLaunchProvider") || /FMLClientTweaker/i.test(cmd)) {
            const m = cmd.match(/forge-(\d+\.\d+\.\d+)/i);
            return { loader: "Forge", loaderVersion: m?.[1] };
        }
        return { loader: "Vanilla" };
    }

    static parseLoginInfo(cmd: string): LoginInfo {
        const username = cmd.match(/--username\s+([^\s]+)/)?.[1];
        const uuid = cmd.match(/--uuid\s+([^\s]+)/)?.[1];
        const accessToken = cmd.match(/--accessToken\s+([^\s]+)/)?.[1];
        let loginType: LoginType = "offline";

        if (accessToken) {
            if (accessToken.split('.').length === 3) loginType = "msa";
            else if (/^[0-9a-f]{32,}$/i.test(accessToken.replace(/-/g, ''))) loginType = "offline";
            else loginType = "other";
        }
        return { username, uuid, loginType };
    }

    static parseVersion(cmd: string): string | undefined {
        return cmd.match(/--version\s+([\d\.\-\w]+)/)?.[1] || cmd.match(/--assetIndex\s+([^\s]+)/)?.[1];
    }

    /**
     * 核心处理逻辑：去重与特征识别
     */
    private static processRawResults(winProcesses: WinProcess[], tcpConnections: TcpConnection[]): MinecraftProcessInfo[] {
        const instanceMap = new Map<string, MinecraftProcessInfo>();

        for (const proc of winProcesses) {
            const cmd = proc.CommandLine || "";
            if (!cmd) continue;

            // 识别是否为 Minecraft 进程
            const isMC = this.MC_MAIN_CLASSES.some(cls => cmd.includes(cls)) || /minecraft/i.test(cmd);
            if (!isMC) continue;

            const login = this.parseLoginInfo(cmd);
            const version = this.parseVersion(cmd);
            const loader = this.parseModLoader(cmd);
            
            // 提取游戏目录，增加鲁棒性
            const gameDirMatch = cmd.match(/--gameDir\s+"?([^"\s]+)"?/);
            const gameDir = gameDirMatch ? gameDirMatch[1] : "default_dir";

            // 唯一指纹：UUID + 游戏目录 + 版本
            // 解决 PID 不同但属于同一个游戏实例的问题
            const fingerprint = `${login.uuid || login.username}|${gameDir}|${version}`;

            // 端口去重：过滤掉同一个 PID 在 IPv4/IPv6 下重复报告的端口
            const ports = Array.from(new Set(
                tcpConnections
                    .filter(t => t.OwningProcess === proc.ProcessId && t.LocalPort >= 1024)
                    .map(t => t.LocalPort)
            ));

            const currentInfo: MinecraftProcessInfo = {
                pid: proc.ProcessId,
                java: proc.Name,
                version,
                loader: loader.loader,
                loaderVersion: loader.loaderVersion,
                username: login.username,
                uuid: login.uuid,
                loginType: login.loginType,
                lanPorts: ports
            };

            // 去重逻辑：
            if (instanceMap.has(fingerprint)) {
                const existing = instanceMap.get(fingerprint)!;
                // 优先级：如果当前记录有 LAN 端口，说明它是真正的游戏进程而非引导进程，覆盖旧记录
                if (currentInfo.lanPorts.length > 0 && existing.lanPorts.length === 0) {
                    instanceMap.set(fingerprint, currentInfo);
                }
            } else {
                instanceMap.set(fingerprint, currentInfo);
            }
        }

        return Array.from(instanceMap.values());
    }

    /**
     * 主检测方法
     */
    static async detectAll(): Promise<MinecraftProcessInfo[]> {
        const procScript = `Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'java' } | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json`;
        const portScript = `Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | ConvertTo-Json`;

        try {
            const [procRaw, portRaw] = await Promise.all([
                this.runPowerShell(procScript),
                this.runPowerShell(portScript)
            ]);

            const parseJson = <T>(raw: string): T[] => {
                if (!raw.trim()) return [];
                try {
                    const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
                    return Array.isArray(parsed) ? parsed : [parsed];
                } catch { return []; }
            };

            const procList = parseJson<WinProcess>(procRaw);
            const tcpList = parseJson<TcpConnection>(portRaw);

            if (procList.length === 0) throw new Error("No processes");

            return this.processRawResults(procList, tcpList);
        } catch {
            return this.detectAllByCMD();
        }
    }

    /**
     * WMIC 回退方案
     */
    static async detectAllByCMD(): Promise<MinecraftProcessInfo[]> {
        const procRaw = await this.runCMD(`wmic process where "name like 'java%'" get ProcessId,Name,CommandLine /FORMAT:CSV`);
        const procList: WinProcess[] = [];
        
        const lines = procRaw.split(/\r?\n/).filter(l => l.trim());
        for (let i = 1; i < lines.length; i++) {
            const parts = (lines[i] as string).split(",");
            if (parts.length < 4) continue;
            const pid = parseInt((parts[parts.length - 2] as string), 10);
            const name = parts[parts.length - 3];
            const cmd = parts.slice(1, parts.length - 3).join(",");
            if (!isNaN(pid)) {
                procList.push({ ProcessId: pid, Name: name as string, CommandLine: cmd });
            }
        }

        const portRaw = await this.runCMD(`netstat -ano -p tcp`);
        const tcpList: TcpConnection[] = [];
        const portLines = portRaw.split(/\r?\n/);
        for (const line of portLines) {
            const match = line.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
            if (match && match[1] && match[2]) {
                tcpList.push({ 
                    LocalPort: parseInt(match[1], 10), 
                    OwningProcess: parseInt(match[2], 10) 
                });
            }
        }

        return this.processRawResults(procList, tcpList);
    }
}

export default MinecraftDetector;