import { ipcRenderer, contextBridge } from 'electron'
import { MinecraftProcessInfo } from './minecraft'
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
  close: () => ipcRenderer.send('window:close'),
})

contextBridge.exposeInMainWorld('mojang', {
  getProfile: (uuid: string) =>
    ipcRenderer.invoke('mojang:getProfile', uuid)
})

contextBridge.exposeInMainWorld('minecraft', {
  getDetect() {
    return ipcRenderer.invoke("minecraft:detect");
  }
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
  // 注意现在需要传 ID
  /**
   * 启动代理
   * @param config ProxyConfig 对象
   */
  start: (config: any) => ipcRenderer.send('mcproxy:start', config),

  /**
   * 停止指定代理
   * @param id 实例 ID
   */
  stop: (id: any) => ipcRenderer.send('mcproxy:stop', id),
  /**
 * 监听启动状态回调
 * @param callback (event, {id, success}) => void
 */
  onStatus: (callback: (event: Electron.IpcRendererEvent, ...args: any[]) => void) => ipcRenderer.on('mcproxy:status', callback)
});