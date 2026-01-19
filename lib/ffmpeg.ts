export type FFmpegStatus = "idle" | "loading" | "success" | "error";

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

  public onProgress(cb: (progress: number) => void): () => void {
    this.progressListeners.add(cb);
    cb(this.progress);
    return () => this.progressListeners.delete(cb);
  }

  public getSnapshot(): { status: FFmpegStatus; progress: number; loaded: boolean } {
    return { status: this.status, progress: this.progress, loaded: this.loaded };
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
        this.toBlobURL = util.toBlobURL;

        this.ffmpeg.on("progress", ({ progress }) => {
          const value = Math.min(100, Math.round(progress * 100));
          this.progress = value;
          this.emitProgress(value);
        });

        const cdnBases = [
          "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
          "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm",
        ] as const;

        let lastError: unknown = null;
        for (const baseURL of cdnBases) {
          try {
            await this.ffmpeg.load({
              coreURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
              wasmURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
            lastError = null;
            break;
          } catch (err) {
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
