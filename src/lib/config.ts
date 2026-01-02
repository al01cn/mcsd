export type Platform = 'sakurafrp' | 'locyanfrp'

export interface PlatformConfig {
    nanoid: string;      // 唯一 ID（自动生成）
    platform: Platform | string;    // 平台名称
    secret: string;      // 平台密钥
    enabled: boolean;    // 是否启用
}

export interface NatFrpUserInfoGroup {
    name: string;
    level: string;
    expires: string;
}

export interface NatFrpUserInfo {
    id: number;
    name: string;
    avatar: string;
    speed: string;
    tunnels: string;
    realname: string;
    group: NatFrpUserInfoGroup;
    sign: {
        traffic: number;
    }
}

export default {
    appName: 'OneTunnel',
}