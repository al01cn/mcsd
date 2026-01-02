var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import * as dgram from "dgram";
import * as net from "net";
import { fork, exec } from "child_process";
import path from "path";
import fs from "fs";
import { webcrypto } from "node:crypto";
import os from "os";
import { promisify } from "util";
class ProxyWorker {
  constructor() {
    __publicField(this, "udp", null);
    __publicField(this, "tcp", null);
    __publicField(this, "broadcastTimer", null);
  }
  start(config2) {
    this.udp = dgram.createSocket({ type: "udp4", reuseAddr: true });
    const msg = Buffer.from(`[MOTD]${config2.fakeMotd}[/MOTD][AD]${config2.localPort}[/AD]`);
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
      r.connect(config2.remotePort, config2.remoteHost, () => {
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
    this.tcp.listen(config2.localPort, "0.0.0.0");
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
    ipcMain.on("mcproxy:start", async (event, config2) => {
      const success = await this.startInstance(config2);
      event.reply("mcproxy:status", { id: config2.id, success });
    });
    ipcMain.on("mcproxy:stop", (_, id) => this.stopInstance(id));
    app.on("before-quit", () => this.stopAll());
  }
  async startInstance(config2) {
    if (this.instances.has(config2.id)) await this.stopInstance(config2.id);
    if (this.instances.size >= this.maxInstances) return false;
    if (this.portLock.has(config2.localPort)) return false;
    try {
      const child = fork(__filename, [], {
        env: { ...process.env, IS_MINECRAFT_PROXY_WORKER: "true" },
        stdio: ["ignore", "inherit", "inherit", "ipc"]
      });
      this.portLock.add(config2.localPort);
      this.instances.set(config2.id, child);
      child.send({ type: "START", payload: config2 });
      child.on("exit", () => {
        this.instances.delete(config2.id);
        this.portLock.delete(config2.localPort);
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
const urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
const POOL_SIZE_MULTIPLIER = 128;
let pool, poolOffset;
function fillPool(bytes) {
  if (!pool || pool.length < bytes) {
    pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER);
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  } else if (poolOffset + bytes > pool.length) {
    webcrypto.getRandomValues(pool);
    poolOffset = 0;
  }
  poolOffset += bytes;
}
function nanoid(size = 21) {
  fillPool(size |= 0);
  let id = "";
  for (let i = poolOffset - size; i < poolOffset; i++) {
    id += urlAlphabet[pool[i] & 63];
  }
  return id;
}
class Config {
  constructor() {
    __publicField(this, "name", "config");
    __publicField(this, "dataDir");
    __publicField(this, "configPath");
    this.dataDir = path.join(app.getPath("userData"), "data");
    this.configPath = path.join(this.dataDir, "config.json");
    this.ensure();
  }
  /* ---------- Init ---------- */
  ensure() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.configPath)) {
      const initial = {
        platforms: []
      };
      this.write(initial);
    }
  }
  /* ---------- Base IO ---------- */
  read() {
    try {
      const raw = fs.readFileSync(this.configPath, "utf-8");
      const parsed = JSON.parse(raw);
      const platformsRaw = Array.isArray(
        parsed.platforms
      ) ? parsed.platforms : [];
      const platforms = platformsRaw.map((p) => ({
        nanoid: p.nanoid,
        platform: p.platform,
        secret: p.secret,
        enabled: typeof p.enabled === "boolean" ? p.enabled : true
      }));
      return { platforms };
    } catch {
      return { platforms: [] };
    }
  }
  write(data) {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(data, null, 2),
      "utf-8"
    );
  }
  /* =======================
     Platform APIs
  ======================= */
  getPlatforms() {
    return this.read().platforms;
  }
  /** 只获取启用的平台（很常用） */
  getEnabledPlatforms() {
    return this.read().platforms.filter((p) => p.enabled);
  }
  getPlatform(nanoid2) {
    return this.read().platforms.find((p) => p.nanoid === nanoid2);
  }
  addPlatform(platform) {
    const cfg = this.read();
    const newPlatform = {
      nanoid: nanoid(),
      platform: platform.platform,
      secret: platform.secret,
      enabled: true
    };
    cfg.platforms.push(newPlatform);
    this.write(cfg);
    return newPlatform;
  }
  updatePlatform(nanoid2, patch) {
    const cfg = this.read();
    const target = cfg.platforms.find((p) => p.nanoid === nanoid2);
    if (!target) return;
    Object.assign(target, patch);
    this.write(cfg);
  }
  /** 快捷启用 */
  enablePlatform(nanoid2) {
    this.updatePlatform(nanoid2, { enabled: true });
  }
  /** 快捷禁用 */
  disablePlatform(nanoid2) {
    this.updatePlatform(nanoid2, { enabled: false });
  }
  removePlatform(nanoid2) {
    const cfg = this.read();
    cfg.platforms = cfg.platforms.filter((p) => p.nanoid !== nanoid2);
    this.write(cfg);
  }
}
function MinecraftTunnelName() {
  return "mc-" + nanoid(8).toString();
}
class NatFrp {
  static async userInfo(token) {
    const res = await fetch(`${this.api_url}/user/info?token=${token}`, {
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  }
  static async tunnelInfo(token) {
    const res = await fetch(`${this.api_url}/tunnels/info?token=${token}`, {
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return {
      length: data.length,
      data
    };
  }
  static async nodes(token) {
    const res = await fetch(`${this.api_url}/nodes?token=${token}`, {
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  }
  static async nodeStats(token) {
    const res = await fetch(`${this.api_url}/node/stats?token=${token}`, {
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data.nodes;
  }
  // 合并节点信息和状态
  static async getMergedNodes(token) {
    const nodesData = await this.nodes(token);
    const statsData = await this.nodeStats(token);
    if (!nodesData || !statsData) return null;
    const merged = statsData.map((stat) => {
      const nodeInfo = nodesData[stat.id];
      if (!nodeInfo) {
        return stat;
      }
      return { ...nodeInfo, ...stat };
    });
    return merged;
  }
  static async tunnelCreate(token, node, local_port) {
    const tunnel_name = MinecraftTunnelName();
    const raw = {
      "name": tunnel_name,
      "type": "tcp",
      "node": node,
      "local_ip": "127.0.0.1",
      "local_port": local_port
    };
    const res = await fetch(`${this.api_url}/tunnels?token=${token}`, {
      method: "POST",
      body: JSON.stringify(raw)
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  }
}
__publicField(NatFrp, "api_url", "https://api.natfrp.com/v4");
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
const config = new Config();
function loadIcpMain(ipcMain2, win2) {
  ipcMain2.handle("platform:list", () => {
    return config.getPlatforms();
  });
  ipcMain2.handle(
    "platform:add",
    (_e, platform) => {
      return config.addPlatform(platform);
    }
  );
  ipcMain2.handle(
    "platform:update",
    (_e, nanoid2, patch) => {
      config.updatePlatform(nanoid2, patch);
    }
  );
  ipcMain2.handle(
    "platform:enable",
    (_e, nanoid2) => {
      config.enablePlatform(nanoid2);
    }
  );
  ipcMain2.handle(
    "platform:disable",
    (_e, nanoid2) => {
      config.disablePlatform(nanoid2);
    }
  );
  ipcMain2.handle(
    "platform:remove",
    (_e, nanoid2) => {
      config.removePlatform(nanoid2);
    }
  );
  ipcMain2.handle(
    "mojang:getProfile",
    async (_event, uuid) => {
      return await getMojangProfile(uuid);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.userInfo",
    async (_event, token) => {
      return await NatFrp.userInfo(token);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.getNodes",
    async (_event, token) => {
      return await NatFrp.nodes(token);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.nodeStats",
    async (_event, token) => {
      return await NatFrp.nodeStats(token);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.getMergedNodes",
    async (_event, token) => {
      return await NatFrp.getMergedNodes(token);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.getTunnels",
    async (_event, token) => {
      return await NatFrp.tunnelInfo(token);
    }
  );
  ipcMain2.handle(
    "frp:natfrp.tunnelCreate",
    async (_event, token, node, local_port) => {
      return await NatFrp.tunnelCreate(token, node, local_port);
    }
  );
  ipcMain2.handle("minecraft:detect", async () => {
    return await MinecraftDetector.detectAll();
  });
  ipcMain2.on("window:minimize", () => {
    win2 == null ? void 0 : win2.minimize();
  });
  ipcMain2.on("window:close", () => {
    win2 == null ? void 0 : win2.close();
  });
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
  loadIcpMain(ipcMain, win);
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
