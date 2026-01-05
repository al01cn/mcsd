import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import path from 'path'
import fs from 'fs'

/* =======================
   类型定义
======================= */

export interface FrpcProcess {
  tunnelId: string
  process: ChildProcessWithoutNullStreams
}

/* =======================
   frpc 管理器
======================= */

export class SakuraFrpcManager {
  private processes = new Map<string, FrpcProcess>()
  private win: BrowserWindow

  constructor(win: BrowserWindow) {
    this.win = win
  }

  private getFrpcPath() {
    return path.join(app.getPath('userData'), 'bin', 'sakurafrp.exe')
  }

  /** 是否存在 frpc */
  exists() {
    return fs.existsSync(this.getFrpcPath())
  }

  /** 启动隧道 */
  startTunnel(token: string, tunnelId: string) {
    if (!this.exists()) {
      throw new Error('frpc 不存在')
    }

    if (this.processes.has(tunnelId)) {
      throw new Error(`隧道 ${tunnelId} 已在运行`)
    }

    const frpcPath = this.getFrpcPath()

    const proc = spawn(frpcPath, ['-f', `${token}:${tunnelId}`], {
      windowsHide: true
    })

    this.processes.set(tunnelId, {
      tunnelId,
      process: proc
    })

    // stdout
    proc.stdout.on('data', (data) => {
      this.sendLog(tunnelId, data.toString(), 'stdout')
    })

    // stderr
    proc.stderr.on('data', (data) => {
      this.sendLog(tunnelId, data.toString(), 'stderr')
    })

    proc.on('close', (code) => {
      this.sendLog(tunnelId, `进程已退出，code=${code}`, 'close')
      this.processes.delete(tunnelId)
    })

    proc.on('error', (err) => {
      this.sendLog(tunnelId, err.message, 'error')
    })
  }

  /** 停止隧道 */
  stopTunnel(tunnelId: string) {
    const item = this.processes.get(tunnelId)
    if (!item) return

    item.process.kill()
    this.processes.delete(tunnelId)
  }

  /** 停止全部 */
  stopAll() {
    for (const [id, item] of this.processes) {
      item.process.kill()
      this.processes.delete(id)
    }
  }

  /** 推送日志到前端 */
  private sendLog(
    tunnelId: string,
    message: string,
    type: 'stdout' | 'stderr' | 'close' | 'error'
  ) {
    this.win.webContents.send('frpc:log', {
      tunnelId,
      message,
      type,
      time: Date.now()
    })
  }
}

export default SakuraFrpcManager
