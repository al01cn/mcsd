var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { app, ipcMain, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path$1 from "node:path";
import path from "path";
import fs from "fs";
import { webcrypto } from "node:crypto";
import { exec, spawn } from "child_process";
import os from "os";
import require$$2, { promisify } from "util";
import https from "https";
import require$$1 from "crypto";
import require$$0$1 from "assert";
import * as net from "net";
import net__default from "net";
import require$$1$1 from "events";
import require$$0$2 from "dns";
import * as require$$0 from "dgram";
import require$$0__default from "dgram";
import net$1 from "node:net";
import os$1 from "node:os";
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
var myHeaders = new Headers();
myHeaders.append("accept", "application/json");
myHeaders.append("Content-Type", "application/json");
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
  static async clients() {
    const res = await fetch(`${this.api_url}/system/clients`, {
      method: "GET"
    });
    return await res.json();
  }
  static async tunnelInfo(token) {
    const res = await fetch(`${this.api_url}/tunnels?token=${token}`, {
      method: "GET"
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
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
      headers: myHeaders,
      body: JSON.stringify(raw)
    });
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data;
  }
  static async tunnelEdit(token, tunnel_id, local_port) {
    const raw = {
      "id": Number(tunnel_id),
      "local_port": local_port
    };
    const res = await fetch(`${this.api_url}/tunnel/edit?token=${token}`, {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify(raw)
    });
    if (!res.ok) {
      return null;
    }
    return true;
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
function getLatestWindowsSakuraFrp(apiData) {
  const archPriority = [
    "windows_amd64",
    "windows_arm64",
    "windows_386"
  ];
  for (const arch of archPriority) {
    const item = apiData.frpc.archs[arch];
    if (item) {
      return {
        version: apiData.frpc.ver,
        arch,
        url: item.url,
        hash: item.hash,
        size: item.size
      };
    }
  }
  throw new Error("未找到 Windows 平台 frpc");
}
class SakuraFrpDownloader {
  constructor() {
    /** 本地统一名称 */
    __publicField(this, "fileName", "sakurafrp.exe");
  }
  get binDir() {
    return path.join(app.getPath("userData"), "bin");
  }
  get filePath() {
    return path.join(this.binDir, this.fileName);
  }
  exists() {
    return fs.existsSync(this.filePath);
  }
  async download(url, expectedHash, onProgress) {
    fs.mkdirSync(this.binDir, { recursive: true });
    const tempPath = this.filePath + ".download";
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(tempPath);
      const md5 = require$$1.createHash("md5");
      https.get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`下载失败，HTTP ${res.statusCode}`));
          return;
        }
        const total = Number(res.headers["content-length"] || 0);
        let received = 0;
        res.on("data", (chunk) => {
          received += chunk.length;
          md5.update(chunk);
          if (total && onProgress) {
            onProgress(Math.floor(received / total * 100));
          }
        });
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          if (expectedHash) {
            const fileHash = md5.digest("hex");
            if (fileHash !== expectedHash) {
              fs.unlinkSync(tempPath);
              reject(new Error("sakurafrp.exe 校验失败"));
              return;
            }
          }
          fs.renameSync(tempPath, this.filePath);
          resolve(this.filePath);
        });
      }).on("error", (err) => {
        fs.unlink(tempPath, () => {
        });
        reject(err);
      });
    });
  }
}
class SakuraFrpcManager {
  constructor(win2) {
    __publicField(this, "processes", /* @__PURE__ */ new Map());
    __publicField(this, "win");
    this.win = win2;
  }
  getFrpcPath() {
    return path.join(app.getPath("userData"), "bin", "sakurafrp.exe");
  }
  /** 是否存在 frpc */
  exists() {
    return fs.existsSync(this.getFrpcPath());
  }
  /** 启动隧道 */
  startTunnel(token, tunnelId) {
    if (!this.exists()) {
      throw new Error("frpc 不存在");
    }
    if (this.processes.has(tunnelId)) {
      throw new Error(`隧道 ${tunnelId} 已在运行`);
    }
    const frpcPath = this.getFrpcPath();
    const proc = spawn(frpcPath, ["-f", `${token}:${tunnelId}`], {
      windowsHide: true
    });
    this.processes.set(tunnelId, {
      tunnelId,
      process: proc
    });
    proc.stdout.on("data", (data) => {
      this.sendLog(tunnelId, data.toString(), "stdout");
    });
    proc.stderr.on("data", (data) => {
      this.sendLog(tunnelId, data.toString(), "stderr");
    });
    proc.on("close", (code) => {
      this.sendLog(tunnelId, `进程已退出，code=${code}`, "close");
      this.processes.delete(tunnelId);
    });
    proc.on("error", (err) => {
      this.sendLog(tunnelId, err.message, "error");
    });
  }
  /** 停止隧道 */
  stopTunnel(tunnelId) {
    const item = this.processes.get(tunnelId);
    if (!item) return;
    item.process.kill();
    this.processes.delete(tunnelId);
  }
  /** 停止全部 */
  stopAll() {
    for (const [id, item] of this.processes) {
      item.process.kill();
      this.processes.delete(id);
    }
  }
  /** 推送日志到前端 */
  sendLog(tunnelId, message, type) {
    this.win.webContents.send("frpc:log", {
      tunnelId,
      message,
      type,
      time: Date.now()
    });
  }
}
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
var dist$1 = {};
var status$1 = {};
var dist = {};
var parse = {};
var __assign = commonjsGlobal && commonjsGlobal.__assign || function() {
  __assign = Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
        t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
Object.defineProperty(parse, "__esModule", { value: true });
parse.parse = void 0;
var colorLookupNames = {
  "0": "black",
  "1": "dark_blue",
  "2": "dark_green",
  "3": "dark_aqua",
  "4": "dark_red",
  "5": "dark_purple",
  "6": "gold",
  "7": "gray",
  "8": "dark_gray",
  "9": "blue",
  "a": "green",
  "b": "aqua",
  "c": "red",
  "d": "light_purple",
  "e": "yellow",
  "f": "white",
  "g": "minecoin_gold"
};
var formattingLookupProperties = {
  "k": "obfuscated",
  "l": "bold",
  "m": "strikethrough",
  "n": "underline",
  "o": "italics"
};
var parseBool = function(value) {
  return typeof value === "boolean" ? value : typeof value === "string" ? value.toLowerCase() === "true" : false;
};
var parseText = function(text, options) {
  var _a;
  var result = [{ text: "", color: "white" }];
  var position = 0;
  while (position + 1 <= text.length) {
    var character = text.charAt(position);
    var item = result[result.length - 1];
    if (character === "\n") {
      result.push({ text: "\n", color: "white" });
      position++;
      continue;
    }
    if (character !== options.formattingCharacter) {
      item.text += character;
      position++;
      continue;
    }
    var formattingCode = text.charAt(position + 1).toLowerCase();
    position += 2;
    if (formattingCode === "r") {
      result.push({ text: "", color: "white" });
      continue;
    }
    if (formattingCode in formattingLookupProperties) {
      if (item.text.length > 0) {
        result.push(__assign(__assign({}, item), (_a = { text: "" }, _a[formattingLookupProperties[formattingCode]] = true, _a)));
      } else {
        item[formattingLookupProperties[formattingCode]] = true;
      }
    } else if (formattingCode in colorLookupNames) {
      result.push({ text: "", color: colorLookupNames[formattingCode] });
    }
  }
  return result;
};
var parseChat = function(chat, options, parent) {
  var _a, _b;
  var result = parseText(chat.text || chat.translate || "", options);
  var item = result[0];
  if (parent && parseBool(parent.bold) && !parseBool(chat.bold) || parseBool(chat.bold)) {
    item.bold = true;
  }
  if (parent && parseBool(parent.italic) && !parseBool(chat.italic) || parseBool(chat.italic)) {
    item.italics = true;
  }
  if (parent && parseBool(parent.underlined) && !parseBool(chat.underlined) || parseBool(chat.underlined)) {
    item.underline = true;
  }
  if (parent && parseBool(parent.strikethrough) && !parseBool(chat.strikethrough) || parseBool(chat.strikethrough)) {
    item.strikethrough = true;
  }
  if (parent && parseBool(parent.obfuscated) && !parseBool(chat.obfuscated) || parseBool(chat.obfuscated)) {
    item.obfuscated = true;
  }
  if (chat.color) {
    item.color = colorLookupNames[(_b = (_a = chat.color) !== null && _a !== void 0 ? _a : parent === null || parent === void 0 ? void 0 : parent.color) !== null && _b !== void 0 ? _b : "white"] || chat.color;
  }
  if (chat.extra) {
    for (var _i = 0, _c = chat.extra; _i < _c.length; _i++) {
      var extra = _c[_i];
      result.push.apply(result, parseChat(extra, options, chat));
    }
  }
  return result;
};
parse.parse = function(input, options) {
  options = Object.assign({
    formattingCharacter: "§"
  }, options);
  var result;
  switch (typeof input) {
    case "string": {
      result = parseText(input, options);
      break;
    }
    case "object": {
      result = parseChat(input, options);
      break;
    }
    default: {
      throw new Error("Unexpected server MOTD type: " + typeof input);
    }
  }
  return result.filter(function(item) {
    return item.text.length > 0;
  });
};
var clean = {};
var __importDefault$h = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(clean, "__esModule", { value: true });
clean.clean = void 0;
var assert_1$e = __importDefault$h(require$$0$1);
clean.clean = function(text, options) {
  assert_1$e.default(typeof text === "string" || Array.isArray(text), "Expected 'text' to be typeof 'string' or 'array', received '" + typeof text + "'");
  options = Object.assign({
    formattingCharacter: "§"
  }, options);
  if (typeof text === "string") {
    return text.replace(new RegExp(options.formattingCharacter + "[0-9a-gk-or]", "g"), "");
  }
  return text.map(function(item) {
    return item.text;
  }).join("");
};
var format = {};
var color = {};
Object.defineProperty(color, "__esModule", { value: true });
var ColorUtil = (
  /** @class */
  function() {
    function ColorUtil2(list) {
      this.list = [];
      for (var key in list) {
        this.list.push({
          name: key,
          hex: list[key],
          sum: sum(list[key])
        });
      }
    }
    ColorUtil2.prototype.closest = function(input) {
      var colorSum = sum(input);
      var closest = null;
      var lastDifference = Infinity;
      for (var _i = 0, _a = this.list; _i < _a.length; _i++) {
        var color2 = _a[_i];
        var diff = Math.abs(colorSum - color2.sum);
        if (closest === null || diff < lastDifference) {
          closest = color2;
          lastDifference = diff;
        }
      }
      return closest;
    };
    return ColorUtil2;
  }()
);
var sum = function(input) {
  var sum2 = 0;
  input = input.replace("#", "");
  var r = input.substring(0, 2);
  var g = input.substring(2, 4);
  var b = input.substring(4, 6);
  sum2 = Math.sqrt(Math.pow(parseInt(r, 16), 2) + Math.pow(parseInt(g, 16), 2) + Math.pow(parseInt(b, 16), 2));
  return sum2;
};
color.default = ColorUtil;
var __importDefault$g = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(format, "__esModule", { value: true });
format.format = void 0;
var assert_1$d = __importDefault$g(require$$0$1);
var parse_1 = parse;
var color_1 = __importDefault$g(color);
var colorLookupCodes = {
  "black": "0",
  "dark_blue": "1",
  "dark_green": "2",
  "dark_aqua": "3",
  "dark_red": "4",
  "dark_purple": "5",
  "gold": "6",
  "gray": "7",
  "dark_gray": "8",
  "blue": "9",
  "green": "a",
  "aqua": "b",
  "red": "c",
  "light_purple": "d",
  "yellow": "e",
  "white": "f",
  "minecoin_gold": "g"
};
var colorValues = {
  "black": "#000000",
  "dark_blue": "#0000AA",
  "dark_green": "#00AA00",
  "dark_aqua": "#00AAAA",
  "dark_red": "#AA0000",
  "dark_purple": "#AA00AA",
  "gold": "#FFAA00",
  "gray": "#AAAAAA",
  "dark_gray": "#555555",
  "blue": "#5555FF",
  "green": "#55FF55",
  "aqua": "#55FFFF",
  "red": "#FF5555",
  "light_purple": "#FF55FF",
  "yellow": "#FFFF55",
  "white": "#FFFFFF"
};
var colorUtil = new color_1.default(colorValues);
format.format = function(input, options) {
  assert_1$d.default(typeof input === "string" || Array.isArray(input), "Expected 'input' to be typeof 'array' or typeof 'string', got '" + typeof input + "'");
  if (typeof input === "string") {
    input = parse_1.parse(input, options);
  }
  var opts = Object.assign({
    formattingCharacter: "§",
    replaceNearestColor: true
  }, options);
  var result = "";
  for (var _i = 0, input_1 = input; _i < input_1.length; _i++) {
    var item = input_1[_i];
    if (item.color) {
      var formatColor = colorLookupCodes[item.color];
      if (formatColor) {
        result += opts.formattingCharacter + colorLookupCodes[item.color];
      } else if (opts.replaceNearestColor) {
        var newColor = colorUtil.closest(item.color);
        if (newColor) {
          var colorCode = colorLookupCodes[newColor.name];
          if (colorCode) {
            result += opts.formattingCharacter + colorCode;
          }
        }
      }
    }
    if (item.bold) {
      result += opts.formattingCharacter + "l";
    }
    if (item.italics) {
      result += opts.formattingCharacter + "o";
    }
    if (item.underline) {
      result += opts.formattingCharacter + "n";
    }
    if (item.strikethrough) {
      result += opts.formattingCharacter + "m";
    }
    if (item.obfuscated) {
      result += opts.formattingCharacter + "k";
    }
    result += item.text;
  }
  return result;
};
var toHTML = {};
var __importDefault$f = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(toHTML, "__esModule", { value: true });
toHTML.toHTML = void 0;
var assert_1$c = __importDefault$f(require$$0$1);
var defaultSerializers = {
  "black": { styles: { color: "#000000" } },
  "dark_blue": { styles: { color: "#0000AA" } },
  "dark_green": { styles: { color: "#00AA00" } },
  "dark_aqua": { styles: { color: "#00AAAA" } },
  "dark_red": { styles: { color: "#AA0000" } },
  "dark_purple": { styles: { color: "#AA00AA" } },
  "gold": { styles: { color: "#FFAA00" } },
  "gray": { styles: { color: "#AAAAAA" } },
  "dark_gray": { styles: { color: "#555555" } },
  "blue": { styles: { color: "#5555FF" } },
  "green": { styles: { color: "#55FF55" } },
  "aqua": { styles: { color: "#55FFFF" } },
  "red": { styles: { color: "#FF5555" } },
  "light_purple": { styles: { color: "#FF55FF" } },
  "yellow": { styles: { color: "#FFFF55" } },
  "white": { styles: { color: "#FFFFFF" } },
  "minecoin_gold": { styles: { color: "#DDD605" } },
  "obfuscated": { classes: ["minecraft-formatting-obfuscated"] },
  "bold": { styles: { "font-weight": "bold" } },
  "strikethrough": { styles: { "text-decoration": "line-through" } },
  "underline": { styles: { "text-decoration": "underline" } },
  "italics": { styles: { "font-style": "italic" } }
};
toHTML.toHTML = function(tree, options) {
  assert_1$c.default(Array.isArray(tree), "Expected 'tree' to be typeof 'array', received '" + typeof tree + "'");
  var opts = Object.assign({
    serializers: defaultSerializers,
    rootTag: "span"
  }, options);
  var result = "<" + opts.rootTag + ">";
  for (var _i = 0, tree_1 = tree; _i < tree_1.length; _i++) {
    var item = tree_1[_i];
    var classes = [];
    var styles = {};
    for (var prop in item) {
      if (prop === "text")
        continue;
      var serializer = opts.serializers[prop === "color" ? item[prop] : prop];
      if (serializer) {
        if (serializer.classes && serializer.classes.length > 0) {
          classes.push.apply(classes, serializer.classes);
        }
        if (serializer.styles) {
          for (var attr in serializer.styles) {
            if (!(attr in styles)) {
              styles[attr] = [];
            }
            styles[attr].push(serializer.styles[attr]);
          }
        }
      } else if (prop === "color") {
        if (!("color" in styles)) {
          styles.color = [];
        }
        styles.color.push(item[prop]);
      }
    }
    var content = item.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    result += "<span" + (classes.length > 0 ? ' class="' + classes.join(" ") + '"' : "") + (Object.keys(styles).length > 0 ? ' style="' + Object.entries(styles).map(function(style) {
      return style[0] + ": " + style[1].join(" ") + ";";
    }).join(" ") + '"' : "") + ">" + content + "</span>";
  }
  result += "</" + opts.rootTag + ">";
  return result;
};
(function(exports$1) {
  Object.defineProperty(exports$1, "__esModule", { value: true });
  exports$1.toHTML = exports$1.format = exports$1.clean = exports$1.parse = void 0;
  var parse_12 = parse;
  Object.defineProperty(exports$1, "parse", { enumerable: true, get: function() {
    return parse_12.parse;
  } });
  var clean_1 = clean;
  Object.defineProperty(exports$1, "clean", { enumerable: true, get: function() {
    return clean_1.clean;
  } });
  var format_1 = format;
  Object.defineProperty(exports$1, "format", { enumerable: true, get: function() {
    return format_1.format;
  } });
  var toHTML_1 = toHTML;
  Object.defineProperty(exports$1, "toHTML", { enumerable: true, get: function() {
    return toHTML_1.toHTML;
  } });
})(dist);
var TCPClient$1 = {};
var varint = {};
var __awaiter$e = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
Object.defineProperty(varint, "__esModule", { value: true });
varint.writeVarInt = varint.readVarInt = void 0;
function readVarInt(readByte) {
  return __awaiter$e(this, void 0, void 0, function* () {
    let numRead = 0;
    let result = 0;
    let read, value;
    do {
      if (numRead > 4)
        throw new Error("VarInt exceeds data bounds");
      read = yield readByte();
      value = read & 127;
      result |= value << 7 * numRead;
      numRead++;
      if (numRead > 5)
        throw new Error("VarInt is too big");
    } while ((read & 128) != 0);
    return result;
  });
}
varint.readVarInt = readVarInt;
function writeVarInt(value) {
  let buf = Buffer.alloc(0);
  do {
    let temp = value & 127;
    value >>>= 7;
    if (value != 0) {
      temp |= 128;
    }
    buf = Buffer.concat([buf, Buffer.from([temp])]);
  } while (value != 0);
  return buf;
}
varint.writeVarInt = writeVarInt;
var __awaiter$d = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$e = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(TCPClient$1, "__esModule", { value: true });
const net_1 = __importDefault$e(net__default);
const events_1$2 = require$$1$1;
const util_1$6 = require$$2;
const varint_1$1 = varint;
const encoder$4 = new util_1$6.TextEncoder();
const decoder$3 = new util_1$6.TextDecoder("utf8");
class TCPClient extends events_1$2.EventEmitter {
  constructor() {
    super(...arguments);
    this.isConnected = false;
    this.socket = null;
    this.data = Buffer.alloc(0);
  }
  connect(options) {
    return new Promise((resolve, reject) => {
      this.socket = net_1.default.createConnection(options);
      const connectHandler = () => {
        var _a, _b, _c, _d;
        this.isConnected = true;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.removeListener("connect", connectHandler);
        (_b = this.socket) === null || _b === void 0 ? void 0 : _b.removeListener("error", errorHandler);
        (_c = this.socket) === null || _c === void 0 ? void 0 : _c.removeListener("timeout", timeoutHandler);
        (_d = this.socket) === null || _d === void 0 ? void 0 : _d.removeListener("close", closeHandler);
        resolve();
      };
      const errorHandler = (error) => {
        var _a;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
        reject(error);
      };
      const timeoutHandler = () => __awaiter$d(this, void 0, void 0, function* () {
        var _a;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
        reject(new Error("Server is offline or unreachable"));
      });
      const closeHandler = (hasError) => {
        var _a;
        this.isConnected = false;
        (_a = this.socket) === null || _a === void 0 ? void 0 : _a.destroy();
        if (!hasError)
          reject();
        this.emit("close");
      };
      this.socket.on("data", (data) => {
        this.data = Buffer.concat([this.data, data]);
        this.emit("data");
      });
      this.socket.on("connect", () => connectHandler());
      this.socket.on("error", (error) => errorHandler(error));
      this.socket.on("timeout", () => timeoutHandler());
      this.socket.on("close", (hasError) => closeHandler(hasError));
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(value) {
    this.writeUInt8(value);
  }
  readBytes(length) {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(length);
      const value = this.data.slice(0, length);
      this.data = this.data.slice(length);
      return value;
    });
  }
  writeBytes(data) {
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt8() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const value = this.data.readUInt8(0);
      this.data = this.data.slice(1);
      return value;
    });
  }
  writeUInt8(value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt8() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const value = this.data.readInt8(0);
      this.data = this.data.slice(1);
      return value;
    });
  }
  writeInt8(value) {
    const data = Buffer.alloc(1);
    data.writeInt8(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt16BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readUInt16BE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeUInt16BE(value) {
    const data = Buffer.alloc(2);
    data.writeUInt16BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt16BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readInt16BE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeInt16BE(value) {
    const data = Buffer.alloc(2);
    data.writeInt16BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt16LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readUInt16LE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeUInt16LE(value) {
    const data = Buffer.alloc(2);
    data.writeUInt16LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt16LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readInt16LE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeInt16LE(value) {
    const data = Buffer.alloc(2);
    data.writeInt16LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt32BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readUInt32BE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeUInt32BE(value) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt32BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readInt32BE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeInt32BE(value) {
    const data = Buffer.alloc(4);
    data.writeInt32BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt32LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readUInt32LE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeUInt32LE(value) {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt32LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readInt32LE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeInt32LE(value) {
    const data = Buffer.alloc(4);
    data.writeInt32LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt64BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigUInt64BE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeUInt64BE(value) {
    const data = Buffer.alloc(8);
    data.writeBigUInt64BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt64BE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigInt64BE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeInt64BE(value) {
    const data = Buffer.alloc(8);
    data.writeBigInt64BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt64LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigUInt64LE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeUInt64LE(value) {
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt64LE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigInt64LE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeInt64LE(value) {
    const data = Buffer.alloc(8);
    data.writeBigInt64LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readFloatBE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readFloatBE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeFloatBE(value) {
    const data = Buffer.alloc(4);
    data.writeFloatBE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readFloatLE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readFloatLE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeFloatLE(value) {
    const data = Buffer.alloc(4);
    data.writeFloatLE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readDoubleBE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readDoubleBE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeDoubleBE(value) {
    const data = Buffer.alloc(8);
    data.writeDoubleBE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readDoubleLE() {
    return __awaiter$d(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readDoubleLE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeDoubleLE(value) {
    const data = Buffer.alloc(8);
    data.writeDoubleLE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readVarInt() {
    return __awaiter$d(this, void 0, void 0, function* () {
      return yield (0, varint_1$1.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(value) {
    this.writeBytes((0, varint_1$1.writeVarInt)(value));
  }
  readString(length) {
    return __awaiter$d(this, void 0, void 0, function* () {
      const data = yield this.readBytes(length);
      return decoder$3.decode(data);
    });
  }
  writeString(value) {
    this.writeBytes(encoder$4.encode(value));
  }
  readStringVarInt() {
    return __awaiter$d(this, void 0, void 0, function* () {
      const length = yield this.readVarInt();
      const data = yield this.readBytes(length);
      return decoder$3.decode(data);
    });
  }
  writeStringVarInt(value) {
    const data = encoder$4.encode(value);
    this.writeVarInt(data.byteLength);
    this.writeBytes(data);
  }
  readStringNT() {
    return __awaiter$d(this, void 0, void 0, function* () {
      let buf = Buffer.alloc(0);
      let value;
      while ((value = yield this.readByte()) !== 0) {
        buf = Buffer.concat([buf, Buffer.from([value])]);
      }
      return decoder$3.decode(buf);
    });
  }
  writeStringNT(value) {
    const data = encoder$4.encode(value);
    this.writeBytes(data);
    this.writeByte(0);
  }
  writeStringBytes(value) {
    this.writeBytes(encoder$4.encode(value));
  }
  readStringUntil(byte) {
    return __awaiter$d(this, void 0, void 0, function* () {
      let buf = Buffer.alloc(0);
      let value;
      while ((value = yield this.readByte()) !== byte) {
        buf = Buffer.concat([buf, Buffer.from([value])]);
      }
      return decoder$3.decode(buf);
    });
  }
  flush(prefixLength = true) {
    if (!this.socket)
      return Promise.resolve();
    return new Promise((resolve, reject) => {
      var _a;
      let buf = this.data;
      if (prefixLength) {
        buf = Buffer.concat([(0, varint_1$1.writeVarInt)(buf.byteLength), buf]);
      }
      (_a = this.socket) === null || _a === void 0 ? void 0 : _a.write(buf, (error) => {
        if (error)
          return reject(error);
        resolve();
      });
      this.data = Buffer.alloc(0);
    });
  }
  close() {
    var _a, _b, _c;
    (_a = this.socket) === null || _a === void 0 ? void 0 : _a.removeAllListeners();
    (_b = this.socket) === null || _b === void 0 ? void 0 : _b.end();
    (_c = this.socket) === null || _c === void 0 ? void 0 : _c.destroy();
  }
  ensureBufferedData(byteLength) {
    return __awaiter$d(this, void 0, void 0, function* () {
      if (this.data.byteLength >= byteLength)
        return Promise.resolve();
      return this._waitForData(byteLength);
    });
  }
  _waitForData(byteLength = 1) {
    return new Promise((resolve, reject) => {
      const dataHandler = () => {
        if (this.data.byteLength >= byteLength) {
          this.removeListener("data", dataHandler);
          this.removeListener("close", closeHandler);
          resolve();
        }
      };
      const closeHandler = () => {
        this.removeListener("data", dataHandler);
        this.removeListener("close", closeHandler);
        reject(new Error("Socket closed unexpectedly while waiting for data"));
      };
      this.on("data", () => dataHandler());
      this.on("close", () => closeHandler());
    });
  }
}
TCPClient$1.default = TCPClient;
var srvRecord = {};
var __importDefault$d = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(srvRecord, "__esModule", { value: true });
srvRecord.resolveSRV = void 0;
const dns_1 = __importDefault$d(require$$0$2);
function resolveSRV(host, protocol = "tcp") {
  return new Promise((resolve) => {
    dns_1.default.resolveSrv(`_minecraft._${protocol}.${host}`, (error, addresses) => {
      if (error || addresses.length < 1)
        return resolve(null);
      const address = addresses[0];
      resolve({ host: address.name, port: address.port });
    });
  });
}
srvRecord.resolveSRV = resolveSRV;
var __awaiter$c = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$c = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(status$1, "__esModule", { value: true });
status$1.status = void 0;
const assert_1$b = __importDefault$c(require$$0$1);
const crypto_1$2 = __importDefault$c(require$$1);
const minecraft_motd_util_1$6 = dist;
const TCPClient_1$7 = __importDefault$c(TCPClient$1);
const srvRecord_1$7 = srvRecord;
function status(host, port = 25565, options) {
  host = host.trim();
  (0, assert_1$b.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$b.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$b.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$b.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$b.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$b.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$b.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$b.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$b.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$b.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$b.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$c(this, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    const socket = new TCPClient_1$7.default();
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$7.resolveSRV)(host);
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        socket.writeVarInt(0);
        socket.writeVarInt(47);
        socket.writeStringVarInt(host);
        socket.writeUInt16BE(port);
        socket.writeVarInt(1);
        yield socket.flush();
      }
      {
        socket.writeVarInt(0);
        yield socket.flush();
      }
      let response;
      {
        const packetLength = yield socket.readVarInt();
        yield socket.ensureBufferedData(packetLength);
        const packetType = yield socket.readVarInt();
        if (packetType !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + packetType);
        response = JSON.parse(yield socket.readStringVarInt());
      }
      const payload = crypto_1$2.default.randomBytes(8).readBigInt64BE();
      {
        socket.writeVarInt(1);
        socket.writeInt64BE(payload);
        yield socket.flush();
      }
      const pingStart = Date.now();
      {
        const packetLength = yield socket.readVarInt();
        yield socket.ensureBufferedData(packetLength);
        const packetType = yield socket.readVarInt();
        if (packetType !== 1)
          throw new Error("Expected server to send packet type 0x01, received " + packetType);
        const receivedPayload = yield socket.readInt64BE();
        if (receivedPayload !== payload)
          throw new Error("Ping payload did not match received payload");
      }
      const motd = (0, minecraft_motd_util_1$6.parse)(response.description);
      clearTimeout(timeout2);
      socket.close();
      resolve({
        version: {
          name: response.version.name,
          protocol: response.version.protocol
        },
        players: {
          online: response.players.online,
          max: response.players.max,
          sample: (_c = response.players.sample) !== null && _c !== void 0 ? _c : null
        },
        motd: {
          raw: (0, minecraft_motd_util_1$6.format)(motd),
          clean: (0, minecraft_motd_util_1$6.clean)(motd),
          html: (0, minecraft_motd_util_1$6.toHTML)(motd)
        },
        favicon: (_d = response.favicon) !== null && _d !== void 0 ? _d : null,
        srvRecord: srvRecord2,
        roundTripLatency: Date.now() - pingStart
      });
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
status$1.status = status;
var statusFE$1 = {};
var __awaiter$b = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$b = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(statusFE$1, "__esModule", { value: true });
statusFE$1.statusFE = void 0;
const assert_1$a = __importDefault$b(require$$0$1);
const TCPClient_1$6 = __importDefault$b(TCPClient$1);
const srvRecord_1$6 = srvRecord;
function statusFE(host, port = 25565, options) {
  process.emitWarning("Use of statusFE() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning");
  host = host.trim();
  (0, assert_1$a.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$a.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$a.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$a.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$a.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$a.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$a.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$a.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$a.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$a.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$a.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$b(this, void 0, void 0, function* () {
    var _a, _b;
    const socket = new TCPClient_1$6.default();
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$6.resolveSRV)(host);
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        socket.writeByte(254);
        yield socket.flush(false);
      }
      {
        const packetID = yield socket.readByte();
        if (packetID !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + packetID);
        const packetLength = yield socket.readInt16BE();
        const remainingData = yield socket.readBytes(packetLength * 2);
        const [motd, onlinePlayersString, maxPlayersString] = remainingData.swap16().toString("utf16le").split("§");
        socket.close();
        clearTimeout(timeout2);
        resolve({
          players: {
            online: parseInt(onlinePlayersString),
            max: parseInt(maxPlayersString)
          },
          motd,
          srvRecord: srvRecord2
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
statusFE$1.statusFE = statusFE;
var statusFE01$1 = {};
var __awaiter$a = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$a = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(statusFE01$1, "__esModule", { value: true });
statusFE01$1.statusFE01 = void 0;
const assert_1$9 = __importDefault$a(require$$0$1);
const minecraft_motd_util_1$5 = dist;
const TCPClient_1$5 = __importDefault$a(TCPClient$1);
const srvRecord_1$5 = srvRecord;
function statusFE01(host, port = 25565, options) {
  process.emitWarning("Use of statusFE01() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning");
  host = host.trim();
  (0, assert_1$9.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$9.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$9.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$9.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$9.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$9.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$9.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$9.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$9.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$9.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$9.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$a(this, void 0, void 0, function* () {
    var _a, _b;
    const socket = new TCPClient_1$5.default();
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$5.resolveSRV)(host);
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        socket.writeBytes(Uint8Array.from([254, 1]));
        yield socket.flush(false);
      }
      {
        const kickIdentifier = yield socket.readByte();
        if (kickIdentifier !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + kickIdentifier);
        const remainingLength = yield socket.readInt16BE();
        const remainingData = yield socket.readBytes(remainingLength * 2);
        const [protocolVersionString, version, motdString, onlinePlayersString, maxPlayersString] = remainingData.slice(6).swap16().toString("utf16le").split("\0");
        const motd = (0, minecraft_motd_util_1$5.parse)(motdString);
        socket.close();
        clearTimeout(timeout2);
        resolve({
          protocolVersion: parseInt(protocolVersionString),
          version,
          players: {
            online: parseInt(onlinePlayersString),
            max: parseInt(maxPlayersString)
          },
          motd: {
            raw: (0, minecraft_motd_util_1$5.format)(motd),
            clean: (0, minecraft_motd_util_1$5.clean)(motd),
            html: (0, minecraft_motd_util_1$5.toHTML)(motd)
          },
          srvRecord: srvRecord2
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
statusFE01$1.statusFE01 = statusFE01;
var statusFE01FA$1 = {};
var __awaiter$9 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$9 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(statusFE01FA$1, "__esModule", { value: true });
statusFE01FA$1.statusFE01FA = void 0;
const assert_1$8 = __importDefault$9(require$$0$1);
const minecraft_motd_util_1$4 = dist;
const util_1$5 = require$$2;
const TCPClient_1$4 = __importDefault$9(TCPClient$1);
const srvRecord_1$4 = srvRecord;
const encoder$3 = new util_1$5.TextEncoder();
function statusFE01FA(host, port = 25565, options) {
  process.emitWarning("Use of statusFE01FA() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning");
  host = host.trim();
  (0, assert_1$8.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$8.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$8.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$8.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$8.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$8.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$8.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$8.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$8.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$8.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$8.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$9(this, void 0, void 0, function* () {
    var _a, _b;
    const socket = new TCPClient_1$4.default();
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$4.resolveSRV)(host);
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        const hostBytes = encoder$3.encode(host);
        socket.writeBytes(Uint8Array.from([254, 1, 250]));
        socket.writeInt16BE(11);
        socket.writeStringBytes("MC|PingHost");
        socket.writeInt16BE(7 + hostBytes.byteLength);
        socket.writeByte(74);
        socket.writeInt16BE(hostBytes.length);
        socket.writeBytes(hostBytes);
        socket.writeInt16BE(port);
        yield socket.flush(false);
      }
      {
        const kickIdentifier = yield socket.readByte();
        if (kickIdentifier !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + kickIdentifier);
        const remainingLength = yield socket.readInt16BE();
        const remainingData = yield socket.readBytes(remainingLength * 2);
        const [protocolVersionString, version, motdString, onlinePlayersString, maxPlayersString] = remainingData.slice(6).swap16().toString("utf16le").split("\0");
        const motd = (0, minecraft_motd_util_1$4.parse)(motdString);
        socket.close();
        clearTimeout(timeout2);
        resolve({
          protocolVersion: parseInt(protocolVersionString),
          version,
          players: {
            online: parseInt(onlinePlayersString),
            max: parseInt(maxPlayersString)
          },
          motd: {
            raw: (0, minecraft_motd_util_1$4.format)(motd),
            clean: (0, minecraft_motd_util_1$4.clean)(motd),
            html: (0, minecraft_motd_util_1$4.toHTML)(motd)
          },
          srvRecord: srvRecord2
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
statusFE01FA$1.statusFE01FA = statusFE01FA;
var statusLegacy$1 = {};
var __awaiter$8 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$8 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(statusLegacy$1, "__esModule", { value: true });
statusLegacy$1.statusLegacy = void 0;
const assert_1$7 = __importDefault$8(require$$0$1);
const minecraft_motd_util_1$3 = dist;
const util_1$4 = require$$2;
const TCPClient_1$3 = __importDefault$8(TCPClient$1);
const srvRecord_1$3 = srvRecord;
const decoder$2 = new util_1$4.TextDecoder("utf-16be");
function statusLegacy(host, port = 25565, options) {
  host = host.trim();
  (0, assert_1$7.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$7.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$7.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$7.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$7.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$7.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$7.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$7.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$7.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$7.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$7.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$8(this, void 0, void 0, function* () {
    var _a, _b;
    const socket = new TCPClient_1$3.default();
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$3.resolveSRV)(host);
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        socket.writeBytes(Uint8Array.from([254, 1]));
        yield socket.flush(false);
      }
      let protocolVersion;
      let versionName;
      let rawMOTD;
      let onlinePlayers;
      let maxPlayers;
      {
        const packetType = yield socket.readByte();
        if (packetType !== 255)
          throw new Error("Packet returned from server was unexpected type");
        const length = yield socket.readUInt16BE();
        const data = decoder$2.decode(yield socket.readBytes(length * 2));
        if (data[0] === "§" || data[1] === "1") {
          const split = data.split("\0");
          protocolVersion = parseInt(split[1]);
          versionName = split[2];
          rawMOTD = split[3];
          onlinePlayers = parseInt(split[4]);
          maxPlayers = parseInt(split[5]);
        } else {
          const split = data.split("§");
          protocolVersion = null;
          versionName = null;
          rawMOTD = split[0];
          onlinePlayers = parseInt(split[1]);
          maxPlayers = parseInt(split[2]);
        }
      }
      socket.close();
      clearTimeout(timeout2);
      const motd = (0, minecraft_motd_util_1$3.parse)(rawMOTD);
      resolve({
        version: versionName === null && protocolVersion === null ? null : {
          name: versionName,
          protocol: protocolVersion
        },
        players: {
          online: onlinePlayers,
          max: maxPlayers
        },
        motd: {
          raw: (0, minecraft_motd_util_1$3.format)(motd),
          clean: (0, minecraft_motd_util_1$3.clean)(motd),
          html: (0, minecraft_motd_util_1$3.toHTML)(motd)
        },
        srvRecord: srvRecord2
      });
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
statusLegacy$1.statusLegacy = statusLegacy;
var statusBedrock$1 = {};
var UDPClient$1 = {};
var __awaiter$7 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$7 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(UDPClient$1, "__esModule", { value: true });
const dgram_1$1 = __importDefault$7(require$$0__default);
const events_1$1 = require$$1$1;
const util_1$3 = require$$2;
const varint_1 = varint;
const encoder$2 = new util_1$3.TextEncoder();
const decoder$1 = new util_1$3.TextDecoder("utf-8");
class UDPClient extends events_1$1.EventEmitter {
  constructor(host, port) {
    super();
    this.data = Buffer.alloc(0);
    this.host = host;
    this.port = port;
    this.socket = dgram_1$1.default.createSocket("udp4");
    this.socket.on("message", (data) => {
      this.data = Buffer.concat([this.data, data]);
      this.emit("data");
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(value) {
    this.writeUInt8(value);
  }
  readBytes(length) {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(length);
      const value = this.data.slice(0, length);
      this.data = this.data.slice(length);
      return value;
    });
  }
  writeBytes(data) {
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt8() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const value = this.data.readUInt8(0);
      this.data = this.data.slice(1);
      return value;
    });
  }
  writeUInt8(value) {
    const data = Buffer.alloc(1);
    data.writeUInt8(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt8() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const value = this.data.readInt8(0);
      this.data = this.data.slice(1);
      return value;
    });
  }
  writeInt8(value) {
    const data = Buffer.alloc(1);
    data.writeInt8(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt16BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readUInt16BE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeUInt16BE(value) {
    const data = Buffer.alloc(2);
    data.writeUInt16BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt16BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readInt16BE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeInt16BE(value) {
    const data = Buffer.alloc(2);
    data.writeInt16BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt16LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readUInt16LE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeUInt16LE(value) {
    const data = Buffer.alloc(2);
    data.writeUInt16LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt16LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const value = this.data.readInt16LE(0);
      this.data = this.data.slice(2);
      return value;
    });
  }
  writeInt16LE(value) {
    const data = Buffer.alloc(2);
    data.writeInt16LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt32BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readUInt32BE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeUInt32BE(value) {
    const data = Buffer.alloc(4);
    data.writeUInt32BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt32BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readInt32BE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeInt32BE(value) {
    const data = Buffer.alloc(4);
    data.writeInt32BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt32LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readUInt32LE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeUInt32LE(value) {
    const data = Buffer.alloc(4);
    data.writeUInt32LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt32LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readInt32LE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeInt32LE(value) {
    const data = Buffer.alloc(4);
    data.writeInt32LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt64BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigUInt64BE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeUInt64BE(value) {
    const data = Buffer.alloc(8);
    data.writeBigUInt64BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt64BE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigInt64BE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeInt64BE(value) {
    const data = Buffer.alloc(8);
    data.writeBigInt64BE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readUInt64LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigUInt64LE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeUInt64LE(value) {
    const data = Buffer.alloc(8);
    data.writeBigUInt64LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readInt64LE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readBigInt64LE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeInt64LE(value) {
    const data = Buffer.alloc(8);
    data.writeBigInt64LE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readFloatBE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readFloatBE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeFloatBE(value) {
    const data = Buffer.alloc(4);
    data.writeFloatBE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readFloatLE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const value = this.data.readFloatLE(0);
      this.data = this.data.slice(4);
      return value;
    });
  }
  writeFloatLE(value) {
    const data = Buffer.alloc(4);
    data.writeFloatLE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readDoubleBE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readDoubleBE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeDoubleBE(value) {
    const data = Buffer.alloc(8);
    data.writeDoubleBE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readDoubleLE() {
    return __awaiter$7(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const value = this.data.readDoubleLE(0);
      this.data = this.data.slice(8);
      return value;
    });
  }
  writeDoubleLE(value) {
    const data = Buffer.alloc(8);
    data.writeDoubleLE(value);
    this.data = Buffer.concat([this.data, data]);
  }
  readVarInt() {
    return __awaiter$7(this, void 0, void 0, function* () {
      return yield (0, varint_1.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(value) {
    this.writeBytes((0, varint_1.writeVarInt)(value));
  }
  readString(length) {
    return __awaiter$7(this, void 0, void 0, function* () {
      const data = yield this.readBytes(length);
      return decoder$1.decode(data);
    });
  }
  writeString(value) {
    this.writeBytes(encoder$2.encode(value));
  }
  readStringVarInt() {
    return __awaiter$7(this, void 0, void 0, function* () {
      const length = yield this.readVarInt();
      const data = yield this.readBytes(length);
      return Array.from(data).map((point) => String.fromCodePoint(point)).join("");
    });
  }
  writeStringVarInt(value) {
    const data = encoder$2.encode(value);
    this.writeVarInt(data.byteLength);
    this.writeBytes(data);
  }
  readStringNT() {
    return __awaiter$7(this, void 0, void 0, function* () {
      let buf = Buffer.alloc(0);
      let value;
      while ((value = yield this.readByte()) !== 0) {
        buf = Buffer.concat([buf, Buffer.from([value])]);
      }
      return Array.from(buf).map((point) => String.fromCodePoint(point)).join("");
    });
  }
  readStringNTFollowedBy(suffixes) {
    return __awaiter$7(this, void 0, void 0, function* () {
      let buf = Buffer.alloc(0);
      while (true) {
        const value = yield this.readByte();
        if (value === 0 && (yield this.checkUpcomingData(suffixes))) {
          break;
        }
        buf = Buffer.concat([buf, Buffer.from([value])]);
      }
      return Array.from(buf).map((point) => String.fromCodePoint(point)).join("");
    });
  }
  checkUpcomingData(suffixes) {
    return __awaiter$7(this, void 0, void 0, function* () {
      let i = 0;
      while (suffixes.length) {
        yield this.ensureBufferedData(i + 1);
        const remaining = [];
        for (const suffix of suffixes) {
          if (this.data[i] === suffix[i]) {
            if (i === suffix.length - 1) {
              return suffix;
            }
            remaining.push(suffix);
          }
        }
        suffixes = remaining;
        i++;
      }
      return null;
    });
  }
  writeStringNT(value) {
    const data = encoder$2.encode(value);
    this.writeBytes(data);
    this.writeByte(0);
  }
  writeStringBytes(value) {
    this.writeBytes(encoder$2.encode(value));
  }
  flush(prefixLength = true) {
    if (!this.socket)
      return Promise.resolve();
    return new Promise((resolve, reject) => {
      let buf = this.data;
      if (prefixLength) {
        buf = Buffer.concat([(0, varint_1.writeVarInt)(buf.byteLength), buf]);
      }
      this.socket.send(buf, 0, buf.byteLength, this.port, this.host, (error) => {
        if (error)
          return reject(error);
        resolve();
      });
      this.data = Buffer.alloc(0);
    });
  }
  close() {
    var _a;
    try {
      (_a = this.socket) === null || _a === void 0 ? void 0 : _a.close();
    } catch (_b) {
    }
  }
  ensureBufferedData(byteLength) {
    return __awaiter$7(this, void 0, void 0, function* () {
      if (this.data.byteLength >= byteLength)
        return Promise.resolve();
      return this._waitForData(byteLength);
    });
  }
  _waitForData(byteLength = 1) {
    return new Promise((resolve, reject) => {
      const dataHandler = () => {
        if (this.data.byteLength >= byteLength) {
          this.removeListener("data", dataHandler);
          this.socket.removeListener("error", errorHandler);
          resolve();
        }
      };
      const errorHandler = (error) => {
        this.removeListener("data", dataHandler);
        this.socket.removeListener("error", errorHandler);
        reject(error);
      };
      this.once("data", () => dataHandler());
      this.socket.on("error", (error) => errorHandler(error));
    });
  }
  hasRemainingData() {
    return this.data.byteLength > 0;
  }
}
UDPClient$1.default = UDPClient;
var __awaiter$6 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$6 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(statusBedrock$1, "__esModule", { value: true });
statusBedrock$1.statusBedrock = void 0;
const assert_1$6 = __importDefault$6(require$$0$1);
const minecraft_motd_util_1$2 = dist;
const UDPClient_1$2 = __importDefault$6(UDPClient$1);
const srvRecord_1$2 = srvRecord;
function statusBedrock(host, port = 19132, options) {
  host = host.trim();
  (0, assert_1$6.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$6.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$6.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$6.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$6.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$6.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$6.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$6.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$6.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$6.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$6.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  return new Promise((resolve, reject) => __awaiter$6(this, void 0, void 0, function* () {
    var _a;
    const socket = new UDPClient_1$2.default(host, port);
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$2.resolveSRV)(host, "udp");
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      {
        socket.writeByte(1);
        socket.writeInt64BE(BigInt(Date.now()));
        socket.writeBytes(Uint8Array.from([0, 255, 255, 0, 254, 254, 254, 254, 253, 253, 253, 253, 18, 52, 86, 120]));
        socket.writeInt64BE(BigInt(2));
        yield socket.flush(false);
      }
      {
        const packetType = yield socket.readByte();
        if (packetType !== 28)
          throw new Error("Expected server to send packet type 0x1C, received " + packetType);
        yield socket.readInt64BE();
        const serverGUID = yield socket.readInt64BE();
        yield socket.readBytes(16);
        const responseLength = yield socket.readInt16BE();
        const response = yield socket.readString(responseLength);
        const [edition, motdLine1, protocolVersion, version, onlinePlayers, maxPlayers, serverID, motdLine2, gameMode, gameModeID, portIPv4, portIPv6] = response.split(";");
        const motd = (0, minecraft_motd_util_1$2.parse)(motdLine1 + (motdLine2 ? "\n" + motdLine2 : ""));
        socket.close();
        clearTimeout(timeout2);
        resolve({
          edition,
          motd: {
            raw: (0, minecraft_motd_util_1$2.format)(motd),
            clean: (0, minecraft_motd_util_1$2.clean)(motd),
            html: (0, minecraft_motd_util_1$2.toHTML)(motd)
          },
          version: {
            name: version,
            protocol: parseInt(protocolVersion)
          },
          players: {
            online: parseInt(onlinePlayers),
            max: parseInt(maxPlayers)
          },
          serverGUID,
          serverID,
          gameMode,
          gameModeID: parseInt(gameModeID),
          portIPv4: portIPv4 ? parseInt(portIPv4) : null,
          portIPv6: portIPv6 ? parseInt(portIPv6) : null,
          srvRecord: srvRecord2
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
statusBedrock$1.statusBedrock = statusBedrock;
var queryBasic$1 = {};
var __awaiter$5 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$5 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(queryBasic$1, "__esModule", { value: true });
queryBasic$1.queryBasic = void 0;
const assert_1$5 = __importDefault$5(require$$0$1);
const minecraft_motd_util_1$1 = dist;
const UDPClient_1$1 = __importDefault$5(UDPClient$1);
const srvRecord_1$1 = srvRecord;
function queryBasic(host, port = 25565, options) {
  var _a;
  host = host.trim();
  (0, assert_1$5.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$5.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$5.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$5.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$5.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$5.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$5.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$5.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$5.default)(typeof options.sessionID === "number" || typeof options.sessionID === "undefined", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof options.sessionID}'`);
    (0, assert_1$5.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$5.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$5.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  const sessionID = ((_a = options === null || options === void 0 ? void 0 : options.sessionID) !== null && _a !== void 0 ? _a : 1) & 252645135;
  return new Promise((resolve, reject) => __awaiter$5(this, void 0, void 0, function* () {
    var _b;
    const socket = new UDPClient_1$1.default(host, port);
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1$1.resolveSRV)(host, "udp");
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      {
        socket.writeUInt16BE(65277);
        socket.writeByte(9);
        socket.writeInt32BE(sessionID);
        yield socket.flush(false);
      }
      let challengeToken;
      {
        const packetType = yield socket.readByte();
        if (packetType !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + packetType);
        const serverSessionID = yield socket.readInt32BE();
        if (sessionID !== serverSessionID)
          throw new Error("Server session ID mismatch, expected " + sessionID + ", received " + serverSessionID);
        challengeToken = parseInt(yield socket.readStringNT());
        if (isNaN(challengeToken))
          throw new Error("Server sent an invalid challenge token");
      }
      {
        socket.writeUInt16BE(65277);
        socket.writeByte(0);
        socket.writeInt32BE(sessionID);
        socket.writeInt32BE(challengeToken);
        yield socket.flush(false);
      }
      {
        const packetType = yield socket.readByte();
        if (packetType !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + packetType);
        const serverSessionID = yield socket.readInt32BE();
        if (sessionID !== serverSessionID)
          throw new Error("Server session ID mismatch, expected " + sessionID + ", received " + serverSessionID);
        const motdString = yield socket.readStringNT();
        const gameType = yield socket.readStringNT();
        const map = yield socket.readStringNT();
        const onlinePlayers = yield socket.readStringNT();
        const maxPlayers = yield socket.readStringNT();
        const hostPort = yield socket.readInt16LE();
        const hostIP = yield socket.readStringNT();
        const motd = (0, minecraft_motd_util_1$1.parse)(motdString);
        socket.close();
        clearTimeout(timeout2);
        resolve({
          motd: {
            raw: (0, minecraft_motd_util_1$1.format)(motd),
            clean: (0, minecraft_motd_util_1$1.clean)(motd),
            html: (0, minecraft_motd_util_1$1.toHTML)(motd)
          },
          gameType,
          map,
          players: {
            online: parseInt(onlinePlayers),
            max: parseInt(maxPlayers)
          },
          hostPort,
          hostIP
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
queryBasic$1.queryBasic = queryBasic;
var queryFull$1 = {};
var __awaiter$4 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$4 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(queryFull$1, "__esModule", { value: true });
queryFull$1.queryFull = void 0;
const assert_1$4 = __importDefault$4(require$$0$1);
const minecraft_motd_util_1 = dist;
const UDPClient_1 = __importDefault$4(UDPClient$1);
const srvRecord_1 = srvRecord;
const validKeys = [
  "gametype",
  "game_id",
  "version",
  "plugins",
  "map",
  "numplayers",
  "maxplayers",
  "hostport",
  "hostip"
].map((s) => Buffer.from(s, "ascii"));
function queryFull(host, port = 25565, options) {
  var _a;
  host = host.trim();
  (0, assert_1$4.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$4.default)(host.length > 0, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$4.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$4.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$4.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$4.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$4.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$4.default)(typeof options.enableSRV === "boolean" || typeof options.enableSRV === "undefined", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof options.enableSRV}'`);
    (0, assert_1$4.default)(typeof options.sessionID === "number" || typeof options.sessionID === "undefined", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof options.sessionID}'`);
    (0, assert_1$4.default)(typeof options.timeout === "number" || typeof options.timeout === "undefined", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof options.timeout}'`);
    if (typeof options.timeout === "number") {
      (0, assert_1$4.default)(Number.isInteger(options.timeout), `Expected 'options.timeout' to be an integer, got '${options.timeout}'`);
      (0, assert_1$4.default)(options.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${options.timeout}'`);
    }
  }
  const sessionID = ((_a = options === null || options === void 0 ? void 0 : options.sessionID) !== null && _a !== void 0 ? _a : 1) & 252645135;
  return new Promise((resolve, reject) => __awaiter$4(this, void 0, void 0, function* () {
    var _b;
    const socket = new UDPClient_1.default(host, port);
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5);
    try {
      let srvRecord2 = null;
      if (typeof options === "undefined" || typeof options.enableSRV === "undefined" || options.enableSRV) {
        srvRecord2 = yield (0, srvRecord_1.resolveSRV)(host, "udp");
        if (srvRecord2) {
          host = srvRecord2.host;
          port = srvRecord2.port;
        }
      }
      {
        socket.writeUInt16BE(65277);
        socket.writeByte(9);
        socket.writeInt32BE(sessionID);
        yield socket.flush(false);
      }
      let challengeToken;
      {
        const packetType = yield socket.readByte();
        if (packetType !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + packetType);
        const serverSessionID = yield socket.readInt32BE();
        if (sessionID !== serverSessionID)
          throw new Error("Server session ID mismatch, expected " + sessionID + ", received " + serverSessionID);
        challengeToken = parseInt(yield socket.readStringNT());
        if (isNaN(challengeToken))
          throw new Error("Server sent an invalid challenge token");
      }
      {
        socket.writeUInt16BE(65277);
        socket.writeByte(0);
        socket.writeInt32BE(sessionID);
        socket.writeInt32BE(challengeToken);
        socket.writeBytes(Uint8Array.from([0, 0, 0, 0]));
        yield socket.flush(false);
      }
      {
        const packetType = yield socket.readByte();
        if (packetType !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + packetType);
        const serverSessionID = yield socket.readInt32BE();
        if (sessionID !== serverSessionID)
          throw new Error("Server session ID mismatch, expected " + sessionID + ", received " + serverSessionID);
        yield socket.readBytes(11);
        const data = {};
        const players = [];
        while (true) {
          const key = yield socket.readStringNT();
          if (key.length < 1)
            break;
          let value;
          if (key === "hostname") {
            value = yield socket.readStringNTFollowedBy(validKeys);
          } else {
            value = yield socket.readStringNT();
          }
          data[key] = value;
        }
        yield socket.readBytes(10);
        while (true) {
          const username = yield socket.readStringNT();
          if (username.length < 1)
            break;
          players.push(username);
        }
        const motd = (0, minecraft_motd_util_1.parse)(data.hostname);
        const plugins = data.plugins.split(/(?::|;) */g);
        socket.close();
        if (socket.hasRemainingData()) {
          throw new Error("Server sent more data than expected");
        }
        clearTimeout(timeout2);
        resolve({
          motd: {
            raw: (0, minecraft_motd_util_1.format)(motd),
            clean: (0, minecraft_motd_util_1.clean)(motd),
            html: (0, minecraft_motd_util_1.toHTML)(motd)
          },
          version: data.version,
          software: plugins[0],
          plugins: plugins.slice(1),
          map: data.map,
          players: {
            online: parseInt(data.numplayers),
            max: parseInt(data.maxplayers),
            list: players
          },
          hostIP: data.hostip,
          hostPort: parseInt(data.hostport)
        });
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
queryFull$1.queryFull = queryFull;
var scanLAN$1 = {};
var __awaiter$3 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$3 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(scanLAN$1, "__esModule", { value: true });
scanLAN$1.scanLAN = void 0;
const assert_1$3 = __importDefault$3(require$$0$1);
const dgram_1 = __importDefault$3(require$$0__default);
const util_1$2 = require$$2;
const decoder = new util_1$2.TextDecoder("utf8");
const pattern = /\[MOTD\](.*)\[\/MOTD\]\[AD\](\d{1,5})\[\/AD\]/;
function scanLAN(options) {
  (0, assert_1$3.default)(typeof options === "object" || typeof options === "undefined", `Expected 'options' to be an 'object' or 'undefined', got '${typeof options}'`);
  if (typeof options === "object") {
    (0, assert_1$3.default)(typeof options.scanTime === "number" || typeof options.scanTime === "undefined", `Expected 'options.scanTime' to be a 'number' or 'undefined', got '${typeof options.scanTime}'`);
    if (typeof options.scanTime === "number") {
      (0, assert_1$3.default)(options.scanTime > 0, `Expected 'options.scanTime' to be greater than or equal to 0, got '${options.scanTime}'`);
    }
  }
  const servers = [];
  const socket = dgram_1.default.createSocket("udp4");
  socket.on("message", (message, info) => {
    const match = decoder.decode(message).match(pattern);
    if (!match || match.length < 3)
      return;
    let port = parseInt(match[2]);
    if (isNaN(port))
      port = 25565;
    if (servers.some((server) => server.host === info.address && server.port === port))
      return;
    servers.push({
      host: info.address,
      port,
      motd: match[1]
    });
  });
  socket.bind(4445, () => {
    socket.addMembership("224.0.2.60");
  });
  return new Promise((resolve, reject) => {
    var _a;
    const timeout2 = setTimeout(() => __awaiter$3(this, void 0, void 0, function* () {
      yield new Promise((resolve2) => socket.close(resolve2));
      resolve(servers);
    }), (_a = options === null || options === void 0 ? void 0 : options.scanTime) !== null && _a !== void 0 ? _a : 1e3 * 5);
    socket.on("error", (error) => {
      socket.close();
      clearTimeout(timeout2);
      reject(error);
    });
  });
}
scanLAN$1.scanLAN = scanLAN;
var sendVote$1 = {};
var __awaiter$2 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$2 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(sendVote$1, "__esModule", { value: true });
sendVote$1.sendVote = void 0;
const assert_1$2 = __importDefault$2(require$$0$1);
const crypto_1$1 = __importDefault$2(require$$1);
const util_1$1 = require$$2;
const TCPClient_1$2 = __importDefault$2(TCPClient$1);
const encoder$1 = new util_1$1.TextEncoder();
function sendVote(host, port = 8192, options) {
  host = host.trim();
  (0, assert_1$2.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$2.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$2.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$2.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$2.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$2.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$2.default)(typeof options === "object", `Expected 'options' to be an 'object', got '${typeof options}'`);
  (0, assert_1$2.default)(typeof options.username === "string", `Expected 'options.username' to be an 'string', got '${typeof options.username}'`);
  (0, assert_1$2.default)(options.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${options.username.length}`);
  (0, assert_1$2.default)(typeof options.token === "string", `Expected 'options.token' to be an 'string', got '${typeof options.token}'`);
  (0, assert_1$2.default)(options.token.length > 1, `Expected 'options.token' to have a length greater than 0, got ${options.token.length}`);
  return new Promise((resolve, reject) => __awaiter$2(this, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    let socket = void 0;
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      socket = new TCPClient_1$2.default();
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      let challengeToken;
      {
        const version = yield socket.readStringUntil(10);
        const split = version.split(" ");
        if (split[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + version);
        if (split[1] !== "2")
          throw new Error("Unsupported Votifier version: " + split[1]);
        challengeToken = split[2];
      }
      {
        const payload = {
          serviceName: (_c = options.serviceName) !== null && _c !== void 0 ? _c : "minecraft-server-util (https://github.com/PassTheMayo/minecraft-server-util)",
          username: options.username,
          address: (_d = options.address) !== null && _d !== void 0 ? _d : host + ":" + port,
          timestamp: (_e = options.timestamp) !== null && _e !== void 0 ? _e : Date.now(),
          challenge: challengeToken
        };
        if (options.uuid) {
          payload.uuid = options.uuid;
        }
        const payloadSerialized = JSON.stringify(payload);
        const message = {
          payload: payloadSerialized,
          signature: crypto_1$1.default.createHmac("sha256", options.token).update(payloadSerialized).digest("base64")
        };
        const messageSerialized = JSON.stringify(message);
        const messageBytes = encoder$1.encode(messageSerialized);
        socket.writeInt16BE(29498);
        socket.writeInt16BE(messageBytes.byteLength);
        socket.writeBytes(messageBytes);
        yield socket.flush(false);
      }
      {
        const responseString = yield socket.readStringUntil(10);
        const response = JSON.parse(responseString);
        socket.close();
        clearTimeout(timeout2);
        switch (response.status) {
          case "ok": {
            resolve();
            break;
          }
          case "error": {
            reject(new Error(response.cause + ": " + response.error));
            break;
          }
          default: {
            reject(new Error("Server sent an unknown response: " + responseString));
            break;
          }
        }
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
sendVote$1.sendVote = sendVote;
var sendLegacyVote$1 = {};
var __awaiter$1 = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault$1 = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(sendLegacyVote$1, "__esModule", { value: true });
sendLegacyVote$1.sendLegacyVote = void 0;
const assert_1$1 = __importDefault$1(require$$0$1);
const crypto_1 = __importDefault$1(require$$1);
const TCPClient_1$1 = __importDefault$1(TCPClient$1);
const wordwrap = (str, size) => str.replace(new RegExp(`(?![^\\n]{1,${size}}$)([^\\n]{1,${size}})\\s`, "g"), "$1\n");
function sendLegacyVote(host, port = 8192, options) {
  host = host.trim();
  options.key = options.key.replace(/ /g, "+");
  options.key = wordwrap(options.key, 65);
  (0, assert_1$1.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
  (0, assert_1$1.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
  (0, assert_1$1.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
  (0, assert_1$1.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
  (0, assert_1$1.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
  (0, assert_1$1.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
  (0, assert_1$1.default)(typeof options === "object", `Expected 'options' to be an 'object', got '${typeof options}'`);
  (0, assert_1$1.default)(typeof options.username === "string", `Expected 'options.username' to be an 'string', got '${typeof options.username}'`);
  (0, assert_1$1.default)(options.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${options.username.length}`);
  (0, assert_1$1.default)(typeof options.key === "string", `Expected 'options.key' to be an 'string', got '${typeof options.key}'`);
  (0, assert_1$1.default)(options.key.length > 1, `Expected 'options.key' to have a length greater than 0, got ${options.key.length}`);
  return new Promise((resolve, reject) => __awaiter$1(this, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    let socket = void 0;
    const timeout2 = setTimeout(() => {
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(new Error("Server is offline or unreachable"));
    }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
    try {
      socket = new TCPClient_1$1.default();
      yield socket.connect({ host, port, timeout: (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 1e3 * 5 });
      {
        const version = yield socket.readStringUntil(10);
        const split = version.split(" ");
        if (split[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + version);
      }
      {
        const timestamp = (_c = options.timestamp) !== null && _c !== void 0 ? _c : Date.now();
        const address = (_d = options.address) !== null && _d !== void 0 ? _d : host + ":" + port;
        const publicKey = `-----BEGIN PUBLIC KEY-----
${options.key}
-----END PUBLIC KEY-----
`;
        const vote = `VOTE
${options.serviceName}
${options.username}
${address}
${timestamp}
`;
        const encryptedPayload = crypto_1.default.publicEncrypt({
          key: publicKey,
          padding: crypto_1.default.constants.RSA_PKCS1_PADDING
        }, Buffer.from(vote));
        socket.writeBytes(encryptedPayload);
        yield socket.flush(false);
      }
      {
        clearTimeout(timeout2);
        socket.close();
        resolve();
      }
    } catch (e) {
      clearTimeout(timeout2);
      socket === null || socket === void 0 ? void 0 : socket.close();
      reject(e);
    }
  }));
}
sendLegacyVote$1.sendLegacyVote = sendLegacyVote;
var RCON$1 = {};
var __awaiter = commonjsGlobal && commonjsGlobal.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function(mod) {
  return mod && mod.__esModule ? mod : { "default": mod };
};
Object.defineProperty(RCON$1, "__esModule", { value: true });
RCON$1.RCON = void 0;
const assert_1 = __importDefault(require$$0$1);
const events_1 = require$$1$1;
const util_1 = require$$2;
const TCPClient_1 = __importDefault(TCPClient$1);
const encoder = new util_1.TextEncoder();
class RCON extends events_1.EventEmitter {
  constructor() {
    super();
    this.isLoggedIn = false;
    this.socket = null;
    this.requestID = 0;
  }
  get isConnected() {
    return this.socket && this.socket.isConnected || false;
  }
  connect(host, port = 25575, options = {}) {
    (0, assert_1.default)(typeof host === "string", `Expected 'host' to be a 'string', got '${typeof host}'`);
    (0, assert_1.default)(host.length > 1, `Expected 'host' to have a length greater than 0, got ${host.length}`);
    (0, assert_1.default)(typeof port === "number", `Expected 'port' to be a 'number', got '${typeof port}'`);
    (0, assert_1.default)(Number.isInteger(port), `Expected 'port' to be an integer, got '${port}'`);
    (0, assert_1.default)(port >= 0, `Expected 'port' to be greater than or equal to 0, got '${port}'`);
    (0, assert_1.default)(port <= 65535, `Expected 'port' to be less than or equal to 65535, got '${port}'`);
    (0, assert_1.default)(typeof options === "object", `Expected 'options' to be an 'object', got '${typeof options}'`);
    return new Promise((resolve, reject) => {
      var _a;
      this.socket = new TCPClient_1.default();
      const timeout2 = setTimeout(() => {
        var _a2;
        reject(new Error("Server is offline or unreachable"));
        (_a2 = this.socket) === null || _a2 === void 0 ? void 0 : _a2.close();
      }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
      this.socket.connect(Object.assign({ host, port }, options)).then(() => {
        clearTimeout(timeout2);
        resolve();
      }).catch((error) => {
        clearTimeout(timeout2);
        reject(error);
      });
    });
  }
  login(password, options = {}) {
    (0, assert_1.default)(typeof password === "string", `Expected 'password' to be a 'string', got '${typeof password}'`);
    (0, assert_1.default)(password.length > 1, `Expected 'password' to have a length greater than 0, got ${password.length}`);
    (0, assert_1.default)(typeof options === "object", `Expected 'options' to be an 'object', got '${typeof options}'`);
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
      var _a;
      if (this.socket === null || !this.socket.isConnected)
        return reject(new Error("login() attempted before RCON has connected"));
      const timeout2 = setTimeout(() => {
        var _a2;
        reject(new Error("Server is offline or unreachable"));
        (_a2 = this.socket) === null || _a2 === void 0 ? void 0 : _a2.close();
      }, (_a = options === null || options === void 0 ? void 0 : options.timeout) !== null && _a !== void 0 ? _a : 1e3 * 5);
      this.isLoggedIn = false;
      const passwordBytes = encoder.encode(password);
      {
        this.socket.writeInt32LE(10 + passwordBytes.byteLength);
        this.socket.writeInt32LE(this.requestID++);
        this.socket.writeInt32LE(3);
        this.socket.writeBytes(passwordBytes);
        this.socket.writeBytes(Uint8Array.from([0, 0]));
        yield this.socket.flush(false);
      }
      {
        const packetLength = yield this.socket.readInt32LE();
        this.socket.ensureBufferedData(packetLength);
        const requestID = yield this.socket.readInt32LE();
        if (requestID === -1)
          reject(new Error("Invalid RCON password"));
        const packetType = yield this.socket.readInt32LE();
        if (packetType !== 2)
          reject(new Error("Expected server to send packet type 2, received " + packetType));
        yield this.socket.readBytes(2);
      }
      this.isLoggedIn = true;
      clearTimeout(timeout2);
      resolve();
      process.nextTick(() => __awaiter(this, void 0, void 0, function* () {
        while (this.socket !== null && this.socket.isConnected && this.isLoggedIn) {
          try {
            yield this._readPacket();
          } catch (e) {
            this.emit("error", e);
          }
        }
      }));
    }));
  }
  run(command) {
    return __awaiter(this, void 0, void 0, function* () {
      (0, assert_1.default)(typeof command === "string", `Expected 'command' to be a 'string', got '${typeof command}'`);
      (0, assert_1.default)(command.length > 0, `Expected 'command' to have a length greater than 0, got ${command.length}`);
      if (this.socket === null || !this.socket.isConnected)
        throw new Error("run() attempted before RCON has connected");
      if (!this.isLoggedIn)
        throw new Error("run() attempted before RCON has successfully logged in");
      const commandBytes = encoder.encode(command);
      const requestID = this.requestID++;
      this.socket.writeInt32LE(10 + commandBytes.byteLength);
      this.socket.writeInt32LE(requestID);
      this.socket.writeInt32LE(2);
      this.socket.writeBytes(commandBytes);
      this.socket.writeBytes(Uint8Array.from([0, 0]));
      yield this.socket.flush(false);
      return requestID;
    });
  }
  execute(command) {
    return __awaiter(this, void 0, void 0, function* () {
      (0, assert_1.default)(typeof command === "string", `Expected 'command' to be a 'string', got '${typeof command}'`);
      (0, assert_1.default)(command.length > 1, `Expected 'command' to have a length greater than 0, got ${command.length}`);
      const requestID = yield this.run(command);
      return new Promise((resolve) => {
        const listenerFunc = (data) => {
          if (data.requestID !== requestID)
            return;
          this.removeListener("message", listenerFunc);
          resolve(data.message);
        };
        this.on("message", listenerFunc);
      });
    });
  }
  _readPacket() {
    return __awaiter(this, void 0, void 0, function* () {
      if (this.socket === null || !this.socket.isConnected || !this.isLoggedIn)
        return Promise.reject(new Error("Attempted to read packet when socket was disconnected or RCON was not logged in"));
      const packetLength = yield this.socket.readInt32LE();
      yield this.socket.ensureBufferedData(packetLength);
      const requestID = yield this.socket.readInt32LE();
      const packetType = yield this.socket.readInt32LE();
      if (packetType === 0) {
        const message = yield this.socket.readStringNT();
        yield this.socket.readBytes(1);
        this.emit("message", { requestID, message });
      } else {
        yield this.socket.readBytes(packetLength - 8);
      }
    });
  }
  close() {
    var _a;
    (_a = this.socket) === null || _a === void 0 ? void 0 : _a.close();
  }
}
RCON$1.RCON = RCON;
var parseAddress$1 = {};
Object.defineProperty(parseAddress$1, "__esModule", { value: true });
parseAddress$1.parseAddress = void 0;
const addressMatch = /^([^:]+)(?::(\d{1,5}))?$/;
function parseAddress(value, defaultPort = 25565) {
  const match = value.match(addressMatch);
  if (!match)
    return null;
  const port = match[2] ? parseInt(match[2]) : defaultPort;
  if (isNaN(port) || port < 1 || port > 65535)
    return null;
  return {
    host: match[1],
    port
  };
}
parseAddress$1.parseAddress = parseAddress;
var BedrockStatusOptions = {};
Object.defineProperty(BedrockStatusOptions, "__esModule", { value: true });
var BedrockStatusResponse = {};
Object.defineProperty(BedrockStatusResponse, "__esModule", { value: true });
var JavaStatusFE01FAResponse = {};
Object.defineProperty(JavaStatusFE01FAResponse, "__esModule", { value: true });
var JavaStatusFE01Response = {};
Object.defineProperty(JavaStatusFE01Response, "__esModule", { value: true });
var JavaStatusFEResponse = {};
Object.defineProperty(JavaStatusFEResponse, "__esModule", { value: true });
var JavaStatusLegacyResponse = {};
Object.defineProperty(JavaStatusLegacyResponse, "__esModule", { value: true });
var JavaStatusOptions = {};
Object.defineProperty(JavaStatusOptions, "__esModule", { value: true });
var JavaStatusResponse = {};
Object.defineProperty(JavaStatusResponse, "__esModule", { value: true });
var QueryOptions = {};
Object.defineProperty(QueryOptions, "__esModule", { value: true });
var SendVoteOptions = {};
Object.defineProperty(SendVoteOptions, "__esModule", { value: true });
var SendLegacyVoteOptions = {};
Object.defineProperty(SendLegacyVoteOptions, "__esModule", { value: true });
var SRVRecord = {};
Object.defineProperty(SRVRecord, "__esModule", { value: true });
(function(exports$1) {
  var __createBinding = commonjsGlobal && commonjsGlobal.__createBinding || (Object.create ? function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() {
        return m[k];
      } };
    }
    Object.defineProperty(o, k2, desc);
  } : function(o, m, k, k2) {
    if (k2 === void 0) k2 = k;
    o[k2] = m[k];
  });
  var __exportStar = commonjsGlobal && commonjsGlobal.__exportStar || function(m, exports$12) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports$12, p)) __createBinding(exports$12, m, p);
  };
  Object.defineProperty(exports$1, "__esModule", { value: true });
  __exportStar(status$1, exports$1);
  __exportStar(statusFE$1, exports$1);
  __exportStar(statusFE01$1, exports$1);
  __exportStar(statusFE01FA$1, exports$1);
  __exportStar(statusLegacy$1, exports$1);
  __exportStar(statusBedrock$1, exports$1);
  __exportStar(queryBasic$1, exports$1);
  __exportStar(queryFull$1, exports$1);
  __exportStar(scanLAN$1, exports$1);
  __exportStar(sendVote$1, exports$1);
  __exportStar(sendLegacyVote$1, exports$1);
  __exportStar(RCON$1, exports$1);
  __exportStar(parseAddress$1, exports$1);
  __exportStar(BedrockStatusOptions, exports$1);
  __exportStar(BedrockStatusResponse, exports$1);
  __exportStar(JavaStatusFE01FAResponse, exports$1);
  __exportStar(JavaStatusFE01Response, exports$1);
  __exportStar(JavaStatusFEResponse, exports$1);
  __exportStar(JavaStatusLegacyResponse, exports$1);
  __exportStar(JavaStatusOptions, exports$1);
  __exportStar(JavaStatusResponse, exports$1);
  __exportStar(QueryOptions, exports$1);
  __exportStar(SendVoteOptions, exports$1);
  __exportStar(SendLegacyVoteOptions, exports$1);
  __exportStar(SRVRecord, exports$1);
})(dist$1);
async function getMinecraftServerStatus(host, port, timeout2 = 5e3) {
  try {
    const result = await dist$1.status(host, port, { timeout: timeout2 });
    return result;
  } catch (error) {
    console.error(`获取 Minecraft 服务器状态失败: ${error}`);
    throw error;
  }
}
class Locked extends Error {
  constructor(port) {
    super(`${port} is locked`);
  }
}
const lockedPorts = {
  old: /* @__PURE__ */ new Set(),
  young: /* @__PURE__ */ new Set()
};
const releaseOldLockedPortsIntervalMs = 1e3 * 15;
let timeout;
const getLocalHosts = () => {
  const interfaces = os$1.networkInterfaces();
  const results = /* @__PURE__ */ new Set([void 0, "0.0.0.0"]);
  for (const _interface of Object.values(interfaces)) {
    for (const config2 of _interface) {
      results.add(config2.address);
    }
  }
  return results;
};
const checkAvailablePort = (options) => new Promise((resolve, reject) => {
  const server = net$1.createServer();
  server.unref();
  server.on("error", reject);
  server.listen(options, () => {
    const { port } = server.address();
    server.close(() => {
      resolve(port);
    });
  });
});
const getAvailablePort = async (options, hosts) => {
  if (options.host || options.port === 0) {
    return checkAvailablePort(options);
  }
  for (const host of hosts) {
    try {
      await checkAvailablePort({ port: options.port, host });
    } catch (error) {
      if (!["EADDRNOTAVAIL", "EINVAL"].includes(error.code)) {
        throw error;
      }
    }
  }
  return options.port;
};
const portCheckSequence = function* (ports) {
  if (ports) {
    yield* ports;
  }
  yield 0;
};
async function getPorts(options) {
  let ports;
  let exclude = /* @__PURE__ */ new Set();
  if (options) {
    if (options.port) {
      ports = typeof options.port === "number" ? [options.port] : options.port;
    }
    if (options.exclude) {
      const excludeIterable = options.exclude;
      if (typeof excludeIterable[Symbol.iterator] !== "function") {
        throw new TypeError("The `exclude` option must be an iterable.");
      }
      for (const element of excludeIterable) {
        if (typeof element !== "number") {
          throw new TypeError("Each item in the `exclude` option must be a number corresponding to the port you want excluded.");
        }
        if (!Number.isSafeInteger(element)) {
          throw new TypeError(`Number ${element} in the exclude option is not a safe integer and can't be used`);
        }
      }
      exclude = new Set(excludeIterable);
    }
  }
  if (timeout === void 0) {
    timeout = setTimeout(() => {
      timeout = void 0;
      lockedPorts.old = lockedPorts.young;
      lockedPorts.young = /* @__PURE__ */ new Set();
    }, releaseOldLockedPortsIntervalMs);
    if (timeout.unref) {
      timeout.unref();
    }
  }
  const hosts = getLocalHosts();
  for (const port of portCheckSequence(ports)) {
    try {
      if (exclude.has(port)) {
        continue;
      }
      let availablePort = await getAvailablePort({ ...options, port }, hosts);
      while (lockedPorts.old.has(availablePort) || lockedPorts.young.has(availablePort)) {
        if (port !== 0) {
          throw new Locked(port);
        }
        availablePort = await getAvailablePort({ ...options, port }, hosts);
      }
      lockedPorts.young.add(availablePort);
      return availablePort;
    } catch (error) {
      if (!["EADDRINUSE", "EACCES"].includes(error.code) && !(error instanceof Locked)) {
        throw error;
      }
    }
  }
  throw new Error("No available ports found");
}
function portNumbers(from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    throw new TypeError("`from` and `to` must be integer numbers");
  }
  const generator = function* (from2, to2) {
    for (let port = from2; port <= to2; port++) {
      yield port;
    }
  };
  return generator(from, to);
}
class MinecraftLanProxy {
  constructor(config2) {
    __publicField(this, "config");
    __publicField(this, "udpClient", null);
    __publicField(this, "tcpServer", null);
    __publicField(this, "broadcastTimer", null);
    __publicField(this, "activeConnections", /* @__PURE__ */ new Set());
    this.config = config2;
  }
  async start() {
    const port = await getPorts({ port: portNumbers(2e4, 65535) });
    if (!this.config.localPort) {
      this.config.localPort = port;
      console.log(`使用随机端口 ${port}`);
    }
    return new Promise((resolve, reject) => {
      this.startWithRetry(resolve, reject);
    });
  }
  /**
  * 内部递归启动函数
  */
  startWithRetry(resolve, reject) {
    try {
      this.cleanupTempResources();
      this.startTcpProxy(
        () => {
          this.startUdpBroadcaster();
          resolve();
        },
        async (err) => {
          if (err.code === "EADDRINUSE") {
            console.warn(`[*] 端口 ${this.config.localPort} 被占用，尝试自动递增...`);
            this.config.localPort += 1;
            if (this.config.localPort > 65535) {
              this.config.localPort = 2e4;
            }
            setTimeout(() => this.startWithRetry(resolve, reject), 10);
          } else {
            reject(err);
          }
        }
      );
    } catch (err) {
      reject(err);
    }
  }
  startUdpBroadcaster() {
    const MCAST_GRP = "224.0.2.60";
    const MCAST_PORT = 4445;
    const message = Buffer.from(`[MOTD]${this.config.fakeMotd}[/MOTD][AD]${this.config.localPort}[/AD]`);
    this.udpClient = require$$0.createSocket({ type: "udp4", reuseAddr: true });
    this.udpClient.on("error", (err) => console.error(`[UDP Error] ${err.message}`));
    this.broadcastTimer = setInterval(() => {
      if (this.udpClient) {
        this.udpClient.send(message, 0, message.length, MCAST_PORT, MCAST_GRP);
      }
    }, 1500);
    console.log(`[*] ID: ${this.config.id} UDP 广播已启动`);
  }
  startTcpProxy(resolve, reject) {
    this.tcpServer = net.createServer((clientSocket) => {
      const remoteSocket = new net.Socket();
      this.activeConnections.add(clientSocket);
      this.activeConnections.add(remoteSocket);
      const closeSockets = () => {
        clientSocket.destroy();
        remoteSocket.destroy();
        this.activeConnections.delete(clientSocket);
        this.activeConnections.delete(remoteSocket);
      };
      clientSocket.pause();
      remoteSocket.connect(this.config.remotePort, this.config.remoteHost, () => {
        clientSocket.resume();
        clientSocket.pipe(remoteSocket);
        remoteSocket.pipe(clientSocket);
      });
      clientSocket.once("data", (data) => {
        try {
          const strData = data.toString("utf8", 0, 100);
          const match = strData.match(/[a-zA-Z0-9_]{3,16}/);
          if (match) {
            console.log(`[*] 识别到可能的玩家名: ${match[0]}`);
          }
        } catch (e) {
        }
      });
      clientSocket.on("error", closeSockets);
      remoteSocket.on("error", closeSockets);
      clientSocket.on("close", closeSockets);
      remoteSocket.on("close", closeSockets);
      clientSocket.setTimeout(3e4);
      clientSocket.on("timeout", () => {
        console.log(`[Proxy] 连接超时已切断`);
        closeSockets();
      });
    });
    this.tcpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        reject(new Error(`端口 ${this.config.localPort} 已被占用`));
      } else {
        reject(err);
      }
    });
    this.tcpServer.listen(this.config.localPort, "0.0.0.0", () => {
      console.log(`[*] TCP 代理就绪: ${this.config.localPort} -> ${this.config.remoteHost}`);
      resolve();
    });
  }
  stop() {
    var _a, _b;
    if (this.broadcastTimer) clearInterval(this.broadcastTimer);
    (_a = this.udpClient) == null ? void 0 : _a.close();
    (_b = this.tcpServer) == null ? void 0 : _b.close(() => {
      console.log(`[*] 代理实例 ${this.config.id} 已完全停止`);
    });
    for (const socket of this.activeConnections) {
      socket.destroy();
    }
    this.activeConnections.clear();
  }
  /**
   * 清理函数：确保递归重试时不会留下半开的服务器
   */
  cleanupTempResources() {
    if (this.broadcastTimer) {
      clearInterval(this.broadcastTimer);
      this.broadcastTimer = null;
    }
    if (this.udpClient) {
      this.udpClient.close();
      this.udpClient = null;
    }
  }
}
class ProxyManager {
  constructor() {
    __publicField(this, "instances", /* @__PURE__ */ new Map());
  }
  init() {
    ipcMain.on("mcproxy:start", async (event, config2) => {
      if (this.instances.has(config2.id)) {
        event.reply("mcproxy:status", { id: config2.id, success: false, message: "该 ID 的实例已在运行", localPort: config2.localPort });
        return;
      }
      const proxy = new MinecraftLanProxy(config2);
      try {
        await proxy.start();
        this.instances.set(config2.id, proxy);
        event.reply("mcproxy:status", { id: config2.id, success: true, message: "启动成功", localPort: config2.localPort });
      } catch (err) {
        event.reply("mcproxy:status", { id: config2.id, success: false, message: err.message });
      }
    });
    ipcMain.on("mcproxy:stop", (event, id) => {
      const proxy = this.instances.get(id);
      if (proxy) {
        proxy.stop();
        this.instances.delete(id);
        event.reply("mcproxy:status", { id, success: false, message: "已停止" });
      }
    });
  }
}
const proxyManager = new ProxyManager();
const config = new Config();
const downloader = new SakuraFrpDownloader();
proxyManager.init();
function loadIcpMain(ipcMain2, win2) {
  const frpc = new SakuraFrpcManager(win2);
  ipcMain2.handle("network:tcp", async (_event, host, port) => {
    const targetPort = parseInt(String(port), 10);
    const targetHost = String(host || "").trim();
    if (isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
      console.error(`无效的端口: ${port}`);
      return -1;
    }
    if (!targetHost) {
      console.error(`无效的地址: ${host}`);
      return -1;
    }
    return new Promise((resolve) => {
      const socket = new net__default.Socket();
      const start = Date.now();
      socket.setTimeout(2e3);
      socket.connect({ port: targetPort, host: targetHost }, () => {
        const delay = Date.now() - start;
        socket.destroy();
        resolve(delay);
      });
      const handleError = () => {
        socket.destroy();
        resolve(-1);
      };
      socket.on("error", handleError);
      socket.on("timeout", handleError);
    });
  });
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
  ipcMain2.handle(
    "frp:natfrp.tunnelEdit",
    async (_event, token, tunnel_id, local_port) => {
      return await NatFrp.tunnelEdit(token, tunnel_id, local_port);
    }
  );
  ipcMain2.handle("frpc:start", (_, token, tunnelId) => {
    frpc.startTunnel(token, tunnelId);
    return true;
  });
  ipcMain2.handle("frpc:stop", (_, tunnelId) => {
    frpc.stopTunnel(tunnelId);
    return true;
  });
  ipcMain2.handle("sakurafrp:exists", () => {
    return downloader.exists();
  });
  ipcMain2.handle("sakurafrp:download", async (event) => {
    const data = await NatFrp.clients();
    const info = getLatestWindowsSakuraFrp(data);
    await downloader.download(
      info.url,
      info.hash,
      (percent) => {
        event.sender.send("sakurafrp:progress", percent);
      }
    );
    return {
      version: info.version,
      path: downloader.filePath
    };
  });
  ipcMain2.handle("minecraft:detect", async () => {
    return await MinecraftDetector.detectAll();
  });
  ipcMain2.handle(
    "minecraft:status",
    async (_event, host, port, timeout2) => {
      return await getMinecraftServerStatus(host, port, timeout2);
    }
  );
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
