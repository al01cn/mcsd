import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import https from 'https'
import crypto from 'crypto'
import { loggerService } from './utils/logger'

/* =======================
   类型定义
======================= */

export interface SakuraFrpArch {
    title: string
    url: string
    hash: string
    size: number
}

export interface SakuraFrpInfo {
    ver: string
    archs: Record<string, SakuraFrpArch>
}

export interface ApiResponse {
    frpc: SakuraFrpInfo
}

/* =======================
   解析最新 Windows frpc
======================= */

export function getLatestWindowsSakuraFrp(apiData: ApiResponse): {
    version: string
    arch: string
    url: string
    hash: string
    size: number
} {
    const archPriority = [
        'windows_amd64',
        'windows_arm64',
        'windows_386'
    ]

    for (const arch of archPriority) {
        const item = apiData.frpc.archs[arch]
        if (item) {
            return {
                version: apiData.frpc.ver,
                arch,
                url: item.url,
                hash: item.hash,
                size: item.size
            }
        }
    }

    throw new Error('未找到 Windows 平台 frpc')
}

/* =======================
   下载器（落盘为 sakurafrp.exe）
======================= */

export class SakuraFrpDownloader {
    /** 本地统一名称 */
    private readonly fileName = 'sakurafrp.exe'

    get binDir(): string {
        return path.join(app.getPath('userData'), 'bin')
    }

    get filePath(): string {
        return path.join(this.binDir, this.fileName)
    }

    exists(): boolean {
        return fs.existsSync(this.filePath)
    }

    async download(
        url: string,
        expectedHash?: string,
        onProgress?: (percent: number) => void
    ): Promise<string> {
        fs.mkdirSync(this.binDir, { recursive: true })

        const tempPath = this.filePath + '.download'

        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(tempPath)
            const md5 = crypto.createHash('md5')

            https.get(url, res => {
                if (res.statusCode !== 200) {
                    loggerService.error('下载失败', res.statusCode)
                    reject(new Error(`下载失败，HTTP ${res.statusCode}`))
                    return
                }

                const total = Number(res.headers['content-length'] || 0)
                let received = 0

                res.on('data', chunk => {
                    received += chunk.length
                    md5.update(chunk)

                    if (total && onProgress) {
                        onProgress(Math.floor((received / total) * 100))
                    }
                })

                res.pipe(file)

                file.on('finish', () => {
                    file.close()

                    if (expectedHash) {
                        const fileHash = md5.digest('hex')
                        if (fileHash !== expectedHash) {
                            fs.unlinkSync(tempPath)
                            loggerService.error('sakurafrp.exe 校验失败', fileHash)
                            reject(new Error('sakurafrp.exe 校验失败'))
                            return
                        }
                    }

                    fs.renameSync(tempPath, this.filePath)
                    resolve(this.filePath)
                })
            }).on('error', err => {
                fs.unlink(tempPath, () => {})
                reject(err)
            })
        })
    }
}
