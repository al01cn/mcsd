import * as dgram from 'dgram';
import * as net from 'net';
import { ChildProcess, fork } from 'child_process';
import { app, ipcMain } from 'electron';

/**
 * 代理配置接口
 */
export interface ProxyConfig {
    id: string;
    remoteHost: string;
    remotePort: number;
    localPort: number;
    fakeMotd: string;
}

// ==========================================
// 1. 核心逻辑类 (定义在顶层，防止语法错误)
// ==========================================

class ProxyWorker {
    private udp: dgram.Socket | null = null;
    private tcp: net.Server | null = null;
    private broadcastTimer: NodeJS.Timeout | null = null;

    start(config: ProxyConfig) {
        this.udp = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        const msg = Buffer.from(`[MOTD]${config.fakeMotd}[/MOTD][AD]${config.localPort}[/AD]`);
        this.broadcastTimer = setInterval(() => {
            try { this.udp?.send(msg, 0, msg.length, 4445, '224.0.2.60'); } catch (e) {}
        }, 1500);

        this.tcp = net.createServer((c) => {
            const r = new net.Socket();
            c.pause();
            c.setTimeout(10000);
            r.connect(config.remotePort, config.remoteHost, () => {
                c.resume();
                c.pipe(r);
                r.pipe(c);
            });
            const end = () => { c.destroy(); r.destroy(); };
            c.on('error', end); r.on('error', end);
            c.on('close', end); r.on('close', end);
        });

        this.tcp.on('error', () => process.exit(1));
        this.tcp.listen(config.localPort, '0.0.0.0');
    }

    stop() {
        if (this.broadcastTimer) clearInterval(this.broadcastTimer);
        this.udp?.removeAllListeners();
        this.udp?.close();
        this.tcp?.close();
    }
}

class MinecraftProxyManager {
    private instances = new Map<string, ChildProcess>();
    private portLock = new Set<number>();
    private maxInstances: number;

    constructor(maxInstances: number) {
        this.maxInstances = maxInstances;
        this.setupIpc();
    }

    private setupIpc() {
        ipcMain.on('mcproxy:start', async (event, config: ProxyConfig) => {
            const success = await this.startInstance(config);
            event.reply('mcproxy:status', { id: config.id, success });
        });
        ipcMain.on('mcproxy:stop', (_, id: string) => this.stopInstance(id));
        app.on('before-quit', () => this.stopAll());
    }

    private async startInstance(config: ProxyConfig): Promise<boolean> {
        if (this.instances.has(config.id)) await this.stopInstance(config.id);
        if (this.instances.size >= this.maxInstances) return false;
        if (this.portLock.has(config.localPort)) return false;

        try {
            const child = fork(__filename, [], {
                env: { ...process.env, IS_MINECRAFT_PROXY_WORKER: 'true' },
                stdio: ['ignore', 'inherit', 'inherit', 'ipc']
            });

            this.portLock.add(config.localPort);
            this.instances.set(config.id, child);
            child.send({ type: 'START', payload: config });

            child.on('exit', () => {
                this.instances.delete(config.id);
                this.portLock.delete(config.localPort);
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    private async stopInstance(id: string) {
        const child = this.instances.get(id);
        if (child?.connected) {
            return new Promise<void>((resolve) => {
                child.once('exit', () => resolve());
                child.send({ type: 'STOP' });
                setTimeout(() => { child.kill('SIGKILL'); resolve(); }, 1000);
            });
        }
    }

    private stopAll() {
        for (const id of this.instances.keys()) this.stopInstance(id);
    }
}

// ==========================================
// 2. 导出入口与自动引导 (核心修复点)
// ==========================================

/**
 * 在 Electron 主进程中调用此函数
 */
export const initMinecraftProxy = (max: number = 1) => {
    return new MinecraftProxyManager(max);
};

// 自动识别子进程并运行
if (process.env.IS_MINECRAFT_PROXY_WORKER === 'true') {
    const worker = new ProxyWorker();
    process.on('message', (m: any) => {
        if (m.type === 'START') worker.start(m.payload);
        if (m.type === 'STOP') { worker.stop(); process.exit(0); }
    });
    process.on('disconnect', () => process.exit(0));
}