import { exec } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

// --- 接口定义 ---

export type ModLoader = "Vanilla" | "Forge" | "Fabric" | "Quilt" | "NeoForge";
export type LoginType = "offline" | "msa" | "custom" | "other";

export interface ModLoaderInfo {
    loader: ModLoader;
    loaderVersion?: string;
}

export interface LoginInfo {
    username?: string;
    uuid?: string;
    loginType?: LoginType;
    provider?: string; // 新增：记录第三方登录的服务商域名
    versionType?: string;
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
    versionType?: string;
    provider?: string;
    lanPorts: number[];
    isLan: boolean;
}

export interface WinProcess {
    ProcessId: number;
    Name: string;
    CommandLine: string | null; // PowerShell 有时可能返回 null
}

export interface TcpConnection {
    LocalAddress: string;
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
            // chcp 65001 是切换到 UTF-8 代码页
            const { stdout } = await execAsync(`chcp 65001 > nul && ${cmd}`, {
                windowsHide: true,
                maxBuffer: 1024 * 1024 * 50
            });
            return stdout;
        } catch (err) {
            return "";
        }
    }

    private static async runPowerShell(script: string): Promise<string> {
        const pwshPaths = [
            `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
            `${process.env['ProgramFiles(x86)']}\\PowerShell\\7\\pwsh.exe`,
            "pwsh"
        ];
        const exe = pwshPaths.find(p => fs.existsSync(p)) || "powershell";

        // 强制声明输出为 UTF8，并确保以 UTF8 捕获 stdout
        const utf8Script = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${script}`;

        try {
            const { stdout } = await execAsync(`"${exe}" -NoProfile -Command "${utf8Script.replace(/"/g, '\\"')}"`, {
                windowsHide: true,
                encoding: "utf8", // 确保 Node.js 用 UTF8 解码
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
        const username = this.getArgValue(cmd, '--username')
        const uuid = this.getArgValue(cmd, '--uuid')
        const accessToken = this.getArgValue(cmd, '--accessToken')
        const versionType = this.getArgValue(cmd, '--versionType')

        let loginType: LoginType = "offline";
        let provider: string | undefined = undefined;

        // 1. 检测是否包含 authlib-injector (第三方登录)
        // 匹配格式: authlib-injector-x.x.x.jar=https://domain.com/api/yggdrasil/
        const injectorMatch = cmd.match(/authlib-injector[^\s=]*=([^"\s]+)/);

        if (accessToken) {
            if (this.isMojangToken(accessToken)) {
                loginType = "msa";
            } else if (injectorMatch) {
                loginType = "custom";
                try {
                    const url = new URL(injectorMatch[1]);
                    provider = url.hostname; // 提取如: littleskin.cn
                } catch {
                    provider = injectorMatch[1]; // fallback
                }
            } else {
                loginType = "offline";
            }
        } else {
            loginType = "other";
        }

        return { username, uuid, loginType, provider, versionType };
    }

    static parseVersion(cmd: string): string | undefined {
        return cmd.match(/--version\s+([\d\.\-\w]+)/)?.[1] || cmd.match(/--assetIndex\s+([^\s]+)/)?.[1];
    }

    /**
* 提取参数值并移除首尾引号
* @param cmd 完整的命令行字符串
* @param argName 参数名称，如 '--versionType'
*/
    private static getArgValue(cmd: string, argName: string): string | undefined {
        // 1. 动态构造正则
        // (\S+) 匹配参数名后的第一个非空字符开始的内容
        // (.*?) 非贪婪匹配，直到遇到 " --" 或字符串结尾 ($)
        const regex = new RegExp(`${argName}\\s+(.*?)(?=\\s+--|$)`);
        const match = cmd.match(regex);

        if (!match) return undefined;

        let value = match[1].trim();

        // 2. 移除首尾引号的精准处理
        // ^["'] 匹配开头的单引号或双引号
        // |["']$ 匹配结尾的单引号或双引号
        // g 全局标志配合 replace
        return value.replace(/^["']|["']$/g, '');
    }

    /**
     * 判断是否为 Minecraft 官方 (Mojang/Microsoft) 的 JWT Token
     */
    static isMojangToken = (token: string): boolean => {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            // 解码 Payload (中间段)
            // 浏览器环境用 atob，Node.js 环境用 Buffer
            const payloadJson = typeof window !== 'undefined'
                ? atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
                : Buffer.from(parts[1], 'base64').toString();

            const payload = JSON.parse(payloadJson);

            // 特征检测：
            // 1. 必须有 xuid (Xbox User ID)
            // 2. 必须有 pfd 数组 (Profile Details) 且包含用户角色名
            // 3. iss 通常固定为 'authentication'
            const hasXuid = typeof payload.xuid === 'string';
            const hasPfd = Array.isArray(payload.pfd) && payload.pfd.length > 0;
            const isAuthIss = payload.iss === 'authentication';
            const hasPlatform = 'platform' in payload;

            return hasXuid && hasPfd && (isAuthIss || hasPlatform);
        } catch (e) {
            // 解码失败或 JSON 解析失败说明不是合法的或不是标准的 Mojang Token
            return false;
        }
    };


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

            /**
                     * 过滤逻辑：
                     * 1. 端口必须归属于当前进程
                     * 2. 端口必须 >= 1024
                     * 3. 核心逻辑：LocalAddress 必须是 '0.0.0.0' 或 '::' (IPv6)，
                     * 排除 '127.0.0.1'，因为那是第三方登录或调试用的内部端口。
                     */
            const validLanPorts = Array.from(new Set(
                tcpConnections
                    .filter(t =>
                        t.OwningProcess === proc.ProcessId &&
                        t.LocalPort >= 1024 &&
                        (t.LocalAddress === '0.0.0.0' || t.LocalAddress === '::' || t.LocalAddress === '*')
                    )
                    .map(t => t.LocalPort)
            ))

            const currentInfo: MinecraftProcessInfo = {
                pid: proc.ProcessId,
                java: proc.Name,
                version,
                versionType: login.versionType,
                loader: loader.loader,
                loaderVersion: loader.loaderVersion?.replace(/[\s._-]+$/, ''),
                username: login.username,
                uuid: login.uuid,
                loginType: login.loginType,
                provider: login.provider, // 将 provider 传入
                lanPorts: validLanPorts,
                isLan: validLanPorts.length > 0
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
        const portScript = `Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess | ConvertTo-Json`;

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

            // console.log(procList);
            // console.log("tcpList", tcpList);

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
            const match = line.trim().match(/^TCP\s+(0\.0\.0\.0|\[::\]):(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
            if (match && match[1] && match[2]) {
                tcpList.push({
                    LocalAddress: match[1],
                    LocalPort: parseInt(match[2], 10),
                    OwningProcess: parseInt(match[3], 10)
                });
            }
        }

        return this.processRawResults(procList, tcpList);
    }
}


export default MinecraftDetector;