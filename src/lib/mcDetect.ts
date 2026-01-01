export type ModLoader = "Vanilla" | "Forge" | "Fabric" | "Quilt" | "NeoForge";
export type LoginType = "offline" | "msa" | "other";

export interface MinecraftProcessInfo {
    pid: number;
    java: string;
    version?: string;
    loader: ModLoader;
    loaderVersion?: string;
    username?: string;
    uuid?: string;
    loginType?: LoginType;
    lanPorts: number[];
}

export async function getDetect() { 
    return await (window as any).minecraft.getDetect() as MinecraftProcessInfo[];
}

export default getDetect