"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("windowControl", {
  minimize: () => electron.ipcRenderer.send("window:minimize"),
  close: () => electron.ipcRenderer.send("window:close")
});
electron.contextBridge.exposeInMainWorld("system", {
  openBrowser: (url) => electron.ipcRenderer.send("system:openUrl", url),
  getVersion: () => electron.ipcRenderer.invoke("system:version")
});
electron.contextBridge.exposeInMainWorld("mojang", {
  getProfile: (uuid) => electron.ipcRenderer.invoke("mojang:getProfile", uuid)
});
electron.contextBridge.exposeInMainWorld("minecraft", {
  getDetect() {
    return electron.ipcRenderer.invoke("minecraft:detect");
  },
  /**
  * 获取 Minecraft 服务器状态
  * @param host 服务器地址
  * @param port 服务器端口
  * @param timeout 超时时间（可选）
  * @returns Promise<StatusResponse>
  */
  getServerStatus: (host, port, timeout) => electron.ipcRenderer.invoke("minecraft:status", host, port, timeout)
});
electron.contextBridge.exposeInMainWorld("frp", {
  natfrp_getNodes: (token) => electron.ipcRenderer.invoke("frp:natfrp.getNodes", token),
  natfrp_nodeStats: (token) => electron.ipcRenderer.invoke("frp:natfrp.nodeStats", token),
  natfrp_getMergedNodes: (token) => electron.ipcRenderer.invoke("frp:natfrp.getMergedNodes", token),
  natfrp_tunnelInfo: (token) => electron.ipcRenderer.invoke("frp:natfrp.getTunnels", token),
  natfrp_tunnelCreate: (token, node, local_port) => electron.ipcRenderer.invoke("frp:natfrp.tunnelCreate", token, node, local_port),
  natfrp_tunnelEdit: (token, tunnel_id, port) => electron.ipcRenderer.invoke("frp:natfrp.tunnelEdit", token, tunnel_id, port),
  natfrp_userInfo: (token) => electron.ipcRenderer.invoke("frp:natfrp.userInfo", token)
});
electron.contextBridge.exposeInMainWorld("sakurafrp", {
  exists: () => {
    return electron.ipcRenderer.invoke("sakurafrp:exists");
  },
  download: () => electron.ipcRenderer.invoke("sakurafrp:download"),
  onProgress: (cb) => {
    electron.ipcRenderer.on("sakurafrp:progress", (_, percent) => cb(percent));
  },
  start: (token, tunnelId) => electron.ipcRenderer.invoke("frpc:start", token, tunnelId),
  stop: (tunnelId) => electron.ipcRenderer.invoke("frpc:stop", tunnelId),
  onLog: (callback) => {
    electron.ipcRenderer.on("frpc:log", (_, data) => callback(data));
  }
});
electron.contextBridge.exposeInMainWorld("platformAPI", {
  list: () => electron.ipcRenderer.invoke("platform:list"),
  add: (platform) => electron.ipcRenderer.invoke("platform:add", platform),
  update: (nanoid, patch) => electron.ipcRenderer.invoke("platform:update", nanoid, patch),
  enable: (nanoid) => electron.ipcRenderer.invoke("platform:enable", nanoid),
  disable: (nanoid) => electron.ipcRenderer.invoke("platform:disable", nanoid),
  remove: (nanoid) => electron.ipcRenderer.invoke("platform:remove", nanoid)
});
electron.contextBridge.exposeInMainWorld("mcproxy", {
  /**
       * @param config { id, remoteHost, remotePort, localPort, fakeMotd }
       */
  start: (config) => electron.ipcRenderer.send("mcproxy:start", config),
  stop: (id) => electron.ipcRenderer.send("mcproxy:stop", id),
  /**
   * 监听状态回调
   * 返回一个 unsubscribe 函数用于销毁监听，防止内存泄漏
   */
  onStatus: (callback) => {
    const subscription = (_event, data) => callback(data);
    electron.ipcRenderer.on("mcproxy:status", subscription);
    return () => {
      electron.ipcRenderer.removeListener("mcproxy:status", subscription);
    };
  },
  getTcpDelay: (host, port) => electron.ipcRenderer.invoke("network:tcp", host, port)
});
