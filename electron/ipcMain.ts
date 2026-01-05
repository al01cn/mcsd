import Config, { PlatformConfig } from "./config";
import { NatFrp } from "./frp";
import MinecraftDetector from "./minecraft";
import { getMojangProfile } from "./mojang";
import { getLatestWindowsSakuraFrp, SakuraFrpDownloader } from "./SakuraFrpDownloader";
import SakuraFrpcManager from './frpc'
import { getMinecraftServerStatus } from "./utils/mcStatus";
import { proxyManager } from "./minecraft-lan-proxy";
import net from 'net';
const config = new Config();
const downloader = new SakuraFrpDownloader()
proxyManager.init();


export function loadIcpMain(ipcMain: Electron.IpcMain, win: Electron.BrowserWindow) {
    const frpc = new SakuraFrpcManager(win)

    // main.ts
    ipcMain.handle("network:tcp", async (_event, host, port) => {
        // 1. 强制转换并检查
        const targetPort = parseInt(String(port), 10);
        const targetHost = String(host || '').trim();

        // 2. 校验合法性
        if (isNaN(targetPort) || targetPort <= 0 || targetPort > 65535) {
            console.error(`无效的端口: ${port}`);
            return -1;
        }
        if (!targetHost) {
            console.error(`无效的地址: ${host}`);
            return -1;
        }

        return new Promise((resolve) => {
            const socket = new net.Socket();
            const start = Date.now();

            socket.setTimeout(2000);

            socket.connect({ port: targetPort, host: targetHost }, () => {
                const delay = Date.now() - start;
                socket.destroy();
                resolve(delay);
            });

            const handleError = () => {
                socket.destroy();
                resolve(-1);
            };

            socket.on('error', handleError);
            socket.on('timeout', handleError);
        });
    });

    // 配置
    ipcMain.handle("platform:list", (): PlatformConfig[] => {
        return config.getPlatforms();
    });

    ipcMain.handle(
        "platform:add",
        (_e, platform: Omit<PlatformConfig, "nanoid">): PlatformConfig => {
            return config.addPlatform(platform);
        }
    );

    ipcMain.handle(
        "platform:update",
        (_e, nanoid: string, patch: Partial<Omit<PlatformConfig, "nanoid">>): void => {
            config.updatePlatform(nanoid, patch);
        }
    );

    ipcMain.handle(
        "platform:enable",
        (_e, nanoid: string): void => {
            config.enablePlatform(nanoid);
        }
    );
    ipcMain.handle(
        "platform:disable",
        (_e, nanoid: string): void => {
            config.disablePlatform(nanoid);
        }
    );

    ipcMain.handle(
        "platform:remove",
        (_e, nanoid: string): void => {
            config.removePlatform(nanoid);
        }
    );

    ipcMain.handle(
        'mojang:getProfile',
        async (_event, uuid: string) => {
            return await getMojangProfile(uuid)
        }
    )

    // 内网穿透平台API
    ipcMain.handle(
        'frp:natfrp.userInfo',
        async (_event, token: string) => {
            return await NatFrp.userInfo(token)
        }
    )

    ipcMain.handle(
        'frp:natfrp.getNodes',
        async (_event, token: string) => {
            return await NatFrp.nodes(token)
        }
    )

    ipcMain.handle(
        'frp:natfrp.nodeStats',
        async (_event, token: string) => {
            return await NatFrp.nodeStats(token)
        }
    )

    ipcMain.handle(
        'frp:natfrp.getMergedNodes',
        async (_event, token: string) => {
            return await NatFrp.getMergedNodes(token)
        }
    )

    ipcMain.handle(
        'frp:natfrp.getTunnels',
        async (_event, token: string) => {
            return await NatFrp.tunnelInfo(token)
        }
    )

    ipcMain.handle(
        'frp:natfrp.tunnelCreate',
        async (_event, token: string, node: number, local_port: number) => {
            return await NatFrp.tunnelCreate(token, node, local_port)
        }
    )

    ipcMain.handle(
        'frp:natfrp.tunnelEdit',
        async (_event, token: string, tunnel_id: string, local_port: number) => {
            return await NatFrp.tunnelEdit(token, tunnel_id, local_port)
        }
    )

    // SakuraFrp管理器

    ipcMain.handle('frpc:start', (_, token: string, tunnelId: string) => {
        frpc.startTunnel(token, tunnelId)
        return true
    })

    ipcMain.handle('frpc:stop', (_, tunnelId: string) => {
        frpc.stopTunnel(tunnelId)
        return true
    })

    /** 前端判断是否存在 */
    ipcMain.handle('sakurafrp:exists', () => {
        return downloader.exists()
    })

    ipcMain.handle('sakurafrp:download', async (event) => {
        const data = await NatFrp.clients()
        const info = getLatestWindowsSakuraFrp(data)

        await downloader.download(
            info.url,
            info.hash,
            percent => {
                event.sender.send('sakurafrp:progress', percent)
            }
        )

        return {
            version: info.version,
            path: downloader.filePath
        }
    })

    // 检测 Minecraft
    ipcMain.handle("minecraft:detect", async () => {
        return await MinecraftDetector.detectAll();
    });

    // MC 服务器状态
    ipcMain.handle(
        "minecraft:status",
        async (_event, host: string, port: number, timeout?: number) => {
            return await getMinecraftServerStatus(host, port, timeout);
        }
    );

    // 窗口控制
    ipcMain.on('window:minimize', () => {
        win?.minimize()
    })

    ipcMain.on('window:close', () => {
        win?.close()
    })
}