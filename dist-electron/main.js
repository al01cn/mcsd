var an = Object.defineProperty;
var sn = (n, t, e) => t in n ? an(n, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : n[t] = e;
var y = (n, t, e) => sn(n, typeof t != "symbol" ? t + "" : t, e);
import Lt, { app as H, ipcMain as Ie, shell as cn, BrowserWindow as mr } from "electron";
import { fileURLToPath as ln } from "node:url";
import Y from "node:path";
import F from "path";
import B from "fs";
import { webcrypto as At } from "node:crypto";
import un, { exec as dn, spawn as fn } from "child_process";
import le from "os";
import Q, { promisify as hn } from "util";
import vr from "https";
import Le from "crypto";
import ue from "events";
import pn from "http";
import D from "assert";
import * as Rt from "net";
import wr from "net";
import gn from "dns";
import * as yn from "dgram";
import br from "dgram";
import mn from "node:net";
import vn from "node:os";
const wn = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", bn = 128;
let X, ie;
function En(n) {
  !X || X.length < n ? (X = Buffer.allocUnsafe(n * bn), At.getRandomValues(X), ie = 0) : ie + n > X.length && (At.getRandomValues(X), ie = 0), ie += n;
}
function Er(n = 21) {
  En(n |= 0);
  let t = "";
  for (let e = ie - n; e < ie; e++)
    t += wn[X[e] & 63];
  return t;
}
class _n {
  constructor() {
    y(this, "name", "config");
    y(this, "dataDir");
    y(this, "configPath");
    this.dataDir = F.join(H.getPath("userData"), "data"), this.configPath = F.join(this.dataDir, "config.json"), this.ensure();
  }
  /* ---------- Init ---------- */
  ensure() {
    if (B.existsSync(this.dataDir) || B.mkdirSync(this.dataDir, { recursive: !0 }), !B.existsSync(this.configPath)) {
      const t = {
        platforms: []
      };
      this.write(t);
    }
  }
  /* ---------- Base IO ---------- */
  read() {
    try {
      const t = B.readFileSync(this.configPath, "utf-8"), e = JSON.parse(t);
      return { platforms: (Array.isArray(
        e.platforms
      ) ? e.platforms : []).map((r) => ({
        nanoid: r.nanoid,
        platform: r.platform,
        secret: r.secret,
        enabled: typeof r.enabled == "boolean" ? r.enabled : !0
      })) };
    } catch {
      return { platforms: [] };
    }
  }
  write(t) {
    B.writeFileSync(
      this.configPath,
      JSON.stringify(t, null, 2),
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
    return this.read().platforms.filter((t) => t.enabled);
  }
  getPlatform(t) {
    return this.read().platforms.find((e) => e.nanoid === t);
  }
  addPlatform(t) {
    const e = this.read(), i = {
      nanoid: Er(),
      platform: t.platform,
      secret: t.secret,
      enabled: !0
    };
    return e.platforms.push(i), this.write(e), i;
  }
  updatePlatform(t, e) {
    const i = this.read(), s = i.platforms.find((r) => r.nanoid === t);
    s && (Object.assign(s, e), this.write(i));
  }
  /** 快捷启用 */
  enablePlatform(t) {
    this.updatePlatform(t, { enabled: !0 });
  }
  /** 快捷禁用 */
  disablePlatform(t) {
    this.updatePlatform(t, { enabled: !1 });
  }
  removePlatform(t) {
    const e = this.read();
    e.platforms = e.platforms.filter((i) => i.nanoid !== t), this.write(e);
  }
}
var $e = new Headers();
$e.append("accept", "application/json");
$e.append("Content-Type", "application/json");
function xn() {
  return "mc-" + Er(8).toString();
}
class G {
  static async userInfo(t) {
    const e = await fetch(`${this.api_url}/user/info?token=${t}`, {
      method: "GET"
    });
    return e.ok ? await e.json() : null;
  }
  static async clients() {
    return await (await fetch(`${this.api_url}/system/clients`, {
      method: "GET"
    })).json();
  }
  static async tunnelInfo(t) {
    const e = await fetch(`${this.api_url}/tunnels?token=${t}`, {
      method: "GET"
    });
    return e.ok ? await e.json() : null;
  }
  static async nodes(t) {
    const e = await fetch(`${this.api_url}/nodes?token=${t}`, {
      method: "GET"
    });
    return e.ok ? await e.json() : null;
  }
  static async nodeStats(t) {
    const e = await fetch(`${this.api_url}/node/stats?token=${t}`, {
      method: "GET"
    });
    return e.ok ? (await e.json()).nodes : null;
  }
  // 合并节点信息和状态
  static async getMergedNodes(t) {
    const e = await this.nodes(t), i = await this.nodeStats(t);
    return !e || !i ? null : i.map((r) => {
      const o = e[r.id];
      return o ? { ...o, ...r } : r;
    });
  }
  static async tunnelCreate(t, e, i) {
    const r = {
      name: xn(),
      type: "tcp",
      node: e,
      local_ip: "127.0.0.1",
      local_port: i
    }, o = await fetch(`${this.api_url}/tunnels?token=${t}`, {
      method: "POST",
      headers: $e,
      body: JSON.stringify(r)
    });
    return o.ok ? await o.json() : await o.json();
  }
  static async tunnelEdit(t, e, i) {
    const s = {
      id: Number(e),
      local_port: i
    };
    return (await fetch(`${this.api_url}/tunnel/edit?token=${t}`, {
      method: "POST",
      headers: $e,
      body: JSON.stringify(s)
    })).ok ? !0 : null;
  }
}
y(G, "api_url", "https://api.natfrp.com/v4");
const Ot = hn(dn);
class xe {
  static async runCMD(t) {
    try {
      const { stdout: e } = await Ot(`chcp 65001 > nul && ${t}`, {
        windowsHide: !0,
        maxBuffer: 52428800
      });
      return e;
    } catch {
      return "";
    }
  }
  static async runPowerShell(t) {
    const i = [
      `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
      `${process.env["ProgramFiles(x86)"]}\\PowerShell\\7\\pwsh.exe`,
      "pwsh"
    ].find((r) => B.existsSync(r)) || "powershell", s = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${t}`;
    try {
      const { stdout: r } = await Ot(`"${i}" -NoProfile -Command "${s.replace(/"/g, '\\"')}"`, {
        windowsHide: !0,
        encoding: "utf8",
        // 确保 Node.js 用 UTF8 解码
        maxBuffer: 52428800
      });
      return r;
    } catch {
      return "";
    }
  }
  static parseModLoader(t = "") {
    var i;
    const e = t.match(/--fml\.neoForgeVersion\s+([^\s]+)/i) || t.match(/neoforge-([\d\.]+)/i);
    if (e || t.includes("net.neoforged"))
      return { loader: "NeoForge", loaderVersion: (i = e == null ? void 0 : e[1]) == null ? void 0 : i.replace(/[\s.]+$/, "") };
    if (t.includes("net.fabricmc.loader")) {
      const s = t.match(/fabric-loader-([\d\.]+)/i);
      return { loader: "Fabric", loaderVersion: s == null ? void 0 : s[1] };
    }
    if (t.includes("org.quiltmc.loader")) {
      const s = t.match(/quilt-loader-([\d\.]+)/i);
      return { loader: "Quilt", loaderVersion: s == null ? void 0 : s[1] };
    }
    if (t.includes("fml.loading.FMLClientLaunchProvider") || /FMLClientTweaker/i.test(t)) {
      const s = t.match(/forge-(\d+\.\d+\.\d+)/i);
      return { loader: "Forge", loaderVersion: s == null ? void 0 : s[1] };
    }
    return { loader: "Vanilla" };
  }
  static parseLoginInfo(t) {
    const e = this.getArgValue(t, "--username"), i = this.getArgValue(t, "--uuid"), s = this.getArgValue(t, "--accessToken"), r = this.getArgValue(t, "--versionType");
    let o = "offline", a;
    const c = t.match(/authlib-injector[^\s=]*=([^"\s]+)/);
    if (s)
      if (this.isMojangToken(s))
        o = "msa";
      else if (c) {
        o = "custom";
        try {
          a = new URL(c[1]).hostname;
        } catch {
          a = c[1];
        }
      } else
        o = "offline";
    else
      o = "other";
    return { username: e, uuid: i, loginType: o, provider: a, versionType: r };
  }
  static parseVersion(t) {
    var e, i;
    return ((e = t.match(/--version\s+([\d\.\-\w]+)/)) == null ? void 0 : e[1]) || ((i = t.match(/--assetIndex\s+([^\s]+)/)) == null ? void 0 : i[1]);
  }
  /**
  * 提取参数值并移除首尾引号
  * @param cmd 完整的命令行字符串
  * @param argName 参数名称，如 '--versionType'
  */
  static getArgValue(t, e) {
    const i = new RegExp(`${e}\\s+(.*?)(?=\\s+--|$)`), s = t.match(i);
    return s ? s[1].trim().replace(/^["']|["']$/g, "") : void 0;
  }
  /**
   * 核心处理逻辑：去重与特征识别
   */
  static processRawResults(t, e) {
    var s;
    const i = /* @__PURE__ */ new Map();
    for (const r of t) {
      const o = r.CommandLine || "";
      if (!o || !(this.MC_MAIN_CLASSES.some((g) => o.includes(g)) || /minecraft/i.test(o))) continue;
      const c = this.parseLoginInfo(o), l = this.parseVersion(o), u = this.parseModLoader(o), d = o.match(/--gameDir\s+"?([^"\s]+)"?/), f = d ? d[1] : "default_dir", h = `${c.uuid || c.username}|${f}|${l}`, m = Array.from(new Set(
        e.filter(
          (g) => g.OwningProcess === r.ProcessId && g.LocalPort >= 1024 && (g.LocalAddress === "0.0.0.0" || g.LocalAddress === "::" || g.LocalAddress === "*")
        ).map((g) => g.LocalPort)
      )), v = {
        pid: r.ProcessId,
        java: r.Name,
        version: l,
        versionType: c.versionType,
        loader: u.loader,
        loaderVersion: (s = u.loaderVersion) == null ? void 0 : s.replace(/[\s._-]+$/, ""),
        username: c.username,
        uuid: c.uuid,
        loginType: c.loginType,
        provider: c.provider,
        // 将 provider 传入
        lanPorts: m,
        isLan: m.length > 0
      };
      if (i.has(h)) {
        const g = i.get(h);
        v.lanPorts.length > 0 && g.lanPorts.length === 0 && i.set(h, v);
      } else
        i.set(h, v);
    }
    return Array.from(i.values());
  }
  /**
   * 主检测方法
   */
  static async detectAll() {
    const t = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'java' } | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json", e = "Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess | ConvertTo-Json";
    try {
      const [i, s] = await Promise.all([
        this.runPowerShell(t),
        this.runPowerShell(e)
      ]), r = (c) => {
        if (!c.trim()) return [];
        try {
          const l = JSON.parse(c.replace(/^\uFEFF/, ""));
          return Array.isArray(l) ? l : [l];
        } catch {
          return [];
        }
      }, o = r(i), a = r(s);
      if (o.length === 0) throw new Error("No processes");
      return this.processRawResults(o, a);
    } catch {
      return this.detectAllByCMD();
    }
  }
  /**
   * WMIC 回退方案
   */
  static async detectAllByCMD() {
    const t = await this.runCMD(`wmic process where "name like 'java%'" get ProcessId,Name,CommandLine /FORMAT:CSV`), e = [], i = t.split(/\r?\n/).filter((a) => a.trim());
    for (let a = 1; a < i.length; a++) {
      const c = i[a].split(",");
      if (c.length < 4) continue;
      const l = parseInt(c[c.length - 2], 10), u = c[c.length - 3], d = c.slice(1, c.length - 3).join(",");
      isNaN(l) || e.push({ ProcessId: l, Name: u, CommandLine: d });
    }
    const s = await this.runCMD("netstat -ano -p tcp"), r = [], o = s.split(/\r?\n/);
    for (const a of o) {
      const c = a.trim().match(/^TCP\s+(0\.0\.0\.0|\[::\]):(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
      c && c[1] && c[2] && r.push({
        LocalAddress: c[1],
        LocalPort: parseInt(c[2], 10),
        OwningProcess: parseInt(c[3], 10)
      });
    }
    return this.processRawResults(e, r);
  }
}
y(xe, "MC_MAIN_CLASSES", [
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
]), y(xe, "MINECRAFT_DIR", F.join(le.homedir(), ".minecraft")), /**
 * 判断是否为 Minecraft 官方 (Mojang/Microsoft) 的 JWT Token
 */
y(xe, "isMojangToken", (t) => {
  try {
    const e = t.split(".");
    if (e.length !== 3) return !1;
    const i = typeof window < "u" ? atob(e[1].replace(/-/g, "+").replace(/_/g, "/")) : Buffer.from(e[1], "base64").toString(), s = JSON.parse(i), r = typeof s.xuid == "string", o = Array.isArray(s.pfd) && s.pfd.length > 0, a = s.iss === "authentication", c = "platform" in s;
    return r && o && (a || c);
  } catch {
    return !1;
  }
});
async function Sn(n) {
  try {
    const t = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${n}?unsigned=true`,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      }
    ), e = await t.json();
    return !t.ok || e.errorMessage ? {
      ok: !1,
      errorMessage: e.errorMessage || `HTTP ${t.status}`
    } : {
      ok: !0,
      data: e
    };
  } catch (t) {
    return {
      ok: !1,
      errorMessage: (t == null ? void 0 : t.message) || "Network error"
    };
  }
}
var p = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {};
function In(n) {
  return n && n.__esModule && Object.prototype.hasOwnProperty.call(n, "default") ? n.default : n;
}
var Se = { exports: {} }, We = { exports: {} }, Ct;
function _r() {
  return Ct || (Ct = 1, function(n) {
    let t = {};
    try {
      t = require("electron");
    } catch {
    }
    t.ipcRenderer && e(t), n.exports = e;
    function e({ contextBridge: i, ipcRenderer: s }) {
      if (!s)
        return;
      s.on("__ELECTRON_LOG_IPC__", (o, a) => {
        window.postMessage({ cmd: "message", ...a });
      }), s.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((o) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${o.message}`
      )));
      const r = {
        sendToMain(o) {
          try {
            s.send("__ELECTRON_LOG__", o);
          } catch (a) {
            console.error("electronLog.sendToMain ", a, "data:", o), s.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: a == null ? void 0 : a.message, stack: a == null ? void 0 : a.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...o) {
          r.sendToMain({ data: o, level: "info" });
        }
      };
      for (const o of ["error", "warn", "info", "verbose", "debug", "silly"])
        r[o] = (...a) => r.sendToMain({
          data: a,
          level: o
        });
      if (i && process.contextIsolated)
        try {
          i.exposeInMainWorld("__electronLog", r);
        } catch {
        }
      typeof window == "object" ? window.__electronLog = r : __electronLog = r;
    }
  }(We)), We.exports;
}
var Je = { exports: {} }, Ge, jt;
function $n() {
  if (jt) return Ge;
  jt = 1, Ge = n;
  function n(t) {
    return Object.defineProperties(e, {
      defaultLabel: { value: "", writable: !0 },
      labelPadding: { value: !0, writable: !0 },
      maxLabelLength: { value: 0, writable: !0 },
      labelLength: {
        get() {
          switch (typeof e.labelPadding) {
            case "boolean":
              return e.labelPadding ? e.maxLabelLength : 0;
            case "number":
              return e.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function e(i) {
      e.maxLabelLength = Math.max(e.maxLabelLength, i.length);
      const s = {};
      for (const r of t.levels)
        s[r] = (...o) => t.logData(o, { level: r, scope: i });
      return s.log = s.info, s;
    }
  }
  return Ge;
}
var Ke, Nt;
function Bn() {
  if (Nt) return Ke;
  Nt = 1;
  class n {
    constructor({ processMessage: e }) {
      this.processMessage = e, this.buffer = [], this.enabled = !1, this.begin = this.begin.bind(this), this.commit = this.commit.bind(this), this.reject = this.reject.bind(this);
    }
    addMessage(e) {
      this.buffer.push(e);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = !1, this.buffer.forEach((e) => this.processMessage(e)), this.buffer = [];
    }
    reject() {
      this.enabled = !1, this.buffer = [];
    }
  }
  return Ke = n, Ke;
}
var Ye, Mt;
function xr() {
  if (Mt) return Ye;
  Mt = 1;
  const n = $n(), t = Bn(), i = class i {
    constructor({
      allowUnknownLevel: r = !1,
      dependencies: o = {},
      errorHandler: a,
      eventLogger: c,
      initializeFn: l,
      isDev: u = !1,
      levels: d = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId: f,
      transportFactories: h = {},
      variables: m
    } = {}) {
      y(this, "dependencies", {});
      y(this, "errorHandler", null);
      y(this, "eventLogger", null);
      y(this, "functions", {});
      y(this, "hooks", []);
      y(this, "isDev", !1);
      y(this, "levels", null);
      y(this, "logId", null);
      y(this, "scope", null);
      y(this, "transports", {});
      y(this, "variables", {});
      this.addLevel = this.addLevel.bind(this), this.create = this.create.bind(this), this.initialize = this.initialize.bind(this), this.logData = this.logData.bind(this), this.processMessage = this.processMessage.bind(this), this.allowUnknownLevel = r, this.buffering = new t(this), this.dependencies = o, this.initializeFn = l, this.isDev = u, this.levels = d, this.logId = f, this.scope = n(this), this.transportFactories = h, this.variables = m || {};
      for (const v of this.levels)
        this.addLevel(v, !1);
      this.log = this.info, this.functions.log = this.log, this.errorHandler = a, a == null || a.setOptions({ ...o, logFn: this.error }), this.eventLogger = c, c == null || c.setOptions({ ...o, logger: this });
      for (const [v, g] of Object.entries(h))
        this.transports[v] = g(this, o);
      i.instances[f] = this;
    }
    static getInstance({ logId: r }) {
      return this.instances[r] || this.instances.default;
    }
    addLevel(r, o = this.levels.length) {
      o !== !1 && this.levels.splice(o, 0, r), this[r] = (...a) => this.logData(a, { level: r }), this.functions[r] = this[r];
    }
    catchErrors(r) {
      return this.processMessage(
        {
          data: ["log.catchErrors is deprecated. Use log.errorHandler instead"],
          level: "warn"
        },
        { transports: ["console"] }
      ), this.errorHandler.startCatching(r);
    }
    create(r) {
      return typeof r == "string" && (r = { logId: r }), new i({
        dependencies: this.dependencies,
        errorHandler: this.errorHandler,
        initializeFn: this.initializeFn,
        isDev: this.isDev,
        transportFactories: this.transportFactories,
        variables: { ...this.variables },
        ...r
      });
    }
    compareLevels(r, o, a = this.levels) {
      const c = a.indexOf(r), l = a.indexOf(o);
      return l === -1 || c === -1 ? !0 : l <= c;
    }
    initialize(r = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...r });
    }
    logData(r, o = {}) {
      this.buffering.enabled ? this.buffering.addMessage({ data: r, date: /* @__PURE__ */ new Date(), ...o }) : this.processMessage({ data: r, ...o });
    }
    processMessage(r, { transports: o = this.transports } = {}) {
      if (r.cmd === "errorHandler") {
        this.errorHandler.handle(r.error, {
          errorName: r.errorName,
          processType: "renderer",
          showDialog: !!r.showDialog
        });
        return;
      }
      let a = r.level;
      this.allowUnknownLevel || (a = this.levels.includes(r.level) ? r.level : "info");
      const c = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...r,
        level: a,
        variables: {
          ...this.variables,
          ...r.variables
        }
      };
      for (const [l, u] of this.transportEntries(o))
        if (!(typeof u != "function" || u.level === !1) && this.compareLevels(u.level, r.level))
          try {
            const d = this.hooks.reduce((f, h) => f && h(f, u, l), c);
            d && u({ ...d, data: [...d.data] });
          } catch (d) {
            this.processInternalErrorFn(d);
          }
    }
    processInternalErrorFn(r) {
    }
    transportEntries(r = this.transports) {
      return (Array.isArray(r) ? r : Object.entries(r)).map((a) => {
        switch (typeof a) {
          case "string":
            return this.transports[a] ? [a, this.transports[a]] : null;
          case "function":
            return [a.name, a];
          default:
            return Array.isArray(a) ? a : null;
        }
      }).filter(Boolean);
    }
  };
  y(i, "instances", {});
  let e = i;
  return Ye = e, Ye;
}
var Qe, Vt;
function Ln() {
  if (Vt) return Qe;
  Vt = 1;
  const n = console.error;
  class t {
    constructor({ logFn: i = null } = {}) {
      y(this, "logFn", null);
      y(this, "onError", null);
      y(this, "showDialog", !1);
      y(this, "preventDefault", !0);
      this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.startCatching = this.startCatching.bind(this), this.logFn = i;
    }
    handle(i, {
      logFn: s = this.logFn,
      errorName: r = "",
      onError: o = this.onError,
      showDialog: a = this.showDialog
    } = {}) {
      try {
        (o == null ? void 0 : o({ error: i, errorName: r, processType: "renderer" })) !== !1 && s({ error: i, errorName: r, showDialog: a });
      } catch {
        n(i);
      }
    }
    setOptions({ logFn: i, onError: s, preventDefault: r, showDialog: o }) {
      typeof i == "function" && (this.logFn = i), typeof s == "function" && (this.onError = s), typeof r == "boolean" && (this.preventDefault = r), typeof o == "boolean" && (this.showDialog = o);
    }
    startCatching({ onError: i, showDialog: s } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: i, showDialog: s }), window.addEventListener("error", (r) => {
        var o;
        this.preventDefault && ((o = r.preventDefault) == null || o.call(r)), this.handleError(r.error || r);
      }), window.addEventListener("unhandledrejection", (r) => {
        var o;
        this.preventDefault && ((o = r.preventDefault) == null || o.call(r)), this.handleRejection(r.reason || r);
      }));
    }
    handleError(i) {
      this.handle(i, { errorName: "Unhandled" });
    }
    handleRejection(i) {
      const s = i instanceof Error ? i : new Error(JSON.stringify(i));
      this.handle(s, { errorName: "Unhandled rejection" });
    }
  }
  return Qe = t, Qe;
}
var Ze, Ut;
function te() {
  if (Ut) return Ze;
  Ut = 1, Ze = { transform: n };
  function n({
    logger: t,
    message: e,
    transport: i,
    initialData: s = (e == null ? void 0 : e.data) || [],
    transforms: r = i == null ? void 0 : i.transforms
  }) {
    return r.reduce((o, a) => typeof a == "function" ? a({ data: o, logger: t, message: e, transport: i }) : o, s);
  }
  return Ze;
}
var Xe, qt;
function Dn() {
  if (qt) return Xe;
  qt = 1;
  const { transform: n } = te();
  Xe = e;
  const t = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  function e(s) {
    return Object.assign(r, {
      format: "{h}:{i}:{s}.{ms}{scope} › {text}",
      transforms: [i],
      writeFn({ message: { level: o, data: a } }) {
        const c = t[o] || t.info;
        setTimeout(() => c(...a));
      }
    });
    function r(o) {
      r.writeFn({
        message: { ...o, data: n({ logger: s, message: o, transport: r }) }
      });
    }
  }
  function i({
    data: s = [],
    logger: r = {},
    message: o = {},
    transport: a = {}
  }) {
    if (typeof a.format == "function")
      return a.format({
        data: s,
        level: (o == null ? void 0 : o.level) || "info",
        logger: r,
        message: o,
        transport: a
      });
    if (typeof a.format != "string")
      return s;
    s.unshift(a.format), typeof s[1] == "string" && s[1].match(/%[1cdfiOos]/) && (s = [`${s[0]}${s[1]}`, ...s.slice(2)]);
    const c = o.date || /* @__PURE__ */ new Date();
    return s[0] = s[0].replace(/\{(\w+)}/g, (l, u) => {
      var d, f;
      switch (u) {
        case "level":
          return o.level;
        case "logId":
          return o.logId;
        case "scope": {
          const h = o.scope || ((d = r.scope) == null ? void 0 : d.defaultLabel);
          return h ? ` (${h})` : "";
        }
        case "text":
          return "";
        case "y":
          return c.getFullYear().toString(10);
        case "m":
          return (c.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return c.getDate().toString(10).padStart(2, "0");
        case "h":
          return c.getHours().toString(10).padStart(2, "0");
        case "i":
          return c.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return c.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return c.getMilliseconds().toString(10).padStart(3, "0");
        case "iso":
          return c.toISOString();
        default:
          return ((f = o.variables) == null ? void 0 : f[u]) || l;
      }
    }).trim(), s;
  }
  return Xe;
}
var et, zt;
function Pn() {
  if (zt) return et;
  zt = 1;
  const { transform: n } = te();
  et = e;
  const t = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
  function e(r) {
    return Object.assign(o, {
      depth: 5,
      transforms: [s]
    });
    function o(a) {
      if (!window.__electronLog) {
        r.processMessage(
          {
            data: ["electron-log: logger isn't initialized in the main process"],
            level: "error"
          },
          { transports: ["console"] }
        );
        return;
      }
      try {
        const c = n({
          initialData: a,
          logger: r,
          message: a,
          transport: o
        });
        __electronLog.sendToMain(c);
      } catch (c) {
        r.transports.console({
          data: ["electronLog.transports.ipc", c, "data:", a.data],
          level: "error"
        });
      }
    }
  }
  function i(r) {
    return Object(r) !== r;
  }
  function s({
    data: r,
    depth: o,
    seen: a = /* @__PURE__ */ new WeakSet(),
    transport: c = {}
  } = {}) {
    const l = o || c.depth || 5;
    return a.has(r) ? "[Circular]" : l < 1 ? i(r) ? r : Array.isArray(r) ? "[Array]" : `[${typeof r}]` : ["function", "symbol"].includes(typeof r) ? r.toString() : i(r) ? r : t.has(r.constructor) ? `[${r.constructor.name}]` : Array.isArray(r) ? r.map((u) => s({
      data: u,
      depth: l - 1,
      seen: a
    })) : r instanceof Date ? r.toISOString() : r instanceof Error ? r.stack : r instanceof Map ? new Map(
      Array.from(r).map(([u, d]) => [
        s({ data: u, depth: l - 1, seen: a }),
        s({ data: d, depth: l - 1, seen: a })
      ])
    ) : r instanceof Set ? new Set(
      Array.from(r).map(
        (u) => s({ data: u, depth: l - 1, seen: a })
      )
    ) : (a.add(r), Object.fromEntries(
      Object.entries(r).map(
        ([u, d]) => [
          u,
          s({ data: d, depth: l - 1, seen: a })
        ]
      )
    ));
  }
  return et;
}
var Ht;
function kn() {
  return Ht || (Ht = 1, function(n) {
    const t = xr(), e = Ln(), i = Dn(), s = Pn();
    typeof process == "object" && process.type === "browser" && console.warn(
      "electron-log/renderer is loaded in the main process. It could cause unexpected behaviour."
    ), n.exports = r(), n.exports.Logger = t, n.exports.default = n.exports;
    function r() {
      const o = new t({
        allowUnknownLevel: !0,
        errorHandler: new e(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: i,
          ipc: s
        },
        variables: {
          processType: "renderer"
        }
      });
      return o.errorHandler.setOptions({
        logFn({ error: a, errorName: c, showDialog: l }) {
          o.transports.console({
            data: [c, a].filter(Boolean),
            level: "error"
          }), o.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: a == null ? void 0 : a.cause,
              code: a == null ? void 0 : a.code,
              name: a == null ? void 0 : a.name,
              message: a == null ? void 0 : a.message,
              stack: a == null ? void 0 : a.stack
            },
            errorName: c,
            logId: o.logId,
            showDialog: l
          });
        }
      }), typeof window == "object" && window.addEventListener("message", (a) => {
        const { cmd: c, logId: l, ...u } = a.data || {}, d = t.getInstance({ logId: l });
        c === "message" && d.processMessage(u, { transports: ["console"] });
      }), new Proxy(o, {
        get(a, c) {
          return typeof a[c] < "u" ? a[c] : (...l) => o.logData(l, { level: c });
        }
      });
    }
  }(Je)), Je.exports;
}
var tt, Wt;
function Fn() {
  if (Wt) return tt;
  Wt = 1;
  const n = B, t = F;
  tt = {
    findAndReadPackageJson: e,
    tryReadJsonAt: i
  };
  function e() {
    return i(o()) || i(r()) || i(process.resourcesPath, "app.asar") || i(process.resourcesPath, "app") || i(process.cwd()) || { name: void 0, version: void 0 };
  }
  function i(...a) {
    if (a[0])
      try {
        const c = t.join(...a), l = s("package.json", c);
        if (!l)
          return;
        const u = JSON.parse(n.readFileSync(l, "utf8")), d = (u == null ? void 0 : u.productName) || (u == null ? void 0 : u.name);
        return !d || d.toLowerCase() === "electron" ? void 0 : d ? { name: d, version: u == null ? void 0 : u.version } : void 0;
      } catch {
        return;
      }
  }
  function s(a, c) {
    let l = c;
    for (; ; ) {
      const u = t.parse(l), d = u.root, f = u.dir;
      if (n.existsSync(t.join(l, a)))
        return t.resolve(t.join(l, a));
      if (l === d)
        return null;
      l = f;
    }
  }
  function r() {
    const a = process.argv.filter((l) => l.indexOf("--user-data-dir=") === 0);
    return a.length === 0 || typeof a[0] != "string" ? null : a[0].replace("--user-data-dir=", "");
  }
  function o() {
    var a;
    try {
      return (a = require.main) == null ? void 0 : a.filename;
    } catch {
      return;
    }
  }
  return tt;
}
var rt, Jt;
function Sr() {
  if (Jt) return rt;
  Jt = 1;
  const n = un, t = le, e = F, i = Fn();
  class s {
    constructor() {
      y(this, "appName");
      y(this, "appPackageJson");
      y(this, "platform", process.platform);
    }
    getAppLogPath(o = this.getAppName()) {
      return this.platform === "darwin" ? e.join(this.getSystemPathHome(), "Library/Logs", o) : e.join(this.getAppUserDataPath(o), "logs");
    }
    getAppName() {
      var a;
      const o = this.appName || ((a = this.getAppPackageJson()) == null ? void 0 : a.name);
      if (!o)
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      return o;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      return typeof this.appPackageJson != "object" && (this.appPackageJson = i.findAndReadPackageJson()), this.appPackageJson;
    }
    getAppUserDataPath(o = this.getAppName()) {
      return o ? e.join(this.getSystemPathAppData(), o) : void 0;
    }
    getAppVersion() {
      var o;
      return (o = this.getAppPackageJson()) == null ? void 0 : o.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const o = Number(t.release().split(".")[0]);
      return o <= 19 ? `10.${o - 4}` : o - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let o = t.type().replace("_", " "), a = t.release();
      return o === "Darwin" && (o = "macOS", a = this.getMacOsVersion()), `${o} ${a}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const o = this.getAppName(), a = this.getAppVersion(), c = this;
      return {
        appData: this.getSystemPathAppData(),
        appName: o,
        appVersion: a,
        get electronDefaultDir() {
          return c.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(o),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(o)
      };
    }
    getSystemPathAppData() {
      const o = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin":
          return e.join(o, "Library/Application Support");
        case "win32":
          return process.env.APPDATA || e.join(o, "AppData/Roaming");
        default:
          return process.env.XDG_CONFIG_HOME || e.join(o, ".config");
      }
    }
    getSystemPathHome() {
      var o;
      return ((o = t.homedir) == null ? void 0 : o.call(t)) || process.env.HOME;
    }
    getSystemPathTemp() {
      return t.tmpdir();
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: void 0,
        os: this.getOsVersion()
      };
    }
    isDev() {
      return process.env.NODE_ENV === "development" || process.env.ELECTRON_IS_DEV === "1";
    }
    isElectron() {
      return !!process.versions.electron;
    }
    onAppEvent(o, a) {
    }
    onAppReady(o) {
      o();
    }
    onEveryWebContentsEvent(o, a) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(o, a) {
    }
    onIpcInvoke(o, a) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(o, a = console.error) {
      const l = { darwin: "open", win32: "start", linux: "xdg-open" }[process.platform] || "xdg-open";
      n.exec(`${l} ${o}`, {}, (u) => {
        u && a(u);
      });
    }
    setAppName(o) {
      this.appName = o;
    }
    setPlatform(o) {
      this.platform = o;
    }
    setPreloadFileForSessions({
      filePath: o,
      // eslint-disable-line no-unused-vars
      includeFutureSession: a = !0,
      // eslint-disable-line no-unused-vars
      getSessions: c = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(o, a) {
    }
    showErrorBox(o, a) {
    }
  }
  return rt = s, rt;
}
var nt, Gt;
function Tn() {
  if (Gt) return nt;
  Gt = 1;
  const n = F, t = Sr();
  class e extends t {
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron: r } = {}) {
      super();
      /**
       * @type {typeof Electron}
       */
      y(this, "electron");
      this.electron = r;
    }
    getAppName() {
      var o, a;
      let r;
      try {
        r = this.appName || ((o = this.electron.app) == null ? void 0 : o.name) || ((a = this.electron.app) == null ? void 0 : a.getName());
      } catch {
      }
      return r || super.getAppName();
    }
    getAppUserDataPath(r) {
      return this.getPath("userData") || super.getAppUserDataPath(r);
    }
    getAppVersion() {
      var o;
      let r;
      try {
        r = (o = this.electron.app) == null ? void 0 : o.getVersion();
      } catch {
      }
      return r || super.getAppVersion();
    }
    getElectronLogPath() {
      return this.getPath("logs") || super.getElectronLogPath();
    }
    /**
     * @private
     * @param {any} name
     * @returns {string|undefined}
     */
    getPath(r) {
      var o;
      try {
        return (o = this.electron.app) == null ? void 0 : o.getPath(r);
      } catch {
        return;
      }
    }
    getVersions() {
      return {
        app: `${this.getAppName()} ${this.getAppVersion()}`,
        electron: `Electron ${process.versions.electron}`,
        os: this.getOsVersion()
      };
    }
    getSystemPathAppData() {
      return this.getPath("appData") || super.getSystemPathAppData();
    }
    isDev() {
      var r;
      return ((r = this.electron.app) == null ? void 0 : r.isPackaged) !== void 0 ? !this.electron.app.isPackaged : typeof process.execPath == "string" ? n.basename(process.execPath).toLowerCase().startsWith("electron") : super.isDev();
    }
    onAppEvent(r, o) {
      var a;
      return (a = this.electron.app) == null || a.on(r, o), () => {
        var c;
        (c = this.electron.app) == null || c.off(r, o);
      };
    }
    onAppReady(r) {
      var o, a, c;
      (o = this.electron.app) != null && o.isReady() ? r() : (a = this.electron.app) != null && a.once ? (c = this.electron.app) == null || c.once("ready", r) : r();
    }
    onEveryWebContentsEvent(r, o) {
      var c, l, u;
      return (l = (c = this.electron.webContents) == null ? void 0 : c.getAllWebContents()) == null || l.forEach((d) => {
        d.on(r, o);
      }), (u = this.electron.app) == null || u.on("web-contents-created", a), () => {
        var d, f;
        (d = this.electron.webContents) == null || d.getAllWebContents().forEach((h) => {
          h.off(r, o);
        }), (f = this.electron.app) == null || f.off("web-contents-created", a);
      };
      function a(d, f) {
        f.on(r, o);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(r, o) {
      var a;
      (a = this.electron.ipcMain) == null || a.on(r, o);
    }
    onIpcInvoke(r, o) {
      var a, c;
      (c = (a = this.electron.ipcMain) == null ? void 0 : a.handle) == null || c.call(a, r, o);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(r, o = console.error) {
      var a;
      (a = this.electron.shell) == null || a.openExternal(r).catch(o);
    }
    setPreloadFileForSessions({
      filePath: r,
      includeFutureSession: o = !0,
      getSessions: a = () => {
        var c;
        return [(c = this.electron.session) == null ? void 0 : c.defaultSession];
      }
    }) {
      for (const l of a().filter(Boolean))
        c(l);
      o && this.onAppEvent("session-created", (l) => {
        c(l);
      });
      function c(l) {
        typeof l.registerPreloadScript == "function" ? l.registerPreloadScript({
          filePath: r,
          id: "electron-log-preload",
          type: "frame"
        }) : l.setPreloads([...l.getPreloads(), r]);
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(r, o) {
      var a, c;
      (c = (a = this.electron.BrowserWindow) == null ? void 0 : a.getAllWindows()) == null || c.forEach((l) => {
        var u, d;
        ((u = l.webContents) == null ? void 0 : u.isDestroyed()) === !1 && ((d = l.webContents) == null ? void 0 : d.isCrashed()) === !1 && l.webContents.send(r, o);
      });
    }
    showErrorBox(r, o) {
      var a;
      (a = this.electron.dialog) == null || a.showErrorBox(r, o);
    }
  }
  return nt = e, nt;
}
var ot, Kt;
function An() {
  if (Kt) return ot;
  Kt = 1;
  const n = B, t = le, e = F, i = _r();
  let s = !1, r = !1;
  ot = {
    initialize({
      externalApi: c,
      getSessions: l,
      includeFutureSession: u,
      logger: d,
      preload: f = !0,
      spyRendererConsole: h = !1
    }) {
      c.onAppReady(() => {
        try {
          f && o({
            externalApi: c,
            getSessions: l,
            includeFutureSession: u,
            logger: d,
            preloadOption: f
          }), h && a({ externalApi: c, logger: d });
        } catch (m) {
          d.warn(m);
        }
      });
    }
  };
  function o({
    externalApi: c,
    getSessions: l,
    includeFutureSession: u,
    logger: d,
    preloadOption: f
  }) {
    let h = typeof f == "string" ? f : void 0;
    if (s) {
      d.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    s = !0;
    try {
      h = e.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!h || !n.existsSync(h)) {
      h = e.join(
        c.getAppUserDataPath() || t.tmpdir(),
        "electron-log-preload.js"
      );
      const m = `
      try {
        (${i.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      n.writeFileSync(h, m, "utf8");
    }
    c.setPreloadFileForSessions({
      filePath: h,
      includeFutureSession: u,
      getSessions: l
    });
  }
  function a({ externalApi: c, logger: l }) {
    if (r) {
      l.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    r = !0;
    const u = ["debug", "info", "warn", "error"];
    c.onEveryWebContentsEvent(
      "console-message",
      (d, f, h) => {
        l.processMessage({
          data: [h],
          level: u[f],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return ot;
}
var it, Yt;
function Rn() {
  if (Yt) return it;
  Yt = 1;
  class n {
    constructor({
      externalApi: i,
      logFn: s = void 0,
      onError: r = void 0,
      showDialog: o = void 0
    } = {}) {
      y(this, "externalApi");
      y(this, "isActive", !1);
      y(this, "logFn");
      y(this, "onError");
      y(this, "showDialog", !0);
      this.createIssue = this.createIssue.bind(this), this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.setOptions({ externalApi: i, logFn: s, onError: r, showDialog: o }), this.startCatching = this.startCatching.bind(this), this.stopCatching = this.stopCatching.bind(this);
    }
    handle(i, {
      logFn: s = this.logFn,
      onError: r = this.onError,
      processType: o = "browser",
      showDialog: a = this.showDialog,
      errorName: c = ""
    } = {}) {
      var l;
      i = t(i);
      try {
        if (typeof r == "function") {
          const u = ((l = this.externalApi) == null ? void 0 : l.getVersions()) || {}, d = this.createIssue;
          if (r({
            createIssue: d,
            error: i,
            errorName: c,
            processType: o,
            versions: u
          }) === !1)
            return;
        }
        c ? s(c, i) : s(i), a && !c.includes("rejection") && this.externalApi && this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${o} process`,
          i.stack
        );
      } catch {
        console.error(i);
      }
    }
    setOptions({ externalApi: i, logFn: s, onError: r, showDialog: o }) {
      typeof i == "object" && (this.externalApi = i), typeof s == "function" && (this.logFn = s), typeof r == "function" && (this.onError = r), typeof o == "boolean" && (this.showDialog = o);
    }
    startCatching({ onError: i, showDialog: s } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: i, showDialog: s }), process.on("uncaughtException", this.handleError), process.on("unhandledRejection", this.handleRejection));
    }
    stopCatching() {
      this.isActive = !1, process.removeListener("uncaughtException", this.handleError), process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(i, s) {
      var r;
      (r = this.externalApi) == null || r.openUrl(
        `${i}?${new URLSearchParams(s).toString()}`
      );
    }
    handleError(i) {
      this.handle(i, { errorName: "Unhandled" });
    }
    handleRejection(i) {
      const s = i instanceof Error ? i : new Error(JSON.stringify(i));
      this.handle(s, { errorName: "Unhandled rejection" });
    }
  }
  function t(e) {
    if (e instanceof Error)
      return e;
    if (e && typeof e == "object") {
      if (e.message)
        return Object.assign(new Error(e.message), e);
      try {
        return new Error(JSON.stringify(e));
      } catch (i) {
        return new Error(`Couldn't normalize error ${String(e)}: ${i}`);
      }
    }
    return new Error(`Can't normalize error ${String(e)}`);
  }
  return it = n, it;
}
var at, Qt;
function On() {
  if (Qt) return at;
  Qt = 1;
  class n {
    constructor(e = {}) {
      y(this, "disposers", []);
      y(this, "format", "{eventSource}#{eventName}:");
      y(this, "formatters", {
        app: {
          "certificate-error": ({ args: e }) => this.arrayToObject(e.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]),
          "child-process-gone": ({ args: e }) => e.length === 1 ? e[0] : e,
          "render-process-gone": ({ args: [e, i] }) => i && typeof i == "object" ? { ...i, ...this.getWebContentsDetails(e) } : []
        },
        webContents: {
          "console-message": ({ args: [e, i, s, r] }) => {
            if (!(e < 3))
              return { message: i, source: `${r}:${s}` };
          },
          "did-fail-load": ({ args: e }) => this.arrayToObject(e, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]),
          "did-fail-provisional-load": ({ args: e }) => this.arrayToObject(e, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]),
          "plugin-crashed": ({ args: e }) => this.arrayToObject(e, ["name", "version"]),
          "preload-error": ({ args: e }) => this.arrayToObject(e, ["preloadPath", "error"])
        }
      });
      y(this, "events", {
        app: {
          "certificate-error": !0,
          "child-process-gone": !0,
          "render-process-gone": !0
        },
        webContents: {
          // 'console-message': true,
          "did-fail-load": !0,
          "did-fail-provisional-load": !0,
          "plugin-crashed": !0,
          "preload-error": !0,
          unresponsive: !0
        }
      });
      y(this, "externalApi");
      y(this, "level", "error");
      y(this, "scope", "");
      this.setOptions(e);
    }
    setOptions({
      events: e,
      externalApi: i,
      level: s,
      logger: r,
      format: o,
      formatters: a,
      scope: c
    }) {
      typeof e == "object" && (this.events = e), typeof i == "object" && (this.externalApi = i), typeof s == "string" && (this.level = s), typeof r == "object" && (this.logger = r), (typeof o == "string" || typeof o == "function") && (this.format = o), typeof a == "object" && (this.formatters = a), typeof c == "string" && (this.scope = c);
    }
    startLogging(e = {}) {
      this.setOptions(e), this.disposeListeners();
      for (const i of this.getEventNames(this.events.app))
        this.disposers.push(
          this.externalApi.onAppEvent(i, (...s) => {
            this.handleEvent({ eventSource: "app", eventName: i, handlerArgs: s });
          })
        );
      for (const i of this.getEventNames(this.events.webContents))
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            i,
            (...s) => {
              this.handleEvent(
                { eventSource: "webContents", eventName: i, handlerArgs: s }
              );
            }
          )
        );
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(e, i) {
      const s = {};
      return i.forEach((r, o) => {
        s[r] = e[o];
      }), e.length > i.length && (s.unknownArgs = e.slice(i.length)), s;
    }
    disposeListeners() {
      this.disposers.forEach((e) => e()), this.disposers = [];
    }
    formatEventLog({ eventName: e, eventSource: i, handlerArgs: s }) {
      var d;
      const [r, ...o] = s;
      if (typeof this.format == "function")
        return this.format({ args: o, event: r, eventName: e, eventSource: i });
      const a = (d = this.formatters[i]) == null ? void 0 : d[e];
      let c = o;
      if (typeof a == "function" && (c = a({ args: o, event: r, eventName: e, eventSource: i })), !c)
        return;
      const l = {};
      return Array.isArray(c) ? l.args = c : typeof c == "object" && Object.assign(l, c), i === "webContents" && Object.assign(l, this.getWebContentsDetails(r == null ? void 0 : r.sender)), [this.format.replace("{eventSource}", i === "app" ? "App" : "WebContents").replace("{eventName}", e), l];
    }
    getEventNames(e) {
      return !e || typeof e != "object" ? [] : Object.entries(e).filter(([i, s]) => s).map(([i]) => i);
    }
    getWebContentsDetails(e) {
      if (!(e != null && e.loadURL))
        return {};
      try {
        return {
          webContents: {
            id: e.id,
            url: e.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName: e, eventSource: i, handlerArgs: s }) {
      var o;
      const r = this.formatEventLog({ eventName: e, eventSource: i, handlerArgs: s });
      if (r) {
        const a = this.scope ? this.logger.scope(this.scope) : this.logger;
        (o = a == null ? void 0 : a[this.level]) == null || o.call(a, ...r);
      }
    }
  }
  return at = n, at;
}
var st, Zt;
function Ir() {
  if (Zt) return st;
  Zt = 1;
  const { transform: n } = te();
  st = {
    concatFirstStringElements: t,
    formatScope: i,
    formatText: r,
    formatVariables: s,
    timeZoneFromOffset: e,
    format({ message: o, logger: a, transport: c, data: l = o == null ? void 0 : o.data }) {
      switch (typeof c.format) {
        case "string":
          return n({
            message: o,
            logger: a,
            transforms: [s, i, r],
            transport: c,
            initialData: [c.format, ...l]
          });
        case "function":
          return c.format({
            data: l,
            level: (o == null ? void 0 : o.level) || "info",
            logger: a,
            message: o,
            transport: c
          });
        default:
          return l;
      }
    }
  };
  function t({ data: o }) {
    return typeof o[0] != "string" || typeof o[1] != "string" || o[0].match(/%[1cdfiOos]/) ? o : [`${o[0]} ${o[1]}`, ...o.slice(2)];
  }
  function e(o) {
    const a = Math.abs(o), c = o > 0 ? "-" : "+", l = Math.floor(a / 60).toString().padStart(2, "0"), u = (a % 60).toString().padStart(2, "0");
    return `${c}${l}:${u}`;
  }
  function i({ data: o, logger: a, message: c }) {
    const { defaultLabel: l, labelLength: u } = (a == null ? void 0 : a.scope) || {}, d = o[0];
    let f = c.scope;
    f || (f = l);
    let h;
    return f === "" ? h = u > 0 ? "".padEnd(u + 3) : "" : typeof f == "string" ? h = ` (${f})`.padEnd(u + 3) : h = "", o[0] = d.replace("{scope}", h), o;
  }
  function s({ data: o, message: a }) {
    let c = o[0];
    if (typeof c != "string")
      return o;
    c = c.replace("{level}]", `${a.level}]`.padEnd(6, " "));
    const l = a.date || /* @__PURE__ */ new Date();
    return o[0] = c.replace(/\{(\w+)}/g, (u, d) => {
      var f;
      switch (d) {
        case "level":
          return a.level || "info";
        case "logId":
          return a.logId;
        case "y":
          return l.getFullYear().toString(10);
        case "m":
          return (l.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return l.getDate().toString(10).padStart(2, "0");
        case "h":
          return l.getHours().toString(10).padStart(2, "0");
        case "i":
          return l.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return l.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return l.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return e(l.getTimezoneOffset());
        case "iso":
          return l.toISOString();
        default:
          return ((f = a.variables) == null ? void 0 : f[d]) || u;
      }
    }).trim(), o;
  }
  function r({ data: o }) {
    const a = o[0];
    if (typeof a != "string")
      return o;
    if (a.lastIndexOf("{text}") === a.length - 6)
      return o[0] = a.replace(/\s?{text}/, ""), o[0] === "" && o.shift(), o;
    const l = a.split("{text}");
    let u = [];
    return l[0] !== "" && u.push(l[0]), u = u.concat(o.slice(1)), l[1] !== "" && u.push(l[1]), u;
  }
  return st;
}
var ct = { exports: {} }, Xt;
function De() {
  return Xt || (Xt = 1, function(n) {
    const t = Q;
    n.exports = {
      serialize: i,
      maxDepth({ data: s, transport: r, depth: o = (r == null ? void 0 : r.depth) ?? 6 }) {
        if (!s)
          return s;
        if (o < 1)
          return Array.isArray(s) ? "[array]" : typeof s == "object" && s ? "[object]" : s;
        if (Array.isArray(s))
          return s.map((c) => n.exports.maxDepth({
            data: c,
            depth: o - 1
          }));
        if (typeof s != "object" || s && typeof s.toISOString == "function")
          return s;
        if (s === null)
          return null;
        if (s instanceof Error)
          return s;
        const a = {};
        for (const c in s)
          Object.prototype.hasOwnProperty.call(s, c) && (a[c] = n.exports.maxDepth({
            data: s[c],
            depth: o - 1
          }));
        return a;
      },
      toJSON({ data: s }) {
        return JSON.parse(JSON.stringify(s, e()));
      },
      toString({ data: s, transport: r }) {
        const o = (r == null ? void 0 : r.inspectOptions) || {}, a = s.map((c) => {
          if (c !== void 0)
            try {
              const l = JSON.stringify(c, e(), "  ");
              return l === void 0 ? void 0 : JSON.parse(l);
            } catch {
              return c;
            }
        });
        return t.formatWithOptions(o, ...a);
      }
    };
    function e(s = {}) {
      const r = /* @__PURE__ */ new WeakSet();
      return function(o, a) {
        if (typeof a == "object" && a !== null) {
          if (r.has(a))
            return;
          r.add(a);
        }
        return i(o, a, s);
      };
    }
    function i(s, r, o = {}) {
      const a = (o == null ? void 0 : o.serializeMapAndSet) !== !1;
      return r instanceof Error ? r.stack : r && (typeof r == "function" ? `[function] ${r.toString()}` : r instanceof Date ? r.toISOString() : a && r instanceof Map && Object.fromEntries ? Object.fromEntries(r) : a && r instanceof Set && Array.from ? Array.from(r) : r);
    }
  }(ct)), ct.exports;
}
var lt, er;
function Dt() {
  if (er) return lt;
  er = 1, lt = {
    transformStyles: i,
    applyAnsiStyles({ data: s }) {
      return i(s, t, e);
    },
    removeStyles({ data: s }) {
      return i(s, () => "");
    }
  };
  const n = {
    unset: "\x1B[0m",
    black: "\x1B[30m",
    red: "\x1B[31m",
    green: "\x1B[32m",
    yellow: "\x1B[33m",
    blue: "\x1B[34m",
    magenta: "\x1B[35m",
    cyan: "\x1B[36m",
    white: "\x1B[37m",
    gray: "\x1B[90m"
  };
  function t(s) {
    const r = s.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return n[r] || "";
  }
  function e(s) {
    return s + n.unset;
  }
  function i(s, r, o) {
    const a = {};
    return s.reduce((c, l, u, d) => {
      if (a[u])
        return c;
      if (typeof l == "string") {
        let f = u, h = !1;
        l = l.replace(/%[1cdfiOos]/g, (m) => {
          if (f += 1, m !== "%c")
            return m;
          const v = d[f];
          return typeof v == "string" ? (a[f] = !0, h = !0, r(v, l)) : m;
        }), h && o && (l = o(l));
      }
      return c.push(l), c;
    }, []);
  }
  return lt;
}
var ut, tr;
function Cn() {
  if (tr) return ut;
  tr = 1;
  const {
    concatFirstStringElements: n,
    format: t
  } = Ir(), { maxDepth: e, toJSON: i } = De(), {
    applyAnsiStyles: s,
    removeStyles: r
  } = Dt(), { transform: o } = te(), a = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  ut = u;
  const l = `%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform === "win32" ? ">" : "›"} {text}`;
  Object.assign(u, {
    DEFAULT_FORMAT: l
  });
  function u(v) {
    return Object.assign(g, {
      colorMap: {
        error: "red",
        warn: "yellow",
        info: "cyan",
        verbose: "unset",
        debug: "gray",
        silly: "gray",
        default: "unset"
      },
      format: l,
      level: "silly",
      transforms: [
        d,
        t,
        h,
        n,
        e,
        i
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message: w }) {
        (a[w.level] || a.info)(...w.data);
      }
    });
    function g(w) {
      const b = o({ logger: v, message: w, transport: g });
      g.writeFn({
        message: { ...w, data: b }
      });
    }
  }
  function d({ data: v, message: g, transport: w }) {
    return typeof w.format != "string" || !w.format.includes("%c") ? v : [
      `color:${m(g.level, w)}`,
      "color:unset",
      ...v
    ];
  }
  function f(v, g) {
    if (typeof v == "boolean")
      return v;
    const b = g === "error" || g === "warn" ? process.stderr : process.stdout;
    return b && b.isTTY;
  }
  function h(v) {
    const { message: g, transport: w } = v;
    return (f(w.useStyles, g.level) ? s : r)(v);
  }
  function m(v, g) {
    return g.colorMap[v] || g.colorMap.default;
  }
  return ut;
}
var dt, rr;
function $r() {
  if (rr) return dt;
  rr = 1;
  const n = ue, t = B, e = le;
  class i extends n {
    constructor({
      path: a,
      writeOptions: c = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync: l = !1
    }) {
      super();
      y(this, "asyncWriteQueue", []);
      y(this, "bytesWritten", 0);
      y(this, "hasActiveAsyncWriting", !1);
      y(this, "path", null);
      y(this, "initialSize");
      y(this, "writeOptions", null);
      y(this, "writeAsync", !1);
      this.path = a, this.writeOptions = c, this.writeAsync = l;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        return t.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        }), this.reset(), !0;
      } catch (a) {
        return a.code === "ENOENT" ? !0 : (this.emit("error", a, this), !1);
      }
    }
    crop(a) {
      try {
        const c = s(this.path, a || 4096);
        this.clear(), this.writeLine(`[log cropped]${e.EOL}${c}`);
      } catch (c) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${c.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0)
        try {
          const a = t.statSync(this.path);
          this.initialSize = a.size;
        } catch {
          this.initialSize = 0;
        }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(a) {
      this.bytesWritten += Buffer.byteLength(a, this.writeOptions.encoding);
    }
    isNull() {
      return !1;
    }
    nextAsyncWrite() {
      const a = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0)
        return;
      const c = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [], this.hasActiveAsyncWriting = !0, t.writeFile(this.path, c, this.writeOptions, (l) => {
        a.hasActiveAsyncWriting = !1, l ? a.emit(
          "error",
          new Error(`Couldn't write to ${a.path}. ${l.message}`),
          this
        ) : a.increaseBytesWrittenCounter(c), a.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0, this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(a) {
      if (a += e.EOL, this.writeAsync) {
        this.asyncWriteQueue.push(a), this.nextAsyncWrite();
        return;
      }
      try {
        t.writeFileSync(this.path, a, this.writeOptions), this.increaseBytesWrittenCounter(a);
      } catch (c) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${c.message}`),
          this
        );
      }
    }
  }
  dt = i;
  function s(r, o) {
    const a = Buffer.alloc(o), c = t.statSync(r), l = Math.min(c.size, o), u = Math.max(0, c.size - o), d = t.openSync(r, "r"), f = t.readSync(d, a, 0, l, u);
    return t.closeSync(d), a.toString("utf8", 0, f);
  }
  return dt;
}
var ft, nr;
function jn() {
  if (nr) return ft;
  nr = 1;
  const n = $r();
  class t extends n {
    clear() {
    }
    crop() {
    }
    getSize() {
      return 0;
    }
    isNull() {
      return !0;
    }
    writeLine() {
    }
  }
  return ft = t, ft;
}
var ht, or;
function Nn() {
  if (or) return ht;
  or = 1;
  const n = ue, t = B, e = F, i = $r(), s = jn();
  class r extends n {
    constructor() {
      super();
      y(this, "store", {});
      this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath: c, writeOptions: l = {}, writeAsync: u = !1 }) {
      let d;
      try {
        if (c = e.resolve(c), this.store[c])
          return this.store[c];
        d = this.createFile({ filePath: c, writeOptions: l, writeAsync: u });
      } catch (f) {
        d = new s({ path: c }), this.emitError(f, d);
      }
      return d.on("error", this.emitError), this.store[c] = d, d;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath: c, writeOptions: l, writeAsync: u }) {
      return this.testFileWriting({ filePath: c, writeOptions: l }), new i({ path: c, writeOptions: l, writeAsync: u });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(c, l) {
      this.emit("error", c, l);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath: c, writeOptions: l }) {
      t.mkdirSync(e.dirname(c), { recursive: !0 }), t.writeFileSync(c, "", { flag: "a", mode: l.mode });
    }
  }
  return ht = r, ht;
}
var pt, ir;
function Mn() {
  if (ir) return pt;
  ir = 1;
  const n = B, t = le, e = F, i = Nn(), { transform: s } = te(), { removeStyles: r } = Dt(), {
    format: o,
    concatFirstStringElements: a
  } = Ir(), { toString: c } = De();
  pt = u;
  const l = new i();
  function u(f, { registry: h = l, externalApi: m } = {}) {
    let v;
    return h.listenerCount("error") < 1 && h.on("error", (S, I) => {
      b(`Can't write to ${I}`, S);
    }), Object.assign(g, {
      fileName: d(f.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile: $,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs: re,
      sync: !0,
      transforms: [r, o, a, c],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(S) {
        const I = S.toString(), P = e.parse(I);
        try {
          n.renameSync(I, e.join(P.dir, `${P.name}.old${P.ext}`));
        } catch (J) {
          b("Could not rotate log", J);
          const ae = Math.round(g.maxSize / 4);
          S.crop(Math.min(ae, 256 * 1024));
        }
      },
      resolvePathFn(S) {
        return e.join(S.libraryDefaultDir, S.fileName);
      },
      setAppName(S) {
        f.dependencies.externalApi.setAppName(S);
      }
    });
    function g(S) {
      const I = $(S);
      g.maxSize > 0 && I.size > g.maxSize && (g.archiveLogFn(I), I.reset());
      const J = s({ logger: f, message: S, transport: g });
      I.writeLine(J);
    }
    function w() {
      v || (v = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            m.getPathVariables()
          ),
          fileName: {
            get() {
              return g.fileName;
            },
            enumerable: !0
          }
        }
      ), typeof g.archiveLog == "function" && (g.archiveLogFn = g.archiveLog, b("archiveLog is deprecated. Use archiveLogFn instead")), typeof g.resolvePath == "function" && (g.resolvePathFn = g.resolvePath, b("resolvePath is deprecated. Use resolvePathFn instead")));
    }
    function b(S, I = null, P = "error") {
      const J = [`electron-log.transports.file: ${S}`];
      I && J.push(I), f.transports.console({ data: J, date: /* @__PURE__ */ new Date(), level: P });
    }
    function $(S) {
      w();
      const I = g.resolvePathFn(v, S);
      return h.provide({
        filePath: I,
        writeAsync: !g.sync,
        writeOptions: g.writeOptions
      });
    }
    function re({ fileFilter: S = (I) => I.endsWith(".log") } = {}) {
      w();
      const I = e.dirname(g.resolvePathFn(v));
      return n.existsSync(I) ? n.readdirSync(I).map((P) => e.join(I, P)).filter(S).map((P) => {
        try {
          return {
            path: P,
            lines: n.readFileSync(P, "utf8").split(t.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean) : [];
    }
  }
  function d(f = process.type) {
    switch (f) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return pt;
}
var gt, ar;
function Vn() {
  if (ar) return gt;
  ar = 1;
  const { maxDepth: n, toJSON: t } = De(), { transform: e } = te();
  gt = i;
  function i(s, { externalApi: r }) {
    return Object.assign(o, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: s.isDev ? "silly" : !1,
      transforms: [t, n]
    }), r != null && r.isElectron() ? o : void 0;
    function o(a) {
      var c;
      ((c = a == null ? void 0 : a.variables) == null ? void 0 : c.processType) !== "renderer" && (r == null || r.sendIpc(o.eventId, {
        ...a,
        data: e({ logger: s, message: a, transport: o })
      }));
    }
  }
  return gt;
}
var yt, sr;
function Un() {
  if (sr) return yt;
  sr = 1;
  const n = pn, t = vr, { transform: e } = te(), { removeStyles: i } = Dt(), { toJSON: s, maxDepth: r } = De();
  yt = o;
  function o(a) {
    return Object.assign(c, {
      client: { name: "electron-application" },
      depth: 6,
      level: !1,
      requestOptions: {},
      transforms: [i, s, r],
      makeBodyFn({ message: l }) {
        return JSON.stringify({
          client: c.client,
          data: l.data,
          date: l.date.getTime(),
          level: l.level,
          scope: l.scope,
          variables: l.variables
        });
      },
      processErrorFn({ error: l }) {
        a.processMessage(
          {
            data: [`electron-log: can't POST ${c.url}`, l],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl: l, requestOptions: u, body: d }) {
        const h = (l.startsWith("https:") ? t : n).request(l, {
          method: "POST",
          ...u,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": d.length,
            ...u.headers
          }
        });
        return h.write(d), h.end(), h;
      }
    });
    function c(l) {
      if (!c.url)
        return;
      const u = c.makeBodyFn({
        logger: a,
        message: { ...l, data: e({ logger: a, message: l, transport: c }) },
        transport: c
      }), d = c.sendRequestFn({
        serverUrl: c.url,
        requestOptions: c.requestOptions,
        body: Buffer.from(u, "utf8")
      });
      d.on("error", (f) => c.processErrorFn({
        error: f,
        logger: a,
        message: l,
        request: d,
        transport: c
      }));
    }
  }
  return yt;
}
var mt, cr;
function Br() {
  if (cr) return mt;
  cr = 1;
  const n = xr(), t = Rn(), e = On(), i = Cn(), s = Mn(), r = Vn(), o = Un();
  mt = a;
  function a({ dependencies: c, initializeFn: l }) {
    var d;
    const u = new n({
      dependencies: c,
      errorHandler: new t(),
      eventLogger: new e(),
      initializeFn: l,
      isDev: (d = c.externalApi) == null ? void 0 : d.isDev(),
      logId: "default",
      transportFactories: {
        console: i,
        file: s,
        ipc: r,
        remote: o
      },
      variables: {
        processType: "main"
      }
    });
    return u.default = u, u.Logger = n, u.processInternalErrorFn = (f) => {
      u.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", f],
          level: "error"
        }
      });
    }, u;
  }
  return mt;
}
var vt, lr;
function qn() {
  if (lr) return vt;
  lr = 1;
  const n = Lt, t = Tn(), { initialize: e } = An(), i = Br(), s = new t({ electron: n }), r = i({
    dependencies: { externalApi: s },
    initializeFn: e
  });
  vt = r, s.onIpc("__ELECTRON_LOG__", (a, c) => {
    c.scope && r.Logger.getInstance(c).scope(c.scope);
    const l = new Date(c.date);
    o({
      ...c,
      date: l.getTime() ? l : /* @__PURE__ */ new Date()
    });
  }), s.onIpcInvoke("__ELECTRON_LOG__", (a, { cmd: c = "", logId: l }) => {
    switch (c) {
      case "getOptions":
        return {
          levels: r.Logger.getInstance({ logId: l }).levels,
          logId: l
        };
      default:
        return o({ data: [`Unknown cmd '${c}'`], level: "error" }), {};
    }
  });
  function o(a) {
    var c;
    (c = r.Logger.getInstance(a)) == null || c.processMessage(a);
  }
  return vt;
}
var wt, ur;
function zn() {
  if (ur) return wt;
  ur = 1;
  const n = Sr(), t = Br(), e = new n();
  return wt = t({
    dependencies: { externalApi: e }
  }), wt;
}
const Hn = typeof process > "u" || process.type === "renderer" || process.type === "worker", Wn = typeof process == "object" && process.type === "browser";
Hn ? (_r(), Se.exports = kn()) : Wn ? Se.exports = qn() : Se.exports = zn();
var Jn = Se.exports;
const K = /* @__PURE__ */ In(Jn);
class Gn {
  constructor() {
    const t = F.join(H.getPath("userData"), "data", "logs", "app.log");
    K.transports.file.resolvePathFn = () => t, K.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}", K.transports.file.maxSize = 5 * 1024 * 1024, K.transports.console.format = "{h}:{i}:{s} › {text}";
  }
  // 初始化 IPC 监听，供渲染进程调用
  initIpc() {
    Ie.on("system:log", (t, { level: e, message: i, data: s }) => {
      K.scope("Renderer")[e](i, s || "");
    });
  }
  // 主进程直接调用的方法
  info(t, ...e) {
    K.info(t, ...e);
  }
  warn(t, ...e) {
    K.warn(t, ...e);
  }
  error(t, ...e) {
    K.error(t, ...e);
  }
}
const E = new Gn();
function Kn(n) {
  const t = [
    "windows_amd64",
    "windows_arm64",
    "windows_386"
  ];
  for (const e of t) {
    const i = n.frpc.archs[e];
    if (i)
      return {
        version: n.frpc.ver,
        arch: e,
        url: i.url,
        hash: i.hash,
        size: i.size
      };
  }
  throw new Error("未找到 Windows 平台 frpc");
}
class Yn {
  constructor() {
    /** 本地统一名称 */
    y(this, "fileName", "sakurafrp.exe");
  }
  get binDir() {
    return F.join(H.getPath("userData"), "bin");
  }
  get filePath() {
    return F.join(this.binDir, this.fileName);
  }
  exists() {
    return B.existsSync(this.filePath);
  }
  async download(t, e, i) {
    B.mkdirSync(this.binDir, { recursive: !0 });
    const s = this.filePath + ".download";
    return new Promise((r, o) => {
      const a = B.createWriteStream(s), c = Le.createHash("md5");
      vr.get(t, (l) => {
        if (l.statusCode !== 200) {
          E.error("下载失败", l.statusCode), o(new Error(`下载失败，HTTP ${l.statusCode}`));
          return;
        }
        const u = Number(l.headers["content-length"] || 0);
        let d = 0;
        l.on("data", (f) => {
          d += f.length, c.update(f), u && i && i(Math.floor(d / u * 100));
        }), l.pipe(a), a.on("finish", () => {
          if (a.close(), e) {
            const f = c.digest("hex");
            if (f !== e) {
              B.unlinkSync(s), E.error("sakurafrp.exe 校验失败", f), o(new Error("sakurafrp.exe 校验失败"));
              return;
            }
          }
          B.renameSync(s, this.filePath), r(this.filePath);
        });
      }).on("error", (l) => {
        B.unlink(s, () => {
        }), o(l);
      });
    });
  }
}
class Qn {
  constructor(t) {
    y(this, "processes", /* @__PURE__ */ new Map());
    y(this, "win");
    this.win = t;
  }
  getFrpcPath() {
    return F.join(H.getPath("userData"), "bin", "sakurafrp.exe");
  }
  /** 是否存在 frpc */
  exists() {
    const t = B.existsSync(this.getFrpcPath());
    return E.info(`检查frpc文件是否存在: ${t}, 路径: ${this.getFrpcPath()}`), t;
  }
  /** 启动隧道 */
  startTunnel(t, e) {
    if (E.info(`开始启动隧道: ${e}，使用token: ${t}`), !this.exists())
      throw E.error("frpc 不存在"), new Error("frpc 不存在");
    if (this.processes.has(e))
      throw E.error(`隧道 ${e} 已在运行`), new Error(`隧道 ${e} 已在运行`);
    const i = this.getFrpcPath();
    E.info(`使用frpc路径: ${i}`);
    const s = fn(i, ["-f", `${t}:${e}`], {
      windowsHide: !0
    });
    this.processes.set(e, {
      tunnelId: e,
      process: s
    }), E.info(`隧道 ${e} 进程已启动`), s.stdout.on("data", (r) => {
      E.info(`隧道 ${e} 输出: ${r.toString()}`), this.sendLog(e, r.toString(), "stdout");
    }), s.stderr.on("data", (r) => {
      E.warn(`隧道 ${e} 错误: ${r.toString()}`), this.sendLog(e, r.toString(), "stderr");
    }), s.on("close", (r) => {
      E.info(`隧道 ${e} 进程已退出，code=${r}`), this.sendLog(e, `进程已退出，code=${r}`, "close"), this.processes.delete(e);
    }), s.on("error", (r) => {
      E.error(`隧道 ${e} 发生错误: ${r.message}`), this.sendLog(e, r.message, "error");
    });
  }
  /** 停止隧道 */
  stopTunnel(t) {
    E.info(`停止隧道: ${t}`);
    const e = this.processes.get(t);
    if (!e) {
      E.warn(`尝试停止不存在的隧道: ${t}`);
      return;
    }
    e.process.kill(), this.processes.delete(t), E.info(`隧道 ${t} 已停止`);
  }
  /** 停止全部 */
  stopAll() {
    E.info("停止所有隧道进程");
    for (const [t, e] of this.processes)
      E.info(`停止隧道: ${t}`), e.process.kill(), this.processes.delete(t);
  }
  /** 推送日志到前端 */
  sendLog(t, e, i) {
    E.info(`发送日志到前端: 隧道${t}, 类型${i}`), this.win.webContents.send("frpc:log", {
      tunnelId: t,
      message: e,
      type: i,
      time: Date.now()
    });
  }
}
var Lr = {}, Pe = {}, Z = {}, de = {}, Be = p && p.__assign || function() {
  return Be = Object.assign || function(n) {
    for (var t, e = 1, i = arguments.length; e < i; e++) {
      t = arguments[e];
      for (var s in t) Object.prototype.hasOwnProperty.call(t, s) && (n[s] = t[s]);
    }
    return n;
  }, Be.apply(this, arguments);
};
Object.defineProperty(de, "__esModule", { value: !0 });
de.parse = void 0;
var $t = {
  0: "black",
  1: "dark_blue",
  2: "dark_green",
  3: "dark_aqua",
  4: "dark_red",
  5: "dark_purple",
  6: "gold",
  7: "gray",
  8: "dark_gray",
  9: "blue",
  a: "green",
  b: "aqua",
  c: "red",
  d: "light_purple",
  e: "yellow",
  f: "white",
  g: "minecoin_gold"
}, bt = {
  k: "obfuscated",
  l: "bold",
  m: "strikethrough",
  n: "underline",
  o: "italics"
}, L = function(n) {
  return typeof n == "boolean" ? n : typeof n == "string" ? n.toLowerCase() === "true" : !1;
}, Dr = function(n, t) {
  for (var e, i = [{ text: "", color: "white" }], s = 0; s + 1 <= n.length; ) {
    var r = n.charAt(s), o = i[i.length - 1];
    if (r === `
`) {
      i.push({ text: `
`, color: "white" }), s++;
      continue;
    }
    if (r !== t.formattingCharacter) {
      o.text += r, s++;
      continue;
    }
    var a = n.charAt(s + 1).toLowerCase();
    if (s += 2, a === "r") {
      i.push({ text: "", color: "white" });
      continue;
    }
    a in bt ? o.text.length > 0 ? i.push(Be(Be({}, o), (e = { text: "" }, e[bt[a]] = !0, e))) : o[bt[a]] = !0 : a in $t && i.push({ text: "", color: $t[a] });
  }
  return i;
}, Pr = function(n, t, e) {
  var i, s, r = Dr(n.text || n.translate || "", t), o = r[0];
  if ((e && L(e.bold) && !L(n.bold) || L(n.bold)) && (o.bold = !0), (e && L(e.italic) && !L(n.italic) || L(n.italic)) && (o.italics = !0), (e && L(e.underlined) && !L(n.underlined) || L(n.underlined)) && (o.underline = !0), (e && L(e.strikethrough) && !L(n.strikethrough) || L(n.strikethrough)) && (o.strikethrough = !0), (e && L(e.obfuscated) && !L(n.obfuscated) || L(n.obfuscated)) && (o.obfuscated = !0), n.color && (o.color = $t[(s = (i = n.color) !== null && i !== void 0 ? i : e == null ? void 0 : e.color) !== null && s !== void 0 ? s : "white"] || n.color), n.extra)
    for (var a = 0, c = n.extra; a < c.length; a++) {
      var l = c[a];
      r.push.apply(r, Pr(l, t, n));
    }
  return r;
};
de.parse = function(n, t) {
  t = Object.assign({
    formattingCharacter: "§"
  }, t);
  var e;
  switch (typeof n) {
    case "string": {
      e = Dr(n, t);
      break;
    }
    case "object": {
      e = Pr(n, t);
      break;
    }
    default:
      throw new Error("Unexpected server MOTD type: " + typeof n);
  }
  return e.filter(function(i) {
    return i.text.length > 0;
  });
};
var ke = {}, Zn = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(ke, "__esModule", { value: !0 });
ke.clean = void 0;
var Xn = Zn(D);
ke.clean = function(n, t) {
  return Xn.default(typeof n == "string" || Array.isArray(n), "Expected 'text' to be typeof 'string' or 'array', received '" + typeof n + "'"), t = Object.assign({
    formattingCharacter: "§"
  }, t), typeof n == "string" ? n.replace(new RegExp(t.formattingCharacter + "[0-9a-gk-or]", "g"), "") : n.map(function(e) {
    return e.text;
  }).join("");
};
var Fe = {}, Pt = {};
Object.defineProperty(Pt, "__esModule", { value: !0 });
var eo = (
  /** @class */
  function() {
    function n(t) {
      this.list = [];
      for (var e in t)
        this.list.push({
          name: e,
          hex: t[e],
          sum: dr(t[e])
        });
    }
    return n.prototype.closest = function(t) {
      for (var e = dr(t), i = null, s = 1 / 0, r = 0, o = this.list; r < o.length; r++) {
        var a = o[r], c = Math.abs(e - a.sum);
        (i === null || c < s) && (i = a, s = c);
      }
      return i;
    }, n;
  }()
), dr = function(n) {
  var t = 0;
  n = n.replace("#", "");
  var e = n.substring(0, 2), i = n.substring(2, 4), s = n.substring(4, 6);
  return t = Math.sqrt(Math.pow(parseInt(e, 16), 2) + Math.pow(parseInt(i, 16), 2) + Math.pow(parseInt(s, 16), 2)), t;
};
Pt.default = eo;
var kr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Fe, "__esModule", { value: !0 });
Fe.format = void 0;
var to = kr(D), ro = de, no = kr(Pt), Et = {
  black: "0",
  dark_blue: "1",
  dark_green: "2",
  dark_aqua: "3",
  dark_red: "4",
  dark_purple: "5",
  gold: "6",
  gray: "7",
  dark_gray: "8",
  blue: "9",
  green: "a",
  aqua: "b",
  red: "c",
  light_purple: "d",
  yellow: "e",
  white: "f",
  minecoin_gold: "g"
}, oo = {
  black: "#000000",
  dark_blue: "#0000AA",
  dark_green: "#00AA00",
  dark_aqua: "#00AAAA",
  dark_red: "#AA0000",
  dark_purple: "#AA00AA",
  gold: "#FFAA00",
  gray: "#AAAAAA",
  dark_gray: "#555555",
  blue: "#5555FF",
  green: "#55FF55",
  aqua: "#55FFFF",
  red: "#FF5555",
  light_purple: "#FF55FF",
  yellow: "#FFFF55",
  white: "#FFFFFF"
}, io = new no.default(oo);
Fe.format = function(n, t) {
  to.default(typeof n == "string" || Array.isArray(n), "Expected 'input' to be typeof 'array' or typeof 'string', got '" + typeof n + "'"), typeof n == "string" && (n = ro.parse(n, t));
  for (var e = Object.assign({
    formattingCharacter: "§",
    replaceNearestColor: !0
  }, t), i = "", s = 0, r = n; s < r.length; s++) {
    var o = r[s];
    if (o.color) {
      var a = Et[o.color];
      if (a)
        i += e.formattingCharacter + Et[o.color];
      else if (e.replaceNearestColor) {
        var c = io.closest(o.color);
        if (c) {
          var l = Et[c.name];
          l && (i += e.formattingCharacter + l);
        }
      }
    }
    o.bold && (i += e.formattingCharacter + "l"), o.italics && (i += e.formattingCharacter + "o"), o.underline && (i += e.formattingCharacter + "n"), o.strikethrough && (i += e.formattingCharacter + "m"), o.obfuscated && (i += e.formattingCharacter + "k"), i += o.text;
  }
  return i;
};
var Te = {}, ao = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Te, "__esModule", { value: !0 });
Te.toHTML = void 0;
var so = ao(D), co = {
  black: { styles: { color: "#000000" } },
  dark_blue: { styles: { color: "#0000AA" } },
  dark_green: { styles: { color: "#00AA00" } },
  dark_aqua: { styles: { color: "#00AAAA" } },
  dark_red: { styles: { color: "#AA0000" } },
  dark_purple: { styles: { color: "#AA00AA" } },
  gold: { styles: { color: "#FFAA00" } },
  gray: { styles: { color: "#AAAAAA" } },
  dark_gray: { styles: { color: "#555555" } },
  blue: { styles: { color: "#5555FF" } },
  green: { styles: { color: "#55FF55" } },
  aqua: { styles: { color: "#55FFFF" } },
  red: { styles: { color: "#FF5555" } },
  light_purple: { styles: { color: "#FF55FF" } },
  yellow: { styles: { color: "#FFFF55" } },
  white: { styles: { color: "#FFFFFF" } },
  minecoin_gold: { styles: { color: "#DDD605" } },
  obfuscated: { classes: ["minecraft-formatting-obfuscated"] },
  bold: { styles: { "font-weight": "bold" } },
  strikethrough: { styles: { "text-decoration": "line-through" } },
  underline: { styles: { "text-decoration": "underline" } },
  italics: { styles: { "font-style": "italic" } }
};
Te.toHTML = function(n, t) {
  so.default(Array.isArray(n), "Expected 'tree' to be typeof 'array', received '" + typeof n + "'");
  for (var e = Object.assign({
    serializers: co,
    rootTag: "span"
  }, t), i = "<" + e.rootTag + ">", s = 0, r = n; s < r.length; s++) {
    var o = r[s], a = [], c = {};
    for (var l in o)
      if (l !== "text") {
        var u = e.serializers[l === "color" ? o[l] : l];
        if (u) {
          if (u.classes && u.classes.length > 0 && a.push.apply(a, u.classes), u.styles)
            for (var d in u.styles)
              d in c || (c[d] = []), c[d].push(u.styles[d]);
        } else l === "color" && ("color" in c || (c.color = []), c.color.push(o[l]));
      }
    var f = o.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    i += "<span" + (a.length > 0 ? ' class="' + a.join(" ") + '"' : "") + (Object.keys(c).length > 0 ? ' style="' + Object.entries(c).map(function(h) {
      return h[0] + ": " + h[1].join(" ") + ";";
    }).join(" ") + '"' : "") + ">" + f + "</span>";
  }
  return i += "</" + e.rootTag + ">", i;
};
(function(n) {
  Object.defineProperty(n, "__esModule", { value: !0 }), n.toHTML = n.format = n.clean = n.parse = void 0;
  var t = de;
  Object.defineProperty(n, "parse", { enumerable: !0, get: function() {
    return t.parse;
  } });
  var e = ke;
  Object.defineProperty(n, "clean", { enumerable: !0, get: function() {
    return e.clean;
  } });
  var i = Fe;
  Object.defineProperty(n, "format", { enumerable: !0, get: function() {
    return i.format;
  } });
  var s = Te;
  Object.defineProperty(n, "toHTML", { enumerable: !0, get: function() {
    return s.toHTML;
  } });
})(Z);
var W = {}, ee = {}, lo = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
};
Object.defineProperty(ee, "__esModule", { value: !0 });
ee.writeVarInt = ee.readVarInt = void 0;
function uo(n) {
  return lo(this, void 0, void 0, function* () {
    let t = 0, e = 0, i, s;
    do {
      if (t > 4)
        throw new Error("VarInt exceeds data bounds");
      if (i = yield n(), s = i & 127, e |= s << 7 * t, t++, t > 5)
        throw new Error("VarInt is too big");
    } while (i & 128);
    return e;
  });
}
ee.readVarInt = uo;
function fo(n) {
  let t = Buffer.alloc(0);
  do {
    let e = n & 127;
    n >>>= 7, n != 0 && (e |= 128), t = Buffer.concat([t, Buffer.from([e])]);
  } while (n != 0);
  return t;
}
ee.writeVarInt = fo;
var _ = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, ho = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(W, "__esModule", { value: !0 });
const po = ho(wr), go = ue, Fr = Q, _t = ee, he = new Fr.TextEncoder(), pe = new Fr.TextDecoder("utf8");
class yo extends go.EventEmitter {
  constructor() {
    super(...arguments), this.isConnected = !1, this.socket = null, this.data = Buffer.alloc(0);
  }
  connect(t) {
    return new Promise((e, i) => {
      this.socket = po.default.createConnection(t);
      const s = () => {
        var c, l, u, d;
        this.isConnected = !0, (c = this.socket) === null || c === void 0 || c.removeListener("connect", s), (l = this.socket) === null || l === void 0 || l.removeListener("error", r), (u = this.socket) === null || u === void 0 || u.removeListener("timeout", o), (d = this.socket) === null || d === void 0 || d.removeListener("close", a), e();
      }, r = (c) => {
        var l;
        (l = this.socket) === null || l === void 0 || l.destroy(), i(c);
      }, o = () => _(this, void 0, void 0, function* () {
        var c;
        (c = this.socket) === null || c === void 0 || c.destroy(), i(new Error("Server is offline or unreachable"));
      }), a = (c) => {
        var l;
        this.isConnected = !1, (l = this.socket) === null || l === void 0 || l.destroy(), c || i(), this.emit("close");
      };
      this.socket.on("data", (c) => {
        this.data = Buffer.concat([this.data, c]), this.emit("data");
      }), this.socket.on("connect", () => s()), this.socket.on("error", (c) => r(c)), this.socket.on("timeout", () => o()), this.socket.on("close", (c) => a(c));
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(t) {
    this.writeUInt8(t);
  }
  readBytes(t) {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(t);
      const e = this.data.slice(0, t);
      return this.data = this.data.slice(t), e;
    });
  }
  writeBytes(t) {
    this.data = Buffer.concat([this.data, t]);
  }
  readUInt8() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const t = this.data.readUInt8(0);
      return this.data = this.data.slice(1), t;
    });
  }
  writeUInt8(t) {
    const e = Buffer.alloc(1);
    e.writeUInt8(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt8() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const t = this.data.readInt8(0);
      return this.data = this.data.slice(1), t;
    });
  }
  writeInt8(t) {
    const e = Buffer.alloc(1);
    e.writeInt8(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt16BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readUInt16BE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeUInt16BE(t) {
    const e = Buffer.alloc(2);
    e.writeUInt16BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt16BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readInt16BE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeInt16BE(t) {
    const e = Buffer.alloc(2);
    e.writeInt16BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt16LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readUInt16LE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeUInt16LE(t) {
    const e = Buffer.alloc(2);
    e.writeUInt16LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt16LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readInt16LE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeInt16LE(t) {
    const e = Buffer.alloc(2);
    e.writeInt16LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt32BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readUInt32BE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeUInt32BE(t) {
    const e = Buffer.alloc(4);
    e.writeUInt32BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt32BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readInt32BE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeInt32BE(t) {
    const e = Buffer.alloc(4);
    e.writeInt32BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt32LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readUInt32LE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeUInt32LE(t) {
    const e = Buffer.alloc(4);
    e.writeUInt32LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt32LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readInt32LE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeInt32LE(t) {
    const e = Buffer.alloc(4);
    e.writeInt32LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt64BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigUInt64BE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeUInt64BE(t) {
    const e = Buffer.alloc(8);
    e.writeBigUInt64BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt64BE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigInt64BE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeInt64BE(t) {
    const e = Buffer.alloc(8);
    e.writeBigInt64BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt64LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigUInt64LE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeUInt64LE(t) {
    const e = Buffer.alloc(8);
    e.writeBigUInt64LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt64LE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigInt64LE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeInt64LE(t) {
    const e = Buffer.alloc(8);
    e.writeBigInt64LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readFloatBE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readFloatBE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeFloatBE(t) {
    const e = Buffer.alloc(4);
    e.writeFloatBE(t), this.data = Buffer.concat([this.data, e]);
  }
  readFloatLE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readFloatLE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeFloatLE(t) {
    const e = Buffer.alloc(4);
    e.writeFloatLE(t), this.data = Buffer.concat([this.data, e]);
  }
  readDoubleBE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readDoubleBE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeDoubleBE(t) {
    const e = Buffer.alloc(8);
    e.writeDoubleBE(t), this.data = Buffer.concat([this.data, e]);
  }
  readDoubleLE() {
    return _(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readDoubleLE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeDoubleLE(t) {
    const e = Buffer.alloc(8);
    e.writeDoubleLE(t), this.data = Buffer.concat([this.data, e]);
  }
  readVarInt() {
    return _(this, void 0, void 0, function* () {
      return yield (0, _t.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(t) {
    this.writeBytes((0, _t.writeVarInt)(t));
  }
  readString(t) {
    return _(this, void 0, void 0, function* () {
      const e = yield this.readBytes(t);
      return pe.decode(e);
    });
  }
  writeString(t) {
    this.writeBytes(he.encode(t));
  }
  readStringVarInt() {
    return _(this, void 0, void 0, function* () {
      const t = yield this.readVarInt(), e = yield this.readBytes(t);
      return pe.decode(e);
    });
  }
  writeStringVarInt(t) {
    const e = he.encode(t);
    this.writeVarInt(e.byteLength), this.writeBytes(e);
  }
  readStringNT() {
    return _(this, void 0, void 0, function* () {
      let t = Buffer.alloc(0), e;
      for (; (e = yield this.readByte()) !== 0; )
        t = Buffer.concat([t, Buffer.from([e])]);
      return pe.decode(t);
    });
  }
  writeStringNT(t) {
    const e = he.encode(t);
    this.writeBytes(e), this.writeByte(0);
  }
  writeStringBytes(t) {
    this.writeBytes(he.encode(t));
  }
  readStringUntil(t) {
    return _(this, void 0, void 0, function* () {
      let e = Buffer.alloc(0), i;
      for (; (i = yield this.readByte()) !== t; )
        e = Buffer.concat([e, Buffer.from([i])]);
      return pe.decode(e);
    });
  }
  flush(t = !0) {
    return this.socket ? new Promise((e, i) => {
      var s;
      let r = this.data;
      t && (r = Buffer.concat([(0, _t.writeVarInt)(r.byteLength), r])), (s = this.socket) === null || s === void 0 || s.write(r, (o) => {
        if (o)
          return i(o);
        e();
      }), this.data = Buffer.alloc(0);
    }) : Promise.resolve();
  }
  close() {
    var t, e, i;
    (t = this.socket) === null || t === void 0 || t.removeAllListeners(), (e = this.socket) === null || e === void 0 || e.end(), (i = this.socket) === null || i === void 0 || i.destroy();
  }
  ensureBufferedData(t) {
    return _(this, void 0, void 0, function* () {
      return this.data.byteLength >= t ? Promise.resolve() : this._waitForData(t);
    });
  }
  _waitForData(t = 1) {
    return new Promise((e, i) => {
      const s = () => {
        this.data.byteLength >= t && (this.removeListener("data", s), this.removeListener("close", r), e());
      }, r = () => {
        this.removeListener("data", s), this.removeListener("close", r), i(new Error("Socket closed unexpectedly while waiting for data"));
      };
      this.on("data", () => s()), this.on("close", () => r());
    });
  }
}
W.default = yo;
var z = {}, mo = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(z, "__esModule", { value: !0 });
z.resolveSRV = void 0;
const vo = mo(gn);
function wo(n, t = "tcp") {
  return new Promise((e) => {
    vo.default.resolveSrv(`_minecraft._${t}.${n}`, (i, s) => {
      if (i || s.length < 1)
        return e(null);
      const r = s[0];
      e({ host: r.name, port: r.port });
    });
  });
}
z.resolveSRV = wo;
var bo = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, kt = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Pe, "__esModule", { value: !0 });
Pe.status = void 0;
const O = kt(D), Eo = kt(Le), ge = Z, _o = kt(W), xo = z;
function So(n, t = 25565, e) {
  return n = n.trim(), (0, O.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, O.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, O.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, O.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, O.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, O.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, O.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, O.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, O.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, O.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, O.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => bo(this, void 0, void 0, function* () {
    var r, o, a, c;
    const l = new _o.default(), u = setTimeout(() => {
      l == null || l.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let d = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (d = yield (0, xo.resolveSRV)(n), d && (n = d.host, t = d.port)), yield l.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 }), l.writeVarInt(0), l.writeVarInt(47), l.writeStringVarInt(n), l.writeUInt16BE(t), l.writeVarInt(1), yield l.flush(), l.writeVarInt(0), yield l.flush();
      let f;
      {
        const g = yield l.readVarInt();
        yield l.ensureBufferedData(g);
        const w = yield l.readVarInt();
        if (w !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + w);
        f = JSON.parse(yield l.readStringVarInt());
      }
      const h = Eo.default.randomBytes(8).readBigInt64BE();
      l.writeVarInt(1), l.writeInt64BE(h), yield l.flush();
      const m = Date.now();
      {
        const g = yield l.readVarInt();
        yield l.ensureBufferedData(g);
        const w = yield l.readVarInt();
        if (w !== 1)
          throw new Error("Expected server to send packet type 0x01, received " + w);
        if ((yield l.readInt64BE()) !== h)
          throw new Error("Ping payload did not match received payload");
      }
      const v = (0, ge.parse)(f.description);
      clearTimeout(u), l.close(), i({
        version: {
          name: f.version.name,
          protocol: f.version.protocol
        },
        players: {
          online: f.players.online,
          max: f.players.max,
          sample: (a = f.players.sample) !== null && a !== void 0 ? a : null
        },
        motd: {
          raw: (0, ge.format)(v),
          clean: (0, ge.clean)(v),
          html: (0, ge.toHTML)(v)
        },
        favicon: (c = f.favicon) !== null && c !== void 0 ? c : null,
        srvRecord: d,
        roundTripLatency: Date.now() - m
      });
    } catch (d) {
      clearTimeout(u), l == null || l.close(), s(d);
    }
  }));
}
Pe.status = So;
var Ae = {}, Io = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Tr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Ae, "__esModule", { value: !0 });
Ae.statusFE = void 0;
const C = Tr(D), $o = Tr(W), Bo = z;
function Lo(n, t = 25565, e) {
  return process.emitWarning("Use of statusFE() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), n = n.trim(), (0, C.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, C.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, C.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, C.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, C.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, C.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, C.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, C.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, C.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, C.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, C.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => Io(this, void 0, void 0, function* () {
    var r, o;
    const a = new $o.default(), c = setTimeout(() => {
      a == null || a.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, Bo.resolveSRV)(n), l && (n = l.host, t = l.port)), yield a.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 }), a.writeByte(254), yield a.flush(!1);
      {
        const u = yield a.readByte();
        if (u !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + u);
        const d = yield a.readInt16BE(), f = yield a.readBytes(d * 2), [h, m, v] = f.swap16().toString("utf16le").split("§");
        a.close(), clearTimeout(c), i({
          players: {
            online: parseInt(m),
            max: parseInt(v)
          },
          motd: h,
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(c), a == null || a.close(), s(l);
    }
  }));
}
Ae.statusFE = Lo;
var Re = {}, Do = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Ar = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Re, "__esModule", { value: !0 });
Re.statusFE01 = void 0;
const j = Ar(D), ye = Z, Po = Ar(W), ko = z;
function Fo(n, t = 25565, e) {
  return process.emitWarning("Use of statusFE01() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), n = n.trim(), (0, j.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, j.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, j.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, j.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, j.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, j.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, j.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, j.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, j.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, j.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, j.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => Do(this, void 0, void 0, function* () {
    var r, o;
    const a = new Po.default(), c = setTimeout(() => {
      a == null || a.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, ko.resolveSRV)(n), l && (n = l.host, t = l.port)), yield a.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 }), a.writeBytes(Uint8Array.from([254, 1])), yield a.flush(!1);
      {
        const u = yield a.readByte();
        if (u !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + u);
        const d = yield a.readInt16BE(), f = yield a.readBytes(d * 2), [h, m, v, g, w] = f.slice(6).swap16().toString("utf16le").split("\0"), b = (0, ye.parse)(v);
        a.close(), clearTimeout(c), i({
          protocolVersion: parseInt(h),
          version: m,
          players: {
            online: parseInt(g),
            max: parseInt(w)
          },
          motd: {
            raw: (0, ye.format)(b),
            clean: (0, ye.clean)(b),
            html: (0, ye.toHTML)(b)
          },
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(c), a == null || a.close(), s(l);
    }
  }));
}
Re.statusFE01 = Fo;
var Oe = {}, To = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Rr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Oe, "__esModule", { value: !0 });
Oe.statusFE01FA = void 0;
const N = Rr(D), me = Z, Ao = Q, Ro = Rr(W), Oo = z, Co = new Ao.TextEncoder();
function jo(n, t = 25565, e) {
  return process.emitWarning("Use of statusFE01FA() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), n = n.trim(), (0, N.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, N.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, N.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, N.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, N.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, N.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, N.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, N.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, N.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, N.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, N.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => To(this, void 0, void 0, function* () {
    var r, o;
    const a = new Ro.default(), c = setTimeout(() => {
      a == null || a.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, Oo.resolveSRV)(n), l && (n = l.host, t = l.port)), yield a.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 });
      {
        const u = Co.encode(n);
        a.writeBytes(Uint8Array.from([254, 1, 250])), a.writeInt16BE(11), a.writeStringBytes("MC|PingHost"), a.writeInt16BE(7 + u.byteLength), a.writeByte(74), a.writeInt16BE(u.length), a.writeBytes(u), a.writeInt16BE(t), yield a.flush(!1);
      }
      {
        const u = yield a.readByte();
        if (u !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + u);
        const d = yield a.readInt16BE(), f = yield a.readBytes(d * 2), [h, m, v, g, w] = f.slice(6).swap16().toString("utf16le").split("\0"), b = (0, me.parse)(v);
        a.close(), clearTimeout(c), i({
          protocolVersion: parseInt(h),
          version: m,
          players: {
            online: parseInt(g),
            max: parseInt(w)
          },
          motd: {
            raw: (0, me.format)(b),
            clean: (0, me.clean)(b),
            html: (0, me.toHTML)(b)
          },
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(c), a == null || a.close(), s(l);
    }
  }));
}
Oe.statusFE01FA = jo;
var Ce = {}, No = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Or = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Ce, "__esModule", { value: !0 });
Ce.statusLegacy = void 0;
const M = Or(D), ve = Z, Mo = Q, Vo = Or(W), Uo = z, qo = new Mo.TextDecoder("utf-16be");
function zo(n, t = 25565, e) {
  return n = n.trim(), (0, M.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, M.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, M.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, M.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, M.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, M.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, M.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, M.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, M.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, M.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, M.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => No(this, void 0, void 0, function* () {
    var r, o;
    const a = new Vo.default(), c = setTimeout(() => {
      a == null || a.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, Uo.resolveSRV)(n), l && (n = l.host, t = l.port)), yield a.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 }), a.writeBytes(Uint8Array.from([254, 1])), yield a.flush(!1);
      let u, d, f, h, m;
      {
        if ((yield a.readByte()) !== 255)
          throw new Error("Packet returned from server was unexpected type");
        const w = yield a.readUInt16BE(), b = qo.decode(yield a.readBytes(w * 2));
        if (b[0] === "§" || b[1] === "1") {
          const $ = b.split("\0");
          u = parseInt($[1]), d = $[2], f = $[3], h = parseInt($[4]), m = parseInt($[5]);
        } else {
          const $ = b.split("§");
          u = null, d = null, f = $[0], h = parseInt($[1]), m = parseInt($[2]);
        }
      }
      a.close(), clearTimeout(c);
      const v = (0, ve.parse)(f);
      i({
        version: d === null && u === null ? null : {
          name: d,
          protocol: u
        },
        players: {
          online: h,
          max: m
        },
        motd: {
          raw: (0, ve.format)(v),
          clean: (0, ve.clean)(v),
          html: (0, ve.toHTML)(v)
        },
        srvRecord: l
      });
    } catch (l) {
      clearTimeout(c), a == null || a.close(), s(l);
    }
  }));
}
Ce.statusLegacy = zo;
var je = {}, fe = {}, x = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Ho = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(fe, "__esModule", { value: !0 });
const Wo = Ho(br), Jo = ue, Cr = Q, xt = ee, we = new Cr.TextEncoder(), Go = new Cr.TextDecoder("utf-8");
class Ko extends Jo.EventEmitter {
  constructor(t, e) {
    super(), this.data = Buffer.alloc(0), this.host = t, this.port = e, this.socket = Wo.default.createSocket("udp4"), this.socket.on("message", (i) => {
      this.data = Buffer.concat([this.data, i]), this.emit("data");
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(t) {
    this.writeUInt8(t);
  }
  readBytes(t) {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(t);
      const e = this.data.slice(0, t);
      return this.data = this.data.slice(t), e;
    });
  }
  writeBytes(t) {
    this.data = Buffer.concat([this.data, t]);
  }
  readUInt8() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const t = this.data.readUInt8(0);
      return this.data = this.data.slice(1), t;
    });
  }
  writeUInt8(t) {
    const e = Buffer.alloc(1);
    e.writeUInt8(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt8() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(1);
      const t = this.data.readInt8(0);
      return this.data = this.data.slice(1), t;
    });
  }
  writeInt8(t) {
    const e = Buffer.alloc(1);
    e.writeInt8(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt16BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readUInt16BE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeUInt16BE(t) {
    const e = Buffer.alloc(2);
    e.writeUInt16BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt16BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readInt16BE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeInt16BE(t) {
    const e = Buffer.alloc(2);
    e.writeInt16BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt16LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readUInt16LE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeUInt16LE(t) {
    const e = Buffer.alloc(2);
    e.writeUInt16LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt16LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(2);
      const t = this.data.readInt16LE(0);
      return this.data = this.data.slice(2), t;
    });
  }
  writeInt16LE(t) {
    const e = Buffer.alloc(2);
    e.writeInt16LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt32BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readUInt32BE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeUInt32BE(t) {
    const e = Buffer.alloc(4);
    e.writeUInt32BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt32BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readInt32BE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeInt32BE(t) {
    const e = Buffer.alloc(4);
    e.writeInt32BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt32LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readUInt32LE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeUInt32LE(t) {
    const e = Buffer.alloc(4);
    e.writeUInt32LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt32LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readInt32LE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeInt32LE(t) {
    const e = Buffer.alloc(4);
    e.writeInt32LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt64BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigUInt64BE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeUInt64BE(t) {
    const e = Buffer.alloc(8);
    e.writeBigUInt64BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt64BE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigInt64BE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeInt64BE(t) {
    const e = Buffer.alloc(8);
    e.writeBigInt64BE(t), this.data = Buffer.concat([this.data, e]);
  }
  readUInt64LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigUInt64LE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeUInt64LE(t) {
    const e = Buffer.alloc(8);
    e.writeBigUInt64LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readInt64LE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readBigInt64LE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeInt64LE(t) {
    const e = Buffer.alloc(8);
    e.writeBigInt64LE(t), this.data = Buffer.concat([this.data, e]);
  }
  readFloatBE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readFloatBE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeFloatBE(t) {
    const e = Buffer.alloc(4);
    e.writeFloatBE(t), this.data = Buffer.concat([this.data, e]);
  }
  readFloatLE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(4);
      const t = this.data.readFloatLE(0);
      return this.data = this.data.slice(4), t;
    });
  }
  writeFloatLE(t) {
    const e = Buffer.alloc(4);
    e.writeFloatLE(t), this.data = Buffer.concat([this.data, e]);
  }
  readDoubleBE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readDoubleBE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeDoubleBE(t) {
    const e = Buffer.alloc(8);
    e.writeDoubleBE(t), this.data = Buffer.concat([this.data, e]);
  }
  readDoubleLE() {
    return x(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(8);
      const t = this.data.readDoubleLE(0);
      return this.data = this.data.slice(8), t;
    });
  }
  writeDoubleLE(t) {
    const e = Buffer.alloc(8);
    e.writeDoubleLE(t), this.data = Buffer.concat([this.data, e]);
  }
  readVarInt() {
    return x(this, void 0, void 0, function* () {
      return yield (0, xt.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(t) {
    this.writeBytes((0, xt.writeVarInt)(t));
  }
  readString(t) {
    return x(this, void 0, void 0, function* () {
      const e = yield this.readBytes(t);
      return Go.decode(e);
    });
  }
  writeString(t) {
    this.writeBytes(we.encode(t));
  }
  readStringVarInt() {
    return x(this, void 0, void 0, function* () {
      const t = yield this.readVarInt(), e = yield this.readBytes(t);
      return Array.from(e).map((i) => String.fromCodePoint(i)).join("");
    });
  }
  writeStringVarInt(t) {
    const e = we.encode(t);
    this.writeVarInt(e.byteLength), this.writeBytes(e);
  }
  readStringNT() {
    return x(this, void 0, void 0, function* () {
      let t = Buffer.alloc(0), e;
      for (; (e = yield this.readByte()) !== 0; )
        t = Buffer.concat([t, Buffer.from([e])]);
      return Array.from(t).map((i) => String.fromCodePoint(i)).join("");
    });
  }
  readStringNTFollowedBy(t) {
    return x(this, void 0, void 0, function* () {
      let e = Buffer.alloc(0);
      for (; ; ) {
        const i = yield this.readByte();
        if (i === 0 && (yield this.checkUpcomingData(t)))
          break;
        e = Buffer.concat([e, Buffer.from([i])]);
      }
      return Array.from(e).map((i) => String.fromCodePoint(i)).join("");
    });
  }
  checkUpcomingData(t) {
    return x(this, void 0, void 0, function* () {
      let e = 0;
      for (; t.length; ) {
        yield this.ensureBufferedData(e + 1);
        const i = [];
        for (const s of t)
          if (this.data[e] === s[e]) {
            if (e === s.length - 1)
              return s;
            i.push(s);
          }
        t = i, e++;
      }
      return null;
    });
  }
  writeStringNT(t) {
    const e = we.encode(t);
    this.writeBytes(e), this.writeByte(0);
  }
  writeStringBytes(t) {
    this.writeBytes(we.encode(t));
  }
  flush(t = !0) {
    return this.socket ? new Promise((e, i) => {
      let s = this.data;
      t && (s = Buffer.concat([(0, xt.writeVarInt)(s.byteLength), s])), this.socket.send(s, 0, s.byteLength, this.port, this.host, (r) => {
        if (r)
          return i(r);
        e();
      }), this.data = Buffer.alloc(0);
    }) : Promise.resolve();
  }
  close() {
    var t;
    try {
      (t = this.socket) === null || t === void 0 || t.close();
    } catch {
    }
  }
  ensureBufferedData(t) {
    return x(this, void 0, void 0, function* () {
      return this.data.byteLength >= t ? Promise.resolve() : this._waitForData(t);
    });
  }
  _waitForData(t = 1) {
    return new Promise((e, i) => {
      const s = () => {
        this.data.byteLength >= t && (this.removeListener("data", s), this.socket.removeListener("error", r), e());
      }, r = (o) => {
        this.removeListener("data", s), this.socket.removeListener("error", r), i(o);
      };
      this.once("data", () => s()), this.socket.on("error", (o) => r(o));
    });
  }
  hasRemainingData() {
    return this.data.byteLength > 0;
  }
}
fe.default = Ko;
var Yo = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, jr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(je, "__esModule", { value: !0 });
je.statusBedrock = void 0;
const V = jr(D), be = Z, Qo = jr(fe), Zo = z;
function Xo(n, t = 19132, e) {
  return n = n.trim(), (0, V.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, V.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, V.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, V.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, V.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, V.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, V.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, V.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, V.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, V.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, V.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((i, s) => Yo(this, void 0, void 0, function* () {
    var r;
    const o = new Qo.default(n, t), a = setTimeout(() => {
      o == null || o.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
    try {
      let c = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (c = yield (0, Zo.resolveSRV)(n, "udp"), c && (n = c.host, t = c.port)), o.writeByte(1), o.writeInt64BE(BigInt(Date.now())), o.writeBytes(Uint8Array.from([0, 255, 255, 0, 254, 254, 254, 254, 253, 253, 253, 253, 18, 52, 86, 120])), o.writeInt64BE(BigInt(2)), yield o.flush(!1);
      {
        const l = yield o.readByte();
        if (l !== 28)
          throw new Error("Expected server to send packet type 0x1C, received " + l);
        yield o.readInt64BE();
        const u = yield o.readInt64BE();
        yield o.readBytes(16);
        const d = yield o.readInt16BE(), f = yield o.readString(d), [h, m, v, g, w, b, $, re, S, I, P, J] = f.split(";"), ae = (0, be.parse)(m + (re ? `
` + re : ""));
        o.close(), clearTimeout(a), i({
          edition: h,
          motd: {
            raw: (0, be.format)(ae),
            clean: (0, be.clean)(ae),
            html: (0, be.toHTML)(ae)
          },
          version: {
            name: g,
            protocol: parseInt(v)
          },
          players: {
            online: parseInt(w),
            max: parseInt(b)
          },
          serverGUID: u,
          serverID: $,
          gameMode: S,
          gameModeID: parseInt(I),
          portIPv4: P ? parseInt(P) : null,
          portIPv6: J ? parseInt(J) : null,
          srvRecord: c
        });
      }
    } catch (c) {
      clearTimeout(a), o == null || o.close(), s(c);
    }
  }));
}
je.statusBedrock = Xo;
var Ne = {}, ei = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Nr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Ne, "__esModule", { value: !0 });
Ne.queryBasic = void 0;
const T = Nr(D), Ee = Z, ti = Nr(fe), ri = z;
function ni(n, t = 25565, e) {
  var i;
  n = n.trim(), (0, T.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, T.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, T.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, T.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, T.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, T.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, T.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, T.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, T.default)(typeof e.sessionID == "number" || typeof e.sessionID > "u", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof e.sessionID}'`), (0, T.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, T.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, T.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`)));
  const s = ((i = e == null ? void 0 : e.sessionID) !== null && i !== void 0 ? i : 1) & 252645135;
  return new Promise((r, o) => ei(this, void 0, void 0, function* () {
    var a;
    const c = new ti.default(n, t), l = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let u = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (u = yield (0, ri.resolveSRV)(n, "udp"), u && (n = u.host, t = u.port)), c.writeUInt16BE(65277), c.writeByte(9), c.writeInt32BE(s), yield c.flush(!1);
      let d;
      {
        const f = yield c.readByte();
        if (f !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + f);
        const h = yield c.readInt32BE();
        if (s !== h)
          throw new Error("Server session ID mismatch, expected " + s + ", received " + h);
        if (d = parseInt(yield c.readStringNT()), isNaN(d))
          throw new Error("Server sent an invalid challenge token");
      }
      c.writeUInt16BE(65277), c.writeByte(0), c.writeInt32BE(s), c.writeInt32BE(d), yield c.flush(!1);
      {
        const f = yield c.readByte();
        if (f !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + f);
        const h = yield c.readInt32BE();
        if (s !== h)
          throw new Error("Server session ID mismatch, expected " + s + ", received " + h);
        const m = yield c.readStringNT(), v = yield c.readStringNT(), g = yield c.readStringNT(), w = yield c.readStringNT(), b = yield c.readStringNT(), $ = yield c.readInt16LE(), re = yield c.readStringNT(), S = (0, Ee.parse)(m);
        c.close(), clearTimeout(l), r({
          motd: {
            raw: (0, Ee.format)(S),
            clean: (0, Ee.clean)(S),
            html: (0, Ee.toHTML)(S)
          },
          gameType: v,
          map: g,
          players: {
            online: parseInt(w),
            max: parseInt(b)
          },
          hostPort: $,
          hostIP: re
        });
      }
    } catch (u) {
      clearTimeout(l), c == null || c.close(), o(u);
    }
  }));
}
Ne.queryBasic = ni;
var Me = {}, oi = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Mr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Me, "__esModule", { value: !0 });
Me.queryFull = void 0;
const A = Mr(D), _e = Z, ii = Mr(fe), ai = z, si = [
  "gametype",
  "game_id",
  "version",
  "plugins",
  "map",
  "numplayers",
  "maxplayers",
  "hostport",
  "hostip"
].map((n) => Buffer.from(n, "ascii"));
function ci(n, t = 25565, e) {
  var i;
  n = n.trim(), (0, A.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, A.default)(n.length > 0, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, A.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, A.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, A.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, A.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, A.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, A.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, A.default)(typeof e.sessionID == "number" || typeof e.sessionID > "u", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof e.sessionID}'`), (0, A.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, A.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, A.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`)));
  const s = ((i = e == null ? void 0 : e.sessionID) !== null && i !== void 0 ? i : 1) & 252645135;
  return new Promise((r, o) => oi(this, void 0, void 0, function* () {
    var a;
    const c = new ii.default(n, t), l = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let u = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (u = yield (0, ai.resolveSRV)(n, "udp"), u && (n = u.host, t = u.port)), c.writeUInt16BE(65277), c.writeByte(9), c.writeInt32BE(s), yield c.flush(!1);
      let d;
      {
        const f = yield c.readByte();
        if (f !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + f);
        const h = yield c.readInt32BE();
        if (s !== h)
          throw new Error("Server session ID mismatch, expected " + s + ", received " + h);
        if (d = parseInt(yield c.readStringNT()), isNaN(d))
          throw new Error("Server sent an invalid challenge token");
      }
      c.writeUInt16BE(65277), c.writeByte(0), c.writeInt32BE(s), c.writeInt32BE(d), c.writeBytes(Uint8Array.from([0, 0, 0, 0])), yield c.flush(!1);
      {
        const f = yield c.readByte();
        if (f !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + f);
        const h = yield c.readInt32BE();
        if (s !== h)
          throw new Error("Server session ID mismatch, expected " + s + ", received " + h);
        yield c.readBytes(11);
        const m = {}, v = [];
        for (; ; ) {
          const b = yield c.readStringNT();
          if (b.length < 1)
            break;
          let $;
          b === "hostname" ? $ = yield c.readStringNTFollowedBy(si) : $ = yield c.readStringNT(), m[b] = $;
        }
        for (yield c.readBytes(10); ; ) {
          const b = yield c.readStringNT();
          if (b.length < 1)
            break;
          v.push(b);
        }
        const g = (0, _e.parse)(m.hostname), w = m.plugins.split(/(?::|;) */g);
        if (c.close(), c.hasRemainingData())
          throw new Error("Server sent more data than expected");
        clearTimeout(l), r({
          motd: {
            raw: (0, _e.format)(g),
            clean: (0, _e.clean)(g),
            html: (0, _e.toHTML)(g)
          },
          version: m.version,
          software: w[0],
          plugins: w.slice(1),
          map: m.map,
          players: {
            online: parseInt(m.numplayers),
            max: parseInt(m.maxplayers),
            list: v
          },
          hostIP: m.hostip,
          hostPort: parseInt(m.hostport)
        });
      }
    } catch (u) {
      clearTimeout(l), c == null || c.close(), o(u);
    }
  }));
}
Me.queryFull = ci;
var Ve = {}, li = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Vr = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Ve, "__esModule", { value: !0 });
Ve.scanLAN = void 0;
const St = Vr(D), ui = Vr(br), di = Q, fi = new di.TextDecoder("utf8"), hi = /\[MOTD\](.*)\[\/MOTD\]\[AD\](\d{1,5})\[\/AD\]/;
function pi(n) {
  (0, St.default)(typeof n == "object" || typeof n > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof n}'`), typeof n == "object" && ((0, St.default)(typeof n.scanTime == "number" || typeof n.scanTime > "u", `Expected 'options.scanTime' to be a 'number' or 'undefined', got '${typeof n.scanTime}'`), typeof n.scanTime == "number" && (0, St.default)(n.scanTime > 0, `Expected 'options.scanTime' to be greater than or equal to 0, got '${n.scanTime}'`));
  const t = [], e = ui.default.createSocket("udp4");
  return e.on("message", (i, s) => {
    const r = fi.decode(i).match(hi);
    if (!r || r.length < 3)
      return;
    let o = parseInt(r[2]);
    isNaN(o) && (o = 25565), !t.some((a) => a.host === s.address && a.port === o) && t.push({
      host: s.address,
      port: o,
      motd: r[1]
    });
  }), e.bind(4445, () => {
    e.addMembership("224.0.2.60");
  }), new Promise((i, s) => {
    var r;
    const o = setTimeout(() => li(this, void 0, void 0, function* () {
      yield new Promise((a) => e.close(a)), i(t);
    }), (r = n == null ? void 0 : n.scanTime) !== null && r !== void 0 ? r : 5e3);
    e.on("error", (a) => {
      e.close(), clearTimeout(o), s(a);
    });
  });
}
Ve.scanLAN = pi;
var Ue = {}, gi = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Ft = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(Ue, "__esModule", { value: !0 });
Ue.sendVote = void 0;
const U = Ft(D), yi = Ft(Le), mi = Q, vi = Ft(W), wi = new mi.TextEncoder();
function bi(n, t = 8192, e) {
  return n = n.trim(), (0, U.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, U.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, U.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, U.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, U.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, U.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, U.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), (0, U.default)(typeof e.username == "string", `Expected 'options.username' to be an 'string', got '${typeof e.username}'`), (0, U.default)(e.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${e.username.length}`), (0, U.default)(typeof e.token == "string", `Expected 'options.token' to be an 'string', got '${typeof e.token}'`), (0, U.default)(e.token.length > 1, `Expected 'options.token' to have a length greater than 0, got ${e.token.length}`), new Promise((i, s) => gi(this, void 0, void 0, function* () {
    var r, o, a, c, l;
    let u;
    const d = setTimeout(() => {
      u == null || u.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 5e3);
    try {
      u = new vi.default(), yield u.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 });
      let f;
      {
        const h = yield u.readStringUntil(10), m = h.split(" ");
        if (m[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + h);
        if (m[1] !== "2")
          throw new Error("Unsupported Votifier version: " + m[1]);
        f = m[2];
      }
      {
        const h = {
          serviceName: (a = e.serviceName) !== null && a !== void 0 ? a : "minecraft-server-util (https://github.com/PassTheMayo/minecraft-server-util)",
          username: e.username,
          address: (c = e.address) !== null && c !== void 0 ? c : n + ":" + t,
          timestamp: (l = e.timestamp) !== null && l !== void 0 ? l : Date.now(),
          challenge: f
        };
        e.uuid && (h.uuid = e.uuid);
        const m = JSON.stringify(h), v = {
          payload: m,
          signature: yi.default.createHmac("sha256", e.token).update(m).digest("base64")
        }, g = JSON.stringify(v), w = wi.encode(g);
        u.writeInt16BE(29498), u.writeInt16BE(w.byteLength), u.writeBytes(w), yield u.flush(!1);
      }
      {
        const h = yield u.readStringUntil(10), m = JSON.parse(h);
        switch (u.close(), clearTimeout(d), m.status) {
          case "ok": {
            i();
            break;
          }
          case "error": {
            s(new Error(m.cause + ": " + m.error));
            break;
          }
          default: {
            s(new Error("Server sent an unknown response: " + h));
            break;
          }
        }
      }
    } catch (f) {
      clearTimeout(d), u == null || u.close(), s(f);
    }
  }));
}
Ue.sendVote = bi;
var qe = {}, Ei = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Tt = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(qe, "__esModule", { value: !0 });
qe.sendLegacyVote = void 0;
const q = Tt(D), fr = Tt(Le), _i = Tt(W), xi = (n, t) => n.replace(new RegExp(`(?![^\\n]{1,${t}}$)([^\\n]{1,${t}})\\s`, "g"), `$1
`);
function Si(n, t = 8192, e) {
  return n = n.trim(), e.key = e.key.replace(/ /g, "+"), e.key = xi(e.key, 65), (0, q.default)(typeof n == "string", `Expected 'host' to be a 'string', got '${typeof n}'`), (0, q.default)(n.length > 1, `Expected 'host' to have a length greater than 0, got ${n.length}`), (0, q.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, q.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, q.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, q.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, q.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), (0, q.default)(typeof e.username == "string", `Expected 'options.username' to be an 'string', got '${typeof e.username}'`), (0, q.default)(e.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${e.username.length}`), (0, q.default)(typeof e.key == "string", `Expected 'options.key' to be an 'string', got '${typeof e.key}'`), (0, q.default)(e.key.length > 1, `Expected 'options.key' to have a length greater than 0, got ${e.key.length}`), new Promise((i, s) => Ei(this, void 0, void 0, function* () {
    var r, o, a, c;
    let l;
    const u = setTimeout(() => {
      l == null || l.close(), s(new Error("Server is offline or unreachable"));
    }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 5e3);
    try {
      l = new _i.default(), yield l.connect({ host: n, port: t, timeout: (o = e == null ? void 0 : e.timeout) !== null && o !== void 0 ? o : 1e3 * 5 });
      {
        const d = yield l.readStringUntil(10);
        if (d.split(" ")[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + d);
      }
      {
        const d = (a = e.timestamp) !== null && a !== void 0 ? a : Date.now(), f = (c = e.address) !== null && c !== void 0 ? c : n + ":" + t, h = `-----BEGIN PUBLIC KEY-----
${e.key}
-----END PUBLIC KEY-----
`, m = `VOTE
${e.serviceName}
${e.username}
${f}
${d}
`, v = fr.default.publicEncrypt({
          key: h,
          padding: fr.default.constants.RSA_PKCS1_PADDING
        }, Buffer.from(m));
        l.writeBytes(v), yield l.flush(!1);
      }
      clearTimeout(u), l.close(), i();
    } catch (d) {
      clearTimeout(u), l == null || l.close(), s(d);
    }
  }));
}
qe.sendLegacyVote = Si;
var ze = {}, se = p && p.__awaiter || function(n, t, e, i) {
  function s(r) {
    return r instanceof e ? r : new e(function(o) {
      o(r);
    });
  }
  return new (e || (e = Promise))(function(r, o) {
    function a(u) {
      try {
        l(i.next(u));
      } catch (d) {
        o(d);
      }
    }
    function c(u) {
      try {
        l(i.throw(u));
      } catch (d) {
        o(d);
      }
    }
    function l(u) {
      u.done ? r(u.value) : s(u.value).then(a, c);
    }
    l((i = i.apply(n, t || [])).next());
  });
}, Ur = p && p.__importDefault || function(n) {
  return n && n.__esModule ? n : { default: n };
};
Object.defineProperty(ze, "__esModule", { value: !0 });
ze.RCON = void 0;
const k = Ur(D), Ii = ue, $i = Q, Bi = Ur(W), hr = new $i.TextEncoder();
class Li extends Ii.EventEmitter {
  constructor() {
    super(), this.isLoggedIn = !1, this.socket = null, this.requestID = 0;
  }
  get isConnected() {
    return this.socket && this.socket.isConnected || !1;
  }
  connect(t, e = 25575, i = {}) {
    return (0, k.default)(typeof t == "string", `Expected 'host' to be a 'string', got '${typeof t}'`), (0, k.default)(t.length > 1, `Expected 'host' to have a length greater than 0, got ${t.length}`), (0, k.default)(typeof e == "number", `Expected 'port' to be a 'number', got '${typeof e}'`), (0, k.default)(Number.isInteger(e), `Expected 'port' to be an integer, got '${e}'`), (0, k.default)(e >= 0, `Expected 'port' to be greater than or equal to 0, got '${e}'`), (0, k.default)(e <= 65535, `Expected 'port' to be less than or equal to 65535, got '${e}'`), (0, k.default)(typeof i == "object", `Expected 'options' to be an 'object', got '${typeof i}'`), new Promise((s, r) => {
      var o;
      this.socket = new Bi.default();
      const a = setTimeout(() => {
        var c;
        r(new Error("Server is offline or unreachable")), (c = this.socket) === null || c === void 0 || c.close();
      }, (o = i == null ? void 0 : i.timeout) !== null && o !== void 0 ? o : 1e3 * 5);
      this.socket.connect(Object.assign({ host: t, port: e }, i)).then(() => {
        clearTimeout(a), s();
      }).catch((c) => {
        clearTimeout(a), r(c);
      });
    });
  }
  login(t, e = {}) {
    return (0, k.default)(typeof t == "string", `Expected 'password' to be a 'string', got '${typeof t}'`), (0, k.default)(t.length > 1, `Expected 'password' to have a length greater than 0, got ${t.length}`), (0, k.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), new Promise((i, s) => se(this, void 0, void 0, function* () {
      var r;
      if (this.socket === null || !this.socket.isConnected)
        return s(new Error("login() attempted before RCON has connected"));
      const o = setTimeout(() => {
        var c;
        s(new Error("Server is offline or unreachable")), (c = this.socket) === null || c === void 0 || c.close();
      }, (r = e == null ? void 0 : e.timeout) !== null && r !== void 0 ? r : 1e3 * 5);
      this.isLoggedIn = !1;
      const a = hr.encode(t);
      this.socket.writeInt32LE(10 + a.byteLength), this.socket.writeInt32LE(this.requestID++), this.socket.writeInt32LE(3), this.socket.writeBytes(a), this.socket.writeBytes(Uint8Array.from([0, 0])), yield this.socket.flush(!1);
      {
        const c = yield this.socket.readInt32LE();
        this.socket.ensureBufferedData(c), (yield this.socket.readInt32LE()) === -1 && s(new Error("Invalid RCON password"));
        const u = yield this.socket.readInt32LE();
        u !== 2 && s(new Error("Expected server to send packet type 2, received " + u)), yield this.socket.readBytes(2);
      }
      this.isLoggedIn = !0, clearTimeout(o), i(), process.nextTick(() => se(this, void 0, void 0, function* () {
        for (; this.socket !== null && this.socket.isConnected && this.isLoggedIn; )
          try {
            yield this._readPacket();
          } catch (c) {
            this.emit("error", c);
          }
      }));
    }));
  }
  run(t) {
    return se(this, void 0, void 0, function* () {
      if ((0, k.default)(typeof t == "string", `Expected 'command' to be a 'string', got '${typeof t}'`), (0, k.default)(t.length > 0, `Expected 'command' to have a length greater than 0, got ${t.length}`), this.socket === null || !this.socket.isConnected)
        throw new Error("run() attempted before RCON has connected");
      if (!this.isLoggedIn)
        throw new Error("run() attempted before RCON has successfully logged in");
      const e = hr.encode(t), i = this.requestID++;
      return this.socket.writeInt32LE(10 + e.byteLength), this.socket.writeInt32LE(i), this.socket.writeInt32LE(2), this.socket.writeBytes(e), this.socket.writeBytes(Uint8Array.from([0, 0])), yield this.socket.flush(!1), i;
    });
  }
  execute(t) {
    return se(this, void 0, void 0, function* () {
      (0, k.default)(typeof t == "string", `Expected 'command' to be a 'string', got '${typeof t}'`), (0, k.default)(t.length > 1, `Expected 'command' to have a length greater than 0, got ${t.length}`);
      const e = yield this.run(t);
      return new Promise((i) => {
        const s = (r) => {
          r.requestID === e && (this.removeListener("message", s), i(r.message));
        };
        this.on("message", s);
      });
    });
  }
  _readPacket() {
    return se(this, void 0, void 0, function* () {
      if (this.socket === null || !this.socket.isConnected || !this.isLoggedIn)
        return Promise.reject(new Error("Attempted to read packet when socket was disconnected or RCON was not logged in"));
      const t = yield this.socket.readInt32LE();
      yield this.socket.ensureBufferedData(t);
      const e = yield this.socket.readInt32LE();
      if ((yield this.socket.readInt32LE()) === 0) {
        const s = yield this.socket.readStringNT();
        yield this.socket.readBytes(1), this.emit("message", { requestID: e, message: s });
      } else
        yield this.socket.readBytes(t - 8);
    });
  }
  close() {
    var t;
    (t = this.socket) === null || t === void 0 || t.close();
  }
}
ze.RCON = Li;
var He = {};
Object.defineProperty(He, "__esModule", { value: !0 });
He.parseAddress = void 0;
const Di = /^([^:]+)(?::(\d{1,5}))?$/;
function Pi(n, t = 25565) {
  const e = n.match(Di);
  if (!e)
    return null;
  const i = e[2] ? parseInt(e[2]) : t;
  return isNaN(i) || i < 1 || i > 65535 ? null : {
    host: e[1],
    port: i
  };
}
He.parseAddress = Pi;
var qr = {};
Object.defineProperty(qr, "__esModule", { value: !0 });
var zr = {};
Object.defineProperty(zr, "__esModule", { value: !0 });
var Hr = {};
Object.defineProperty(Hr, "__esModule", { value: !0 });
var Wr = {};
Object.defineProperty(Wr, "__esModule", { value: !0 });
var Jr = {};
Object.defineProperty(Jr, "__esModule", { value: !0 });
var Gr = {};
Object.defineProperty(Gr, "__esModule", { value: !0 });
var Kr = {};
Object.defineProperty(Kr, "__esModule", { value: !0 });
var Yr = {};
Object.defineProperty(Yr, "__esModule", { value: !0 });
var Qr = {};
Object.defineProperty(Qr, "__esModule", { value: !0 });
var Zr = {};
Object.defineProperty(Zr, "__esModule", { value: !0 });
var Xr = {};
Object.defineProperty(Xr, "__esModule", { value: !0 });
var en = {};
Object.defineProperty(en, "__esModule", { value: !0 });
(function(n) {
  var t = p && p.__createBinding || (Object.create ? function(i, s, r, o) {
    o === void 0 && (o = r);
    var a = Object.getOwnPropertyDescriptor(s, r);
    (!a || ("get" in a ? !s.__esModule : a.writable || a.configurable)) && (a = { enumerable: !0, get: function() {
      return s[r];
    } }), Object.defineProperty(i, o, a);
  } : function(i, s, r, o) {
    o === void 0 && (o = r), i[o] = s[r];
  }), e = p && p.__exportStar || function(i, s) {
    for (var r in i) r !== "default" && !Object.prototype.hasOwnProperty.call(s, r) && t(s, i, r);
  };
  Object.defineProperty(n, "__esModule", { value: !0 }), e(Pe, n), e(Ae, n), e(Re, n), e(Oe, n), e(Ce, n), e(je, n), e(Ne, n), e(Me, n), e(Ve, n), e(Ue, n), e(qe, n), e(ze, n), e(He, n), e(qr, n), e(zr, n), e(Hr, n), e(Wr, n), e(Jr, n), e(Gr, n), e(Kr, n), e(Yr, n), e(Qr, n), e(Zr, n), e(Xr, n), e(en, n);
})(Lr);
async function ki(n, t, e = 5e3) {
  try {
    return await Lr.status(n, t, { timeout: e });
  } catch (i) {
    throw E.error("获取 Minecraft 状态失败", i), i;
  }
}
class pr extends Error {
  constructor(t) {
    super(`${t} is locked`);
  }
}
const ne = {
  old: /* @__PURE__ */ new Set(),
  young: /* @__PURE__ */ new Set()
}, Fi = 1e3 * 15;
let ce;
const Ti = () => {
  const n = vn.networkInterfaces(), t = /* @__PURE__ */ new Set([void 0, "0.0.0.0"]);
  for (const e of Object.values(n))
    for (const i of e)
      t.add(i.address);
  return t;
}, gr = (n) => new Promise((t, e) => {
  const i = mn.createServer();
  i.unref(), i.on("error", e), i.listen(n, () => {
    const { port: s } = i.address();
    i.close(() => {
      t(s);
    });
  });
}), yr = async (n, t) => {
  if (n.host || n.port === 0)
    return gr(n);
  for (const e of t)
    try {
      await gr({ port: n.port, host: e });
    } catch (i) {
      if (!["EADDRNOTAVAIL", "EINVAL"].includes(i.code))
        throw i;
    }
  return n.port;
}, Ai = function* (n) {
  n && (yield* n), yield 0;
};
async function Ri(n) {
  let t, e = /* @__PURE__ */ new Set();
  if (n && (n.port && (t = typeof n.port == "number" ? [n.port] : n.port), n.exclude)) {
    const s = n.exclude;
    if (typeof s[Symbol.iterator] != "function")
      throw new TypeError("The `exclude` option must be an iterable.");
    for (const r of s) {
      if (typeof r != "number")
        throw new TypeError("Each item in the `exclude` option must be a number corresponding to the port you want excluded.");
      if (!Number.isSafeInteger(r))
        throw new TypeError(`Number ${r} in the exclude option is not a safe integer and can't be used`);
    }
    e = new Set(s);
  }
  ce === void 0 && (ce = setTimeout(() => {
    ce = void 0, ne.old = ne.young, ne.young = /* @__PURE__ */ new Set();
  }, Fi), ce.unref && ce.unref());
  const i = Ti();
  for (const s of Ai(t))
    try {
      if (e.has(s))
        continue;
      let r = await yr({ ...n, port: s }, i);
      for (; ne.old.has(r) || ne.young.has(r); ) {
        if (s !== 0)
          throw new pr(s);
        r = await yr({ ...n, port: s }, i);
      }
      return ne.young.add(r), r;
    } catch (r) {
      if (!["EADDRINUSE", "EACCES"].includes(r.code) && !(r instanceof pr))
        throw r;
    }
  throw new Error("No available ports found");
}
function Oi(n, t) {
  if (!Number.isInteger(n) || !Number.isInteger(t))
    throw new TypeError("`from` and `to` must be integer numbers");
  return function* (i, s) {
    for (let r = i; r <= s; r++)
      yield r;
  }(n, t);
}
class Ci {
  constructor(t) {
    y(this, "config");
    y(this, "udpClient", null);
    y(this, "tcpServer", null);
    y(this, "broadcastTimer", null);
    y(this, "activeConnections", /* @__PURE__ */ new Set());
    this.config = t;
  }
  async start() {
    const t = await Ri({ port: Oi(2e4, 65535) });
    return this.config.localPort || (this.config.localPort = t, console.log(`使用随机端口 ${t}`)), new Promise((e, i) => {
      this.startWithRetry(e, i);
    });
  }
  /**
  * 内部递归启动函数
  */
  startWithRetry(t, e) {
    try {
      this.cleanupTempResources(), this.startTcpProxy(
        () => {
          this.startUdpBroadcaster(), t();
        },
        async (i) => {
          i.code === "EADDRINUSE" ? (console.warn(`[*] 端口 ${this.config.localPort} 被占用，尝试自动递增...`), this.config.localPort += 1, this.config.localPort > 65535 && (this.config.localPort = 2e4), setTimeout(() => this.startWithRetry(t, e), 10)) : e(i);
        }
      );
    } catch (i) {
      e(i);
    }
  }
  startUdpBroadcaster() {
    const t = "224.0.2.60", i = Buffer.from(`[MOTD]${this.config.fakeMotd}[/MOTD][AD]${this.config.localPort}[/AD]`);
    this.udpClient = yn.createSocket({ type: "udp4", reuseAddr: !0 }), this.udpClient.on("error", (s) => console.error(`[UDP Error] ${s.message}`)), this.broadcastTimer = setInterval(() => {
      this.udpClient && this.udpClient.send(i, 0, i.length, 4445, t);
    }, 1500), console.log(`[*] ID: ${this.config.id} UDP 广播已启动`);
  }
  startTcpProxy(t, e) {
    this.tcpServer = Rt.createServer((i) => {
      const s = new Rt.Socket();
      this.activeConnections.add(i), this.activeConnections.add(s);
      const r = () => {
        i.destroy(), s.destroy(), this.activeConnections.delete(i), this.activeConnections.delete(s);
      };
      i.pause(), s.connect(this.config.remotePort, this.config.remoteHost, () => {
        i.resume(), i.pipe(s), s.pipe(i);
      }), i.once("data", (o) => {
        try {
          const c = o.toString("utf8", 0, 100).match(/[a-zA-Z0-9_]{3,16}/);
          c && console.log(`[*] 识别到可能的玩家名: ${c[0]}`);
        } catch {
        }
      }), i.on("error", r), s.on("error", r), i.on("close", r), s.on("close", r), i.setTimeout(3e4), i.on("timeout", () => {
        console.log("[Proxy] 连接超时已切断"), r();
      });
    }), this.tcpServer.on("error", (i) => {
      i.code === "EADDRINUSE" ? e(new Error(`端口 ${this.config.localPort} 已被占用`)) : e(i);
    }), this.tcpServer.listen(this.config.localPort, "0.0.0.0", () => {
      console.log(`[*] TCP 代理就绪: ${this.config.localPort} -> ${this.config.remoteHost}`), t();
    });
  }
  stop() {
    var t, e;
    this.broadcastTimer && clearInterval(this.broadcastTimer), (t = this.udpClient) == null || t.close(), (e = this.tcpServer) == null || e.close(() => {
      console.log(`[*] 代理实例 ${this.config.id} 已完全停止`);
    });
    for (const i of this.activeConnections)
      i.destroy();
    this.activeConnections.clear();
  }
  /**
   * 清理函数：确保递归重试时不会留下半开的服务器
   */
  cleanupTempResources() {
    this.broadcastTimer && (clearInterval(this.broadcastTimer), this.broadcastTimer = null), this.udpClient && (this.udpClient.close(), this.udpClient = null);
  }
}
class ji {
  constructor() {
    y(this, "instances", /* @__PURE__ */ new Map());
  }
  init() {
    Ie.on("mcproxy:start", async (t, e) => {
      if (this.instances.has(e.id)) {
        t.reply("mcproxy:status", { id: e.id, success: !1, message: "该 ID 的实例已在运行", localPort: e.localPort });
        return;
      }
      const i = new Ci(e);
      try {
        await i.start(), this.instances.set(e.id, i), t.reply("mcproxy:status", { id: e.id, success: !0, message: "启动成功", localPort: e.localPort });
      } catch (s) {
        t.reply("mcproxy:status", { id: e.id, success: !1, message: s.message });
      }
    }), Ie.on("mcproxy:stop", (t, e) => {
      const i = this.instances.get(e);
      i && (i.stop(), this.instances.delete(e), t.reply("mcproxy:status", { id: e, success: !1, message: "已停止" }));
    });
  }
}
const Ni = new ji(), oe = new _n(), It = new Yn();
Ni.init();
function Mi(n, t) {
  const e = new Qn(t);
  n.handle("network:tcp", async (i, s, r) => {
    E.info(`开始测试TCP连接: ${s}:${r}`);
    const o = parseInt(String(r), 10), a = String(s || "").trim();
    return isNaN(o) || o <= 0 || o > 65535 ? (E.error(`无效的端口: ${r}`), -1) : a ? new Promise((c) => {
      const l = new wr.Socket(), u = Date.now();
      l.setTimeout(2e3), l.connect({ port: o, host: a }, () => {
        const f = Date.now() - u;
        l.destroy(), c(f);
      });
      const d = () => {
        l.destroy(), c(-1);
      };
      l.on("error", d), l.on("timeout", d);
    }) : (E.error(`无效的地址: ${s}`), -1);
  }), n.on("system:openUrl", (i, s) => {
    E.info(`打开外部链接: ${s}`), cn.openExternal(s);
  }), n.handle("system:version", () => (E.info(`获取应用版本: ${H.getVersion()}`), H.getVersion())), E.initIpc(), n.handle("platform:list", () => oe.getPlatforms()), n.handle(
    "platform:add",
    (i, s) => oe.addPlatform(s)
  ), n.handle(
    "platform:update",
    (i, s, r) => {
      oe.updatePlatform(s, r);
    }
  ), n.handle(
    "platform:enable",
    (i, s) => {
      oe.enablePlatform(s);
    }
  ), n.handle(
    "platform:disable",
    (i, s) => {
      oe.disablePlatform(s);
    }
  ), n.handle(
    "platform:remove",
    (i, s) => {
      oe.removePlatform(s);
    }
  ), n.handle(
    "mojang:getProfile",
    async (i, s) => await Sn(s)
  ), n.handle(
    "frp:natfrp.userInfo",
    async (i, s) => await G.userInfo(s)
  ), n.handle(
    "frp:natfrp.getNodes",
    async (i, s) => await G.nodes(s)
  ), n.handle(
    "frp:natfrp.nodeStats",
    async (i, s) => await G.nodeStats(s)
  ), n.handle(
    "frp:natfrp.getMergedNodes",
    async (i, s) => await G.getMergedNodes(s)
  ), n.handle(
    "frp:natfrp.getTunnels",
    async (i, s) => await G.tunnelInfo(s)
  ), n.handle(
    "frp:natfrp.tunnelCreate",
    async (i, s, r, o) => (E.info(`创建natfrp隧道: 节点${r}, 端口${o}`), await G.tunnelCreate(s, r, o))
  ), n.handle(
    "frp:natfrp.tunnelEdit",
    async (i, s, r, o) => (E.info(`修改natfrp隧道: 隧道${r}, 端口${o}`), await G.tunnelEdit(s, r, o))
  ), n.handle("frpc:start", (i, s, r) => (E.info(`启动SakuraFRPC隧道: ${r}`), e.startTunnel(s, r), !0)), n.handle("frpc:stop", (i, s) => (E.info(`停止SakuraFRPC隧道: ${s}`), e.stopTunnel(s), !0)), n.handle("sakurafrp:exists", () => {
    const i = It.exists();
    return E.info(`检查SakuraFRP是否存在: ${i}`), i;
  }), n.handle("sakurafrp:download", async (i) => {
    E.info("开始下载SakuraFRPC");
    const s = await G.clients(), r = Kn(s);
    return await It.download(
      r.url,
      r.hash,
      (o) => {
        i.sender.send("sakurafrp:progress", o);
      }
    ), E.info("SakuraFRPC下载完成"), {
      version: r.version,
      path: It.filePath
    };
  }), n.handle("minecraft:detect", async () => await xe.detectAll()), n.handle(
    "minecraft:status",
    async (i, s, r, o) => await ki(s, r, o)
  ), n.on("window:minimize", () => {
    t == null || t.minimize();
  }), n.on("window:close", () => {
    t == null || t.close();
  });
}
if (typeof Lt == "string")
  throw new TypeError("Not running in an Electron environment!");
const { env: tn } = process, Vi = "ELECTRON_IS_DEV" in tn, Ui = Number.parseInt(tn.ELECTRON_IS_DEV, 10) === 1, qi = Vi ? Ui : !Lt.app.isPackaged, rn = Y.dirname(ln(import.meta.url));
process.env.APP_ROOT = Y.join(rn, "..");
const Bt = process.env.VITE_DEV_SERVER_URL, ua = Y.join(process.env.APP_ROOT, "dist-electron"), nn = Y.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = Bt ? Y.join(process.env.APP_ROOT, "public") : nn;
let R;
function on() {
  R = new mr({
    width: 1200,
    height: 800,
    // 🔒 固定尺寸
    resizable: !1,
    minimizable: !0,
    maximizable: !1,
    fullscreenable: !1,
    // 🚫 无边框
    frame: !1,
    // 🧠 推荐开启
    useContentSize: !0,
    icon: Y.join(process.env.VITE_PUBLIC, "favicon.png"),
    title: "OneTunnel",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !0,
      preload: Y.join(rn, "preload.mjs")
    }
  }), E.info("应用正在启动..."), R.setMenu(null), R.setMenuBarVisibility(!1), R.on("maximize", () => {
    R == null || R.unmaximize();
  }), Mi(Ie, R), (process.env.NODE_ENV === "development" || qi) && R.webContents.openDevTools(), Bt ? R.loadURL(Bt) : R.loadFile(Y.join(nn, "index.html"));
}
H.on("window-all-closed", () => {
  process.platform !== "darwin" && (H.quit(), R = null);
});
H.on("activate", async () => {
  mr.getAllWindows().length === 0 && on();
});
H.whenReady().then(on);
export {
  ua as MAIN_DIST,
  nn as RENDERER_DIST,
  Bt as VITE_DEV_SERVER_URL
};
