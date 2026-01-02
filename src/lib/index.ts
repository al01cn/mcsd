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