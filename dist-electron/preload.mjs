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
electron.contextBridge.exposeInMainWorld("mojang", {
  getProfile: (uuid) => electron.ipcRenderer.invoke("mojang:getProfile", uuid)
});
electron.contextBridge.exposeInMainWorld("minecraft", {
  getDetect() {
    return electron.ipcRenderer.invoke("minecraft:detect");
  }
});
electron.contextBridge.exposeInMainWorld("frp", {
  natfrp_getNodes: (token) => electron.ipcRenderer.invoke("frp:natfrp.getNodes", token),
  natfrp_nodeStats: (token) => electron.ipcRenderer.invoke("frp:natfrp.nodeStats", token),
  natfrp_getMergedNodes: (token) => electron.ipcRenderer.invoke("frp:natfrp.getMergedNodes", token),
  natfrp_tunnelInfo: (token) => electron.ipcRenderer.invoke("frp:natfrp.getTunnels", token),
  natfrp_tunnelCreate: (token, node, local_port) => electron.ipcRenderer.invoke("frp:natfrp.tunnelCreate", token, node, local_port),
  natfrp_userInfo: (token) => electron.ipcRenderer.invoke("frp:natfrp.userInfo", token)
});
electron.contextBridge.exposeInMainWorld("sakurafrp", {
  exists: () => {
    return electron.ipcRenderer.invoke("sakurafrp:exists");
  },
  download: () => electron.ipcRenderer.invoke("sakurafrp:download"),
  onProgress: (cb) => {
    electron.ipcRenderer.on("sakurafrp:progress", (_, percent) => cb(percent));
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
  // 注意现在需要传 ID
  /**
   * 启动代理
   * @param config ProxyConfig 对象
   */
  start: (config) => electron.ipcRenderer.send("mcproxy:start", config),
  /**
   * 停止指定代理
   * @param id 实例 ID
   */
  stop: (id) => electron.ipcRenderer.send("mcproxy:stop", id),
  /**
  * 监听启动状态回调
  * @param callback (event, {id, success}) => void
  */
  onStatus: (callback) => electron.ipcRenderer.on("mcproxy:status", callback)
});
