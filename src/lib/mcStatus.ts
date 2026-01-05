import type { JavaStatusResponse } from "minecraft-server-util";

/**
 * 获取 Minecraft 服务器状态信息
 *
 * @param host - 服务器地址，例如 "127.0.0.1"
 * @param port - 服务器端口，例如 25565
 * @param timeout - 超时时间，默认 5000ms
 * @returns 服务器状态对象
 */
export async function fetchServerStatus(
  host: string,
  port: number,
  timeout: number = 5000
): Promise<JavaStatusResponse | null> {
  try {
    const result = await (window as any).minecraft.getServerStatus(host, port, timeout);
    return result;
  } catch (err) {
    console.error("获取服务器状态失败:", err);
    return null;
  }
}
