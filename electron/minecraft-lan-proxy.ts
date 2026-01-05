import * as dgram from 'dgram';
import { ipcMain } from 'electron';
import getPort, { portNumbers } from 'get-port';
import * as net from 'net';

export interface MCProxyConfig {
    id: string;
    remoteHost: string;
    remotePort: number;
    localPort: number;
    fakeMotd: string;
}

export class MinecraftLanProxy {
    private readonly config: MCProxyConfig;
    private udpClient: dgram.Socket | null = null;
    private tcpServer: net.Server | null = null;
    private broadcastTimer: NodeJS.Timeout | null = null;
    private activeConnections: Set<net.Socket> = new Set();

    constructor(config: MCProxyConfig) {
        this.config = config;
    }

    public async start(): Promise<void> {
        // 初始获取一个随机可用端口
        const port = await getPort({ port: portNumbers(20000, 65535) });
        if(!this.config.localPort){
            this.config.localPort = port;
            console.log(`使用随机端口 ${port}`);
        }

        return new Promise((resolve, reject) => {
            this.startWithRetry(resolve, reject);
        });
    }

    /**
 * 内部递归启动函数
 */
    private startWithRetry(resolve: Function, reject: Function): void {
        try {
            // 每次尝试启动前，先确保之前的资源是干净的
            this.cleanupTempResources();

            this.startTcpProxy(
                () => {
                    // TCP 成功后启动 UDP
                    this.startUdpBroadcaster();
                    resolve();
                },
                async (err: any) => {
                    if (err.code === 'EADDRINUSE') {
                        console.warn(`[*] 端口 ${this.config.localPort} 被占用，尝试自动递增...`);

                        // 逻辑：端口加 1，并确保不超过最大值
                        this.config.localPort += 1;
                        if (this.config.localPort > 65535) {
                            this.config.localPort = 20000; // 回到起始范围
                        }

                        // 稍作延迟后递归重试，避免极端情况下的死循环
                        setTimeout(() => this.startWithRetry(resolve, reject), 10);
                    } else {
                        reject(err);
                    }
                }
            );
        } catch (err) {
            reject(err);
        }
    }

    private startUdpBroadcaster(): void {
        const MCAST_GRP = '224.0.2.60';
        const MCAST_PORT = 4445;
        const message = Buffer.from(`[MOTD]${this.config.fakeMotd}[/MOTD][AD]${this.config.localPort}[/AD]`);

        this.udpClient = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        this.udpClient.on('error', (err) => console.error(`[UDP Error] ${err.message}`));

        this.broadcastTimer = setInterval(() => {
            if (this.udpClient) {
                this.udpClient.send(message, 0, message.length, MCAST_PORT, MCAST_GRP);
            }
        }, 1500);

        console.log(`[*] ID: ${this.config.id} UDP 广播已启动`);
    }



    private startTcpProxy(resolve: Function, reject: Function): void {
        this.tcpServer = net.createServer((clientSocket) => {
            const remoteSocket = new net.Socket();
            this.activeConnections.add(clientSocket);
            this.activeConnections.add(remoteSocket);

            const closeSockets = () => {
                clientSocket.destroy();
                remoteSocket.destroy();
                this.activeConnections.delete(clientSocket);
                this.activeConnections.delete(remoteSocket);
            };

            clientSocket.pause();

            remoteSocket.connect(this.config.remotePort, this.config.remoteHost, () => {
                clientSocket.resume();
                clientSocket.pipe(remoteSocket);
                remoteSocket.pipe(clientSocket);
            });

            // 在 createServer 回调内部添加
            clientSocket.once('data', (data) => {
                try {
                    // Minecraft 握手包简单解析 (初步尝试获取玩家名)
                    // 注意：这取决于玩家使用的版本，某些版本在握手包中不包含玩家名
                    const strData = data.toString('utf8', 0, 100);
                    const match = strData.match(/[a-zA-Z0-9_]{3,16}/); // 匹配可能的玩家名正则
                    if (match) {
                        console.log(`[*] 识别到可能的玩家名: ${match[0]}`);
                    }
                } catch (e) {
                    // 解析失败不影响代理
                }
            });

            // 错误与断开处理
            clientSocket.on('error', closeSockets);
            remoteSocket.on('error', closeSockets);
            clientSocket.on('close', closeSockets);
            remoteSocket.on('close', closeSockets);

            // 30秒超时处理
            clientSocket.setTimeout(30000);
            clientSocket.on('timeout', () => {
                console.log(`[Proxy] 连接超时已切断`);
                closeSockets();
            });
        });

        this.tcpServer.on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                reject(new Error(`端口 ${this.config.localPort} 已被占用`));
            } else {
                reject(err);
            }
        });

        this.tcpServer.listen(this.config.localPort, '0.0.0.0', () => {
            console.log(`[*] TCP 代理就绪: ${this.config.localPort} -> ${this.config.remoteHost}`);
            resolve();
        });
    }

    public stop(): void {
        if (this.broadcastTimer) clearInterval(this.broadcastTimer);

        this.udpClient?.close();
        this.tcpServer?.close(() => {
            console.log(`[*] 代理实例 ${this.config.id} 已完全停止`);
        });

        // 强制断开所有当前连接
        for (const socket of this.activeConnections) {
            socket.destroy();
        }
        this.activeConnections.clear();
    }

    /**
     * 清理函数：确保递归重试时不会留下半开的服务器
     */
    private cleanupTempResources(): void {
        if (this.broadcastTimer) {
            clearInterval(this.broadcastTimer);
            this.broadcastTimer = null;
        }
        if (this.udpClient) {
            this.udpClient.close();
            this.udpClient = null;
        }
    }
}

class ProxyManager {
    private instances: Map<string, MinecraftLanProxy> = new Map();

    init() {
        ipcMain.on('mcproxy:start', async (event, config: MCProxyConfig) => {
            if (this.instances.has(config.id)) {
                event.reply('mcproxy:status', { id: config.id, success: false, message: '该 ID 的实例已在运行', localPort: config.localPort });
                return;
            }

            const proxy = new MinecraftLanProxy(config);
            try {
                await proxy.start();
                this.instances.set(config.id, proxy);
                event.reply('mcproxy:status', { id: config.id, success: true, message: '启动成功', localPort: config.localPort });
            } catch (err: any) {
                event.reply('mcproxy:status', { id: config.id, success: false, message: err.message });
            }
        });

        ipcMain.on('mcproxy:stop', (event, id: string) => {
            const proxy = this.instances.get(id);
            if (proxy) {
                proxy.stop();
                this.instances.delete(id);
                event.reply('mcproxy:status', { id, success: false, message: '已停止' });
            }
        });
    }
}

export const proxyManager = new ProxyManager();