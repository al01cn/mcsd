var qt = Object.defineProperty;
var Ht = (r, t, e) => t in r ? qt(r, t, { enumerable: !0, configurable: !0, writable: !0, value: e }) : r[t] = e;
var B = (r, t, e) => Ht(r, typeof t != "symbol" ? t + "" : t, e);
import it, { app as q, ipcMain as je, shell as Jt, BrowserWindow as st } from "electron";
import { fileURLToPath as Wt } from "node:url";
import U from "node:path";
import Y from "path";
import k from "fs";
import { webcrypto as Ye } from "node:crypto";
import { exec as Gt, spawn as zt } from "child_process";
import Kt from "os";
import G, { promisify as Qt } from "util";
import Yt from "https";
import ve from "crypto";
import x from "assert";
import * as Ze from "net";
import dt from "net";
import He from "events";
import Zt from "dns";
import * as Xt from "dgram";
import lt from "dgram";
import er from "node:net";
import tr from "node:os";
const rr = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict", nr = 128;
let J, Q;
function ar(r) {
  !J || J.length < r ? (J = Buffer.allocUnsafe(r * nr), Ye.getRandomValues(J), Q = 0) : Q + r > J.length && (Ye.getRandomValues(J), Q = 0), Q += r;
}
function ct(r = 21) {
  ar(r |= 0);
  let t = "";
  for (let e = Q - r; e < Q; e++)
    t += rr[J[e] & 63];
  return t;
}
class or {
  constructor() {
    B(this, "name", "config");
    B(this, "dataDir");
    B(this, "configPath");
    this.dataDir = Y.join(q.getPath("userData"), "data"), this.configPath = Y.join(this.dataDir, "config.json"), this.ensure();
  }
  /* ---------- Init ---------- */
  ensure() {
    if (k.existsSync(this.dataDir) || k.mkdirSync(this.dataDir, { recursive: !0 }), !k.existsSync(this.configPath)) {
      const t = {
        platforms: []
      };
      this.write(t);
    }
  }
  /* ---------- Base IO ---------- */
  read() {
    try {
      const t = k.readFileSync(this.configPath, "utf-8"), e = JSON.parse(t);
      return { platforms: (Array.isArray(
        e.platforms
      ) ? e.platforms : []).map((a) => ({
        nanoid: a.nanoid,
        platform: a.platform,
        secret: a.secret,
        enabled: typeof a.enabled == "boolean" ? a.enabled : !0
      })) };
    } catch {
      return { platforms: [] };
    }
  }
  write(t) {
    k.writeFileSync(
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
    const e = this.read(), n = {
      nanoid: ct(),
      platform: t.platform,
      secret: t.secret,
      enabled: !0
    };
    return e.platforms.push(n), this.write(e), n;
  }
  updatePlatform(t, e) {
    const n = this.read(), o = n.platforms.find((a) => a.nanoid === t);
    o && (Object.assign(o, e), this.write(n));
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
    e.platforms = e.platforms.filter((n) => n.nanoid !== t), this.write(e);
  }
}
var ye = new Headers();
ye.append("accept", "application/json");
ye.append("Content-Type", "application/json");
function ir() {
  return "mc-" + ct(8).toString();
}
class M {
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
    const e = await this.nodes(t), n = await this.nodeStats(t);
    return !e || !n ? null : n.map((a) => {
      const i = e[a.id];
      return i ? { ...i, ...a } : a;
    });
  }
  static async tunnelCreate(t, e, n) {
    const a = {
      name: ir(),
      type: "tcp",
      node: e,
      local_ip: "127.0.0.1",
      local_port: n
    }, i = await fetch(`${this.api_url}/tunnels?token=${t}`, {
      method: "POST",
      headers: ye,
      body: JSON.stringify(a)
    });
    return i.ok ? await i.json() : await i.json();
  }
  static async tunnelEdit(t, e, n) {
    const o = {
      id: Number(e),
      local_port: n
    };
    return (await fetch(`${this.api_url}/tunnel/edit?token=${t}`, {
      method: "POST",
      headers: ye,
      body: JSON.stringify(o)
    })).ok ? !0 : null;
  }
}
B(M, "api_url", "https://api.natfrp.com/v4");
const Xe = Qt(Gt);
class Me {
  static async runCMD(t) {
    try {
      const { stdout: e } = await Xe(`chcp 65001 > nul && ${t}`, {
        windowsHide: !0,
        maxBuffer: 52428800
      });
      return e;
    } catch {
      return "";
    }
  }
  static async runPowerShell(t) {
    const n = [
      `${process.env.ProgramFiles}\\PowerShell\\7\\pwsh.exe`,
      `${process.env["ProgramFiles(x86)"]}\\PowerShell\\7\\pwsh.exe`,
      "pwsh"
    ].find((a) => k.existsSync(a)) || "powershell", o = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; ${t}`;
    try {
      const { stdout: a } = await Xe(`"${n}" -NoProfile -Command "${o.replace(/"/g, '\\"')}"`, {
        windowsHide: !0,
        encoding: "utf8",
        // 确保 Node.js 用 UTF8 解码
        maxBuffer: 52428800
      });
      return a;
    } catch {
      return "";
    }
  }
  static parseModLoader(t = "") {
    var n;
    const e = t.match(/--fml\.neoForgeVersion\s+([^\s]+)/i) || t.match(/neoforge-([\d\.]+)/i);
    if (e || t.includes("net.neoforged"))
      return { loader: "NeoForge", loaderVersion: (n = e == null ? void 0 : e[1]) == null ? void 0 : n.replace(/[\s.]+$/, "") };
    if (t.includes("net.fabricmc.loader")) {
      const o = t.match(/fabric-loader-([\d\.]+)/i);
      return { loader: "Fabric", loaderVersion: o == null ? void 0 : o[1] };
    }
    if (t.includes("org.quiltmc.loader")) {
      const o = t.match(/quilt-loader-([\d\.]+)/i);
      return { loader: "Quilt", loaderVersion: o == null ? void 0 : o[1] };
    }
    if (t.includes("fml.loading.FMLClientLaunchProvider") || /FMLClientTweaker/i.test(t)) {
      const o = t.match(/forge-(\d+\.\d+\.\d+)/i);
      return { loader: "Forge", loaderVersion: o == null ? void 0 : o[1] };
    }
    return { loader: "Vanilla" };
  }
  static parseLoginInfo(t) {
    var s, l, d;
    const e = (s = t.match(/--username\s+([^\s]+)/)) == null ? void 0 : s[1], n = (l = t.match(/--uuid\s+([^\s]+)/)) == null ? void 0 : l[1], o = (d = t.match(/--accessToken\s+([^\s]+)/)) == null ? void 0 : d[1];
    let a = "offline", i;
    const c = t.match(/authlib-injector[^\s=]*=([^"\s]+)/);
    if (c) {
      a = "custom";
      try {
        i = new URL(c[1]).hostname;
      } catch {
        i = c[1];
      }
    } else o && o !== "0" ? o.split(".").length === 3 && t.includes("--userType msa") && !c ? a = "msa" : a = "offline" : a = "other";
    return { username: e, uuid: n, loginType: a, provider: i };
  }
  static parseVersion(t) {
    var e, n;
    return ((e = t.match(/--version\s+([\d\.\-\w]+)/)) == null ? void 0 : e[1]) || ((n = t.match(/--assetIndex\s+([^\s]+)/)) == null ? void 0 : n[1]);
  }
  /**
   * 核心处理逻辑：去重与特征识别
   */
  static processRawResults(t, e) {
    var o;
    const n = /* @__PURE__ */ new Map();
    for (const a of t) {
      const i = a.CommandLine || "";
      if (!i || !(this.MC_MAIN_CLASSES.some((v) => i.includes(v)) || /minecraft/i.test(i))) continue;
      const s = this.parseLoginInfo(i), l = this.parseVersion(i), d = this.parseModLoader(i), u = i.match(/--gameDir\s+"?([^"\s]+)"?/), h = u ? u[1] : "default_dir", y = `${s.uuid || s.username}|${h}|${l}`, m = Array.from(new Set(
        e.filter(
          (v) => v.OwningProcess === a.ProcessId && v.LocalPort >= 1024 && (v.LocalAddress === "0.0.0.0" || v.LocalAddress === "::" || v.LocalAddress === "*")
        ).map((v) => v.LocalPort)
      )), p = {
        pid: a.ProcessId,
        java: a.Name,
        version: l,
        loader: d.loader,
        loaderVersion: (o = d.loaderVersion) == null ? void 0 : o.replace(/[\s._-]+$/, ""),
        username: s.username,
        uuid: s.uuid,
        loginType: s.loginType,
        provider: s.provider,
        // 将 provider 传入
        lanPorts: m,
        isLan: m.length > 0
      };
      if (n.has(y)) {
        const v = n.get(y);
        p.lanPorts.length > 0 && v.lanPorts.length === 0 && n.set(y, p);
      } else
        n.set(y, p);
    }
    return Array.from(n.values());
  }
  /**
   * 主检测方法
   */
  static async detectAll() {
    const t = "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'java' } | Select-Object ProcessId, Name, CommandLine | ConvertTo-Json", e = "Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess | ConvertTo-Json";
    try {
      const [n, o] = await Promise.all([
        this.runPowerShell(t),
        this.runPowerShell(e)
      ]), a = (s) => {
        if (!s.trim()) return [];
        try {
          const l = JSON.parse(s.replace(/^\uFEFF/, ""));
          return Array.isArray(l) ? l : [l];
        } catch {
          return [];
        }
      }, i = a(n), c = a(o);
      if (i.length === 0) throw new Error("No processes");
      return this.processRawResults(i, c);
    } catch {
      return this.detectAllByCMD();
    }
  }
  /**
   * WMIC 回退方案
   */
  static async detectAllByCMD() {
    const t = await this.runCMD(`wmic process where "name like 'java%'" get ProcessId,Name,CommandLine /FORMAT:CSV`), e = [], n = t.split(/\r?\n/).filter((c) => c.trim());
    for (let c = 1; c < n.length; c++) {
      const s = n[c].split(",");
      if (s.length < 4) continue;
      const l = parseInt(s[s.length - 2], 10), d = s[s.length - 3], u = s.slice(1, s.length - 3).join(",");
      isNaN(l) || e.push({ ProcessId: l, Name: d, CommandLine: u });
    }
    const o = await this.runCMD("netstat -ano -p tcp"), a = [], i = o.split(/\r?\n/);
    for (const c of i) {
      const s = c.trim().match(/^TCP\s+(0\.0\.0\.0|\[::\]):(\d+)\s+\S+\s+LISTENING\s+(\d+)$/i);
      s && s[1] && s[2] && a.push({
        LocalAddress: s[1],
        LocalPort: parseInt(s[2], 10),
        OwningProcess: parseInt(s[3], 10)
      });
    }
    return this.processRawResults(e, a);
  }
}
B(Me, "MC_MAIN_CLASSES", [
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
]), B(Me, "MINECRAFT_DIR", Y.join(Kt.homedir(), ".minecraft"));
async function sr(r) {
  try {
    const t = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${r}?unsigned=true`,
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
function dr(r) {
  const t = [
    "windows_amd64",
    "windows_arm64",
    "windows_386"
  ];
  for (const e of t) {
    const n = r.frpc.archs[e];
    if (n)
      return {
        version: r.frpc.ver,
        arch: e,
        url: n.url,
        hash: n.hash,
        size: n.size
      };
  }
  throw new Error("未找到 Windows 平台 frpc");
}
class lr {
  constructor() {
    /** 本地统一名称 */
    B(this, "fileName", "sakurafrp.exe");
  }
  get binDir() {
    return Y.join(q.getPath("userData"), "bin");
  }
  get filePath() {
    return Y.join(this.binDir, this.fileName);
  }
  exists() {
    return k.existsSync(this.filePath);
  }
  async download(t, e, n) {
    k.mkdirSync(this.binDir, { recursive: !0 });
    const o = this.filePath + ".download";
    return new Promise((a, i) => {
      const c = k.createWriteStream(o), s = ve.createHash("md5");
      Yt.get(t, (l) => {
        if (l.statusCode !== 200) {
          i(new Error(`下载失败，HTTP ${l.statusCode}`));
          return;
        }
        const d = Number(l.headers["content-length"] || 0);
        let u = 0;
        l.on("data", (h) => {
          u += h.length, s.update(h), d && n && n(Math.floor(u / d * 100));
        }), l.pipe(c), c.on("finish", () => {
          if (c.close(), e && s.digest("hex") !== e) {
            k.unlinkSync(o), i(new Error("sakurafrp.exe 校验失败"));
            return;
          }
          k.renameSync(o, this.filePath), a(this.filePath);
        });
      }).on("error", (l) => {
        k.unlink(o, () => {
        }), i(l);
      });
    });
  }
}
class cr {
  constructor(t) {
    B(this, "processes", /* @__PURE__ */ new Map());
    B(this, "win");
    this.win = t;
  }
  getFrpcPath() {
    return Y.join(q.getPath("userData"), "bin", "sakurafrp.exe");
  }
  /** 是否存在 frpc */
  exists() {
    return k.existsSync(this.getFrpcPath());
  }
  /** 启动隧道 */
  startTunnel(t, e) {
    if (!this.exists())
      throw new Error("frpc 不存在");
    if (this.processes.has(e))
      throw new Error(`隧道 ${e} 已在运行`);
    const n = this.getFrpcPath(), o = zt(n, ["-f", `${t}:${e}`], {
      windowsHide: !0
    });
    this.processes.set(e, {
      tunnelId: e,
      process: o
    }), o.stdout.on("data", (a) => {
      this.sendLog(e, a.toString(), "stdout");
    }), o.stderr.on("data", (a) => {
      this.sendLog(e, a.toString(), "stderr");
    }), o.on("close", (a) => {
      this.sendLog(e, `进程已退出，code=${a}`, "close"), this.processes.delete(e);
    }), o.on("error", (a) => {
      this.sendLog(e, a.message, "error");
    });
  }
  /** 停止隧道 */
  stopTunnel(t) {
    const e = this.processes.get(t);
    e && (e.process.kill(), this.processes.delete(t));
  }
  /** 停止全部 */
  stopAll() {
    for (const [t, e] of this.processes)
      e.process.kill(), this.processes.delete(t);
  }
  /** 推送日志到前端 */
  sendLog(t, e, n) {
    this.win.webContents.send("frpc:log", {
      tunnelId: t,
      message: e,
      type: n,
      time: Date.now()
    });
  }
}
var f = typeof globalThis < "u" ? globalThis : typeof window < "u" ? window : typeof global < "u" ? global : typeof self < "u" ? self : {}, ut = {}, pe = {}, H = {}, te = {}, me = f && f.__assign || function() {
  return me = Object.assign || function(r) {
    for (var t, e = 1, n = arguments.length; e < n; e++) {
      t = arguments[e];
      for (var o in t) Object.prototype.hasOwnProperty.call(t, o) && (r[o] = t[o]);
    }
    return r;
  }, me.apply(this, arguments);
};
Object.defineProperty(te, "__esModule", { value: !0 });
te.parse = void 0;
var Ue = {
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
}, Re = {
  k: "obfuscated",
  l: "bold",
  m: "strikethrough",
  n: "underline",
  o: "italics"
}, I = function(r) {
  return typeof r == "boolean" ? r : typeof r == "string" ? r.toLowerCase() === "true" : !1;
}, ft = function(r, t) {
  for (var e, n = [{ text: "", color: "white" }], o = 0; o + 1 <= r.length; ) {
    var a = r.charAt(o), i = n[n.length - 1];
    if (a === `
`) {
      n.push({ text: `
`, color: "white" }), o++;
      continue;
    }
    if (a !== t.formattingCharacter) {
      i.text += a, o++;
      continue;
    }
    var c = r.charAt(o + 1).toLowerCase();
    if (o += 2, c === "r") {
      n.push({ text: "", color: "white" });
      continue;
    }
    c in Re ? i.text.length > 0 ? n.push(me(me({}, i), (e = { text: "" }, e[Re[c]] = !0, e))) : i[Re[c]] = !0 : c in Ue && n.push({ text: "", color: Ue[c] });
  }
  return n;
}, ht = function(r, t, e) {
  var n, o, a = ft(r.text || r.translate || "", t), i = a[0];
  if ((e && I(e.bold) && !I(r.bold) || I(r.bold)) && (i.bold = !0), (e && I(e.italic) && !I(r.italic) || I(r.italic)) && (i.italics = !0), (e && I(e.underlined) && !I(r.underlined) || I(r.underlined)) && (i.underline = !0), (e && I(e.strikethrough) && !I(r.strikethrough) || I(r.strikethrough)) && (i.strikethrough = !0), (e && I(e.obfuscated) && !I(r.obfuscated) || I(r.obfuscated)) && (i.obfuscated = !0), r.color && (i.color = Ue[(o = (n = r.color) !== null && n !== void 0 ? n : e == null ? void 0 : e.color) !== null && o !== void 0 ? o : "white"] || r.color), r.extra)
    for (var c = 0, s = r.extra; c < s.length; c++) {
      var l = s[c];
      a.push.apply(a, ht(l, t, r));
    }
  return a;
};
te.parse = function(r, t) {
  t = Object.assign({
    formattingCharacter: "§"
  }, t);
  var e;
  switch (typeof r) {
    case "string": {
      e = ft(r, t);
      break;
    }
    case "object": {
      e = ht(r, t);
      break;
    }
    default:
      throw new Error("Unexpected server MOTD type: " + typeof r);
  }
  return e.filter(function(n) {
    return n.text.length > 0;
  });
};
var ge = {}, ur = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(ge, "__esModule", { value: !0 });
ge.clean = void 0;
var fr = ur(x);
ge.clean = function(r, t) {
  return fr.default(typeof r == "string" || Array.isArray(r), "Expected 'text' to be typeof 'string' or 'array', received '" + typeof r + "'"), t = Object.assign({
    formattingCharacter: "§"
  }, t), typeof r == "string" ? r.replace(new RegExp(t.formattingCharacter + "[0-9a-gk-or]", "g"), "") : r.map(function(e) {
    return e.text;
  }).join("");
};
var we = {}, Je = {};
Object.defineProperty(Je, "__esModule", { value: !0 });
var hr = (
  /** @class */
  function() {
    function r(t) {
      this.list = [];
      for (var e in t)
        this.list.push({
          name: e,
          hex: t[e],
          sum: et(t[e])
        });
    }
    return r.prototype.closest = function(t) {
      for (var e = et(t), n = null, o = 1 / 0, a = 0, i = this.list; a < i.length; a++) {
        var c = i[a], s = Math.abs(e - c.sum);
        (n === null || s < o) && (n = c, o = s);
      }
      return n;
    }, r;
  }()
), et = function(r) {
  var t = 0;
  r = r.replace("#", "");
  var e = r.substring(0, 2), n = r.substring(2, 4), o = r.substring(4, 6);
  return t = Math.sqrt(Math.pow(parseInt(e, 16), 2) + Math.pow(parseInt(n, 16), 2) + Math.pow(parseInt(o, 16), 2)), t;
};
Je.default = hr;
var yt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(we, "__esModule", { value: !0 });
we.format = void 0;
var yr = yt(x), mr = te, vr = yt(Je), Ve = {
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
}, pr = {
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
}, gr = new vr.default(pr);
we.format = function(r, t) {
  yr.default(typeof r == "string" || Array.isArray(r), "Expected 'input' to be typeof 'array' or typeof 'string', got '" + typeof r + "'"), typeof r == "string" && (r = mr.parse(r, t));
  for (var e = Object.assign({
    formattingCharacter: "§",
    replaceNearestColor: !0
  }, t), n = "", o = 0, a = r; o < a.length; o++) {
    var i = a[o];
    if (i.color) {
      var c = Ve[i.color];
      if (c)
        n += e.formattingCharacter + Ve[i.color];
      else if (e.replaceNearestColor) {
        var s = gr.closest(i.color);
        if (s) {
          var l = Ve[s.name];
          l && (n += e.formattingCharacter + l);
        }
      }
    }
    i.bold && (n += e.formattingCharacter + "l"), i.italics && (n += e.formattingCharacter + "o"), i.underline && (n += e.formattingCharacter + "n"), i.strikethrough && (n += e.formattingCharacter + "m"), i.obfuscated && (n += e.formattingCharacter + "k"), n += i.text;
  }
  return n;
};
var be = {}, wr = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(be, "__esModule", { value: !0 });
be.toHTML = void 0;
var br = wr(x), Er = {
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
be.toHTML = function(r, t) {
  br.default(Array.isArray(r), "Expected 'tree' to be typeof 'array', received '" + typeof r + "'");
  for (var e = Object.assign({
    serializers: Er,
    rootTag: "span"
  }, t), n = "<" + e.rootTag + ">", o = 0, a = r; o < a.length; o++) {
    var i = a[o], c = [], s = {};
    for (var l in i)
      if (l !== "text") {
        var d = e.serializers[l === "color" ? i[l] : l];
        if (d) {
          if (d.classes && d.classes.length > 0 && c.push.apply(c, d.classes), d.styles)
            for (var u in d.styles)
              u in s || (s[u] = []), s[u].push(d.styles[u]);
        } else l === "color" && ("color" in s || (s.color = []), s.color.push(i[l]));
      }
    var h = i.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    n += "<span" + (c.length > 0 ? ' class="' + c.join(" ") + '"' : "") + (Object.keys(s).length > 0 ? ' style="' + Object.entries(s).map(function(y) {
      return y[0] + ": " + y[1].join(" ") + ";";
    }).join(" ") + '"' : "") + ">" + h + "</span>";
  }
  return n += "</" + e.rootTag + ">", n;
};
(function(r) {
  Object.defineProperty(r, "__esModule", { value: !0 }), r.toHTML = r.format = r.clean = r.parse = void 0;
  var t = te;
  Object.defineProperty(r, "parse", { enumerable: !0, get: function() {
    return t.parse;
  } });
  var e = ge;
  Object.defineProperty(r, "clean", { enumerable: !0, get: function() {
    return e.clean;
  } });
  var n = we;
  Object.defineProperty(r, "format", { enumerable: !0, get: function() {
    return n.format;
  } });
  var o = be;
  Object.defineProperty(r, "toHTML", { enumerable: !0, get: function() {
    return o.toHTML;
  } });
})(H);
var j = {}, W = {}, _r = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
};
Object.defineProperty(W, "__esModule", { value: !0 });
W.writeVarInt = W.readVarInt = void 0;
function Br(r) {
  return _r(this, void 0, void 0, function* () {
    let t = 0, e = 0, n, o;
    do {
      if (t > 4)
        throw new Error("VarInt exceeds data bounds");
      if (n = yield r(), o = n & 127, e |= o << 7 * t, t++, t > 5)
        throw new Error("VarInt is too big");
    } while (n & 128);
    return e;
  });
}
W.readVarInt = Br;
function Ir(r) {
  let t = Buffer.alloc(0);
  do {
    let e = r & 127;
    r >>>= 7, r != 0 && (e |= 128), t = Buffer.concat([t, Buffer.from([e])]);
  } while (r != 0);
  return t;
}
W.writeVarInt = Ir;
var g = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, xr = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(j, "__esModule", { value: !0 });
const $r = xr(dt), Sr = He, mt = G, Ae = W, ae = new mt.TextEncoder(), oe = new mt.TextDecoder("utf8");
class kr extends Sr.EventEmitter {
  constructor() {
    super(...arguments), this.isConnected = !1, this.socket = null, this.data = Buffer.alloc(0);
  }
  connect(t) {
    return new Promise((e, n) => {
      this.socket = $r.default.createConnection(t);
      const o = () => {
        var s, l, d, u;
        this.isConnected = !0, (s = this.socket) === null || s === void 0 || s.removeListener("connect", o), (l = this.socket) === null || l === void 0 || l.removeListener("error", a), (d = this.socket) === null || d === void 0 || d.removeListener("timeout", i), (u = this.socket) === null || u === void 0 || u.removeListener("close", c), e();
      }, a = (s) => {
        var l;
        (l = this.socket) === null || l === void 0 || l.destroy(), n(s);
      }, i = () => g(this, void 0, void 0, function* () {
        var s;
        (s = this.socket) === null || s === void 0 || s.destroy(), n(new Error("Server is offline or unreachable"));
      }), c = (s) => {
        var l;
        this.isConnected = !1, (l = this.socket) === null || l === void 0 || l.destroy(), s || n(), this.emit("close");
      };
      this.socket.on("data", (s) => {
        this.data = Buffer.concat([this.data, s]), this.emit("data");
      }), this.socket.on("connect", () => o()), this.socket.on("error", (s) => a(s)), this.socket.on("timeout", () => i()), this.socket.on("close", (s) => c(s));
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(t) {
    this.writeUInt8(t);
  }
  readBytes(t) {
    return g(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(t);
      const e = this.data.slice(0, t);
      return this.data = this.data.slice(t), e;
    });
  }
  writeBytes(t) {
    this.data = Buffer.concat([this.data, t]);
  }
  readUInt8() {
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
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
    return g(this, void 0, void 0, function* () {
      return yield (0, Ae.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(t) {
    this.writeBytes((0, Ae.writeVarInt)(t));
  }
  readString(t) {
    return g(this, void 0, void 0, function* () {
      const e = yield this.readBytes(t);
      return oe.decode(e);
    });
  }
  writeString(t) {
    this.writeBytes(ae.encode(t));
  }
  readStringVarInt() {
    return g(this, void 0, void 0, function* () {
      const t = yield this.readVarInt(), e = yield this.readBytes(t);
      return oe.decode(e);
    });
  }
  writeStringVarInt(t) {
    const e = ae.encode(t);
    this.writeVarInt(e.byteLength), this.writeBytes(e);
  }
  readStringNT() {
    return g(this, void 0, void 0, function* () {
      let t = Buffer.alloc(0), e;
      for (; (e = yield this.readByte()) !== 0; )
        t = Buffer.concat([t, Buffer.from([e])]);
      return oe.decode(t);
    });
  }
  writeStringNT(t) {
    const e = ae.encode(t);
    this.writeBytes(e), this.writeByte(0);
  }
  writeStringBytes(t) {
    this.writeBytes(ae.encode(t));
  }
  readStringUntil(t) {
    return g(this, void 0, void 0, function* () {
      let e = Buffer.alloc(0), n;
      for (; (n = yield this.readByte()) !== t; )
        e = Buffer.concat([e, Buffer.from([n])]);
      return oe.decode(e);
    });
  }
  flush(t = !0) {
    return this.socket ? new Promise((e, n) => {
      var o;
      let a = this.data;
      t && (a = Buffer.concat([(0, Ae.writeVarInt)(a.byteLength), a])), (o = this.socket) === null || o === void 0 || o.write(a, (i) => {
        if (i)
          return n(i);
        e();
      }), this.data = Buffer.alloc(0);
    }) : Promise.resolve();
  }
  close() {
    var t, e, n;
    (t = this.socket) === null || t === void 0 || t.removeAllListeners(), (e = this.socket) === null || e === void 0 || e.end(), (n = this.socket) === null || n === void 0 || n.destroy();
  }
  ensureBufferedData(t) {
    return g(this, void 0, void 0, function* () {
      return this.data.byteLength >= t ? Promise.resolve() : this._waitForData(t);
    });
  }
  _waitForData(t = 1) {
    return new Promise((e, n) => {
      const o = () => {
        this.data.byteLength >= t && (this.removeListener("data", o), this.removeListener("close", a), e());
      }, a = () => {
        this.removeListener("data", o), this.removeListener("close", a), n(new Error("Socket closed unexpectedly while waiting for data"));
      };
      this.on("data", () => o()), this.on("close", () => a());
    });
  }
}
j.default = kr;
var O = {}, Dr = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(O, "__esModule", { value: !0 });
O.resolveSRV = void 0;
const Lr = Dr(Zt);
function Pr(r, t = "tcp") {
  return new Promise((e) => {
    Lr.default.resolveSrv(`_minecraft._${t}.${r}`, (n, o) => {
      if (n || o.length < 1)
        return e(null);
      const a = o[0];
      e({ host: a.name, port: a.port });
    });
  });
}
O.resolveSRV = Pr;
var Tr = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, We = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(pe, "__esModule", { value: !0 });
pe.status = void 0;
const P = We(x), Fr = We(ve), ie = H, Rr = We(j), Vr = O;
function Ar(r, t = 25565, e) {
  return r = r.trim(), (0, P.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, P.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, P.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, P.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, P.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, P.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, P.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, P.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, P.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, P.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, P.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => Tr(this, void 0, void 0, function* () {
    var a, i, c, s;
    const l = new Rr.default(), d = setTimeout(() => {
      l == null || l.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let u = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (u = yield (0, Vr.resolveSRV)(r), u && (r = u.host, t = u.port)), yield l.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 }), l.writeVarInt(0), l.writeVarInt(47), l.writeStringVarInt(r), l.writeUInt16BE(t), l.writeVarInt(1), yield l.flush(), l.writeVarInt(0), yield l.flush();
      let h;
      {
        const v = yield l.readVarInt();
        yield l.ensureBufferedData(v);
        const E = yield l.readVarInt();
        if (E !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + E);
        h = JSON.parse(yield l.readStringVarInt());
      }
      const y = Fr.default.randomBytes(8).readBigInt64BE();
      l.writeVarInt(1), l.writeInt64BE(y), yield l.flush();
      const m = Date.now();
      {
        const v = yield l.readVarInt();
        yield l.ensureBufferedData(v);
        const E = yield l.readVarInt();
        if (E !== 1)
          throw new Error("Expected server to send packet type 0x01, received " + E);
        if ((yield l.readInt64BE()) !== y)
          throw new Error("Ping payload did not match received payload");
      }
      const p = (0, ie.parse)(h.description);
      clearTimeout(d), l.close(), n({
        version: {
          name: h.version.name,
          protocol: h.version.protocol
        },
        players: {
          online: h.players.online,
          max: h.players.max,
          sample: (c = h.players.sample) !== null && c !== void 0 ? c : null
        },
        motd: {
          raw: (0, ie.format)(p),
          clean: (0, ie.clean)(p),
          html: (0, ie.toHTML)(p)
        },
        favicon: (s = h.favicon) !== null && s !== void 0 ? s : null,
        srvRecord: u,
        roundTripLatency: Date.now() - m
      });
    } catch (u) {
      clearTimeout(d), l == null || l.close(), o(u);
    }
  }));
}
pe.status = Ar;
var Ee = {}, Cr = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, vt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Ee, "__esModule", { value: !0 });
Ee.statusFE = void 0;
const T = vt(x), Nr = vt(j), Or = O;
function jr(r, t = 25565, e) {
  return process.emitWarning("Use of statusFE() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), r = r.trim(), (0, T.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, T.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, T.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, T.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, T.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, T.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, T.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, T.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, T.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, T.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, T.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => Cr(this, void 0, void 0, function* () {
    var a, i;
    const c = new Nr.default(), s = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, Or.resolveSRV)(r), l && (r = l.host, t = l.port)), yield c.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 }), c.writeByte(254), yield c.flush(!1);
      {
        const d = yield c.readByte();
        if (d !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + d);
        const u = yield c.readInt16BE(), h = yield c.readBytes(u * 2), [y, m, p] = h.swap16().toString("utf16le").split("§");
        c.close(), clearTimeout(s), n({
          players: {
            online: parseInt(m),
            max: parseInt(p)
          },
          motd: y,
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(s), c == null || c.close(), o(l);
    }
  }));
}
Ee.statusFE = jr;
var _e = {}, Mr = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, pt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(_e, "__esModule", { value: !0 });
_e.statusFE01 = void 0;
const F = pt(x), se = H, Ur = pt(j), qr = O;
function Hr(r, t = 25565, e) {
  return process.emitWarning("Use of statusFE01() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), r = r.trim(), (0, F.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, F.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, F.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, F.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, F.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, F.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, F.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, F.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, F.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, F.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, F.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => Mr(this, void 0, void 0, function* () {
    var a, i;
    const c = new Ur.default(), s = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, qr.resolveSRV)(r), l && (r = l.host, t = l.port)), yield c.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 }), c.writeBytes(Uint8Array.from([254, 1])), yield c.flush(!1);
      {
        const d = yield c.readByte();
        if (d !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + d);
        const u = yield c.readInt16BE(), h = yield c.readBytes(u * 2), [y, m, p, v, E] = h.slice(6).swap16().toString("utf16le").split("\0"), b = (0, se.parse)(p);
        c.close(), clearTimeout(s), n({
          protocolVersion: parseInt(y),
          version: m,
          players: {
            online: parseInt(v),
            max: parseInt(E)
          },
          motd: {
            raw: (0, se.format)(b),
            clean: (0, se.clean)(b),
            html: (0, se.toHTML)(b)
          },
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(s), c == null || c.close(), o(l);
    }
  }));
}
_e.statusFE01 = Hr;
var Be = {}, Jr = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, gt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Be, "__esModule", { value: !0 });
Be.statusFE01FA = void 0;
const R = gt(x), de = H, Wr = G, Gr = gt(j), zr = O, Kr = new Wr.TextEncoder();
function Qr(r, t = 25565, e) {
  return process.emitWarning("Use of statusFE01FA() has been deprecated since 5.2.0 in favor of a statusLegacy(). This method will be removed during the next major release of the minecraft-server-util library.", "DeprecationWarning"), r = r.trim(), (0, R.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, R.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, R.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, R.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, R.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, R.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, R.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, R.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, R.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, R.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, R.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => Jr(this, void 0, void 0, function* () {
    var a, i;
    const c = new Gr.default(), s = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, zr.resolveSRV)(r), l && (r = l.host, t = l.port)), yield c.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 });
      {
        const d = Kr.encode(r);
        c.writeBytes(Uint8Array.from([254, 1, 250])), c.writeInt16BE(11), c.writeStringBytes("MC|PingHost"), c.writeInt16BE(7 + d.byteLength), c.writeByte(74), c.writeInt16BE(d.length), c.writeBytes(d), c.writeInt16BE(t), yield c.flush(!1);
      }
      {
        const d = yield c.readByte();
        if (d !== 255)
          throw new Error("Expected server to send 0xFF kick packet, got " + d);
        const u = yield c.readInt16BE(), h = yield c.readBytes(u * 2), [y, m, p, v, E] = h.slice(6).swap16().toString("utf16le").split("\0"), b = (0, de.parse)(p);
        c.close(), clearTimeout(s), n({
          protocolVersion: parseInt(y),
          version: m,
          players: {
            online: parseInt(v),
            max: parseInt(E)
          },
          motd: {
            raw: (0, de.format)(b),
            clean: (0, de.clean)(b),
            html: (0, de.toHTML)(b)
          },
          srvRecord: l
        });
      }
    } catch (l) {
      clearTimeout(s), c == null || c.close(), o(l);
    }
  }));
}
Be.statusFE01FA = Qr;
var Ie = {}, Yr = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, wt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Ie, "__esModule", { value: !0 });
Ie.statusLegacy = void 0;
const V = wt(x), le = H, Zr = G, Xr = wt(j), en = O, tn = new Zr.TextDecoder("utf-16be");
function rn(r, t = 25565, e) {
  return r = r.trim(), (0, V.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, V.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, V.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, V.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, V.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, V.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, V.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, V.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, V.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, V.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, V.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => Yr(this, void 0, void 0, function* () {
    var a, i;
    const c = new Xr.default(), s = setTimeout(() => {
      c == null || c.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let l = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (l = yield (0, en.resolveSRV)(r), l && (r = l.host, t = l.port)), yield c.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 }), c.writeBytes(Uint8Array.from([254, 1])), yield c.flush(!1);
      let d, u, h, y, m;
      {
        if ((yield c.readByte()) !== 255)
          throw new Error("Packet returned from server was unexpected type");
        const E = yield c.readUInt16BE(), b = tn.decode(yield c.readBytes(E * 2));
        if (b[0] === "§" || b[1] === "1") {
          const _ = b.split("\0");
          d = parseInt(_[1]), u = _[2], h = _[3], y = parseInt(_[4]), m = parseInt(_[5]);
        } else {
          const _ = b.split("§");
          d = null, u = null, h = _[0], y = parseInt(_[1]), m = parseInt(_[2]);
        }
      }
      c.close(), clearTimeout(s);
      const p = (0, le.parse)(h);
      n({
        version: u === null && d === null ? null : {
          name: u,
          protocol: d
        },
        players: {
          online: y,
          max: m
        },
        motd: {
          raw: (0, le.format)(p),
          clean: (0, le.clean)(p),
          html: (0, le.toHTML)(p)
        },
        srvRecord: l
      });
    } catch (l) {
      clearTimeout(s), c == null || c.close(), o(l);
    }
  }));
}
Ie.statusLegacy = rn;
var xe = {}, re = {}, w = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, nn = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(re, "__esModule", { value: !0 });
const an = nn(lt), on = He, bt = G, Ce = W, ce = new bt.TextEncoder(), sn = new bt.TextDecoder("utf-8");
class dn extends on.EventEmitter {
  constructor(t, e) {
    super(), this.data = Buffer.alloc(0), this.host = t, this.port = e, this.socket = an.default.createSocket("udp4"), this.socket.on("message", (n) => {
      this.data = Buffer.concat([this.data, n]), this.emit("data");
    });
  }
  readByte() {
    return this.readUInt8();
  }
  writeByte(t) {
    this.writeUInt8(t);
  }
  readBytes(t) {
    return w(this, void 0, void 0, function* () {
      yield this.ensureBufferedData(t);
      const e = this.data.slice(0, t);
      return this.data = this.data.slice(t), e;
    });
  }
  writeBytes(t) {
    this.data = Buffer.concat([this.data, t]);
  }
  readUInt8() {
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
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
    return w(this, void 0, void 0, function* () {
      return yield (0, Ce.readVarInt)(() => this.readByte());
    });
  }
  writeVarInt(t) {
    this.writeBytes((0, Ce.writeVarInt)(t));
  }
  readString(t) {
    return w(this, void 0, void 0, function* () {
      const e = yield this.readBytes(t);
      return sn.decode(e);
    });
  }
  writeString(t) {
    this.writeBytes(ce.encode(t));
  }
  readStringVarInt() {
    return w(this, void 0, void 0, function* () {
      const t = yield this.readVarInt(), e = yield this.readBytes(t);
      return Array.from(e).map((n) => String.fromCodePoint(n)).join("");
    });
  }
  writeStringVarInt(t) {
    const e = ce.encode(t);
    this.writeVarInt(e.byteLength), this.writeBytes(e);
  }
  readStringNT() {
    return w(this, void 0, void 0, function* () {
      let t = Buffer.alloc(0), e;
      for (; (e = yield this.readByte()) !== 0; )
        t = Buffer.concat([t, Buffer.from([e])]);
      return Array.from(t).map((n) => String.fromCodePoint(n)).join("");
    });
  }
  readStringNTFollowedBy(t) {
    return w(this, void 0, void 0, function* () {
      let e = Buffer.alloc(0);
      for (; ; ) {
        const n = yield this.readByte();
        if (n === 0 && (yield this.checkUpcomingData(t)))
          break;
        e = Buffer.concat([e, Buffer.from([n])]);
      }
      return Array.from(e).map((n) => String.fromCodePoint(n)).join("");
    });
  }
  checkUpcomingData(t) {
    return w(this, void 0, void 0, function* () {
      let e = 0;
      for (; t.length; ) {
        yield this.ensureBufferedData(e + 1);
        const n = [];
        for (const o of t)
          if (this.data[e] === o[e]) {
            if (e === o.length - 1)
              return o;
            n.push(o);
          }
        t = n, e++;
      }
      return null;
    });
  }
  writeStringNT(t) {
    const e = ce.encode(t);
    this.writeBytes(e), this.writeByte(0);
  }
  writeStringBytes(t) {
    this.writeBytes(ce.encode(t));
  }
  flush(t = !0) {
    return this.socket ? new Promise((e, n) => {
      let o = this.data;
      t && (o = Buffer.concat([(0, Ce.writeVarInt)(o.byteLength), o])), this.socket.send(o, 0, o.byteLength, this.port, this.host, (a) => {
        if (a)
          return n(a);
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
    return w(this, void 0, void 0, function* () {
      return this.data.byteLength >= t ? Promise.resolve() : this._waitForData(t);
    });
  }
  _waitForData(t = 1) {
    return new Promise((e, n) => {
      const o = () => {
        this.data.byteLength >= t && (this.removeListener("data", o), this.socket.removeListener("error", a), e());
      }, a = (i) => {
        this.removeListener("data", o), this.socket.removeListener("error", a), n(i);
      };
      this.once("data", () => o()), this.socket.on("error", (i) => a(i));
    });
  }
  hasRemainingData() {
    return this.data.byteLength > 0;
  }
}
re.default = dn;
var ln = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, Et = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(xe, "__esModule", { value: !0 });
xe.statusBedrock = void 0;
const A = Et(x), ue = H, cn = Et(re), un = O;
function fn(r, t = 19132, e) {
  return r = r.trim(), (0, A.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, A.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, A.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, A.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, A.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, A.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, A.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, A.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, A.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, A.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, A.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`))), new Promise((n, o) => ln(this, void 0, void 0, function* () {
    var a;
    const i = new cn.default(r, t), c = setTimeout(() => {
      i == null || i.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
    try {
      let s = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (s = yield (0, un.resolveSRV)(r, "udp"), s && (r = s.host, t = s.port)), i.writeByte(1), i.writeInt64BE(BigInt(Date.now())), i.writeBytes(Uint8Array.from([0, 255, 255, 0, 254, 254, 254, 254, 253, 253, 253, 253, 18, 52, 86, 120])), i.writeInt64BE(BigInt(2)), yield i.flush(!1);
      {
        const l = yield i.readByte();
        if (l !== 28)
          throw new Error("Expected server to send packet type 0x1C, received " + l);
        yield i.readInt64BE();
        const d = yield i.readInt64BE();
        yield i.readBytes(16);
        const u = yield i.readInt16BE(), h = yield i.readString(u), [y, m, p, v, E, b, _, ne, Z, Ut, Ke, Qe] = h.split(";"), Fe = (0, ue.parse)(m + (ne ? `
` + ne : ""));
        i.close(), clearTimeout(c), n({
          edition: y,
          motd: {
            raw: (0, ue.format)(Fe),
            clean: (0, ue.clean)(Fe),
            html: (0, ue.toHTML)(Fe)
          },
          version: {
            name: v,
            protocol: parseInt(p)
          },
          players: {
            online: parseInt(E),
            max: parseInt(b)
          },
          serverGUID: d,
          serverID: _,
          gameMode: Z,
          gameModeID: parseInt(Ut),
          portIPv4: Ke ? parseInt(Ke) : null,
          portIPv6: Qe ? parseInt(Qe) : null,
          srvRecord: s
        });
      }
    } catch (s) {
      clearTimeout(c), i == null || i.close(), o(s);
    }
  }));
}
xe.statusBedrock = fn;
var $e = {}, hn = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, _t = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty($e, "__esModule", { value: !0 });
$e.queryBasic = void 0;
const D = _t(x), fe = H, yn = _t(re), mn = O;
function vn(r, t = 25565, e) {
  var n;
  r = r.trim(), (0, D.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, D.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, D.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, D.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, D.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, D.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, D.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, D.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, D.default)(typeof e.sessionID == "number" || typeof e.sessionID > "u", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof e.sessionID}'`), (0, D.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, D.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, D.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`)));
  const o = ((n = e == null ? void 0 : e.sessionID) !== null && n !== void 0 ? n : 1) & 252645135;
  return new Promise((a, i) => hn(this, void 0, void 0, function* () {
    var c;
    const s = new yn.default(r, t), l = setTimeout(() => {
      s == null || s.close(), i(new Error("Server is offline or unreachable"));
    }, (c = e == null ? void 0 : e.timeout) !== null && c !== void 0 ? c : 1e3 * 5);
    try {
      let d = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (d = yield (0, mn.resolveSRV)(r, "udp"), d && (r = d.host, t = d.port)), s.writeUInt16BE(65277), s.writeByte(9), s.writeInt32BE(o), yield s.flush(!1);
      let u;
      {
        const h = yield s.readByte();
        if (h !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + h);
        const y = yield s.readInt32BE();
        if (o !== y)
          throw new Error("Server session ID mismatch, expected " + o + ", received " + y);
        if (u = parseInt(yield s.readStringNT()), isNaN(u))
          throw new Error("Server sent an invalid challenge token");
      }
      s.writeUInt16BE(65277), s.writeByte(0), s.writeInt32BE(o), s.writeInt32BE(u), yield s.flush(!1);
      {
        const h = yield s.readByte();
        if (h !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + h);
        const y = yield s.readInt32BE();
        if (o !== y)
          throw new Error("Server session ID mismatch, expected " + o + ", received " + y);
        const m = yield s.readStringNT(), p = yield s.readStringNT(), v = yield s.readStringNT(), E = yield s.readStringNT(), b = yield s.readStringNT(), _ = yield s.readInt16LE(), ne = yield s.readStringNT(), Z = (0, fe.parse)(m);
        s.close(), clearTimeout(l), a({
          motd: {
            raw: (0, fe.format)(Z),
            clean: (0, fe.clean)(Z),
            html: (0, fe.toHTML)(Z)
          },
          gameType: p,
          map: v,
          players: {
            online: parseInt(E),
            max: parseInt(b)
          },
          hostPort: _,
          hostIP: ne
        });
      }
    } catch (d) {
      clearTimeout(l), s == null || s.close(), i(d);
    }
  }));
}
$e.queryBasic = vn;
var Se = {}, pn = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, Bt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Se, "__esModule", { value: !0 });
Se.queryFull = void 0;
const L = Bt(x), he = H, gn = Bt(re), wn = O, bn = [
  "gametype",
  "game_id",
  "version",
  "plugins",
  "map",
  "numplayers",
  "maxplayers",
  "hostport",
  "hostip"
].map((r) => Buffer.from(r, "ascii"));
function En(r, t = 25565, e) {
  var n;
  r = r.trim(), (0, L.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, L.default)(r.length > 0, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, L.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, L.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, L.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, L.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, L.default)(typeof e == "object" || typeof e > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof e}'`), typeof e == "object" && ((0, L.default)(typeof e.enableSRV == "boolean" || typeof e.enableSRV > "u", `Expected 'options.enableSRV' to be a 'boolean' or 'undefined', got '${typeof e.enableSRV}'`), (0, L.default)(typeof e.sessionID == "number" || typeof e.sessionID > "u", `Expected 'options.sessionID' to be a 'number' or 'undefined', got '${typeof e.sessionID}'`), (0, L.default)(typeof e.timeout == "number" || typeof e.timeout > "u", `Expected 'options.timeout' to be a 'number' or 'undefined', got '${typeof e.timeout}'`), typeof e.timeout == "number" && ((0, L.default)(Number.isInteger(e.timeout), `Expected 'options.timeout' to be an integer, got '${e.timeout}'`), (0, L.default)(e.timeout >= 0, `Expected 'options.timeout' to be greater than or equal to 0, got '${e.timeout}'`)));
  const o = ((n = e == null ? void 0 : e.sessionID) !== null && n !== void 0 ? n : 1) & 252645135;
  return new Promise((a, i) => pn(this, void 0, void 0, function* () {
    var c;
    const s = new gn.default(r, t), l = setTimeout(() => {
      s == null || s.close(), i(new Error("Server is offline or unreachable"));
    }, (c = e == null ? void 0 : e.timeout) !== null && c !== void 0 ? c : 1e3 * 5);
    try {
      let d = null;
      (typeof e > "u" || typeof e.enableSRV > "u" || e.enableSRV) && (d = yield (0, wn.resolveSRV)(r, "udp"), d && (r = d.host, t = d.port)), s.writeUInt16BE(65277), s.writeByte(9), s.writeInt32BE(o), yield s.flush(!1);
      let u;
      {
        const h = yield s.readByte();
        if (h !== 9)
          throw new Error("Expected server to send packet type 0x09, received " + h);
        const y = yield s.readInt32BE();
        if (o !== y)
          throw new Error("Server session ID mismatch, expected " + o + ", received " + y);
        if (u = parseInt(yield s.readStringNT()), isNaN(u))
          throw new Error("Server sent an invalid challenge token");
      }
      s.writeUInt16BE(65277), s.writeByte(0), s.writeInt32BE(o), s.writeInt32BE(u), s.writeBytes(Uint8Array.from([0, 0, 0, 0])), yield s.flush(!1);
      {
        const h = yield s.readByte();
        if (h !== 0)
          throw new Error("Expected server to send packet type 0x00, received " + h);
        const y = yield s.readInt32BE();
        if (o !== y)
          throw new Error("Server session ID mismatch, expected " + o + ", received " + y);
        yield s.readBytes(11);
        const m = {}, p = [];
        for (; ; ) {
          const b = yield s.readStringNT();
          if (b.length < 1)
            break;
          let _;
          b === "hostname" ? _ = yield s.readStringNTFollowedBy(bn) : _ = yield s.readStringNT(), m[b] = _;
        }
        for (yield s.readBytes(10); ; ) {
          const b = yield s.readStringNT();
          if (b.length < 1)
            break;
          p.push(b);
        }
        const v = (0, he.parse)(m.hostname), E = m.plugins.split(/(?::|;) */g);
        if (s.close(), s.hasRemainingData())
          throw new Error("Server sent more data than expected");
        clearTimeout(l), a({
          motd: {
            raw: (0, he.format)(v),
            clean: (0, he.clean)(v),
            html: (0, he.toHTML)(v)
          },
          version: m.version,
          software: E[0],
          plugins: E.slice(1),
          map: m.map,
          players: {
            online: parseInt(m.numplayers),
            max: parseInt(m.maxplayers),
            list: p
          },
          hostIP: m.hostip,
          hostPort: parseInt(m.hostport)
        });
      }
    } catch (d) {
      clearTimeout(l), s == null || s.close(), i(d);
    }
  }));
}
Se.queryFull = En;
var ke = {}, _n = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, It = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(ke, "__esModule", { value: !0 });
ke.scanLAN = void 0;
const Ne = It(x), Bn = It(lt), In = G, xn = new In.TextDecoder("utf8"), $n = /\[MOTD\](.*)\[\/MOTD\]\[AD\](\d{1,5})\[\/AD\]/;
function Sn(r) {
  (0, Ne.default)(typeof r == "object" || typeof r > "u", `Expected 'options' to be an 'object' or 'undefined', got '${typeof r}'`), typeof r == "object" && ((0, Ne.default)(typeof r.scanTime == "number" || typeof r.scanTime > "u", `Expected 'options.scanTime' to be a 'number' or 'undefined', got '${typeof r.scanTime}'`), typeof r.scanTime == "number" && (0, Ne.default)(r.scanTime > 0, `Expected 'options.scanTime' to be greater than or equal to 0, got '${r.scanTime}'`));
  const t = [], e = Bn.default.createSocket("udp4");
  return e.on("message", (n, o) => {
    const a = xn.decode(n).match($n);
    if (!a || a.length < 3)
      return;
    let i = parseInt(a[2]);
    isNaN(i) && (i = 25565), !t.some((c) => c.host === o.address && c.port === i) && t.push({
      host: o.address,
      port: i,
      motd: a[1]
    });
  }), e.bind(4445, () => {
    e.addMembership("224.0.2.60");
  }), new Promise((n, o) => {
    var a;
    const i = setTimeout(() => _n(this, void 0, void 0, function* () {
      yield new Promise((c) => e.close(c)), n(t);
    }), (a = r == null ? void 0 : r.scanTime) !== null && a !== void 0 ? a : 5e3);
    e.on("error", (c) => {
      e.close(), clearTimeout(i), o(c);
    });
  });
}
ke.scanLAN = Sn;
var De = {}, kn = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, Ge = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(De, "__esModule", { value: !0 });
De.sendVote = void 0;
const C = Ge(x), Dn = Ge(ve), Ln = G, Pn = Ge(j), Tn = new Ln.TextEncoder();
function Fn(r, t = 8192, e) {
  return r = r.trim(), (0, C.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, C.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, C.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, C.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, C.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, C.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, C.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), (0, C.default)(typeof e.username == "string", `Expected 'options.username' to be an 'string', got '${typeof e.username}'`), (0, C.default)(e.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${e.username.length}`), (0, C.default)(typeof e.token == "string", `Expected 'options.token' to be an 'string', got '${typeof e.token}'`), (0, C.default)(e.token.length > 1, `Expected 'options.token' to have a length greater than 0, got ${e.token.length}`), new Promise((n, o) => kn(this, void 0, void 0, function* () {
    var a, i, c, s, l;
    let d;
    const u = setTimeout(() => {
      d == null || d.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 5e3);
    try {
      d = new Pn.default(), yield d.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 });
      let h;
      {
        const y = yield d.readStringUntil(10), m = y.split(" ");
        if (m[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + y);
        if (m[1] !== "2")
          throw new Error("Unsupported Votifier version: " + m[1]);
        h = m[2];
      }
      {
        const y = {
          serviceName: (c = e.serviceName) !== null && c !== void 0 ? c : "minecraft-server-util (https://github.com/PassTheMayo/minecraft-server-util)",
          username: e.username,
          address: (s = e.address) !== null && s !== void 0 ? s : r + ":" + t,
          timestamp: (l = e.timestamp) !== null && l !== void 0 ? l : Date.now(),
          challenge: h
        };
        e.uuid && (y.uuid = e.uuid);
        const m = JSON.stringify(y), p = {
          payload: m,
          signature: Dn.default.createHmac("sha256", e.token).update(m).digest("base64")
        }, v = JSON.stringify(p), E = Tn.encode(v);
        d.writeInt16BE(29498), d.writeInt16BE(E.byteLength), d.writeBytes(E), yield d.flush(!1);
      }
      {
        const y = yield d.readStringUntil(10), m = JSON.parse(y);
        switch (d.close(), clearTimeout(u), m.status) {
          case "ok": {
            n();
            break;
          }
          case "error": {
            o(new Error(m.cause + ": " + m.error));
            break;
          }
          default: {
            o(new Error("Server sent an unknown response: " + y));
            break;
          }
        }
      }
    } catch (h) {
      clearTimeout(u), d == null || d.close(), o(h);
    }
  }));
}
De.sendVote = Fn;
var Le = {}, Rn = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, ze = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Le, "__esModule", { value: !0 });
Le.sendLegacyVote = void 0;
const N = ze(x), tt = ze(ve), Vn = ze(j), An = (r, t) => r.replace(new RegExp(`(?![^\\n]{1,${t}}$)([^\\n]{1,${t}})\\s`, "g"), `$1
`);
function Cn(r, t = 8192, e) {
  return r = r.trim(), e.key = e.key.replace(/ /g, "+"), e.key = An(e.key, 65), (0, N.default)(typeof r == "string", `Expected 'host' to be a 'string', got '${typeof r}'`), (0, N.default)(r.length > 1, `Expected 'host' to have a length greater than 0, got ${r.length}`), (0, N.default)(typeof t == "number", `Expected 'port' to be a 'number', got '${typeof t}'`), (0, N.default)(Number.isInteger(t), `Expected 'port' to be an integer, got '${t}'`), (0, N.default)(t >= 0, `Expected 'port' to be greater than or equal to 0, got '${t}'`), (0, N.default)(t <= 65535, `Expected 'port' to be less than or equal to 65535, got '${t}'`), (0, N.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), (0, N.default)(typeof e.username == "string", `Expected 'options.username' to be an 'string', got '${typeof e.username}'`), (0, N.default)(e.username.length > 1, `Expected 'options.username' to have a length greater than 0, got ${e.username.length}`), (0, N.default)(typeof e.key == "string", `Expected 'options.key' to be an 'string', got '${typeof e.key}'`), (0, N.default)(e.key.length > 1, `Expected 'options.key' to have a length greater than 0, got ${e.key.length}`), new Promise((n, o) => Rn(this, void 0, void 0, function* () {
    var a, i, c, s;
    let l;
    const d = setTimeout(() => {
      l == null || l.close(), o(new Error("Server is offline or unreachable"));
    }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 5e3);
    try {
      l = new Vn.default(), yield l.connect({ host: r, port: t, timeout: (i = e == null ? void 0 : e.timeout) !== null && i !== void 0 ? i : 1e3 * 5 });
      {
        const u = yield l.readStringUntil(10);
        if (u.split(" ")[0] !== "VOTIFIER")
          throw new Error("Not connected to a Votifier server. Expected VOTIFIER in handshake, received: " + u);
      }
      {
        const u = (c = e.timestamp) !== null && c !== void 0 ? c : Date.now(), h = (s = e.address) !== null && s !== void 0 ? s : r + ":" + t, y = `-----BEGIN PUBLIC KEY-----
${e.key}
-----END PUBLIC KEY-----
`, m = `VOTE
${e.serviceName}
${e.username}
${h}
${u}
`, p = tt.default.publicEncrypt({
          key: y,
          padding: tt.default.constants.RSA_PKCS1_PADDING
        }, Buffer.from(m));
        l.writeBytes(p), yield l.flush(!1);
      }
      clearTimeout(d), l.close(), n();
    } catch (u) {
      clearTimeout(d), l == null || l.close(), o(u);
    }
  }));
}
Le.sendLegacyVote = Cn;
var Pe = {}, X = f && f.__awaiter || function(r, t, e, n) {
  function o(a) {
    return a instanceof e ? a : new e(function(i) {
      i(a);
    });
  }
  return new (e || (e = Promise))(function(a, i) {
    function c(d) {
      try {
        l(n.next(d));
      } catch (u) {
        i(u);
      }
    }
    function s(d) {
      try {
        l(n.throw(d));
      } catch (u) {
        i(u);
      }
    }
    function l(d) {
      d.done ? a(d.value) : o(d.value).then(c, s);
    }
    l((n = n.apply(r, t || [])).next());
  });
}, xt = f && f.__importDefault || function(r) {
  return r && r.__esModule ? r : { default: r };
};
Object.defineProperty(Pe, "__esModule", { value: !0 });
Pe.RCON = void 0;
const $ = xt(x), Nn = He, On = G, jn = xt(j), rt = new On.TextEncoder();
class Mn extends Nn.EventEmitter {
  constructor() {
    super(), this.isLoggedIn = !1, this.socket = null, this.requestID = 0;
  }
  get isConnected() {
    return this.socket && this.socket.isConnected || !1;
  }
  connect(t, e = 25575, n = {}) {
    return (0, $.default)(typeof t == "string", `Expected 'host' to be a 'string', got '${typeof t}'`), (0, $.default)(t.length > 1, `Expected 'host' to have a length greater than 0, got ${t.length}`), (0, $.default)(typeof e == "number", `Expected 'port' to be a 'number', got '${typeof e}'`), (0, $.default)(Number.isInteger(e), `Expected 'port' to be an integer, got '${e}'`), (0, $.default)(e >= 0, `Expected 'port' to be greater than or equal to 0, got '${e}'`), (0, $.default)(e <= 65535, `Expected 'port' to be less than or equal to 65535, got '${e}'`), (0, $.default)(typeof n == "object", `Expected 'options' to be an 'object', got '${typeof n}'`), new Promise((o, a) => {
      var i;
      this.socket = new jn.default();
      const c = setTimeout(() => {
        var s;
        a(new Error("Server is offline or unreachable")), (s = this.socket) === null || s === void 0 || s.close();
      }, (i = n == null ? void 0 : n.timeout) !== null && i !== void 0 ? i : 1e3 * 5);
      this.socket.connect(Object.assign({ host: t, port: e }, n)).then(() => {
        clearTimeout(c), o();
      }).catch((s) => {
        clearTimeout(c), a(s);
      });
    });
  }
  login(t, e = {}) {
    return (0, $.default)(typeof t == "string", `Expected 'password' to be a 'string', got '${typeof t}'`), (0, $.default)(t.length > 1, `Expected 'password' to have a length greater than 0, got ${t.length}`), (0, $.default)(typeof e == "object", `Expected 'options' to be an 'object', got '${typeof e}'`), new Promise((n, o) => X(this, void 0, void 0, function* () {
      var a;
      if (this.socket === null || !this.socket.isConnected)
        return o(new Error("login() attempted before RCON has connected"));
      const i = setTimeout(() => {
        var s;
        o(new Error("Server is offline or unreachable")), (s = this.socket) === null || s === void 0 || s.close();
      }, (a = e == null ? void 0 : e.timeout) !== null && a !== void 0 ? a : 1e3 * 5);
      this.isLoggedIn = !1;
      const c = rt.encode(t);
      this.socket.writeInt32LE(10 + c.byteLength), this.socket.writeInt32LE(this.requestID++), this.socket.writeInt32LE(3), this.socket.writeBytes(c), this.socket.writeBytes(Uint8Array.from([0, 0])), yield this.socket.flush(!1);
      {
        const s = yield this.socket.readInt32LE();
        this.socket.ensureBufferedData(s), (yield this.socket.readInt32LE()) === -1 && o(new Error("Invalid RCON password"));
        const d = yield this.socket.readInt32LE();
        d !== 2 && o(new Error("Expected server to send packet type 2, received " + d)), yield this.socket.readBytes(2);
      }
      this.isLoggedIn = !0, clearTimeout(i), n(), process.nextTick(() => X(this, void 0, void 0, function* () {
        for (; this.socket !== null && this.socket.isConnected && this.isLoggedIn; )
          try {
            yield this._readPacket();
          } catch (s) {
            this.emit("error", s);
          }
      }));
    }));
  }
  run(t) {
    return X(this, void 0, void 0, function* () {
      if ((0, $.default)(typeof t == "string", `Expected 'command' to be a 'string', got '${typeof t}'`), (0, $.default)(t.length > 0, `Expected 'command' to have a length greater than 0, got ${t.length}`), this.socket === null || !this.socket.isConnected)
        throw new Error("run() attempted before RCON has connected");
      if (!this.isLoggedIn)
        throw new Error("run() attempted before RCON has successfully logged in");
      const e = rt.encode(t), n = this.requestID++;
      return this.socket.writeInt32LE(10 + e.byteLength), this.socket.writeInt32LE(n), this.socket.writeInt32LE(2), this.socket.writeBytes(e), this.socket.writeBytes(Uint8Array.from([0, 0])), yield this.socket.flush(!1), n;
    });
  }
  execute(t) {
    return X(this, void 0, void 0, function* () {
      (0, $.default)(typeof t == "string", `Expected 'command' to be a 'string', got '${typeof t}'`), (0, $.default)(t.length > 1, `Expected 'command' to have a length greater than 0, got ${t.length}`);
      const e = yield this.run(t);
      return new Promise((n) => {
        const o = (a) => {
          a.requestID === e && (this.removeListener("message", o), n(a.message));
        };
        this.on("message", o);
      });
    });
  }
  _readPacket() {
    return X(this, void 0, void 0, function* () {
      if (this.socket === null || !this.socket.isConnected || !this.isLoggedIn)
        return Promise.reject(new Error("Attempted to read packet when socket was disconnected or RCON was not logged in"));
      const t = yield this.socket.readInt32LE();
      yield this.socket.ensureBufferedData(t);
      const e = yield this.socket.readInt32LE();
      if ((yield this.socket.readInt32LE()) === 0) {
        const o = yield this.socket.readStringNT();
        yield this.socket.readBytes(1), this.emit("message", { requestID: e, message: o });
      } else
        yield this.socket.readBytes(t - 8);
    });
  }
  close() {
    var t;
    (t = this.socket) === null || t === void 0 || t.close();
  }
}
Pe.RCON = Mn;
var Te = {};
Object.defineProperty(Te, "__esModule", { value: !0 });
Te.parseAddress = void 0;
const Un = /^([^:]+)(?::(\d{1,5}))?$/;
function qn(r, t = 25565) {
  const e = r.match(Un);
  if (!e)
    return null;
  const n = e[2] ? parseInt(e[2]) : t;
  return isNaN(n) || n < 1 || n > 65535 ? null : {
    host: e[1],
    port: n
  };
}
Te.parseAddress = qn;
var $t = {};
Object.defineProperty($t, "__esModule", { value: !0 });
var St = {};
Object.defineProperty(St, "__esModule", { value: !0 });
var kt = {};
Object.defineProperty(kt, "__esModule", { value: !0 });
var Dt = {};
Object.defineProperty(Dt, "__esModule", { value: !0 });
var Lt = {};
Object.defineProperty(Lt, "__esModule", { value: !0 });
var Pt = {};
Object.defineProperty(Pt, "__esModule", { value: !0 });
var Tt = {};
Object.defineProperty(Tt, "__esModule", { value: !0 });
var Ft = {};
Object.defineProperty(Ft, "__esModule", { value: !0 });
var Rt = {};
Object.defineProperty(Rt, "__esModule", { value: !0 });
var Vt = {};
Object.defineProperty(Vt, "__esModule", { value: !0 });
var At = {};
Object.defineProperty(At, "__esModule", { value: !0 });
var Ct = {};
Object.defineProperty(Ct, "__esModule", { value: !0 });
(function(r) {
  var t = f && f.__createBinding || (Object.create ? function(n, o, a, i) {
    i === void 0 && (i = a);
    var c = Object.getOwnPropertyDescriptor(o, a);
    (!c || ("get" in c ? !o.__esModule : c.writable || c.configurable)) && (c = { enumerable: !0, get: function() {
      return o[a];
    } }), Object.defineProperty(n, i, c);
  } : function(n, o, a, i) {
    i === void 0 && (i = a), n[i] = o[a];
  }), e = f && f.__exportStar || function(n, o) {
    for (var a in n) a !== "default" && !Object.prototype.hasOwnProperty.call(o, a) && t(o, n, a);
  };
  Object.defineProperty(r, "__esModule", { value: !0 }), e(pe, r), e(Ee, r), e(_e, r), e(Be, r), e(Ie, r), e(xe, r), e($e, r), e(Se, r), e(ke, r), e(De, r), e(Le, r), e(Pe, r), e(Te, r), e($t, r), e(St, r), e(kt, r), e(Dt, r), e(Lt, r), e(Pt, r), e(Tt, r), e(Ft, r), e(Rt, r), e(Vt, r), e(At, r), e(Ct, r);
})(ut);
async function Hn(r, t, e = 5e3) {
  try {
    return await ut.status(r, t, { timeout: e });
  } catch (n) {
    throw console.error(`获取 Minecraft 服务器状态失败: ${n}`), n;
  }
}
class nt extends Error {
  constructor(t) {
    super(`${t} is locked`);
  }
}
const z = {
  old: /* @__PURE__ */ new Set(),
  young: /* @__PURE__ */ new Set()
}, Jn = 1e3 * 15;
let ee;
const Wn = () => {
  const r = tr.networkInterfaces(), t = /* @__PURE__ */ new Set([void 0, "0.0.0.0"]);
  for (const e of Object.values(r))
    for (const n of e)
      t.add(n.address);
  return t;
}, at = (r) => new Promise((t, e) => {
  const n = er.createServer();
  n.unref(), n.on("error", e), n.listen(r, () => {
    const { port: o } = n.address();
    n.close(() => {
      t(o);
    });
  });
}), ot = async (r, t) => {
  if (r.host || r.port === 0)
    return at(r);
  for (const e of t)
    try {
      await at({ port: r.port, host: e });
    } catch (n) {
      if (!["EADDRNOTAVAIL", "EINVAL"].includes(n.code))
        throw n;
    }
  return r.port;
}, Gn = function* (r) {
  r && (yield* r), yield 0;
};
async function zn(r) {
  let t, e = /* @__PURE__ */ new Set();
  if (r && (r.port && (t = typeof r.port == "number" ? [r.port] : r.port), r.exclude)) {
    const o = r.exclude;
    if (typeof o[Symbol.iterator] != "function")
      throw new TypeError("The `exclude` option must be an iterable.");
    for (const a of o) {
      if (typeof a != "number")
        throw new TypeError("Each item in the `exclude` option must be a number corresponding to the port you want excluded.");
      if (!Number.isSafeInteger(a))
        throw new TypeError(`Number ${a} in the exclude option is not a safe integer and can't be used`);
    }
    e = new Set(o);
  }
  ee === void 0 && (ee = setTimeout(() => {
    ee = void 0, z.old = z.young, z.young = /* @__PURE__ */ new Set();
  }, Jn), ee.unref && ee.unref());
  const n = Wn();
  for (const o of Gn(t))
    try {
      if (e.has(o))
        continue;
      let a = await ot({ ...r, port: o }, n);
      for (; z.old.has(a) || z.young.has(a); ) {
        if (o !== 0)
          throw new nt(o);
        a = await ot({ ...r, port: o }, n);
      }
      return z.young.add(a), a;
    } catch (a) {
      if (!["EADDRINUSE", "EACCES"].includes(a.code) && !(a instanceof nt))
        throw a;
    }
  throw new Error("No available ports found");
}
function Kn(r, t) {
  if (!Number.isInteger(r) || !Number.isInteger(t))
    throw new TypeError("`from` and `to` must be integer numbers");
  return function* (n, o) {
    for (let a = n; a <= o; a++)
      yield a;
  }(r, t);
}
class Qn {
  constructor(t) {
    B(this, "config");
    B(this, "udpClient", null);
    B(this, "tcpServer", null);
    B(this, "broadcastTimer", null);
    B(this, "activeConnections", /* @__PURE__ */ new Set());
    this.config = t;
  }
  async start() {
    const t = await zn({ port: Kn(2e4, 65535) });
    return this.config.localPort || (this.config.localPort = t, console.log(`使用随机端口 ${t}`)), new Promise((e, n) => {
      this.startWithRetry(e, n);
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
        async (n) => {
          n.code === "EADDRINUSE" ? (console.warn(`[*] 端口 ${this.config.localPort} 被占用，尝试自动递增...`), this.config.localPort += 1, this.config.localPort > 65535 && (this.config.localPort = 2e4), setTimeout(() => this.startWithRetry(t, e), 10)) : e(n);
        }
      );
    } catch (n) {
      e(n);
    }
  }
  startUdpBroadcaster() {
    const t = "224.0.2.60", n = Buffer.from(`[MOTD]${this.config.fakeMotd}[/MOTD][AD]${this.config.localPort}[/AD]`);
    this.udpClient = Xt.createSocket({ type: "udp4", reuseAddr: !0 }), this.udpClient.on("error", (o) => console.error(`[UDP Error] ${o.message}`)), this.broadcastTimer = setInterval(() => {
      this.udpClient && this.udpClient.send(n, 0, n.length, 4445, t);
    }, 1500), console.log(`[*] ID: ${this.config.id} UDP 广播已启动`);
  }
  startTcpProxy(t, e) {
    this.tcpServer = Ze.createServer((n) => {
      const o = new Ze.Socket();
      this.activeConnections.add(n), this.activeConnections.add(o);
      const a = () => {
        n.destroy(), o.destroy(), this.activeConnections.delete(n), this.activeConnections.delete(o);
      };
      n.pause(), o.connect(this.config.remotePort, this.config.remoteHost, () => {
        n.resume(), n.pipe(o), o.pipe(n);
      }), n.once("data", (i) => {
        try {
          const s = i.toString("utf8", 0, 100).match(/[a-zA-Z0-9_]{3,16}/);
          s && console.log(`[*] 识别到可能的玩家名: ${s[0]}`);
        } catch {
        }
      }), n.on("error", a), o.on("error", a), n.on("close", a), o.on("close", a), n.setTimeout(3e4), n.on("timeout", () => {
        console.log("[Proxy] 连接超时已切断"), a();
      });
    }), this.tcpServer.on("error", (n) => {
      n.code === "EADDRINUSE" ? e(new Error(`端口 ${this.config.localPort} 已被占用`)) : e(n);
    }), this.tcpServer.listen(this.config.localPort, "0.0.0.0", () => {
      console.log(`[*] TCP 代理就绪: ${this.config.localPort} -> ${this.config.remoteHost}`), t();
    });
  }
  stop() {
    var t, e;
    this.broadcastTimer && clearInterval(this.broadcastTimer), (t = this.udpClient) == null || t.close(), (e = this.tcpServer) == null || e.close(() => {
      console.log(`[*] 代理实例 ${this.config.id} 已完全停止`);
    });
    for (const n of this.activeConnections)
      n.destroy();
    this.activeConnections.clear();
  }
  /**
   * 清理函数：确保递归重试时不会留下半开的服务器
   */
  cleanupTempResources() {
    this.broadcastTimer && (clearInterval(this.broadcastTimer), this.broadcastTimer = null), this.udpClient && (this.udpClient.close(), this.udpClient = null);
  }
}
class Yn {
  constructor() {
    B(this, "instances", /* @__PURE__ */ new Map());
  }
  init() {
    je.on("mcproxy:start", async (t, e) => {
      if (this.instances.has(e.id)) {
        t.reply("mcproxy:status", { id: e.id, success: !1, message: "该 ID 的实例已在运行", localPort: e.localPort });
        return;
      }
      const n = new Qn(e);
      try {
        await n.start(), this.instances.set(e.id, n), t.reply("mcproxy:status", { id: e.id, success: !0, message: "启动成功", localPort: e.localPort });
      } catch (o) {
        t.reply("mcproxy:status", { id: e.id, success: !1, message: o.message });
      }
    }), je.on("mcproxy:stop", (t, e) => {
      const n = this.instances.get(e);
      n && (n.stop(), this.instances.delete(e), t.reply("mcproxy:status", { id: e, success: !1, message: "已停止" }));
    });
  }
}
const Zn = new Yn(), K = new or(), Oe = new lr();
Zn.init();
function Xn(r, t) {
  const e = new cr(t);
  r.handle("network:tcp", async (n, o, a) => {
    const i = parseInt(String(a), 10), c = String(o || "").trim();
    return isNaN(i) || i <= 0 || i > 65535 ? (console.error(`无效的端口: ${a}`), -1) : c ? new Promise((s) => {
      const l = new dt.Socket(), d = Date.now();
      l.setTimeout(2e3), l.connect({ port: i, host: c }, () => {
        const h = Date.now() - d;
        l.destroy(), s(h);
      });
      const u = () => {
        l.destroy(), s(-1);
      };
      l.on("error", u), l.on("timeout", u);
    }) : (console.error(`无效的地址: ${o}`), -1);
  }), r.on("system:openUrl", (n, o) => {
    Jt.openExternal(o);
  }), r.handle("system:version", () => q.getVersion()), r.handle("platform:list", () => K.getPlatforms()), r.handle(
    "platform:add",
    (n, o) => K.addPlatform(o)
  ), r.handle(
    "platform:update",
    (n, o, a) => {
      K.updatePlatform(o, a);
    }
  ), r.handle(
    "platform:enable",
    (n, o) => {
      K.enablePlatform(o);
    }
  ), r.handle(
    "platform:disable",
    (n, o) => {
      K.disablePlatform(o);
    }
  ), r.handle(
    "platform:remove",
    (n, o) => {
      K.removePlatform(o);
    }
  ), r.handle(
    "mojang:getProfile",
    async (n, o) => await sr(o)
  ), r.handle(
    "frp:natfrp.userInfo",
    async (n, o) => await M.userInfo(o)
  ), r.handle(
    "frp:natfrp.getNodes",
    async (n, o) => await M.nodes(o)
  ), r.handle(
    "frp:natfrp.nodeStats",
    async (n, o) => await M.nodeStats(o)
  ), r.handle(
    "frp:natfrp.getMergedNodes",
    async (n, o) => await M.getMergedNodes(o)
  ), r.handle(
    "frp:natfrp.getTunnels",
    async (n, o) => await M.tunnelInfo(o)
  ), r.handle(
    "frp:natfrp.tunnelCreate",
    async (n, o, a, i) => await M.tunnelCreate(o, a, i)
  ), r.handle(
    "frp:natfrp.tunnelEdit",
    async (n, o, a, i) => await M.tunnelEdit(o, a, i)
  ), r.handle("frpc:start", (n, o, a) => (e.startTunnel(o, a), !0)), r.handle("frpc:stop", (n, o) => (e.stopTunnel(o), !0)), r.handle("sakurafrp:exists", () => Oe.exists()), r.handle("sakurafrp:download", async (n) => {
    const o = await M.clients(), a = dr(o);
    return await Oe.download(
      a.url,
      a.hash,
      (i) => {
        n.sender.send("sakurafrp:progress", i);
      }
    ), {
      version: a.version,
      path: Oe.filePath
    };
  }), r.handle("minecraft:detect", async () => await Me.detectAll()), r.handle(
    "minecraft:status",
    async (n, o, a, i) => await Hn(o, a, i)
  ), r.on("window:minimize", () => {
    t == null || t.minimize();
  }), r.on("window:close", () => {
    t == null || t.close();
  });
}
if (typeof it == "string")
  throw new TypeError("Not running in an Electron environment!");
