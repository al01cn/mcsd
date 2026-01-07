import { ipcRenderer, contextBridge, IpcRendererEvent } from 'electron'
import { PlatformConfig } from './config'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('windowControl', {
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close')
})

contextBridge.exposeInMainWorld('system', {
  openBrowser: (url: string) => ipcRenderer.send('system:openUrl', url),
  getVersion: () => ipcRenderer.invoke("system:version"),
  log: (level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) => {
    ipcRenderer.send('system:log', { level, message, data });
  }
});

contextBridge.exposeInMainWorld('mojang', {
  getProfile: (uuid: string) => ipcRenderer.invoke('mojang:getProfile', uuid)
})

contextBridge.exposeInMainWorld('minecraft', {
  getDetect() {
    return ipcRenderer.invoke("minecraft:detect");
  },

  /**
 * 获取 Minecraft 服务器状态
 * @param host 服务器地址
 * @param port 服务器端口
 * @param timeout 超时时间（可选）
 * @returns Promise<StatusResponse>
 */
  getServerStatus: (host: string, port: number, timeout?: number) =>
    ipcRenderer.invoke("minecraft:status", host, port, timeout),
})

contextBridge.exposeInMainWorld("frp", {
  natfrp_getNodes: (token: string) =>
    ipcRenderer.invoke("frp:natfrp.getNodes", token),
  natfrp_nodeStats: (token: string) =>
    ipcRenderer.invoke("frp:natfrp.nodeStats", token),
  natfrp_getMergedNodes: (token: string) =>
    ipcRenderer.invoke("frp:natfrp.getMergedNodes", token),
  natfrp_tunnelInfo: (token: string) =>
    ipcRenderer.invoke("frp:natfrp.getTunnels", token),
  natfrp_tunnelCreate: (token: string, node: number, local_port: number) =>
    ipcRenderer.invoke("frp:natfrp.tunnelCreate", token, node, local_port),
  natfrp_tunnelEdit: (token: string, tunnel_id: string, port: number) =>
    ipcRenderer.invoke('frp:natfrp.tunnelEdit', token, tunnel_id, port),
  natfrp_userInfo: (token: string) =>
    ipcRenderer.invoke("frp:natfrp.userInfo", token),
});

contextBridge.exposeInMainWorld('sakurafrp', {
  exists: (): Promise<boolean> => {
    return ipcRenderer.invoke('sakurafrp:exists')
  },
  download: () => ipcRenderer.invoke('sakurafrp:download'),
  onProgress: (cb: (percent: number) => void) => {
    ipcRenderer.on('sakurafrp:progress', (_, percent) => cb(percent))
  },
  start: (token: string, tunnelId: string) =>
    ipcRenderer.invoke('frpc:start', token, tunnelId),

  stop: (tunnelId: string) =>
    ipcRenderer.invoke('frpc:stop', tunnelId),

  onLog: (callback: (log: any) => void) => {
    ipcRenderer.on('frpc:log', (_, data) => callback(data))
  }
})

contextBridge.exposeInMainWorld("platformAPI", {
  list: (): Promise<PlatformConfig[]> =>
    ipcRenderer.invoke("platform:list"),

  add: (platform: Omit<PlatformConfig, "nanoid">) =>
    ipcRenderer.invoke("platform:add", platform),

  update: (
    nanoid: string,
    patch: Partial<Omit<PlatformConfig, "nanoid">>
  ) => ipcRenderer.invoke("platform:update", nanoid, patch),

  enable: (
    nanoid: string,
  ) => ipcRenderer.invoke("platform:enable", nanoid),

  disable: (
    nanoid: string,
  ) => ipcRenderer.invoke("platform:disable", nanoid),

  remove: (nanoid: string) =>
    ipcRenderer.invoke("platform:remove", nanoid)
});

contextBridge.exposeInMainWorld('mcproxy', {
  /**
       * @param config { id, remoteHost, remotePort, localPort, fakeMotd }
       */
  start: (config: any) => ipcRenderer.send('mcproxy:start', config),

  stop: (id: string) => ipcRenderer.send('mcproxy:stop', id),

  /**
   * 监听状态回调
   * 返回一个 unsubscribe 函数用于销毁监听，防止内存泄漏
   */
  onStatus: (callback: (data: any) => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('mcproxy:status', subscription);

    return () => {
      ipcRenderer.removeListener('mcproxy:status', subscription);
    };
  },
  getTcpDelay: (host: string, port: number) => ipcRenderer.invoke('network:tcp', host, port)
});