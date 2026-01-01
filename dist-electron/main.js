var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import { exec, fork } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import { promisify } from "util";
import * as dgram from "dgram";
import * as net from "net";
const execAsync = promisify(exec);
class MinecraftDetector {
  static async runCMD(cmd) {
    try {
      const { stdout } = await execAsync(cmd, { windowsHide: true, maxBuffer: 1024 * 1024 * 50 });
      return stdout;
    } catch (err) {
      return "";
    }
  }
  static async runPowerShell(script) {
    const pwshPaths = [
      `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
      `${process.env["ProgramFiles(x86)"]}\\PowerShell\\7\\pwsh.exe`,
      "pwsh"
    ];
    const exe = pwshPaths.find((p) => fs.existsSync(p)) || "powershell";
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
  static parseModLoader(cmd = "") {
    var _a;
    const neoMatch = cmd.match(/--fml\.neoForgeVersion\s+([^\s]+)/i) || cmd.match(/neoforge-([\d\.]+)/i);
    if (neoMatch || cmd.includes("net.neoforged")) {
      return { loader: "NeoForge", loaderVersion: (_a = neoMatch == null ? void 0 : neoMatch[1]) == null ? void 0 : _a.replace(/[\s.]+$/, "") };
    }
    if (cmd.includes("net.fabricmc.loader")) {
      const m = cmd.match(/fabric-loader-([\d\.]+)/i);
      return { loader: "Fabric", loaderVersion: m == null ? void 0 : m[1] };
    }
    if (cmd.includes("org.quiltmc.loader")) {
      const m = cmd.match(/quilt-loader-([\d\.]+)/i);
      return { loader: "Quilt", loaderVersion: m == null ? void 0 : m[1] };
    }
    if (cmd.includes("fml.loading.FMLClientLaunchProvider") || /FMLClientTweaker/i.test(cmd)) {
      const m = cmd.match(/forge-(\d+\.\d+\.\d+)/i);
      return { loader: "Forge", loaderVersion: m == null ? void 0 : m[1] };
    }
    return { loader: "Vanilla" };
  }
  static parseLoginInfo(cmd) {
    var _a, _b, _c;
    const username = (_a = cmd.match(/--username\s+([^\s]+)/)) == null ? void 0 : _a[1];
    const uuid = (_b = cmd.match(/--uuid\s+([^\s]+)/)) == null ? void 0 : _b[1];
    const accessToken = (_c = cmd.match(/--accessToken\s+([^\s]+)/)) == null ? void 0 : _c[1];
    let loginType = "offline";
    if (accessToken) {
      if (accessToken.split(".").length === 3) loginType = "msa";
      else if (/^[0-9a-f]{32,}$/i.test(accessToken.replace(/-/g, ""))) loginType = "offline";
      else loginType = "other";
    }
    return { username, uuid, loginType };
  }
  static parseVersion(cmd) {
    var _a, _b;
    return ((_a = cmd.match(/--version\s+([\d\.\-\w]+)/)) == null ? void 0 : _a[1]) || ((_b = cmd.match(/--assetIndex\s+([^\s]+)/)) == null ? void 0 : _b[1]);
  }
  /**
   * 核心处理逻辑：去重与特征识别
   */
  static processRawResults(winProcesses, tcpConnections) {
    const instanceMap = /* @__PURE__ */ new Map();
    for (const proc of winProcesses) {
      const cmd = proc.CommandLine || "";
      if (!cmd) continue;
      const isMC = this.MC_MAIN_CLASSES.some((cls) => cmd.includes(cls)) || /minecraft/i.test(cmd);
      if (!isMC) continue;
      const login = this.parseLoginInfo(cmd);
      const version = this.parseVersion(cmd);
      const loader = this.parseModLoader(cmd);
      const gameDirMatch = cmd.match(/--gameDir\s+"?([^"\s]+)"?/);
      const gameDir = gameDirMatch ? gameDirMatch[1] : "default_dir";
      const fingerprint = `${login.uuid || login.username}|${gameDir}|${version}`;
      const ports = Array.from(new Set(
        tcpConnections.filter((t) => t.OwningProcess === proc.ProcessId && t.LocalPort >= 1024).map((t) => t.LocalPort)
      ));
      const currentInfo = {
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
      if (instanceMap.has(fingerprint)) {
        const existing = instanceMap.get(fingerprint);
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
  static async detectAll() {
    const procScript = `Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'java' } | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json`;
    const portScript = `Get-NetTCPConnection -State Listen | Select-Object LocalPort, OwningProcess | ConvertTo-Json`;
    try {
      const [procRaw, portRaw] = await Promise.all([
        this.runPowerShell(procScript),
        this.runPowerShell(portScript)
      ]);
      const parseJson = (raw) => {
        if (!raw.trim()) return [];
        try {
          const parsed = JSON.parse(raw.replace(/^\uFEFF/, ""));
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          return [];
        }
      };
      const procList = parseJson(procRaw);
      const tcpList = parseJson(portRaw);
      if (procList.length === 0) throw new Error("No processes");
      return this.processRawResults(procList, tcpList);
    } catch {
      return this.detectAllByCMD();
    }
  }
  /**
   * WMIC 回退方案
   */
  static async detectAllByCMD() {
    const procRaw = await this.runCMD(`wmic process where "name like 'java%'" get ProcessId,Name,CommandLine /FORMAT:CSV`);
    const procList = [];
    const lines = procRaw.split(/\r?\n/).filter((l) => l.trim());
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (parts.length < 4) continue;
      const pid = parseInt(parts[parts.length - 2], 10);
      const name = parts[parts.length - 3];
      const cmd = parts.slice(1, parts.length - 3).join(",");
      if (!isNaN(pid)) {
        procList.push({ ProcessId: pid, Name: name, CommandLine: cmd });
      }
    }
    const portRaw = await this.runCMD(`netstat -ano -p tcp`);
    const tcpList = [];
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
__publicField(MinecraftDetector, "MC_MAIN_CLASSES", [
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
  "org.multimc.Entry"
]);
__publicField(MinecraftDetector, "MINECRAFT_DIR", path.join(os.homedir(), ".minecraft"));
class ProxyWorker {
  constructor() {
    __publicField(this, "udp", null);
    __publicField(this, "tcp", null);
    __publicField(this, "broadcastTimer", null);
  }
  start(config) {
    this.udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const msg = Buffer.from(`[MOTD]${config.fakeMotd}[/MOTD][AD]${config.localPort}[/AD]`);
    this.broadcastTimer = setInterval(() => {
      var _a;
      try {
        (_a = this.udp) == null ? void 0 : _a.send(msg, 0, msg.length, 4445, "224.0.2.60");
      } catch (e) {
      }
    }, 1500);
    this.tcp = net.createServer((c) => {
      const r = new net.Socket();
      c.pause();
      c.setTimeout(1e4);
      r.connect(config.remotePort, config.remoteHost, () => {
        c.resume();
        c.pipe(r);
        r.pipe(c);
      });
      const end = () => {
        c.destroy();
        r.destroy();
      };
      c.on("error", end);
      r.on("error", end);
      c.on("close", end);
      r.on("close", end);
    });
    this.tcp.on("error", () => process.exit(1));
    this.tcp.listen(config.localPort, "0.0.0.0");
  }
  stop() {
    var _a, _b, _c;
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    (_a = this.udp) == null ? void 0 : _a.removeAllListeners();
    (_b = this.udp) == null ? void 0 : _b.close();
    (_c = this.tcp) == null ? void 0 : _c.close();
  }
}
class MinecraftProxyManager {
  constructor(maxInstances) {
    __publicField(this, "instances", /* @__PURE__ */ new Map());
    __publicField(this, "portLock", /* @__PURE__ */ new Set());
    __publicField(this, "maxInstances");
    this.maxInstances = maxInstances;
    this.setupIpc();
  }
  setupIpc() {
    ipcMain.on("mcproxy:start", async (event, config) => {
      const success = await this.startInstance(config);
      event.reply("mcproxy:status", { id: config.id, success });
    });
    ipcMain.on("mcproxy:stop", (_, id) => this.stopInstance(id));
    app.on("before-quit", () => this.stopAll());
  }
  async startInstance(config) {
    if (this.instances.has(config.id)) await this.stopInstance(config.id);
    if (this.instances.size >= this.maxInstances) return false;
    if (this.portLock.has(config.localPort)) return false;
    try {
      const child = fork(__filename, [], {
        env: { ...process.env, IS_MINECRAFT_PROXY_WORKER: "true" },
        stdio: ["ignore", "inherit", "inherit", "ipc"]
      });
      this.portLock.add(config.localPort);
      this.instances.set(config.id, child);
      child.send({ type: "START", payload: config });
      child.on("exit", () => {
        this.instances.delete(config.id);
        this.portLock.delete(config.localPort);
      });
      return true;
    } catch (e) {
      return false;
    }
  }
  async stopInstance(id) {
    const child = this.instances.get(id);
    if (child == null ? void 0 : child.connected) {
      return new Promise((resolve) => {
        child.once("exit", () => resolve());
        child.send({ type: "STOP" });
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 1e3);
      });
    }
  }
  stopAll() {
    for (const id of this.instances.keys()) this.stopInstance(id);
  }
}
const initMinecraftProxy = (max = 1) => {
  return new MinecraftProxyManager(max);
};
if (process.env.IS_MINECRAFT_PROXY_WORKER === "true") {
  const worker = new ProxyWorker();
  process.on("message", (m) => {
    if (m.type === "START") worker.start(m.payload);
    if (m.type === "STOP") {
      worker.stop();
      process.exit(0);
    }
  });
  process.on("disconnect", () => process.exit(0));
}
async function getMojangProfile(uuid) {
  try {
    const res = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}?unsigned=true`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      }
    );
    const data = await res.json();
    if (!res.ok || data.errorMessage) {
      return {
        ok: false,
        errorMessage: data.errorMessage || `HTTP ${res.status}`
      };
    }
    return {
      ok: true,
      data
    };
  } catch (err) {
    return {
      ok: false,
      errorMessage: (err == null ? void 0 : err.message) || "Network error"
    };
  }
}
createRequire(import.meta.url);
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
initMinecraftProxy(3);
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    // 🔒 固定尺寸
    resizable: false,
    minimizable: true,
    maximizable: false,
    fullscreenable: false,
    // 🚫 无边框
    frame: false,
    // 🧠 推荐开启
    useContentSize: true,
    icon: path$1.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    title: "OneTunnel",
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path$1.join(__dirname$1, "preload.mjs")
    }
  });
  win.setMenu(null);
  win.setMenuBarVisibility(false);
  win.webContents.openDevTools();
  win.on("maximize", () => {
    win == null ? void 0 : win.unmaximize();
  });
  ipcMain.handle(
    "mojang:getProfile",
    async (_event, uuid) => {
      return await getMojangProfile(uuid);
    }
  );
  ipcMain.handle("minecraft:detect", async () => {
    return await MinecraftDetector.detectAll();
  });
  ipcMain.on("window:minimize", () => {
    win == null ? void 0 : win.minimize();
  });
  ipcMain.on("window:close", () => {
    win == null ? void 0 : win.close();
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
