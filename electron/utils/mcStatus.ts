// src/utils/minecraft.ts
import { status, JavaStatusResponse } from "minecraft-server-util";
import { loggerService } from "./logger";

/**
 * 获取 Minecraft 服务器状态信息
 *
 * @param host - 服务器地址，例如 "127.0.0.1"
 * @param port - 服务器端口，例如 25565
 * @param timeout - 请求超时时间（毫秒），默认 5000
 * @returns 返回一个 Promise，解析为服务器状态信息对象
 *
 * @example
 * ```ts
 * const info = await getMinecraftServerStatus("127.0.0.1", 25565);
 * console.log(info.players.online);
 * ```
 */
export async function getMinecraftServerStatus(
  host: string,
  port: number,
  timeout: number = 5000
): Promise<JavaStatusResponse> {
  try {
    const result = await status(host, port, { timeout });
    return result;
  } catch (error) {
    loggerService.error("获取 Minecraft 状态失败", error);
    throw error;
  }
}
