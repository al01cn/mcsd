import { app, BrowserWindow } from 'electron'
import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import path from 'path'
import fs from 'fs'
import { loggerService } from './utils/logger'

/* =======================
   类型定义
======================= */

interface FrpcProcess {
  tunnelId: string
  process: ChildProcessWithoutNullStreams
}

/* =======================
   frpc 管理器
======================= */

class SakuraFrpcManager {
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
    const exists = fs.existsSync(this.getFrpcPath())
    loggerService.info(`检查frpc文件是否存在: ${exists}, 路径: ${this.getFrpcPath()}`)
    return exists
  }

  /** 启动隧道 */
  startTunnel(token: string, tunnelId: string) {
    loggerService.info(`开始启动隧道: ${tunnelId}，使用token: ${token}`)
    
    if (!this.exists()) {
      loggerService.error('frpc 不存在')
      throw new Error('frpc 不存在')
    }

    if (this.processes.has(tunnelId)) {
      loggerService.error(`隧道 ${tunnelId} 已在运行`)
      throw new Error(`隧道 ${tunnelId} 已在运行`)
    }

    const frpcPath = this.getFrpcPath()
    loggerService.info(`使用frpc路径: ${frpcPath}`)

    const proc = spawn(frpcPath, ['-f', `${token}:${tunnelId}`], {
      windowsHide: true
    })

    this.processes.set(tunnelId, {
      tunnelId,
      process: proc
    })

    loggerService.info(`隧道 ${tunnelId} 进程已启动`)

    // stdout
    proc.stdout.on('data', (data) => {
      loggerService.info(`隧道 ${tunnelId} 输出: ${data.toString()}`)
      this.sendLog(tunnelId, data.toString(), 'stdout')
    })

    // stderr
    proc.stderr.on('data', (data) => {
      loggerService.warn(`隧道 ${tunnelId} 错误: ${data.toString()}`)
      this.sendLog(tunnelId, data.toString(), 'stderr')
    })

    proc.on('close', (code) => {
      loggerService.info(`隧道 ${tunnelId} 进程已退出，code=${code}`)
      this.sendLog(tunnelId, `进程已退出，code=${code}`, 'close')
      this.processes.delete(tunnelId)
    })

    proc.on('error', (err) => {
      loggerService.error(`隧道 ${tunnelId} 发生错误: ${err.message}`)
      this.sendLog(tunnelId, err.message, 'error')
    })
  }

  /** 停止隧道 */
  stopTunnel(tunnelId: string) {
    loggerService.info(`停止隧道: ${tunnelId}`)
    const item = this.processes.get(tunnelId)
    if (!item) {
      loggerService.warn(`尝试停止不存在的隧道: ${tunnelId}`)
      return
    }

    item.process.kill()
    this.processes.delete(tunnelId)
    loggerService.info(`隧道 ${tunnelId} 已停止`)
  }

  /** 停止全部 */
  stopAll() {
    loggerService.info(`停止所有隧道进程`)
    for (const [id, item] of this.processes) {
      loggerService.info(`停止隧道: ${id}`)
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
    loggerService.info(`发送日志到前端: 隧道${tunnelId}, 类型${type}`)
    this.win.webContents.send('frpc:log', {
      tunnelId,
      message,
      type,
      time: Date.now()
    })
  }
}

export default SakuraFrpcManager