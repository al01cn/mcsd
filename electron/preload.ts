import { ipcRenderer, contextBridge } from 'electron'

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