export function loadIcpMain(ipcMain: Electron.IpcMain, win: Electron.BrowserWindow) {

    // 窗口控制
    ipcMain.on('window:minimize', () => {
        win?.minimize()
    })

    ipcMain.on('window:close', () => {
        win?.close()
    })
}