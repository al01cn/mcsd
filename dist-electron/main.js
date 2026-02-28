var rt = Object.defineProperty;
var nt = (l, c, s) => c in l ? rt(l, c, { enumerable: !0, configurable: !0, writable: !0, value: s }) : l[c] = s;
var h = (l, c, s) => nt(l, typeof c != "symbol" ? c + "" : c, s);
import fe, { app as x, dialog as st, shell as ot, ipcMain as ke, BrowserWindow as We } from "electron";
import { fileURLToPath as it } from "node:url";
import w from "node:path";
import j from "node:fs/promises";
import F from "path";
import at from "child_process";
import N from "os";
import R from "fs";
import ct from "util";
import Ue from "events";
import lt from "http";
import ut from "https";
async function ft(l) {
  try {
    await j.access(l);
  } catch {
    return l;
  }
  const c = w.dirname(l), s = w.extname(l), i = w.basename(l, s);
  for (let o = 1; o < 1e4; o += 1) {
    const r = w.join(c, `${i} (${o})${s}`);
    try {
      await j.access(r);
    } catch {
      return r;
    }
  }
  return w.join(c, `${i} (${Date.now()})${s}`);
}
function pt(l, c) {
  l.on("window:minimize", () => {
    c == null || c.minimize();
  }), l.on("window:close", () => {
    c == null || c.close();
  }), l.handle("system:getPath", async (s, i) => {
    if (i !== "downloads") throw new Error("unsupported system path");
    return x.getPath(i);
  }), l.handle("dialog:selectDirectory", async () => {
    const s = await st.showOpenDialog(c, {
      properties: ["openDirectory", "createDirectory"]
    });
    return s.canceled ? null : s.filePaths[0] ?? null;
  }), l.handle("shell:openPath", async (s, i) => ot.openPath(i)), l.handle(
    "pack:saveToDirectory",
    async (s, i) => {
      const o = String(i.directory || "").trim(), r = String(i.fileName || "").trim();
      if (!o) throw new Error("directory is required");
      if (!r) throw new Error("fileName is required");
      const e = w.basename(r);
      await j.mkdir(o, { recursive: !0 });
      const t = w.join(o, e), n = await ft(t), a = i.data instanceof ArrayBuffer ? new Uint8Array(i.data) : i.data;
      return await j.writeFile(n, Buffer.from(a)), n;
    }
  );
}
function ht(l) {
  return l && l.__esModule && Object.prototype.hasOwnProperty.call(l, "default") ? l.default : l;
}
var _ = { exports: {} }, T = { exports: {} }, he;
function Ve() {
  return he || (he = 1, function(l) {
    let c = {};
    try {
      c = require("electron");
    } catch {
    }
    c.ipcRenderer && s(c), l.exports = s;
    function s({ contextBridge: i, ipcRenderer: o }) {
      if (!o)
        return;
      o.on("__ELECTRON_LOG_IPC__", (e, t) => {
        window.postMessage({ cmd: "message", ...t });
      }), o.invoke("__ELECTRON_LOG__", { cmd: "getOptions" }).catch((e) => console.error(new Error(
        `electron-log isn't initialized in the main process. Please call log.initialize() before. ${e.message}`
      )));
      const r = {
        sendToMain(e) {
          try {
            o.send("__ELECTRON_LOG__", e);
          } catch (t) {
            console.error("electronLog.sendToMain ", t, "data:", e), o.send("__ELECTRON_LOG__", {
              cmd: "errorHandler",
              error: { message: t == null ? void 0 : t.message, stack: t == null ? void 0 : t.stack },
              errorName: "sendToMain"
            });
          }
        },
        log(...e) {
          r.sendToMain({ data: e, level: "info" });
        }
      };
      for (const e of ["error", "warn", "info", "verbose", "debug", "silly"])
        r[e] = (...t) => r.sendToMain({
          data: t,
          level: e
        });
      if (i && process.contextIsolated)
        try {
          i.exposeInMainWorld("__electronLog", r);
        } catch {
        }
      typeof window == "object" ? window.__electronLog = r : __electronLog = r;
    }
  }(T)), T.exports;
}
var C = { exports: {} }, q, de;
function dt() {
  if (de) return q;
  de = 1, q = l;
  function l(c) {
    return Object.defineProperties(s, {
      defaultLabel: { value: "", writable: !0 },
      labelPadding: { value: !0, writable: !0 },
      maxLabelLength: { value: 0, writable: !0 },
      labelLength: {
        get() {
          switch (typeof s.labelPadding) {
            case "boolean":
              return s.labelPadding ? s.maxLabelLength : 0;
            case "number":
              return s.labelPadding;
            default:
              return 0;
          }
        }
      }
    });
    function s(i) {
      s.maxLabelLength = Math.max(s.maxLabelLength, i.length);
      const o = {};
      for (const r of c.levels)
        o[r] = (...e) => c.logData(e, { level: r, scope: i });
      return o.log = o.info, o;
    }
  }
  return q;
}
var z, ge;
function gt() {
  if (ge) return z;
  ge = 1;
  class l {
    constructor({ processMessage: s }) {
      this.processMessage = s, this.buffer = [], this.enabled = !1, this.begin = this.begin.bind(this), this.commit = this.commit.bind(this), this.reject = this.reject.bind(this);
    }
    addMessage(s) {
      this.buffer.push(s);
    }
    begin() {
      this.enabled = [];
    }
    commit() {
      this.enabled = !1, this.buffer.forEach((s) => this.processMessage(s)), this.buffer = [];
    }
    reject() {
      this.enabled = !1, this.buffer = [];
    }
  }
  return z = l, z;
}
var M, me;
function Be() {
  if (me) return M;
  me = 1;
  const l = dt(), c = gt(), i = class i {
    constructor({
      allowUnknownLevel: r = !1,
      dependencies: e = {},
      errorHandler: t,
      eventLogger: n,
      initializeFn: a,
      isDev: u = !1,
      levels: f = ["error", "warn", "info", "verbose", "debug", "silly"],
      logId: p,
      transportFactories: d = {},
      variables: E
    } = {}) {
      h(this, "dependencies", {});
      h(this, "errorHandler", null);
      h(this, "eventLogger", null);
      h(this, "functions", {});
      h(this, "hooks", []);
      h(this, "isDev", !1);
      h(this, "levels", null);
      h(this, "logId", null);
      h(this, "scope", null);
      h(this, "transports", {});
      h(this, "variables", {});
      this.addLevel = this.addLevel.bind(this), this.create = this.create.bind(this), this.initialize = this.initialize.bind(this), this.logData = this.logData.bind(this), this.processMessage = this.processMessage.bind(this), this.allowUnknownLevel = r, this.buffering = new c(this), this.dependencies = e, this.initializeFn = a, this.isDev = u, this.levels = f, this.logId = p, this.scope = l(this), this.transportFactories = d, this.variables = E || {};
      for (const m of this.levels)
        this.addLevel(m, !1);
      this.log = this.info, this.functions.log = this.log, this.errorHandler = t, t == null || t.setOptions({ ...e, logFn: this.error }), this.eventLogger = n, n == null || n.setOptions({ ...e, logger: this });
      for (const [m, g] of Object.entries(d))
        this.transports[m] = g(this, e);
      i.instances[p] = this;
    }
    static getInstance({ logId: r }) {
      return this.instances[r] || this.instances.default;
    }
    addLevel(r, e = this.levels.length) {
      e !== !1 && this.levels.splice(e, 0, r), this[r] = (...t) => this.logData(t, { level: r }), this.functions[r] = this[r];
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
    compareLevels(r, e, t = this.levels) {
      const n = t.indexOf(r), a = t.indexOf(e);
      return a === -1 || n === -1 ? !0 : a <= n;
    }
    initialize(r = {}) {
      this.initializeFn({ logger: this, ...this.dependencies, ...r });
    }
    logData(r, e = {}) {
      this.buffering.enabled ? this.buffering.addMessage({ data: r, date: /* @__PURE__ */ new Date(), ...e }) : this.processMessage({ data: r, ...e });
    }
    processMessage(r, { transports: e = this.transports } = {}) {
      if (r.cmd === "errorHandler") {
        this.errorHandler.handle(r.error, {
          errorName: r.errorName,
          processType: "renderer",
          showDialog: !!r.showDialog
        });
        return;
      }
      let t = r.level;
      this.allowUnknownLevel || (t = this.levels.includes(r.level) ? r.level : "info");
      const n = {
        date: /* @__PURE__ */ new Date(),
        logId: this.logId,
        ...r,
        level: t,
        variables: {
          ...this.variables,
          ...r.variables
        }
      };
      for (const [a, u] of this.transportEntries(e))
        if (!(typeof u != "function" || u.level === !1) && this.compareLevels(u.level, r.level))
          try {
            const f = this.hooks.reduce((p, d) => p && d(p, u, a), n);
            f && u({ ...f, data: [...f.data] });
          } catch (f) {
            this.processInternalErrorFn(f);
          }
    }
    processInternalErrorFn(r) {
    }
    transportEntries(r = this.transports) {
      return (Array.isArray(r) ? r : Object.entries(r)).map((t) => {
        switch (typeof t) {
          case "string":
            return this.transports[t] ? [t, this.transports[t]] : null;
          case "function":
            return [t.name, t];
          default:
            return Array.isArray(t) ? t : null;
        }
      }).filter(Boolean);
    }
  };
  h(i, "instances", {});
  let s = i;
  return M = s, M;
}
var k, ye;
function mt() {
  if (ye) return k;
  ye = 1;
  const l = console.error;
  class c {
    constructor({ logFn: i = null } = {}) {
      h(this, "logFn", null);
      h(this, "onError", null);
      h(this, "showDialog", !1);
      h(this, "preventDefault", !0);
      this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.startCatching = this.startCatching.bind(this), this.logFn = i;
    }
    handle(i, {
      logFn: o = this.logFn,
      errorName: r = "",
      onError: e = this.onError,
      showDialog: t = this.showDialog
    } = {}) {
      try {
        (e == null ? void 0 : e({ error: i, errorName: r, processType: "renderer" })) !== !1 && o({ error: i, errorName: r, showDialog: t });
      } catch {
        l(i);
      }
    }
    setOptions({ logFn: i, onError: o, preventDefault: r, showDialog: e }) {
      typeof i == "function" && (this.logFn = i), typeof o == "function" && (this.onError = o), typeof r == "boolean" && (this.preventDefault = r), typeof e == "boolean" && (this.showDialog = e);
    }
    startCatching({ onError: i, showDialog: o } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: i, showDialog: o }), window.addEventListener("error", (r) => {
        var e;
        this.preventDefault && ((e = r.preventDefault) == null || e.call(r)), this.handleError(r.error || r);
      }), window.addEventListener("unhandledrejection", (r) => {
        var e;
        this.preventDefault && ((e = r.preventDefault) == null || e.call(r)), this.handleRejection(r.reason || r);
      }));
    }
    handleError(i) {
      this.handle(i, { errorName: "Unhandled" });
    }
    handleRejection(i) {
      const o = i instanceof Error ? i : new Error(JSON.stringify(i));
      this.handle(o, { errorName: "Unhandled rejection" });
    }
  }
  return k = c, k;
}
var W, ve;
function P() {
  if (ve) return W;
  ve = 1, W = { transform: l };
  function l({
    logger: c,
    message: s,
    transport: i,
    initialData: o = (s == null ? void 0 : s.data) || [],
    transforms: r = i == null ? void 0 : i.transforms
  }) {
    return r.reduce((e, t) => typeof t == "function" ? t({ data: e, logger: c, message: s, transport: i }) : e, o);
  }
  return W;
}
var U, be;
function yt() {
  if (be) return U;
  be = 1;
  const { transform: l } = P();
  U = s;
  const c = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  function s(o) {
    return Object.assign(r, {
      format: "{h}:{i}:{s}.{ms}{scope} › {text}",
      transforms: [i],
      writeFn({ message: { level: e, data: t } }) {
        const n = c[e] || c.info;
        setTimeout(() => n(...t));
      }
    });
    function r(e) {
      r.writeFn({
        message: { ...e, data: l({ logger: o, message: e, transport: r }) }
      });
    }
  }
  function i({
    data: o = [],
    logger: r = {},
    message: e = {},
    transport: t = {}
  }) {
    if (typeof t.format == "function")
      return t.format({
        data: o,
        level: (e == null ? void 0 : e.level) || "info",
        logger: r,
        message: e,
        transport: t
      });
    if (typeof t.format != "string")
      return o;
    o.unshift(t.format), typeof o[1] == "string" && o[1].match(/%[1cdfiOos]/) && (o = [`${o[0]}${o[1]}`, ...o.slice(2)]);
    const n = e.date || /* @__PURE__ */ new Date();
    return o[0] = o[0].replace(/\{(\w+)}/g, (a, u) => {
      var f, p;
      switch (u) {
        case "level":
          return e.level;
        case "logId":
          return e.logId;
        case "scope": {
          const d = e.scope || ((f = r.scope) == null ? void 0 : f.defaultLabel);
          return d ? ` (${d})` : "";
        }
        case "text":
          return "";
        case "y":
          return n.getFullYear().toString(10);
        case "m":
          return (n.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return n.getDate().toString(10).padStart(2, "0");
        case "h":
          return n.getHours().toString(10).padStart(2, "0");
        case "i":
          return n.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return n.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return n.getMilliseconds().toString(10).padStart(3, "0");
        case "iso":
          return n.toISOString();
        default:
          return ((p = e.variables) == null ? void 0 : p[u]) || a;
      }
    }).trim(), o;
  }
  return U;
}
var V, we;
function vt() {
  if (we) return V;
  we = 1;
  const { transform: l } = P();
  V = s;
  const c = /* @__PURE__ */ new Set([Promise, WeakMap, WeakSet]);
  function s(r) {
    return Object.assign(e, {
      depth: 5,
      transforms: [o]
    });
    function e(t) {
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
        const n = l({
          initialData: t,
          logger: r,
          message: t,
          transport: e
        });
        __electronLog.sendToMain(n);
      } catch (n) {
        r.transports.console({
          data: ["electronLog.transports.ipc", n, "data:", t.data],
          level: "error"
        });
      }
    }
  }
  function i(r) {
    return Object(r) !== r;
  }
  function o({
    data: r,
    depth: e,
    seen: t = /* @__PURE__ */ new WeakSet(),
    transport: n = {}
  } = {}) {
    const a = e || n.depth || 5;
    return t.has(r) ? "[Circular]" : a < 1 ? i(r) ? r : Array.isArray(r) ? "[Array]" : `[${typeof r}]` : ["function", "symbol"].includes(typeof r) ? r.toString() : i(r) ? r : c.has(r.constructor) ? `[${r.constructor.name}]` : Array.isArray(r) ? r.map((u) => o({
      data: u,
      depth: a - 1,
      seen: t
    })) : r instanceof Date ? r.toISOString() : r instanceof Error ? r.stack : r instanceof Map ? new Map(
      Array.from(r).map(([u, f]) => [
        o({ data: u, depth: a - 1, seen: t }),
        o({ data: f, depth: a - 1, seen: t })
      ])
    ) : r instanceof Set ? new Set(
      Array.from(r).map(
        (u) => o({ data: u, depth: a - 1, seen: t })
      )
    ) : (t.add(r), Object.fromEntries(
      Object.entries(r).map(
        ([u, f]) => [
          u,
          o({ data: f, depth: a - 1, seen: t })
        ]
      )
    ));
  }
  return V;
}
var Ee;
function bt() {
  return Ee || (Ee = 1, function(l) {
    const c = Be(), s = mt(), i = yt(), o = vt();
    typeof process == "object" && process.type === "browser" && console.warn(
      "electron-log/renderer is loaded in the main process. It could cause unexpected behaviour."
    ), l.exports = r(), l.exports.Logger = c, l.exports.default = l.exports;
    function r() {
      const e = new c({
        allowUnknownLevel: !0,
        errorHandler: new s(),
        initializeFn: () => {
        },
        logId: "default",
        transportFactories: {
          console: i,
          ipc: o
        },
        variables: {
          processType: "renderer"
        }
      });
      return e.errorHandler.setOptions({
        logFn({ error: t, errorName: n, showDialog: a }) {
          e.transports.console({
            data: [n, t].filter(Boolean),
            level: "error"
          }), e.transports.ipc({
            cmd: "errorHandler",
            error: {
              cause: t == null ? void 0 : t.cause,
              code: t == null ? void 0 : t.code,
              name: t == null ? void 0 : t.name,
              message: t == null ? void 0 : t.message,
              stack: t == null ? void 0 : t.stack
            },
            errorName: n,
            logId: e.logId,
            showDialog: a
          });
        }
      }), typeof window == "object" && window.addEventListener("message", (t) => {
        const { cmd: n, logId: a, ...u } = t.data || {}, f = c.getInstance({ logId: a });
        n === "message" && f.processMessage(u, { transports: ["console"] });
      }), new Proxy(e, {
        get(t, n) {
          return typeof t[n] < "u" ? t[n] : (...a) => e.logData(a, { level: n });
        }
      });
    }
  }(C)), C.exports;
}
var B, Se;
function wt() {
  if (Se) return B;
  Se = 1;
  const l = R, c = F;
  B = {
    findAndReadPackageJson: s,
    tryReadJsonAt: i
  };
  function s() {
    return i(e()) || i(r()) || i(process.resourcesPath, "app.asar") || i(process.resourcesPath, "app") || i(process.cwd()) || { name: void 0, version: void 0 };
  }
  function i(...t) {
    if (t[0])
      try {
        const n = c.join(...t), a = o("package.json", n);
        if (!a)
          return;
        const u = JSON.parse(l.readFileSync(a, "utf8")), f = (u == null ? void 0 : u.productName) || (u == null ? void 0 : u.name);
        return !f || f.toLowerCase() === "electron" ? void 0 : f ? { name: f, version: u == null ? void 0 : u.version } : void 0;
      } catch {
        return;
      }
  }
  function o(t, n) {
    let a = n;
    for (; ; ) {
      const u = c.parse(a), f = u.root, p = u.dir;
      if (l.existsSync(c.join(a, t)))
        return c.resolve(c.join(a, t));
      if (a === f)
        return null;
      a = p;
    }
  }
  function r() {
    const t = process.argv.filter((a) => a.indexOf("--user-data-dir=") === 0);
    return t.length === 0 || typeof t[0] != "string" ? null : t[0].replace("--user-data-dir=", "");
  }
  function e() {
    var t;
    try {
      return (t = require.main) == null ? void 0 : t.filename;
    } catch {
      return;
    }
  }
  return B;
}
var J, Oe;
function Je() {
  if (Oe) return J;
  Oe = 1;
  const l = at, c = N, s = F, i = wt();
  class o {
    constructor() {
      h(this, "appName");
      h(this, "appPackageJson");
      h(this, "platform", process.platform);
    }
    getAppLogPath(e = this.getAppName()) {
      return this.platform === "darwin" ? s.join(this.getSystemPathHome(), "Library/Logs", e) : s.join(this.getAppUserDataPath(e), "logs");
    }
    getAppName() {
      var t;
      const e = this.appName || ((t = this.getAppPackageJson()) == null ? void 0 : t.name);
      if (!e)
        throw new Error(
          "electron-log can't determine the app name. It tried these methods:\n1. Use `electron.app.name`\n2. Use productName or name from the nearest package.json`\nYou can also set it through log.transports.file.setAppName()"
        );
      return e;
    }
    /**
     * @private
     * @returns {undefined}
     */
    getAppPackageJson() {
      return typeof this.appPackageJson != "object" && (this.appPackageJson = i.findAndReadPackageJson()), this.appPackageJson;
    }
    getAppUserDataPath(e = this.getAppName()) {
      return e ? s.join(this.getSystemPathAppData(), e) : void 0;
    }
    getAppVersion() {
      var e;
      return (e = this.getAppPackageJson()) == null ? void 0 : e.version;
    }
    getElectronLogPath() {
      return this.getAppLogPath();
    }
    getMacOsVersion() {
      const e = Number(c.release().split(".")[0]);
      return e <= 19 ? `10.${e - 4}` : e - 9;
    }
    /**
     * @protected
     * @returns {string}
     */
    getOsVersion() {
      let e = c.type().replace("_", " "), t = c.release();
      return e === "Darwin" && (e = "macOS", t = this.getMacOsVersion()), `${e} ${t}`;
    }
    /**
     * @return {PathVariables}
     */
    getPathVariables() {
      const e = this.getAppName(), t = this.getAppVersion(), n = this;
      return {
        appData: this.getSystemPathAppData(),
        appName: e,
        appVersion: t,
        get electronDefaultDir() {
          return n.getElectronLogPath();
        },
        home: this.getSystemPathHome(),
        libraryDefaultDir: this.getAppLogPath(e),
        libraryTemplate: this.getAppLogPath("{appName}"),
        temp: this.getSystemPathTemp(),
        userData: this.getAppUserDataPath(e)
      };
    }
    getSystemPathAppData() {
      const e = this.getSystemPathHome();
      switch (this.platform) {
        case "darwin":
          return s.join(e, "Library/Application Support");
        case "win32":
          return process.env.APPDATA || s.join(e, "AppData/Roaming");
        default:
          return process.env.XDG_CONFIG_HOME || s.join(e, ".config");
      }
    }
    getSystemPathHome() {
      var e;
      return ((e = c.homedir) == null ? void 0 : e.call(c)) || process.env.HOME;
    }
    getSystemPathTemp() {
      return c.tmpdir();
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
    onAppEvent(e, t) {
    }
    onAppReady(e) {
      e();
    }
    onEveryWebContentsEvent(e, t) {
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(e, t) {
    }
    onIpcInvoke(e, t) {
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(e, t = console.error) {
      const a = { darwin: "open", win32: "start", linux: "xdg-open" }[process.platform] || "xdg-open";
      l.exec(`${a} ${e}`, {}, (u) => {
        u && t(u);
      });
    }
    setAppName(e) {
      this.appName = e;
    }
    setPlatform(e) {
      this.platform = e;
    }
    setPreloadFileForSessions({
      filePath: e,
      // eslint-disable-line no-unused-vars
      includeFutureSession: t = !0,
      // eslint-disable-line no-unused-vars
      getSessions: n = () => []
      // eslint-disable-line no-unused-vars
    }) {
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(e, t) {
    }
    showErrorBox(e, t) {
    }
  }
  return J = o, J;
}
var H, Le;
function Et() {
  if (Le) return H;
  Le = 1;
  const l = F, c = Je();
  class s extends c {
    /**
     * @param {object} options
     * @param {typeof Electron} [options.electron]
     */
    constructor({ electron: r } = {}) {
      super();
      /**
       * @type {typeof Electron}
       */
      h(this, "electron");
      this.electron = r;
    }
    getAppName() {
      var e, t;
      let r;
      try {
        r = this.appName || ((e = this.electron.app) == null ? void 0 : e.name) || ((t = this.electron.app) == null ? void 0 : t.getName());
      } catch {
      }
      return r || super.getAppName();
    }
    getAppUserDataPath(r) {
      return this.getPath("userData") || super.getAppUserDataPath(r);
    }
    getAppVersion() {
      var e;
      let r;
      try {
        r = (e = this.electron.app) == null ? void 0 : e.getVersion();
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
      var e;
      try {
        return (e = this.electron.app) == null ? void 0 : e.getPath(r);
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
      return ((r = this.electron.app) == null ? void 0 : r.isPackaged) !== void 0 ? !this.electron.app.isPackaged : typeof process.execPath == "string" ? l.basename(process.execPath).toLowerCase().startsWith("electron") : super.isDev();
    }
    onAppEvent(r, e) {
      var t;
      return (t = this.electron.app) == null || t.on(r, e), () => {
        var n;
        (n = this.electron.app) == null || n.off(r, e);
      };
    }
    onAppReady(r) {
      var e, t, n;
      (e = this.electron.app) != null && e.isReady() ? r() : (t = this.electron.app) != null && t.once ? (n = this.electron.app) == null || n.once("ready", r) : r();
    }
    onEveryWebContentsEvent(r, e) {
      var n, a, u;
      return (a = (n = this.electron.webContents) == null ? void 0 : n.getAllWebContents()) == null || a.forEach((f) => {
        f.on(r, e);
      }), (u = this.electron.app) == null || u.on("web-contents-created", t), () => {
        var f, p;
        (f = this.electron.webContents) == null || f.getAllWebContents().forEach((d) => {
          d.off(r, e);
        }), (p = this.electron.app) == null || p.off("web-contents-created", t);
      };
      function t(f, p) {
        p.on(r, e);
      }
    }
    /**
     * Listen to async messages sent from opposite process
     * @param {string} channel
     * @param {function} listener
     */
    onIpc(r, e) {
      var t;
      (t = this.electron.ipcMain) == null || t.on(r, e);
    }
    onIpcInvoke(r, e) {
      var t, n;
      (n = (t = this.electron.ipcMain) == null ? void 0 : t.handle) == null || n.call(t, r, e);
    }
    /**
     * @param {string} url
     * @param {Function} [logFunction]
     */
    openUrl(r, e = console.error) {
      var t;
      (t = this.electron.shell) == null || t.openExternal(r).catch(e);
    }
    setPreloadFileForSessions({
      filePath: r,
      includeFutureSession: e = !0,
      getSessions: t = () => {
        var n;
        return [(n = this.electron.session) == null ? void 0 : n.defaultSession];
      }
    }) {
      for (const a of t().filter(Boolean))
        n(a);
      e && this.onAppEvent("session-created", (a) => {
        n(a);
      });
      function n(a) {
        typeof a.registerPreloadScript == "function" ? a.registerPreloadScript({
          filePath: r,
          id: "electron-log-preload",
          type: "frame"
        }) : a.setPreloads([...a.getPreloads(), r]);
      }
    }
    /**
     * Sent a message to opposite process
     * @param {string} channel
     * @param {any} message
     */
    sendIpc(r, e) {
      var t, n;
      (n = (t = this.electron.BrowserWindow) == null ? void 0 : t.getAllWindows()) == null || n.forEach((a) => {
        var u, f;
        ((u = a.webContents) == null ? void 0 : u.isDestroyed()) === !1 && ((f = a.webContents) == null ? void 0 : f.isCrashed()) === !1 && a.webContents.send(r, e);
      });
    }
    showErrorBox(r, e) {
      var t;
      (t = this.electron.dialog) == null || t.showErrorBox(r, e);
    }
  }
  return H = s, H;
}
var G, Ae;
function St() {
  if (Ae) return G;
  Ae = 1;
  const l = R, c = N, s = F, i = Ve();
  let o = !1, r = !1;
  G = {
    initialize({
      externalApi: n,
      getSessions: a,
      includeFutureSession: u,
      logger: f,
      preload: p = !0,
      spyRendererConsole: d = !1
    }) {
      n.onAppReady(() => {
        try {
          p && e({
            externalApi: n,
            getSessions: a,
            includeFutureSession: u,
            logger: f,
            preloadOption: p
          }), d && t({ externalApi: n, logger: f });
        } catch (E) {
          f.warn(E);
        }
      });
    }
  };
  function e({
    externalApi: n,
    getSessions: a,
    includeFutureSession: u,
    logger: f,
    preloadOption: p
  }) {
    let d = typeof p == "string" ? p : void 0;
    if (o) {
      f.warn(new Error("log.initialize({ preload }) already called").stack);
      return;
    }
    o = !0;
    try {
      d = s.resolve(
        __dirname,
        "../renderer/electron-log-preload.js"
      );
    } catch {
    }
    if (!d || !l.existsSync(d)) {
      d = s.join(
        n.getAppUserDataPath() || c.tmpdir(),
        "electron-log-preload.js"
      );
      const E = `
      try {
        (${i.toString()})(require('electron'));
      } catch(e) {
        console.error(e);
      }
    `;
      l.writeFileSync(d, E, "utf8");
    }
    n.setPreloadFileForSessions({
      filePath: d,
      includeFutureSession: u,
      getSessions: a
    });
  }
  function t({ externalApi: n, logger: a }) {
    if (r) {
      a.warn(
        new Error("log.initialize({ spyRendererConsole }) already called").stack
      );
      return;
    }
    r = !0;
    const u = ["debug", "info", "warn", "error"];
    n.onEveryWebContentsEvent(
      "console-message",
      (f, p, d) => {
        a.processMessage({
          data: [d],
          level: u[p],
          variables: { processType: "renderer" }
        });
      }
    );
  }
  return G;
}
var Y, Fe;
function Ot() {
  if (Fe) return Y;
  Fe = 1;
  class l {
    constructor({
      externalApi: i,
      logFn: o = void 0,
      onError: r = void 0,
      showDialog: e = void 0
    } = {}) {
      h(this, "externalApi");
      h(this, "isActive", !1);
      h(this, "logFn");
      h(this, "onError");
      h(this, "showDialog", !0);
      this.createIssue = this.createIssue.bind(this), this.handleError = this.handleError.bind(this), this.handleRejection = this.handleRejection.bind(this), this.setOptions({ externalApi: i, logFn: o, onError: r, showDialog: e }), this.startCatching = this.startCatching.bind(this), this.stopCatching = this.stopCatching.bind(this);
    }
    handle(i, {
      logFn: o = this.logFn,
      onError: r = this.onError,
      processType: e = "browser",
      showDialog: t = this.showDialog,
      errorName: n = ""
    } = {}) {
      var a;
      i = c(i);
      try {
        if (typeof r == "function") {
          const u = ((a = this.externalApi) == null ? void 0 : a.getVersions()) || {}, f = this.createIssue;
          if (r({
            createIssue: f,
            error: i,
            errorName: n,
            processType: e,
            versions: u
          }) === !1)
            return;
        }
        n ? o(n, i) : o(i), t && !n.includes("rejection") && this.externalApi && this.externalApi.showErrorBox(
          `A JavaScript error occurred in the ${e} process`,
          i.stack
        );
      } catch {
        console.error(i);
      }
    }
    setOptions({ externalApi: i, logFn: o, onError: r, showDialog: e }) {
      typeof i == "object" && (this.externalApi = i), typeof o == "function" && (this.logFn = o), typeof r == "function" && (this.onError = r), typeof e == "boolean" && (this.showDialog = e);
    }
    startCatching({ onError: i, showDialog: o } = {}) {
      this.isActive || (this.isActive = !0, this.setOptions({ onError: i, showDialog: o }), process.on("uncaughtException", this.handleError), process.on("unhandledRejection", this.handleRejection));
    }
    stopCatching() {
      this.isActive = !1, process.removeListener("uncaughtException", this.handleError), process.removeListener("unhandledRejection", this.handleRejection);
    }
    createIssue(i, o) {
      var r;
      (r = this.externalApi) == null || r.openUrl(
        `${i}?${new URLSearchParams(o).toString()}`
      );
    }
    handleError(i) {
      this.handle(i, { errorName: "Unhandled" });
    }
    handleRejection(i) {
      const o = i instanceof Error ? i : new Error(JSON.stringify(i));
      this.handle(o, { errorName: "Unhandled rejection" });
    }
  }
  function c(s) {
    if (s instanceof Error)
      return s;
    if (s && typeof s == "object") {
      if (s.message)
        return Object.assign(new Error(s.message), s);
      try {
        return new Error(JSON.stringify(s));
      } catch (i) {
        return new Error(`Couldn't normalize error ${String(s)}: ${i}`);
      }
    }
    return new Error(`Can't normalize error ${String(s)}`);
  }
  return Y = l, Y;
}
var Q, Pe;
function Lt() {
  if (Pe) return Q;
  Pe = 1;
  class l {
    constructor(s = {}) {
      h(this, "disposers", []);
      h(this, "format", "{eventSource}#{eventName}:");
      h(this, "formatters", {
        app: {
          "certificate-error": ({ args: s }) => this.arrayToObject(s.slice(1, 4), [
            "url",
            "error",
            "certificate"
          ]),
          "child-process-gone": ({ args: s }) => s.length === 1 ? s[0] : s,
          "render-process-gone": ({ args: [s, i] }) => i && typeof i == "object" ? { ...i, ...this.getWebContentsDetails(s) } : []
        },
        webContents: {
          "console-message": ({ args: [s, i, o, r] }) => {
            if (!(s < 3))
              return { message: i, source: `${r}:${o}` };
          },
          "did-fail-load": ({ args: s }) => this.arrayToObject(s, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]),
          "did-fail-provisional-load": ({ args: s }) => this.arrayToObject(s, [
            "errorCode",
            "errorDescription",
            "validatedURL",
            "isMainFrame",
            "frameProcessId",
            "frameRoutingId"
          ]),
          "plugin-crashed": ({ args: s }) => this.arrayToObject(s, ["name", "version"]),
          "preload-error": ({ args: s }) => this.arrayToObject(s, ["preloadPath", "error"])
        }
      });
      h(this, "events", {
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
      h(this, "externalApi");
      h(this, "level", "error");
      h(this, "scope", "");
      this.setOptions(s);
    }
    setOptions({
      events: s,
      externalApi: i,
      level: o,
      logger: r,
      format: e,
      formatters: t,
      scope: n
    }) {
      typeof s == "object" && (this.events = s), typeof i == "object" && (this.externalApi = i), typeof o == "string" && (this.level = o), typeof r == "object" && (this.logger = r), (typeof e == "string" || typeof e == "function") && (this.format = e), typeof t == "object" && (this.formatters = t), typeof n == "string" && (this.scope = n);
    }
    startLogging(s = {}) {
      this.setOptions(s), this.disposeListeners();
      for (const i of this.getEventNames(this.events.app))
        this.disposers.push(
          this.externalApi.onAppEvent(i, (...o) => {
            this.handleEvent({ eventSource: "app", eventName: i, handlerArgs: o });
          })
        );
      for (const i of this.getEventNames(this.events.webContents))
        this.disposers.push(
          this.externalApi.onEveryWebContentsEvent(
            i,
            (...o) => {
              this.handleEvent(
                { eventSource: "webContents", eventName: i, handlerArgs: o }
              );
            }
          )
        );
    }
    stopLogging() {
      this.disposeListeners();
    }
    arrayToObject(s, i) {
      const o = {};
      return i.forEach((r, e) => {
        o[r] = s[e];
      }), s.length > i.length && (o.unknownArgs = s.slice(i.length)), o;
    }
    disposeListeners() {
      this.disposers.forEach((s) => s()), this.disposers = [];
    }
    formatEventLog({ eventName: s, eventSource: i, handlerArgs: o }) {
      var f;
      const [r, ...e] = o;
      if (typeof this.format == "function")
        return this.format({ args: e, event: r, eventName: s, eventSource: i });
      const t = (f = this.formatters[i]) == null ? void 0 : f[s];
      let n = e;
      if (typeof t == "function" && (n = t({ args: e, event: r, eventName: s, eventSource: i })), !n)
        return;
      const a = {};
      return Array.isArray(n) ? a.args = n : typeof n == "object" && Object.assign(a, n), i === "webContents" && Object.assign(a, this.getWebContentsDetails(r == null ? void 0 : r.sender)), [this.format.replace("{eventSource}", i === "app" ? "App" : "WebContents").replace("{eventName}", s), a];
    }
    getEventNames(s) {
      return !s || typeof s != "object" ? [] : Object.entries(s).filter(([i, o]) => o).map(([i]) => i);
    }
    getWebContentsDetails(s) {
      if (!(s != null && s.loadURL))
        return {};
      try {
        return {
          webContents: {
            id: s.id,
            url: s.getURL()
          }
        };
      } catch {
        return {};
      }
    }
    handleEvent({ eventName: s, eventSource: i, handlerArgs: o }) {
      var e;
      const r = this.formatEventLog({ eventName: s, eventSource: i, handlerArgs: o });
      if (r) {
        const t = this.scope ? this.logger.scope(this.scope) : this.logger;
        (e = t == null ? void 0 : t[this.level]) == null || e.call(t, ...r);
      }
    }
  }
  return Q = l, Q;
}
var X, De;
function He() {
  if (De) return X;
  De = 1;
  const { transform: l } = P();
  X = {
    concatFirstStringElements: c,
    formatScope: i,
    formatText: r,
    formatVariables: o,
    timeZoneFromOffset: s,
    format({ message: e, logger: t, transport: n, data: a = e == null ? void 0 : e.data }) {
      switch (typeof n.format) {
        case "string":
          return l({
            message: e,
            logger: t,
            transforms: [o, i, r],
            transport: n,
            initialData: [n.format, ...a]
          });
        case "function":
          return n.format({
            data: a,
            level: (e == null ? void 0 : e.level) || "info",
            logger: t,
            message: e,
            transport: n
          });
        default:
          return a;
      }
    }
  };
  function c({ data: e }) {
    return typeof e[0] != "string" || typeof e[1] != "string" || e[0].match(/%[1cdfiOos]/) ? e : [`${e[0]} ${e[1]}`, ...e.slice(2)];
  }
  function s(e) {
    const t = Math.abs(e), n = e > 0 ? "-" : "+", a = Math.floor(t / 60).toString().padStart(2, "0"), u = (t % 60).toString().padStart(2, "0");
    return `${n}${a}:${u}`;
  }
  function i({ data: e, logger: t, message: n }) {
    const { defaultLabel: a, labelLength: u } = (t == null ? void 0 : t.scope) || {}, f = e[0];
    let p = n.scope;
    p || (p = a);
    let d;
    return p === "" ? d = u > 0 ? "".padEnd(u + 3) : "" : typeof p == "string" ? d = ` (${p})`.padEnd(u + 3) : d = "", e[0] = f.replace("{scope}", d), e;
  }
  function o({ data: e, message: t }) {
    let n = e[0];
    if (typeof n != "string")
      return e;
    n = n.replace("{level}]", `${t.level}]`.padEnd(6, " "));
    const a = t.date || /* @__PURE__ */ new Date();
    return e[0] = n.replace(/\{(\w+)}/g, (u, f) => {
      var p;
      switch (f) {
        case "level":
          return t.level || "info";
        case "logId":
          return t.logId;
        case "y":
          return a.getFullYear().toString(10);
        case "m":
          return (a.getMonth() + 1).toString(10).padStart(2, "0");
        case "d":
          return a.getDate().toString(10).padStart(2, "0");
        case "h":
          return a.getHours().toString(10).padStart(2, "0");
        case "i":
          return a.getMinutes().toString(10).padStart(2, "0");
        case "s":
          return a.getSeconds().toString(10).padStart(2, "0");
        case "ms":
          return a.getMilliseconds().toString(10).padStart(3, "0");
        case "z":
          return s(a.getTimezoneOffset());
        case "iso":
          return a.toISOString();
        default:
          return ((p = t.variables) == null ? void 0 : p[f]) || u;
      }
    }).trim(), e;
  }
  function r({ data: e }) {
    const t = e[0];
    if (typeof t != "string")
      return e;
    if (t.lastIndexOf("{text}") === t.length - 6)
      return e[0] = t.replace(/\s?{text}/, ""), e[0] === "" && e.shift(), e;
    const a = t.split("{text}");
    let u = [];
    return a[0] !== "" && u.push(a[0]), u = u.concat(e.slice(1)), a[1] !== "" && u.push(a[1]), u;
  }
  return X;
}
var Z = { exports: {} }, xe;
function I() {
  return xe || (xe = 1, function(l) {
    const c = ct;
    l.exports = {
      serialize: i,
      maxDepth({ data: o, transport: r, depth: e = (r == null ? void 0 : r.depth) ?? 6 }) {
        if (!o)
          return o;
        if (e < 1)
          return Array.isArray(o) ? "[array]" : typeof o == "object" && o ? "[object]" : o;
        if (Array.isArray(o))
          return o.map((n) => l.exports.maxDepth({
            data: n,
            depth: e - 1
          }));
        if (typeof o != "object" || o && typeof o.toISOString == "function")
          return o;
        if (o === null)
          return null;
        if (o instanceof Error)
          return o;
        const t = {};
        for (const n in o)
          Object.prototype.hasOwnProperty.call(o, n) && (t[n] = l.exports.maxDepth({
            data: o[n],
            depth: e - 1
          }));
        return t;
      },
      toJSON({ data: o }) {
        return JSON.parse(JSON.stringify(o, s()));
      },
      toString({ data: o, transport: r }) {
        const e = (r == null ? void 0 : r.inspectOptions) || {}, t = o.map((n) => {
          if (n !== void 0)
            try {
              const a = JSON.stringify(n, s(), "  ");
              return a === void 0 ? void 0 : JSON.parse(a);
            } catch {
              return n;
            }
        });
        return c.formatWithOptions(e, ...t);
      }
    };
    function s(o = {}) {
      const r = /* @__PURE__ */ new WeakSet();
      return function(e, t) {
        if (typeof t == "object" && t !== null) {
          if (r.has(t))
            return;
          r.add(t);
        }
        return i(e, t, o);
      };
    }
    function i(o, r, e = {}) {
      const t = (e == null ? void 0 : e.serializeMapAndSet) !== !1;
      return r instanceof Error ? r.stack : r && (typeof r == "function" ? `[function] ${r.toString()}` : r instanceof Date ? r.toISOString() : t && r instanceof Map && Object.fromEntries ? Object.fromEntries(r) : t && r instanceof Set && Array.from ? Array.from(r) : r);
    }
  }(Z)), Z.exports;
}
var K, Re;
function pe() {
  if (Re) return K;
  Re = 1, K = {
    transformStyles: i,
    applyAnsiStyles({ data: o }) {
      return i(o, c, s);
    },
    removeStyles({ data: o }) {
      return i(o, () => "");
    }
  };
  const l = {
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
  function c(o) {
    const r = o.replace(/color:\s*(\w+).*/, "$1").toLowerCase();
    return l[r] || "";
  }
  function s(o) {
    return o + l.unset;
  }
  function i(o, r, e) {
    const t = {};
    return o.reduce((n, a, u, f) => {
      if (t[u])
        return n;
      if (typeof a == "string") {
        let p = u, d = !1;
        a = a.replace(/%[1cdfiOos]/g, (E) => {
          if (p += 1, E !== "%c")
            return E;
          const m = f[p];
          return typeof m == "string" ? (t[p] = !0, d = !0, r(m, a)) : E;
        }), d && e && (a = e(a));
      }
      return n.push(a), n;
    }, []);
  }
  return K;
}
var ee, _e;
function At() {
  if (_e) return ee;
  _e = 1;
  const {
    concatFirstStringElements: l,
    format: c
  } = He(), { maxDepth: s, toJSON: i } = I(), {
    applyAnsiStyles: o,
    removeStyles: r
  } = pe(), { transform: e } = P(), t = {
    error: console.error,
    warn: console.warn,
    info: console.info,
    verbose: console.info,
    debug: console.debug,
    silly: console.debug,
    log: console.log
  };
  ee = u;
  const a = `%c{h}:{i}:{s}.{ms}{scope}%c ${process.platform === "win32" ? ">" : "›"} {text}`;
  Object.assign(u, {
    DEFAULT_FORMAT: a
  });
  function u(m) {
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
      format: a,
      level: "silly",
      transforms: [
        f,
        c,
        d,
        l,
        s,
        i
      ],
      useStyles: process.env.FORCE_STYLES,
      writeFn({ message: b }) {
        (t[b.level] || t.info)(...b.data);
      }
    });
    function g(b) {
      const O = e({ logger: m, message: b, transport: g });
      g.writeFn({
        message: { ...b, data: O }
      });
    }
  }
  function f({ data: m, message: g, transport: b }) {
    return typeof b.format != "string" || !b.format.includes("%c") ? m : [
      `color:${E(g.level, b)}`,
      "color:unset",
      ...m
    ];
  }
  function p(m, g) {
    if (typeof m == "boolean")
      return m;
    const O = g === "error" || g === "warn" ? process.stderr : process.stdout;
    return O && O.isTTY;
  }
  function d(m) {
    const { message: g, transport: b } = m;
    return (p(b.useStyles, g.level) ? o : r)(m);
  }
  function E(m, g) {
    return g.colorMap[m] || g.colorMap.default;
  }
  return ee;
}
var te, je;
function Ge() {
  if (je) return te;
  je = 1;
  const l = Ue, c = R, s = N;
  class i extends l {
    constructor({
      path: t,
      writeOptions: n = { encoding: "utf8", flag: "a", mode: 438 },
      writeAsync: a = !1
    }) {
      super();
      h(this, "asyncWriteQueue", []);
      h(this, "bytesWritten", 0);
      h(this, "hasActiveAsyncWriting", !1);
      h(this, "path", null);
      h(this, "initialSize");
      h(this, "writeOptions", null);
      h(this, "writeAsync", !1);
      this.path = t, this.writeOptions = n, this.writeAsync = a;
    }
    get size() {
      return this.getSize();
    }
    clear() {
      try {
        return c.writeFileSync(this.path, "", {
          mode: this.writeOptions.mode,
          flag: "w"
        }), this.reset(), !0;
      } catch (t) {
        return t.code === "ENOENT" ? !0 : (this.emit("error", t, this), !1);
      }
    }
    crop(t) {
      try {
        const n = o(this.path, t || 4096);
        this.clear(), this.writeLine(`[log cropped]${s.EOL}${n}`);
      } catch (n) {
        this.emit(
          "error",
          new Error(`Couldn't crop file ${this.path}. ${n.message}`),
          this
        );
      }
    }
    getSize() {
      if (this.initialSize === void 0)
        try {
          const t = c.statSync(this.path);
          this.initialSize = t.size;
        } catch {
          this.initialSize = 0;
        }
      return this.initialSize + this.bytesWritten;
    }
    increaseBytesWrittenCounter(t) {
      this.bytesWritten += Buffer.byteLength(t, this.writeOptions.encoding);
    }
    isNull() {
      return !1;
    }
    nextAsyncWrite() {
      const t = this;
      if (this.hasActiveAsyncWriting || this.asyncWriteQueue.length === 0)
        return;
      const n = this.asyncWriteQueue.join("");
      this.asyncWriteQueue = [], this.hasActiveAsyncWriting = !0, c.writeFile(this.path, n, this.writeOptions, (a) => {
        t.hasActiveAsyncWriting = !1, a ? t.emit(
          "error",
          new Error(`Couldn't write to ${t.path}. ${a.message}`),
          this
        ) : t.increaseBytesWrittenCounter(n), t.nextAsyncWrite();
      });
    }
    reset() {
      this.initialSize = void 0, this.bytesWritten = 0;
    }
    toString() {
      return this.path;
    }
    writeLine(t) {
      if (t += s.EOL, this.writeAsync) {
        this.asyncWriteQueue.push(t), this.nextAsyncWrite();
        return;
      }
      try {
        c.writeFileSync(this.path, t, this.writeOptions), this.increaseBytesWrittenCounter(t);
      } catch (n) {
        this.emit(
          "error",
          new Error(`Couldn't write to ${this.path}. ${n.message}`),
          this
        );
      }
    }
  }
  te = i;
  function o(r, e) {
    const t = Buffer.alloc(e), n = c.statSync(r), a = Math.min(n.size, e), u = Math.max(0, n.size - e), f = c.openSync(r, "r"), p = c.readSync(f, t, 0, a, u);
    return c.closeSync(f), t.toString("utf8", 0, p);
  }
  return te;
}
var re, Ne;
function Ft() {
  if (Ne) return re;
  Ne = 1;
  const l = Ge();
  class c extends l {
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
  return re = c, re;
}
var ne, Ie;
function Pt() {
  if (Ie) return ne;
  Ie = 1;
  const l = Ue, c = R, s = F, i = Ge(), o = Ft();
  class r extends l {
    constructor() {
      super();
      h(this, "store", {});
      this.emitError = this.emitError.bind(this);
    }
    /**
     * Provide a File object corresponding to the filePath
     * @param {string} filePath
     * @param {WriteOptions} [writeOptions]
     * @param {boolean} [writeAsync]
     * @return {File}
     */
    provide({ filePath: n, writeOptions: a = {}, writeAsync: u = !1 }) {
      let f;
      try {
        if (n = s.resolve(n), this.store[n])
          return this.store[n];
        f = this.createFile({ filePath: n, writeOptions: a, writeAsync: u });
      } catch (p) {
        f = new o({ path: n }), this.emitError(p, f);
      }
      return f.on("error", this.emitError), this.store[n] = f, f;
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @param {boolean} async
     * @return {File}
     * @private
     */
    createFile({ filePath: n, writeOptions: a, writeAsync: u }) {
      return this.testFileWriting({ filePath: n, writeOptions: a }), new i({ path: n, writeOptions: a, writeAsync: u });
    }
    /**
     * @param {Error} error
     * @param {File} file
     * @private
     */
    emitError(n, a) {
      this.emit("error", n, a);
    }
    /**
     * @param {string} filePath
     * @param {WriteOptions} writeOptions
     * @private
     */
    testFileWriting({ filePath: n, writeOptions: a }) {
      c.mkdirSync(s.dirname(n), { recursive: !0 }), c.writeFileSync(n, "", { flag: "a", mode: a.mode });
    }
  }
  return ne = r, ne;
}
var se, $e;
function Dt() {
  if ($e) return se;
  $e = 1;
  const l = R, c = N, s = F, i = Pt(), { transform: o } = P(), { removeStyles: r } = pe(), {
    format: e,
    concatFirstStringElements: t
  } = He(), { toString: n } = I();
  se = u;
  const a = new i();
  function u(p, { registry: d = a, externalApi: E } = {}) {
    let m;
    return d.listenerCount("error") < 1 && d.on("error", (v, y) => {
      O(`Can't write to ${y}`, v);
    }), Object.assign(g, {
      fileName: f(p.variables.processType),
      format: "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}",
      getFile: $,
      inspectOptions: { depth: 5 },
      level: "silly",
      maxSize: 1024 ** 2,
      readAllLogs: et,
      sync: !0,
      transforms: [r, e, t, n],
      writeOptions: { flag: "a", mode: 438, encoding: "utf8" },
      archiveLogFn(v) {
        const y = v.toString(), L = s.parse(y);
        try {
          l.renameSync(y, s.join(L.dir, `${L.name}.old${L.ext}`));
        } catch (D) {
          O("Could not rotate log", D);
          const tt = Math.round(g.maxSize / 4);
          v.crop(Math.min(tt, 256 * 1024));
        }
      },
      resolvePathFn(v) {
        return s.join(v.libraryDefaultDir, v.fileName);
      },
      setAppName(v) {
        p.dependencies.externalApi.setAppName(v);
      }
    });
    function g(v) {
      const y = $(v);
      g.maxSize > 0 && y.size > g.maxSize && (g.archiveLogFn(y), y.reset());
      const D = o({ logger: p, message: v, transport: g });
      y.writeLine(D);
    }
    function b() {
      m || (m = Object.create(
        Object.prototype,
        {
          ...Object.getOwnPropertyDescriptors(
            E.getPathVariables()
          ),
          fileName: {
            get() {
              return g.fileName;
            },
            enumerable: !0
          }
        }
      ), typeof g.archiveLog == "function" && (g.archiveLogFn = g.archiveLog, O("archiveLog is deprecated. Use archiveLogFn instead")), typeof g.resolvePath == "function" && (g.resolvePathFn = g.resolvePath, O("resolvePath is deprecated. Use resolvePathFn instead")));
    }
    function O(v, y = null, L = "error") {
      const D = [`electron-log.transports.file: ${v}`];
      y && D.push(y), p.transports.console({ data: D, date: /* @__PURE__ */ new Date(), level: L });
    }
    function $(v) {
      b();
      const y = g.resolvePathFn(m, v);
      return d.provide({
        filePath: y,
        writeAsync: !g.sync,
        writeOptions: g.writeOptions
      });
    }
    function et({ fileFilter: v = (y) => y.endsWith(".log") } = {}) {
      b();
      const y = s.dirname(g.resolvePathFn(m));
      return l.existsSync(y) ? l.readdirSync(y).map((L) => s.join(y, L)).filter(v).map((L) => {
        try {
          return {
            path: L,
            lines: l.readFileSync(L, "utf8").split(c.EOL)
          };
        } catch {
          return null;
        }
      }).filter(Boolean) : [];
    }
  }
  function f(p = process.type) {
    switch (p) {
      case "renderer":
        return "renderer.log";
      case "worker":
        return "worker.log";
      default:
        return "main.log";
    }
  }
  return se;
}
var oe, Te;
function xt() {
  if (Te) return oe;
  Te = 1;
  const { maxDepth: l, toJSON: c } = I(), { transform: s } = P();
  oe = i;
  function i(o, { externalApi: r }) {
    return Object.assign(e, {
      depth: 3,
      eventId: "__ELECTRON_LOG_IPC__",
      level: o.isDev ? "silly" : !1,
      transforms: [c, l]
    }), r != null && r.isElectron() ? e : void 0;
    function e(t) {
      var n;
      ((n = t == null ? void 0 : t.variables) == null ? void 0 : n.processType) !== "renderer" && (r == null || r.sendIpc(e.eventId, {
        ...t,
        data: s({ logger: o, message: t, transport: e })
      }));
    }
  }
  return oe;
}
var ie, Ce;
function Rt() {
  if (Ce) return ie;
  Ce = 1;
  const l = lt, c = ut, { transform: s } = P(), { removeStyles: i } = pe(), { toJSON: o, maxDepth: r } = I();
  ie = e;
  function e(t) {
    return Object.assign(n, {
      client: { name: "electron-application" },
      depth: 6,
      level: !1,
      requestOptions: {},
      transforms: [i, o, r],
      makeBodyFn({ message: a }) {
        return JSON.stringify({
          client: n.client,
          data: a.data,
          date: a.date.getTime(),
          level: a.level,
          scope: a.scope,
          variables: a.variables
        });
      },
      processErrorFn({ error: a }) {
        t.processMessage(
          {
            data: [`electron-log: can't POST ${n.url}`, a],
            level: "warn"
          },
          { transports: ["console", "file"] }
        );
      },
      sendRequestFn({ serverUrl: a, requestOptions: u, body: f }) {
        const d = (a.startsWith("https:") ? c : l).request(a, {
          method: "POST",
          ...u,
          headers: {
            "Content-Type": "application/json",
            "Content-Length": f.length,
            ...u.headers
          }
        });
        return d.write(f), d.end(), d;
      }
    });
    function n(a) {
      if (!n.url)
        return;
      const u = n.makeBodyFn({
        logger: t,
        message: { ...a, data: s({ logger: t, message: a, transport: n }) },
        transport: n
      }), f = n.sendRequestFn({
        serverUrl: n.url,
        requestOptions: n.requestOptions,
        body: Buffer.from(u, "utf8")
      });
      f.on("error", (p) => n.processErrorFn({
        error: p,
        logger: t,
        message: a,
        request: f,
        transport: n
      }));
    }
  }
  return ie;
}
var ae, qe;
function Ye() {
  if (qe) return ae;
  qe = 1;
  const l = Be(), c = Ot(), s = Lt(), i = At(), o = Dt(), r = xt(), e = Rt();
  ae = t;
  function t({ dependencies: n, initializeFn: a }) {
    var f;
    const u = new l({
      dependencies: n,
      errorHandler: new c(),
      eventLogger: new s(),
      initializeFn: a,
      isDev: (f = n.externalApi) == null ? void 0 : f.isDev(),
      logId: "default",
      transportFactories: {
        console: i,
        file: o,
        ipc: r,
        remote: e
      },
      variables: {
        processType: "main"
      }
    });
    return u.default = u, u.Logger = l, u.processInternalErrorFn = (p) => {
      u.transports.console.writeFn({
        message: {
          data: ["Unhandled electron-log error", p],
          level: "error"
        }
      });
    }, u;
  }
  return ae;
}
var ce, ze;
function _t() {
  if (ze) return ce;
  ze = 1;
  const l = fe, c = Et(), { initialize: s } = St(), i = Ye(), o = new c({ electron: l }), r = i({
    dependencies: { externalApi: o },
    initializeFn: s
  });
  ce = r, o.onIpc("__ELECTRON_LOG__", (t, n) => {
    n.scope && r.Logger.getInstance(n).scope(n.scope);
    const a = new Date(n.date);
    e({
      ...n,
      date: a.getTime() ? a : /* @__PURE__ */ new Date()
    });
  }), o.onIpcInvoke("__ELECTRON_LOG__", (t, { cmd: n = "", logId: a }) => {
    switch (n) {
      case "getOptions":
        return {
          levels: r.Logger.getInstance({ logId: a }).levels,
          logId: a
        };
      default:
        return e({ data: [`Unknown cmd '${n}'`], level: "error" }), {};
    }
  });
  function e(t) {
    var n;
    (n = r.Logger.getInstance(t)) == null || n.processMessage(t);
  }
  return ce;
}
var le, Me;
function jt() {
  if (Me) return le;
  Me = 1;
  const l = Je(), c = Ye(), s = new l();
  return le = c({
    dependencies: { externalApi: s }
  }), le;
}
const Nt = typeof process > "u" || process.type === "renderer" || process.type === "worker", It = typeof process == "object" && process.type === "browser";
Nt ? (Ve(), _.exports = bt()) : It ? _.exports = _t() : _.exports = jt();
var $t = _.exports;
const A = /* @__PURE__ */ ht($t);
class Tt {
  constructor() {
    const c = F.join(x.getPath("userData"), "data", "logs", "app.log");
    A.transports.file.resolvePathFn = () => c, A.transports.file.format = "[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}", A.transports.file.maxSize = 5 * 1024 * 1024, A.transports.console.format = "{h}:{i}:{s} › {text}";
  }
  // 初始化 IPC 监听，供渲染进程调用
  initIpc() {
    ke.on("system:log", (c, { level: s, message: i, data: o }) => {
      A.scope("Renderer")[s](i, o || "");
    });
  }
  // 主进程直接调用的方法
  info(c, ...s) {
    A.info(c, ...s);
  }
  warn(c, ...s) {
    A.warn(c, ...s);
  }
  error(c, ...s) {
    A.error(c, ...s);
  }
}
const Ct = new Tt();
if (typeof fe == "string")
  throw new TypeError("Not running in an Electron environment!");
const { env: Qe } = process, qt = "ELECTRON_IS_DEV" in Qe, zt = Number.parseInt(Qe.ELECTRON_IS_DEV, 10) === 1, Mt = qt ? zt : !fe.app.isPackaged, Xe = w.dirname(it(import.meta.url));
process.env.APP_ROOT = w.join(Xe, "..");
const ue = process.env.VITE_DEV_SERVER_URL, er = w.join(process.env.APP_ROOT, "dist-electron"), Ze = w.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = ue ? w.join(process.env.APP_ROOT, "public") : Ze;
let S;
function Ke() {
  S = new We({
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
    icon: w.join(process.env.VITE_PUBLIC, "favicon.png"),
    title: "Minecraft Sounds",
    webPreferences: {
      nodeIntegration: !0,
      contextIsolation: !0,
      preload: w.join(Xe, "preload.mjs")
    }
  }), Ct.info("应用正在启动..."), S.setMenu(null), S.setMenuBarVisibility(!1), S.on("maximize", () => {
    S == null || S.unmaximize();
  }), pt(ke, S), (process.env.NODE_ENV === "development" || Mt) && S.webContents.openDevTools(), ue ? S.loadURL(ue) : S.loadFile(w.join(Ze, "index.html"));
}
x.on("window-all-closed", () => {
  process.platform !== "darwin" && (x.quit(), S = null);
});
x.on("activate", async () => {
  We.getAllWindows().length === 0 && Ke();
});
x.whenReady().then(Ke);
export {
  er as MAIN_DIST,
  Ze as RENDERER_DIST,
  ue as VITE_DEV_SERVER_URL
};