const { env: Nt } = process, ea = "ELECTRON_IS_DEV" in Nt, ta = Number.parseInt(Nt.ELECTRON_IS_DEV, 10) === 1, ra = ea ? ta : !it.app.isPackaged, Ot = U.dirname(Wt(import.meta.url));
process.env.APP_ROOT = U.join(Ot, "..");
const qe = process.env.VITE_DEV_SERVER_URL, _a = U.join(process.env.APP_ROOT, "dist-electron"), jt = U.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = qe ? U.join(process.env.APP_ROOT, "public") : jt;
let S;
function Mt() {
  S = new st({
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
    icon: U.join(process.env.VITE_PUBLIC, "favicon.png"),
    title: "OneTunnel",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !0,
      preload: U.join(Ot, "preload.mjs")
    }
  }), S.setMenu(null), S.setMenuBarVisibility(!1), process.env.NODE_MODE && S.webContents.openDevTools(), S.on("maximize", () => {
    S == null || S.unmaximize();
  }), Xn(je, S), (process.env.NODE_ENV === "development" || ra) && S.webContents.openDevTools(), qe ? S.loadURL(qe) : S.loadFile(U.join(jt, "index.html"));
}
q.on("window-all-closed", () => {
  process.platform !== "darwin" && (q.quit(), S = null);
});
q.on("activate", async () => {
  st.getAllWindows().length === 0 && Mt();
});
q.whenReady().then(Mt);
export {
  _a as MAIN_DIST,
  jt as RENDERER_DIST,
  qe as VITE_DEV_SERVER_URL
};
