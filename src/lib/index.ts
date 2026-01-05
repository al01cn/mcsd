import { nanoid } from "nanoid";

/**
 * 将接口返回数值换算成 GB 并四舍五入
 * @param value 原始接口数值
 * @param decimals 小数点保留位数，默认 1
 * @returns GB 字符串
 */
export function formatToGB(value: number, decimals: number = 1): string {
    const gb = value / 1000; // MB → GB（十进制）
    return `${gb.toFixed(decimals)} GB`;
}

/**
 * 将 GiB 转换为 GB 并四舍五入
 * @param gib 原始 GiB 数值
 * @param decimals 小数点保留位数，默认 1
 * @returns GB 字符串
 */
export function gibToGB(gib: number, decimals: number = 1): string {
    // 1 GiB = 1024^3 Bytes, 1 GB = 1000^3 Bytes
    const gb = gib * (1024 ** 3) / (1000 ** 3);
    const rounded = Number(gb.toFixed(decimals));
    return `${rounded} GB`;
}

export function MCProxyName() {
    return "mc_" + nanoid(6)
}

export const extractHostAndPort = (text: string) => {
    // 正则解析：
    // >>             : 匹配起始符
    // ([^<>]+:\d+)   : 捕获组 1：匹配不含<>的字符，中间必须有冒号，后面必须跟数字端口
    // <<             : 匹配结束符
    const regex = />>([^<>]+:\d+)<</;

    const match = text.match(regex);
    if (match) {
        const fullContent = match[1]; // 得到 "frp-ski.com:39345"
        const [host, port] = fullContent.split(':');
        return { host, port };
    }
    return null;
};

export const openUrl = (url: string) => {
    (window as any).system.openBrowser(url)
}

export async function getVersion() {
    const version = await (window as any).system.getVersion()
    return version
}