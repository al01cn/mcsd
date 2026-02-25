import { app, dialog, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

type AllowedSystemPath = 'downloads'

async function findAvailableFilePath(filePath: string) {
  try {
    await fs.access(filePath)
  } catch {
    return filePath
  }

  const dir = path.dirname(filePath)
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)

  for (let i = 1; i < 10_000; i += 1) {
    const candidate = path.join(dir, `${base} (${i})${ext}`)
    try {
      await fs.access(candidate)
    } catch {
      return candidate
    }
  }

  return path.join(dir, `${base} (${Date.now()})${ext}`)
}

export function loadIcpMain(ipcMain: Electron.IpcMain, win: Electron.BrowserWindow) {

    // 窗口控制
    ipcMain.on('window:minimize', () => {
        win?.minimize()
    })

    ipcMain.on('window:close', () => {
        win?.close()
    })

    ipcMain.handle('system:getPath', async (_event, name: AllowedSystemPath) => {
        if (name !== 'downloads') throw new Error('unsupported system path')
        return app.getPath(name)
    })

    ipcMain.handle('dialog:selectDirectory', async () => {
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'createDirectory'],
        })
        if (result.canceled) return null
        return result.filePaths[0] ?? null
    })

    ipcMain.handle('shell:openPath', async (_event, targetPath: string) => {
        return shell.openPath(targetPath)
    })

    ipcMain.handle(
        'pack:saveToDirectory',
        async (
            _event,
            args: {
                directory: string
                fileName: string
                data: Uint8Array | ArrayBuffer
            }
        ) => {
            const directory = String(args.directory || '').trim()
            const fileName = String(args.fileName || '').trim()
            if (!directory) throw new Error('directory is required')
            if (!fileName) throw new Error('fileName is required')

            const safeFileName = path.basename(fileName)
            await fs.mkdir(directory, { recursive: true })

            const rawTargetPath = path.join(directory, safeFileName)
            const targetPath = await findAvailableFilePath(rawTargetPath)
            const bytes = args.data instanceof ArrayBuffer ? new Uint8Array(args.data) : args.data

            await fs.writeFile(targetPath, Buffer.from(bytes))
            return targetPath
        }
    )
}
