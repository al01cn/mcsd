import log from 'electron-log';
import path from 'path';
import { app, ipcMain } from 'electron';

export class LoggerService {
    constructor() {
        const logPath = path.join(app.getPath("userData"), "data", "logs", "app.log");

        // 配置日志文件路径
        log.transports.file.resolvePathFn = () => logPath;

        // 配置日志格式
        log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

        // 设置日志文件大小限制 (例如 5MB)
        log.transports.file.maxSize = 5 * 1024 * 1024;

        // 控制台输出配置
        log.transports.console.format = '{h}:{i}:{s} › {text}';
    }

    // 初始化 IPC 监听，供渲染进程调用
    initIpc() {
        ipcMain.on('system:log', (_event, { level, message, data }) => {
            const logger = log.scope('Renderer');
            // @ts-ignore
            logger[level](message, data || '');
        });
    }

    // 主进程直接调用的方法
    info(msg: string, ...args: any[]) {
        log.info(msg, ...args);
    }

    warn(msg: string, ...args: any[]) {
        log.warn(msg, ...args);
    }

    error(msg: string, ...args: any[]) {
        log.error(msg, ...args);
    }
}

export const loggerService = new LoggerService();