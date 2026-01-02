import { app } from "electron";
import path from "path";
import fs from "fs";
import { nanoid } from "nanoid";

/* =======================
   Type Definitions
======================= */

export interface PlatformConfig {
    nanoid: string;      // 唯一 ID（自动生成）
    platform: string;    // 平台名称
    secret: string;      // 平台密钥
    enabled: boolean;    // 是否启用
}

export interface AppConfigData {
    platforms: PlatformConfig[];
}

/* =======================
   Config Class
======================= */

export default class Config {
    public readonly name: string = "config";
    public readonly dataDir: string;
    public readonly configPath: string;

    constructor() {
        this.dataDir = path.join(app.getPath("userData"), "data");
        this.configPath = path.join(this.dataDir, "config.json");
        this.ensure();
    }

    /* ---------- Init ---------- */

    private ensure(): void {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }

        if (!fs.existsSync(this.configPath)) {
            const initial: AppConfigData = {
                platforms: []
            };
            this.write(initial);
        }
    }

    /* ---------- Base IO ---------- */

    public read(): AppConfigData {
        try {
            const raw: string = fs.readFileSync(this.configPath, "utf-8");
            const parsed: unknown = JSON.parse(raw);

            const platformsRaw = Array.isArray(
                (parsed as AppConfigData).platforms
            )
                ? (parsed as AppConfigData).platforms
                : [];

            // 向后兼容：补 enabled 默认值
            const platforms: PlatformConfig[] = platformsRaw.map(p => ({
                nanoid: p.nanoid,
                platform: p.platform,
                secret: p.secret,
                enabled: typeof p.enabled === "boolean" ? p.enabled : true
            }));

            return { platforms };
        } catch {
            return { platforms: [] };
        }
    }

    public write(data: AppConfigData): void {
        fs.writeFileSync(
            this.configPath,
            JSON.stringify(data, null, 2),
            "utf-8"
        );
    }

    /* =======================
       Platform APIs
    ======================= */

    public getPlatforms(): PlatformConfig[] {
        return this.read().platforms;
    }

    /** 只获取启用的平台（很常用） */
    public getEnabledPlatforms(): PlatformConfig[] {
        return this.read().platforms.filter(p => p.enabled);
    }

    public getPlatform(nanoid: string): PlatformConfig | undefined {
        return this.read().platforms.find(p => p.nanoid === nanoid);
    }

    public addPlatform(
        platform: Omit<PlatformConfig, "nanoid" | "enabled">
    ): PlatformConfig {
        const cfg: AppConfigData = this.read();

        const newPlatform: PlatformConfig = {
            nanoid: nanoid(),
            platform: platform.platform,
            secret: platform.secret,
            enabled: true
        };

        cfg.platforms.push(newPlatform);
        this.write(cfg);

        return newPlatform;
    }

    public updatePlatform(
        nanoid: string,
        patch: Partial<Omit<PlatformConfig, "nanoid">>
    ): void {
        const cfg: AppConfigData = this.read();
        const target = cfg.platforms.find(p => p.nanoid === nanoid);

        if (!target) return;

        Object.assign(target, patch);
        this.write(cfg);
    }

    /** 快捷启用 */
    public enablePlatform(nanoid: string): void {
        this.updatePlatform(nanoid, { enabled: true });
    }

    /** 快捷禁用 */
    public disablePlatform(nanoid: string): void {
        this.updatePlatform(nanoid, { enabled: false });
    }

    public removePlatform(nanoid: string): void {
        const cfg: AppConfigData = this.read();
        cfg.platforms = cfg.platforms.filter(p => p.nanoid !== nanoid);
        this.write(cfg);
    }
}
