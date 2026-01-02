import Config, { PlatformConfig } from "./config";
import { NatFrp } from "./frp";
import MinecraftDetector from "./minecraft";
import { getMojangProfile } from "./mojang";
const config = new Config();


export function loadIcpMain(ipcMain: Electron.IpcMain, win: Electron.BrowserWindow) {
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


    // 检测 Minecraft
    ipcMain.handle("minecraft:detect", async () => {
        return await MinecraftDetector.detectAll();
    });

    // 窗口控制
    ipcMain.on('window:minimize', () => {
        win?.minimize()
    })

    ipcMain.on('window:close', () => {
        win?.close()
    })
}