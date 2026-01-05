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

/** FRP 节点信息 */
export interface SakuraFrpNode {
    /** 节点名称 */
    name: string

    /** 节点域名（有些节点为空） */
    host: string

    /** 描述信息 */
    description: string

    /** VIP 等级（0 表示非 VIP） */
    vip: number

    /** 节点标识 / 国家或线路标志 */
    flag: number

    /** 带宽描述（当前为空字符串） */
    band: string

    /** 节点唯一 ID */
    id: number

    /** 当前在线人数 */
    online: number

    /** 运行时长（秒） */
    uptime: number

    /** 当前负载 */
    load: number

    /** 经纬度（部分海外节点没有） */
    loc?: [number, number]
}

export interface MCProxyConfig {
    id: string;
    remoteHost: string;
    remotePort: number;
    localPort: number;
    fakeMotd: string;
}

export default {
    appName: 'OneTunnel',
}