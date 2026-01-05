/**
 * 提取 Minecraft 皮肤的头部并返回 Base64 图片
 * @param skinUrl 皮肤图片的 URL 或 Base64
 * @param size 输出头像的尺寸（像素）
 * @returns Promise<string> Base64 格式的头像
 */
export async function getMinecraftHead(skinUrl: string, size: number = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = skinUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Canvas context not found");

      canvas.width = size;
      canvas.height = size;

      // 核心：必须禁用平滑处理，否则像素边缘会模糊
      ctx.imageSmoothingEnabled = false;

      /**
       * 坐标说明 (基于 64x64 像素标准):
       * 头部底层 (Base): x=8, y=8, 宽=8, 高=8
       * 头部外层 (Overlay/Hat): x=40, y=8, 宽=8, 高=8
       */

      // 1. 绘制底层头部
      ctx.drawImage(img, 8, 8, 8, 8, 0, 0, size, size);

      // 2. 绘制第二层（帽子/头盔层）
      // 注意：外层通常包含透明像素，drawImage 会自动处理透明度叠加
      ctx.drawImage(img, 40, 8, 8, 8, 0, 0, size, size);

      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject("Image load failed");
  });
}

/**
 * 获取 Minecraft 玩家皮肤 URL
 *
 * @param uuid - 玩家 UUID（不带连字符）
 * @returns 玩家皮肤 URL，失败返回 null
 *
 * @example
 * const url = await getMinecraftSkin("player-uuid");
 */
export async function getMinecraftSkin(uuid: string): Promise<string | null> {
  try {
    // 调用 Mojang API 获取 profile
    const rawData = await (window as any).mojang.getProfile(uuid);

    const mcProfile = rawData.data;

    const texturesProperty = (mcProfile.properties as any[]).find(
      (prop: any) => prop.name === "textures"
    );

    if (!texturesProperty) return null;

    // Mojang 返回的 value 是 Base64 编码
    const decoded = atob(texturesProperty.value);
    const data = JSON.parse(decoded);


    // 获取皮肤链接
    const skinUrl = data?.textures?.SKIN?.url || null;

    return skinUrl;
  } catch (err) {
    console.warn(`获取玩家皮肤失败: ${err}`);
    return null;
  }
}

export default getMinecraftHead