export type ModLoader = "Vanilla" | "Forge" | "Fabric" | "Quilt" | "NeoForge";
export type LoginType = "offline" | "msa" | "custom" | "other";
export enum McModLoader {
    Vanilla = 'Vanilla',
    Forge = 'Forge',
    Fabric = 'Fabric',
    Quilt = 'Quilt',
    NeoForge = 'NeoForge'
}

export enum McLoginType {
    Offline = 'offline',
    Msa = 'msa',
    Custom = 'custom',
    Other = 'other'
}

export interface MinecraftProcessInfo {
    pid: number;
    java: string;
    version?: string;
    loader: ModLoader;
    loaderVersion?: string;
    username?: string;
    uuid?: string;
    loginType?: LoginType;
    provider?: string;
    lanPorts: number[];
    isLan: boolean;
}

export async function getDetect() { 
    return await (window as any).minecraft.getDetect() as MinecraftProcessInfo[];
}

export default getDetect