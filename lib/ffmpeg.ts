export type FFmpegStatus = "idle" | "loading" | "success" | "error";

export const FFMPEG_CORE_CACHE_NAME = "mcsd_ffmpeg_core_cache_v1";
export const FFMPEG_PREFERRED_CDN_KEY = "mcsd_ffmpeg_preferred_cdn_v1";
export const FFMPEG_PREFERRED_CDN_LOCK_KEY = "mcsd_ffmpeg_preferred_cdn_lock_v1";
export const FFMPEG_CDN_BASES = [
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd",
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd",
] as const;

export class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: import("@ffmpeg/ffmpeg").FFmpeg | null = null;
  private fetchFile: ((file: File | Blob) => Promise<Uint8Array>) | null = null;
  private toBlobURL:
    | ((url: string, mimeType: string) => Promise<string>)
    | null = null;
  private loaded = false;
  private status: FFmpegStatus = "idle";
  private progress = 0;
  private loadTask: Promise<void> | null = null;
  private preferredCdnOverride: (typeof FFMPEG_CDN_BASES)[number] | null = null;
  private preferredCdnLocked: boolean | null = null;
  private statusListeners = new Set<(status: FFmpegStatus) => void>();
  private progressListeners = new Set<(progress: number) => void>();

  private constructor() {
    void 0;
  }

  public static getInstance(): FFmpegService {
    if (!this.instance) {
      this.instance = new FFmpegService();
    }
    return this.instance;
  }

  private setStatus(status: FFmpegStatus): void {
    this.status = status;
    this.emitStatus(status);
  }

  private emitStatus(status: FFmpegStatus): void {
    for (const cb of this.statusListeners) cb(status);
  }

  private emitProgress(progress: number): void {
    for (const cb of this.progressListeners) cb(progress);
  }

  public onStatus(cb: (status: FFmpegStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public onProgress(
    cb: (progress: number) => void,
    options?: {
      immediate?: boolean;
    }
  ): () => void {
    this.progressListeners.add(cb);
    if (options?.immediate !== false) cb(this.progress);
    return () => this.progressListeners.delete(cb);
  }

  public getSnapshot(): { status: FFmpegStatus; progress: number; loaded: boolean } {
    return { status: this.status, progress: this.progress, loaded: this.loaded };
  }

  public setPreferredCdn(baseURL: (typeof FFMPEG_CDN_BASES)[number], options?: { lock?: boolean }): void {
    this.preferredCdnOverride = baseURL;
    if (typeof options?.lock === "boolean") {
      this.preferredCdnLocked = options.lock;
      try {
        localStorage.setItem(FFMPEG_PREFERRED_CDN_LOCK_KEY, options.lock ? "1" : "0");
      } catch {
        void 0;
      }
    }
    try {
      localStorage.setItem(FFMPEG_PREFERRED_CDN_KEY, baseURL);
    } catch {
      void 0;
    }
  }

  public setPreferredCdnLock(locked: boolean): void {
    this.preferredCdnLocked = locked;
    try {
      localStorage.setItem(FFMPEG_PREFERRED_CDN_LOCK_KEY, locked ? "1" : "0");
    } catch {
      void 0;
    }
  }

  public async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadTask) return this.loadTask;

    this.loadTask = (async () => {
      this.setStatus("loading");

      if (typeof window === "undefined") {
        this.setStatus("error");
        throw new Error("ffmpeg.wasm does not support nodejs");
      }

      try {
        const [{ FFmpeg }, util] = await Promise.all([
          import("@ffmpeg/ffmpeg"),
          import("@ffmpeg/util"),
        ]);

        this.ffmpeg = new FFmpeg();
        this.fetchFile = util.fetchFile;
        this.toBlobURL = async (url: string, mimeType: string) => {
          if (typeof caches === "undefined") return util.toBlobURL(url, mimeType);
          if (mimeType !== "text/javascript" && mimeType !== "application/javascript") return util.toBlobURL(url, mimeType);

          const cache = await caches.open(FFMPEG_CORE_CACHE_NAME);
          const cached = await cache.match(url);
          const response = cached ?? (await fetch(url, { cache: "force-cache" }));
          if (!response.ok) throw new Error(`ffmpeg core fetch failed: ${response.status} ${response.statusText}`);
          if (!cached) await cache.put(url, response.clone());

          const buffer = await response.arrayBuffer();
          const blob = new Blob([buffer], { type: mimeType });
          return URL.createObjectURL(blob);
        };

        this.ffmpeg.on("progress", ({ progress }) => {
          const value = Math.min(100, Math.round(progress * 100));
          this.progress = value;
          this.emitProgress(value);
        });

        const preferredBase = (() => {
          try {
            const value = localStorage.getItem(FFMPEG_PREFERRED_CDN_KEY);
            return FFMPEG_CDN_BASES.includes(value as (typeof FFMPEG_CDN_BASES)[number])
              ? (value as (typeof FFMPEG_CDN_BASES)[number])
              : null;
          } catch {
            return null;
          }
        })();

        const preferredLocked = (() => {
          if (typeof this.preferredCdnLocked === "boolean") return this.preferredCdnLocked;
          try {
            return localStorage.getItem(FFMPEG_PREFERRED_CDN_LOCK_KEY) === "1";
          } catch {
            return false;
          }
        })();

        const baseCandidates = (() => {
          const override = this.preferredCdnOverride;
          const first =
            override && FFMPEG_CDN_BASES.includes(override as (typeof FFMPEG_CDN_BASES)[number]) ? override : preferredBase;
          if (!first) return [...FFMPEG_CDN_BASES];
          return preferredLocked ? [first] : [first, ...FFMPEG_CDN_BASES.filter((v) => v !== first)];
        })();

        const getCachedWasmBlobURL = async (url: string): Promise<string | null> => {
          if (typeof caches === "undefined") return null;
          try {
            const cache = await caches.open(FFMPEG_CORE_CACHE_NAME);
            const cached = await cache.match(url);
            if (!cached || !cached.ok) return null;
            const buffer = await cached.arrayBuffer();
            const blob = new Blob([buffer], { type: "application/wasm" });
            return URL.createObjectURL(blob);
          } catch {
            return null;
          }
        };

        let lastError: unknown = null;
        for (const baseURL of baseCandidates) {
          try {
            const coreURL = await this.toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
            const wasmURL = `${baseURL}/ffmpeg-core.wasm`;
            await this.ffmpeg.load({
              coreURL,
              wasmURL,
            });
            try {
              localStorage.setItem(FFMPEG_PREFERRED_CDN_KEY, baseURL);
            } catch {
              void 0;
            }
            lastError = null;
            break;
          } catch (err) {
            try {
              const cachedWasmURL = await getCachedWasmBlobURL(`${baseURL}/ffmpeg-core.wasm`);
              if (cachedWasmURL) {
                const coreURL = await this.toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
                await this.ffmpeg.load({
                  coreURL,
                  wasmURL: cachedWasmURL,
                });
                try {
                  localStorage.setItem(FFMPEG_PREFERRED_CDN_KEY, baseURL);
                } catch {
                  void 0;
                }
                lastError = null;
                break;
              }
            } catch {
              void 0;
            }
            lastError = err;
          }
        }

        if (lastError) {
          throw lastError;
        }

        this.loaded = true;
        this.setStatus("idle");
      } catch (error) {
        this.setStatus("error");
        throw error;
      } finally {
        this.loadTask = null;
      }
    })();

    return this.loadTask;
  }

  public async toOGG(
    file: File | Blob,
    options?: {
      sampleRate?: number;
      channels?: number;
    }
  ): Promise<{ blob: Blob; url: string }> {
    this.progress = 0;
    this.emitProgress(0);
    this.setStatus("loading");

    await this.load();

    if (!this.ffmpeg || !this.fetchFile) {
      this.setStatus("error");
      throw new Error("ffmpeg not initialized");
    }

    const inputName = "input";
    const outputName = "output.ogg";

    await this.ffmpeg.writeFile(inputName, await this.fetchFile(file));
    await this.ffmpeg.exec([
      "-i",
      inputName,
      "-vn",
      "-acodec",
      "libvorbis",
      "-ar",
      String(options?.sampleRate ?? 44100),
      "-ac",
      String(options?.channels ?? 2),
      outputName,
    ]);

    const data = await this.ffmpeg.readFile(outputName);
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const blob = new Blob([arrayBuffer], { type: "audio/ogg" });
    const url = URL.createObjectURL(blob);

    await this.ffmpeg.deleteFile(inputName);
    await this.ffmpeg.deleteFile(outputName);

    this.emitProgress(100);
    this.setStatus("success");

    return { blob, url };
  }
}

const ffmpeg = FFmpegService.getInstance();
export default ffmpeg;
