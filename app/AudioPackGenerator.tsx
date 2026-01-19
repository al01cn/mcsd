"use client";

import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ArrowRight,
  AlertCircle,
  Check,
  ChevronDown,
  Download,
  Edit2,
  Loader2,
  File as FileIcon,
  Folder,
  Image as ImageIcon,
  Music,
  Package,
  Play,
  Plus,
  Trash2,
  UploadCloud,
} from "lucide-react";
import Image from "next/image";
import { pinyin } from "pinyin-pro";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ffmpeg from "../lib/ffmpeg";

type PackPlatform = "java" | "bedrock";

type Step = 1 | 2 | 3 | 4;

type FileItem = {
  id: string;
  originalFile: File;
  originalName: string;
  newName: string;
  status: "pending" | "processing" | "done" | "error";
  vanillaEvent: string;
  processedBlob: Blob | null;
};

type PackMeta = {
  name: string;
  key: string;
  desc: string;
  platform: PackPlatform;
  iconFile: File | null;
  iconPreviewUrl: string | null;
  modifyVanilla: boolean;
};

const DEFAULT_KEY = "mcsd";

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeKey(input: string) {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned.length ? cleaned.slice(0, 5) : DEFAULT_KEY;
}

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text);
}

function processFileName(name: string) {
  const base = name.trim();
  if (!base) return "sound";

  if (isChinese(base)) {
    const arr = pinyin(base, {
      pattern: "first",
      toneType: "none",
      type: "array",
    }) as string[];
    const res = arr.join("").toLowerCase().replace(/[^a-z0-9]/g, "");
    return clampText(res || "sound", 8);
  }

  if (/[ _-]/.test(base)) {
    const parts = base.split(/[\s_-]+/).filter(Boolean);
    const res = parts.map((p) => p[0] ?? "").join("").toLowerCase();
    return clampText(res || "sound", 8);
  }

  const res = base.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return clampText(res || "sound", 8);
}

function ensureUniqueName(base: string, existing: Set<string>) {
  const normalizedBase = clampText(base || "sound", 8);
  if (!existing.has(normalizedBase)) return normalizedBase;

  let counter = 1;
  while (counter < 1000) {
    const suffix = String(counter);
    const baseLen = Math.max(1, 8 - suffix.length);
    const candidate = `${normalizedBase.slice(0, baseLen)}${suffix}`;
    if (!existing.has(candidate)) return candidate;
    counter += 1;
  }

  return `${normalizedBase.slice(0, 6)}${Math.random().toString(16).slice(2, 4)}`;
}

function readFileAsArrayBuffer(file: File) {
  return file.arrayBuffer();
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
}

async function getImageNaturalSize(file: File): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadHtmlImage(url);
    return { width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getIconCropBaseScale(img: HTMLImageElement | null, size: number) {
  if (!img) return 1;
  return Math.max(size / img.naturalWidth, size / img.naturalHeight);
}

function clampIconCropOffset(
  next: { x: number; y: number },
  img: HTMLImageElement | null,
  size: number,
  zoom: number
) {
  if (!img) return next;
  const base = getIconCropBaseScale(img, size);
  const scale = base * zoom;
  const imageHalfW = (img.naturalWidth * scale) / 2;
  const imageHalfH = (img.naturalHeight * scale) / 2;
  const boxHalf = size / 2;

  const minX = boxHalf - imageHalfW;
  const maxX = imageHalfW - boxHalf;
  const minY = boxHalf - imageHalfH;
  const maxY = imageHalfH - boxHalf;

  return {
    x: clampNumber(next.x, minX, maxX),
    y: clampNumber(next.y, minY, maxY),
  };
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function buildJavaSoundsJson(
  key: string,
  files: Array<Pick<FileItem, "newName" | "vanillaEvent">>,
  modifyVanilla: boolean
) {
  const soundsJson: Record<string, unknown> = {};
  for (const f of files) {
    const soundPath = `${key}/${f.newName}`;
    if (modifyVanilla && f.vanillaEvent) {
      soundsJson[f.vanillaEvent] = {
        replace: true,
        sounds: [{ name: `minecraft:${soundPath}`, stream: true }],
      };
    } else {
      const customKey = `${key}_${f.newName}`;
      soundsJson[customKey] = {
        sounds: [{ name: `minecraft:${soundPath}`, stream: true }],
      };
    }
  }
  return soundsJson;
}

function buildBedrockSoundDefinitions(files: Array<Pick<FileItem, "newName">>) {
  const definitions: Record<string, unknown> = {
    format_version: "1.14.0",
    sound_definitions: {},
  };

  const soundDefinitions = definitions.sound_definitions as Record<
    string,
    { category: string; sounds: string[] }
  >;

  for (const f of files) {
    soundDefinitions[`custom.${f.newName}`] = {
      category: "neutral",
      sounds: [`sounds/custom/${f.newName}`],
    };
  }

  return definitions;
}

function StepIndicator({
  index,
  active,
  completed,
  title,
  desc,
}: {
  index: number;
  active: boolean;
  completed: boolean;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={[
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-extrabold transition",
          active
            ? "border-sky-400 bg-sky-400 text-white shadow-[0_0_0_4px_rgba(224,242,254,1)]"
            : completed
              ? "border-emerald-400 bg-emerald-400 text-white"
              : "border-slate-200 bg-slate-50 text-slate-500",
        ].join(" ")}
      >
        {completed ? <Check className="h-4 w-4" /> : index}
      </div>
      <div>
        <div className="font-bold text-slate-700">{title}</div>
        <div className="text-xs text-slate-400">{desc}</div>
      </div>
    </div>
  );
}

function FfmpegInlineStatus({
  loaded,
  giveUp,
  retryCount,
  maxRetries,
}: {
  loaded: boolean;
  giveUp: boolean;
  retryCount: number;
  maxRetries: number;
}) {
  const view = (() => {
    if (loaded) {
      return {
        label: "已就绪",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        showSpinner: false,
      };
    }
    if (giveUp) {
      return {
        label: "加载失败",
        className: "border-red-200 bg-red-50 text-red-700",
        dot: "bg-red-500",
        showSpinner: false,
      };
    }
    if (retryCount > 0) {
      return {
        label: `重试中（${retryCount}/${maxRetries}）`,
        className: "border-sky-200 bg-sky-50 text-sky-700",
        dot: "bg-sky-500",
        showSpinner: true,
      };
    }
    return {
      label: "加载中",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      dot: "bg-slate-500",
      showSpinner: true,
    };
  })();

  return (
    <div
      className={[
        "inline-flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-xs font-bold",
        view.className,
      ].join(" ")}
    >
      <span className={["h-2 w-2 shrink-0 rounded-full", view.dot].join(" ")} />
      <span className="shrink-0">FFmpeg</span>
      <span className="text-slate-400">·</span>
      <span className="break-words text-right">{view.label}</span>
      {view.showSpinner ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : null}
    </div>
  );
}

function FfmpegBlockingOverlay({
  stage,
  retryCount,
  maxRetries,
}: {
  stage: "loading" | "failed";
  retryCount: number;
  maxRetries: number;
}) {
  const isError = stage === "failed";
  const title = isError ? "转换器加载失败" : "正在加载音频转换器";
  const desc = isError
    ? `已重试 ${maxRetries} 次仍失败，请刷新页面后再试。`
    : "首次加载FFmpeg较慢，请耐心等待，期间将暂时禁止操作。";
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    lastActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      lastActiveRef.current?.focus?.();
    };
  }, []);

  const onKeyDownCapture = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) {
      e.preventDefault();
      return;
    }

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);

    if (focusables.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === dialog) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
      onKeyDownCapture={onKeyDownCapture}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-full",
              isError ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600",
            ].join(" ")}
          >
            {isError ? <AlertCircle className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
          </div>
          <div className="min-w-0">
            <div className="wrap-break-word text-base font-extrabold text-slate-800">{title}</div>
            <div className="text-sm text-slate-500">{desc}</div>
          </div>
        </div>

        {!isError && retryCount > 0 ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            重试中（{Math.min(maxRetries, Math.max(1, retryCount))}/{maxRetries}）
          </div>
        ) : null}

        {isError ? (
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => location.reload()}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              刷新页面
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function IconPreview({
  iconPreviewUrl,
  onPick,
}: {
  iconPreviewUrl: string | null;
  onPick: (file: File | null) => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex justify-center">
      <div className="group relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={[
            "relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition",
            iconPreviewUrl
              ? "border-slate-200 bg-white"
              : "border-slate-300 bg-slate-50 text-slate-400 hover:border-sky-400 hover:text-sky-500",
          ].join(" ")}
        >
          {iconPreviewUrl ? (
            <Image
              src={iconPreviewUrl}
              alt="pack icon"
              fill
              sizes="128px"
              className="object-cover"
              unoptimized
              priority
            />
          ) : (
            <div className="flex flex-col items-center">
              <ImageIcon className="mb-2 h-8 w-8" />
              <span className="text-xs font-bold">上传封面</span>
            </div>
          )}
          <span className="pointer-events-none absolute -bottom-2 -right-2 hidden rounded-full bg-sky-400 p-1.5 text-white shadow-md transition group-hover:block">
            <Edit2 className="h-3 w-3" />
          </span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="hidden"
          onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
        />
      </div>
    </div>
  );
}

function IconCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const imageUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [boxSize, setBoxSize] = useState<number>(256);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [outputSize, setOutputSize] = useState<number>(256);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const zoomRef = useRef<number>(zoom);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const img = await loadHtmlImage(imageUrl);
        if (cancelled) return;
        setImage(img);
        setStatus("ready");
      } catch {
        if (cancelled) return;
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    imageRef.current = image;
  }, [image]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const apply = () => {
      const next = Math.round(el.getBoundingClientRect().width);
      if (next <= 0) return;
      const img = imageRef.current;
      const currentZoom = zoomRef.current;
      setBoxSize(next);
      setOffset((prev) => clampIconCropOffset(prev, img, next, currentZoom));
    };
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => apply());
      ro.observe(el);
      return () => ro.disconnect();
    }
    globalThis.addEventListener("resize", apply);
    return () => globalThis.removeEventListener("resize", apply);
  }, []);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (status !== "ready") return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    if (e.pointerId !== dragRef.current.pointerId) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clampIconCropOffset(
        { x: dragRef.current.startOffsetX + dx, y: dragRef.current.startOffsetY + dy },
        image,
        boxSize,
        zoom
      )
    );
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    if (!dragRef.current) return;
    if (e.pointerId !== dragRef.current.pointerId) return;
    dragRef.current = null;
  };

  const onKeyDownCapture = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }

    if (e.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) {
      e.preventDefault();
      return;
    }

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0);

    if (focusables.length === 0) {
      e.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first || active === dialog) {
        e.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const confirm = async () => {
    if (!image) return;
    const base = getIconCropBaseScale(image, boxSize);
    const scale = base * zoom;

    const imgW = image.naturalWidth * scale;
    const imgH = image.naturalHeight * scale;
    const imageLeft = boxSize / 2 + offset.x - imgW / 2;
    const imageTop = boxSize / 2 + offset.y - imgH / 2;

    const sx = (0 - imageLeft) / scale;
    const sy = (0 - imageTop) / scale;
    const sWidth = boxSize / scale;
    const sHeight = boxSize / scale;

    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/png");
    });
    if (!blob) return;

    onConfirm(new File([blob], "pack.png", { type: "image/png" }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onKeyDownCapture={onKeyDownCapture}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl outline-none md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-lg font-extrabold text-slate-800">裁剪封面</div>
            <div className="mt-1 text-sm text-slate-500">需要 1:1，尺寸 64–256px（PNG）。</div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            取消
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="flex flex-col items-center">
            <div
              ref={containerRef}
              className="relative aspect-square w-full max-w-[22rem] overflow-hidden rounded-2xl bg-slate-100"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {status === "ready" && imageUrl && image ? (
                <Image
                  src={imageUrl}
                  alt="crop source"
                  width={image.naturalWidth}
                  height={image.naturalHeight}
                  unoptimized
                  priority
                  className="absolute left-1/2 top-1/2 select-none"
                  draggable={false}
                  style={{
                    transform: (() => {
                      const base = getIconCropBaseScale(image, boxSize);
                      const scale = base * zoom;
                      return `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`;
                    })(),
                    transformOrigin: "center",
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm font-bold text-slate-400">
                  {status === "error" ? "图片加载失败" : "加载中..."}
                </div>
              )}

              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-200" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-extrabold text-slate-700">缩放</div>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const nextZoom = Number(e.target.value);
                  setZoom(nextZoom);
                  setOffset((prev) => clampIconCropOffset(prev, image, boxSize, nextZoom));
                }}
                className="mt-3 w-full"
                disabled={status !== "ready"}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-extrabold text-slate-700">导出尺寸</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[64, 128, 256].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setOutputSize(s)}
                    className={[
                      "rounded-xl px-3 py-2 text-sm font-bold transition",
                      outputSize === s
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-600 hover:bg-slate-100",
                    ].join(" ")}
                    disabled={status !== "ready"}
                  >
                    {s}×{s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={status !== "ready"}
                className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                使用该封面
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return <div className="h-2 bg-gradient-to-r from-sky-400 via-sky-300 to-sky-500" />;
}

function Sidebar({ step }: { step: Step }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col space-y-8 md:flex">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-500 text-white shadow-lg">
          <Music className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800">MC AudioGen</h1>
          <p className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-400">
            v1.1
          </p>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 pl-2">
        <div className="absolute bottom-4 left-[27px] top-4 w-0.5 bg-slate-100" />

        <StepIndicator
          index={1}
          active={step === 1}
          completed={step > 1}
          title="基本信息"
          desc="设置包名与版本"
        />
        <StepIndicator
          index={2}
          active={step === 2}
          completed={step > 2}
          title="导入音频"
          desc="处理与重命名"
        />
        <StepIndicator
          index={3}
          active={step === 3}
          completed={step > 3}
          title="格式转换"
          desc="转为 OGG 格式"
        />
        <StepIndicator
          index={4}
          active={step === 4}
          completed={false}
          title="打包下载"
          desc="生成资源包"
        />
      </div>
    </aside>
  );
}

const VANILLA_EVENTS = [
  "ambient.cave",
  "block.anvil.land",
  "block.chest.open",
  "block.door.toggle",
  "block.glass.break",
  "block.grass.step",
  "block.stone.break",
  "entity.creeper.primed",
  "entity.generic.explode",
  "entity.player.hurt",
  "entity.player.levelup",
  "entity.zombie.ambient",
  "item.totem.use",
  "ui.button.click",
  "weather.rain",
  "music.game",
  "music.menu",
] as const;

export default function AudioPackGenerator() {
  const [step, setStep] = useState<Step>(1);
  const [files, setFiles] = useState<FileItem[]>([]);
  const snapshot = ffmpeg.getSnapshot();
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(snapshot.loaded);
  const [ffmpegRetryCount, setFfmpegRetryCount] = useState<number>(0);
  const [ffmpegGiveUp, setFfmpegGiveUp] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [meta, setMeta] = useState<PackMeta>({
    name: "",
    key: DEFAULT_KEY,
    desc: "",
    platform: "java",
    iconFile: null,
    iconPreviewUrl: null,
    modifyVanilla: false,
  });
  const [iconCropFile, setIconCropFile] = useState<File | null>(null);

  const [processing, setProcessing] = useState<{
    title: string;
    desc: string;
    currentFile: string;
    percent: number;
    error: string | null;
  }>({
    title: "正在准备转换器...",
    desc: "首次使用会下载转换组件，请耐心等待。",
    currentFile: "Waiting to start...",
    percent: 0,
    error: null,
  });

  const nameCount = meta.name.length;
  const descCount = meta.desc.length;

  const fileCount = files.length;
  const canStartProcess = fileCount > 0;

  useEffect(() => {
    if (meta.platform !== "java" && meta.modifyVanilla) {
      setMeta((prev) => ({ ...prev, modifyVanilla: false }));
    }
  }, [meta.platform, meta.modifyVanilla]);

  useEffect(() => {
    if (!meta.iconFile) {
      setMeta((prev) => {
        if (prev.iconPreviewUrl) URL.revokeObjectURL(prev.iconPreviewUrl);
        return { ...prev, iconPreviewUrl: null };
      });
      return;
    }

    const url = URL.createObjectURL(meta.iconFile);
    setMeta((prev) => {
      if (prev.iconPreviewUrl) URL.revokeObjectURL(prev.iconPreviewUrl);
      return { ...prev, iconPreviewUrl: url };
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [meta.iconFile]);

  useEffect(() => {
    let cancelled = false;
    const maxRetries = 3;

    const runRetry = async (retryCount: number) => {
      setFfmpegRetryCount(retryCount);
      try {
        await ffmpeg.load();
        if (cancelled) return;
        setFfmpegGiveUp(false);
      } catch {
        if (cancelled) return;
        if (retryCount < maxRetries) {
          const delay = 800 * retryCount;
          window.setTimeout(() => {
            if (cancelled) return;
            void runRetry(retryCount + 1);
          }, delay);
          return;
        }
        setFfmpegGiveUp(true);
      }
    };

    const runInitial = async () => {
      setFfmpegRetryCount(0);
      try {
        await ffmpeg.load();
        if (cancelled) return;
        setFfmpegGiveUp(false);
      } catch {
        if (cancelled) return;
        window.setTimeout(() => {
          if (cancelled) return;
          void runRetry(1);
        }, 600);
      }
    };

    void runInitial();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const offStatus = ffmpeg.onStatus(() => {
      setFfmpegLoaded(ffmpeg.getSnapshot().loaded);
    });
    return () => {
      offStatus();
    };
  }, []);

  const overlayActive = !ffmpegLoaded || Boolean(iconCropFile);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const inertEl = el as HTMLElement & { inert?: boolean };
    inertEl.inert = overlayActive;
    return () => {
      inertEl.inert = false;
    };
  }, [overlayActive]);

  const resetAll = () => {
    setStep(1);
    setFiles([]);
    setIconCropFile(null);
    setMeta({
      name: "",
      key: DEFAULT_KEY,
      desc: "",
      platform: "java",
      iconFile: null,
      iconPreviewUrl: null,
      modifyVanilla: false,
    });
    setProcessing({
      title: "正在准备转换器...",
      desc: "首次使用会下载转换组件，请耐心等待。",
      currentFile: "Waiting to start...",
      percent: 0,
      error: null,
    });
  };

  const onPickIcon = async (file: File | null) => {
    if (!file) {
      setMeta((prev) => ({ ...prev, iconFile: null }));
      return;
    }

    try {
      const { width, height } = await getImageNaturalSize(file);
      const isSquare = width === height;
      const within = width >= 64 && height >= 64 && width <= 256 && height <= 256;
      if (isSquare && within) {
        setMeta((prev) => ({ ...prev, iconFile: file }));
        return;
      }
      setIconCropFile(file);
    } catch {
      alert("图片读取失败，请重新选择 PNG 图片。");
    }
  };

  const onAddFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;

    setFiles((prev) => {
      const next = [...prev];
      const used = new Set(next.map((f) => f.newName));

      for (const file of Array.from(list)) {
        if (!file.type.startsWith("audio/")) continue;
        const dot = file.name.lastIndexOf(".");
        const originalBase = dot > 0 ? file.name.slice(0, dot) : file.name;
        const base = processFileName(originalBase);
        const unique = ensureUniqueName(base, used);
        used.add(unique);

        next.push({
          id: buildId(),
          originalFile: file,
          originalName: file.name,
          newName: unique,
          status: "pending",
          vanillaEvent: "",
          processedBlob: null,
        });
      }

      return next;
    });
  };

  const onRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onUpdateVanillaEvent = (id: string, value: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, vanillaEvent: value } : f)));
  };

  const goToStep = (target: Step) => {
    if (target === 2) {
      if (!meta.name.trim()) {
        alert("请输入音频包名称");
        return;
      }
    }

    if (target === 3 && meta.modifyVanilla) {
      if (files.length === 0) {
        alert("请先添加音频文件");
        return;
      }
      if (files.some((f) => !f.vanillaEvent.trim())) {
        alert("请为所有文件选择替换的原版事件，或删除不需要的文件。");
        return;
      }
    }

    setStep(target);
  };

  const startProcessing = async () => {
    goToStep(3);

    const total = files.length;
    if (total === 0) return;

    setProcessing({
      title: "正在加载转换器...",
      desc: "首次加载需要下载 wasm 资源，后续会更快。",
      currentFile: "Loading...",
      percent: 0,
      error: null,
    });

    try {
      await ffmpeg.load();
    } catch {
      setProcessing((prev) => ({
        ...prev,
        title: "转换器加载失败",
        desc: "请检查网络或刷新页面后重试。",
        error: "FFmpeg load failed",
      }));
      return;
    }

    setProcessing({
      title: "正在转换格式...",
      desc: "正在将音频统一转码为 Minecraft 支持的 OGG (Vorbis)。",
      currentFile: "Starting...",
      percent: 0,
      error: null,
    });

    const results: Record<string, Blob> = {};

    for (let i = 0; i < total; i += 1) {
      const item = files[i];
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "processing" } : f))
      );

      setProcessing((prev) => ({
        ...prev,
        currentFile: `Processing: ${item.originalName}`,
      }));

      const unsubscribe = ffmpeg.onProgress((p) => {
        const overall = Math.min(100, Math.round(((i + p / 100) / total) * 100));
        setProcessing((prev) => ({ ...prev, percent: overall }));
      });

      try {
        const converted = await ffmpeg.toOGG(item.originalFile, { sampleRate: 44100, channels: 2 });
        results[item.id] = converted.blob;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "done", processedBlob: converted.blob } : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error" } : f))
        );
        setProcessing((prev) => ({
          ...prev,
          title: "转换失败",
          desc: "请尝试更换音频文件或刷新后重试。",
          error: err instanceof Error ? err.message : "convert failed",
        }));
        unsubscribe();
        return;
      } finally {
        unsubscribe();
      }
    }

    setProcessing((prev) => ({
      ...prev,
      title: "生成配置文件...",
      desc: "正在生成 sounds.json 与资源包元数据。",
      currentFile: "All files processed!",
      percent: 100,
    }));

    setFiles((prev) => prev.map((f) => ({ ...f, processedBlob: results[f.id] ?? f.processedBlob })));
    goToStep(4);
  };

  const buildPackPreview = () => {
    if (meta.platform === "java") {
      return [
        { icon: <FileIcon className="h-3 w-3" />, text: "pack.mcmeta" },
        { icon: <ImageIcon className="h-3 w-3" />, text: "pack.png" },
        { icon: <FileIcon className="h-3 w-3" />, text: "assets/minecraft/sounds.json" },
        { icon: <Folder className="h-3 w-3" />, text: `assets/minecraft/sounds/${meta.key}/...` },
      ];
    }

    return [
      { icon: <FileIcon className="h-3 w-3" />, text: "manifest.json" },
      { icon: <ImageIcon className="h-3 w-3" />, text: "pack_icon.png" },
      { icon: <FileIcon className="h-3 w-3" />, text: "sounds/sound_definitions.json" },
      { icon: <Folder className="h-3 w-3" />, text: "sounds/custom/..." },
    ];
  };

  const downloadPack = async () => {
    const zip = new JSZip();
    const safeName = meta.name.trim() || "SoundPack";

    const readyFiles = files.filter((f) => f.processedBlob && f.status === "done");
    if (readyFiles.length !== files.length) {
      alert("存在未成功转换的文件，请重新处理后再下载。");
      return;
    }

    if (meta.platform === "java") {
      const mcmeta = {
        pack: {
          pack_format: 15,
          description: meta.desc.trim() || "Generated by MC AudioGen",
        },
      };
      zip.file("pack.mcmeta", JSON.stringify(mcmeta, null, 2));

      if (meta.iconFile) {
        const iconBuffer = await readFileAsArrayBuffer(meta.iconFile);
        zip.file("pack.png", iconBuffer);
      }

      const key = normalizeKey(meta.key);
      const soundFolder = zip.folder("assets")?.folder("minecraft")?.folder("sounds")?.folder(key);
      if (!soundFolder) throw new Error("zip folder init failed");

      for (const f of readyFiles) {
        soundFolder.file(`${f.newName}.ogg`, f.processedBlob as Blob);
      }

      const soundsJson = buildJavaSoundsJson(
        key,
        readyFiles.map((f) => ({ newName: f.newName, vanillaEvent: f.vanillaEvent })),
        meta.modifyVanilla
      );

      zip
        .folder("assets")
        ?.folder("minecraft")
        ?.file("sounds.json", JSON.stringify(soundsJson, null, 2));
    } else {
      const uuid1 = uuid();
      const uuid2 = uuid();
      const manifest = {
        format_version: 2,
        header: {
          name: safeName,
          description: meta.desc.trim() || "",
          uuid: uuid1,
          version: [1, 0, 0],
          min_engine_version: [1, 16, 0],
        },
        modules: [
          {
            type: "resources",
            uuid: uuid2,
            version: [1, 0, 0],
          },
        ],
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      if (meta.iconFile) {
        const iconBuffer = await readFileAsArrayBuffer(meta.iconFile);
        zip.file("pack_icon.png", iconBuffer);
      }

      const soundFolder = zip.folder("sounds")?.folder("custom");
      if (!soundFolder) throw new Error("zip folder init failed");
      for (const f of readyFiles) {
        soundFolder.file(`${f.newName}.ogg`, f.processedBlob as Blob);
      }

      const definitions = buildBedrockSoundDefinitions(readyFiles.map((f) => ({ newName: f.newName })));
      zip
        .folder("sounds")
        ?.file("sound_definitions.json", JSON.stringify(definitions, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${safeName}.zip`);
  };

  return (
    <div className="h-dvh overflow-hidden bg-slate-50 text-slate-900">
      {!ffmpegLoaded ? (
        <FfmpegBlockingOverlay
          stage={ffmpegGiveUp ? "failed" : "loading"}
          retryCount={ffmpegRetryCount}
          maxRetries={3}
        />
      ) : null}
      {iconCropFile ? (
        <IconCropModal
          key={`${iconCropFile.name}-${iconCropFile.size}-${iconCropFile.lastModified}`}
          file={iconCropFile}
          onCancel={() => setIconCropFile(null)}
          onConfirm={(file) => {
            setIconCropFile(null);
            setMeta((prev) => ({ ...prev, iconFile: file }));
          }}
        />
      ) : null}
      <div
        ref={contentRef}
        aria-hidden={overlayActive}
        className="mx-auto flex h-full max-w-6xl gap-8 p-4 md:p-8"
      >
        <Sidebar step={step} />

        <main className="relative flex h-full flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TopBar />

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="mb-4 flex justify-end">
              <FfmpegInlineStatus
                loaded={ffmpegLoaded}
                giveUp={ffmpegGiveUp}
                retryCount={ffmpegRetryCount}
                maxRetries={3}
              />
            </div>
            {step === 1 ? (
              <div className="mx-auto max-w-xl">
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-2xl font-extrabold text-slate-800">创建新的音频包</h2>
                  <p className="text-slate-500">填写资源包的基本元数据。</p>
                </div>

                <div className="space-y-6">
                  <IconPreview iconPreviewUrl={meta.iconPreviewUrl} onPick={onPickIcon} />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-600">
                        音频包名称 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-16 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          placeholder="例如：我的世界原声"
                          maxLength={6}
                          value={meta.name}
                          onChange={(e) => setMeta((prev) => ({ ...prev, name: clampText(e.target.value, 6) }))}
                          required
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {nameCount}/6
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-600">
                        主 Key (文件夹名) <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <input
                          className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-24 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          placeholder="例如：mcsd"
                          maxLength={5}
                          value={meta.key}
                          onChange={(e) =>
                            setMeta((prev) => ({
                              ...prev,
                              key: normalizeKey(e.target.value),
                            }))
                          }
                        />
                        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-400">
                          不可中文
                        </div>
                      </div>
                      <p className="ml-1 mt-1.5 text-xs text-slate-400">
                        生成的路径: assets/minecraft/sounds/
                        <span className="font-bold text-sky-500">{meta.key || DEFAULT_KEY}</span>/...
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-600">
                        游戏版本 <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <select
                          className="w-full appearance-none rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-10 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          value={meta.platform}
                          onChange={(e) =>
                            setMeta((prev) => ({
                              ...prev,
                              platform: e.target.value === "bedrock" ? "bedrock" : "java",
                            }))
                          }
                        >
                          <option value="java">Java 版</option>
                          <option value="bedrock">基岩版 (Bedrock)</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>

                    <div className="col-span-2">
                      {meta.platform === "java" ? (
                        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                          <div>
                            <div className="text-sm font-bold text-slate-700">修改原版音频? (Java 独占)</div>
                            <div className="text-xs text-slate-400">
                              开启后可替换原版声音事件，如受伤、走路等。
                            </div>
                          </div>

                          <label className="flex cursor-pointer items-center gap-3 select-none">
                            <div className="relative">
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={meta.modifyVanilla}
                                onChange={(e) => setMeta((prev) => ({ ...prev, modifyVanilla: e.target.checked }))}
                              />
                              <div className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-sky-400">
                                <div className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                              </div>
                            </div>
                          </label>
                        </div>
                      ) : null}
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-600">简介 (可选)</label>
                      <div className="relative">
                        <input
                          className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-16 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          placeholder="简短描述..."
                          maxLength={20}
                          value={meta.desc}
                          onChange={(e) => setMeta((prev) => ({ ...prev, desc: clampText(e.target.value, 20) }))}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {descCount}/20
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-6 py-3 font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 hover:bg-sky-300 md:w-auto"
                    >
                      下一步 <ArrowRight className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="flex h-full flex-col">
                <div className="mb-6 flex shrink-0 items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">添加音频文件</h2>
                    <p className="text-sm text-slate-500">
                      {meta.modifyVanilla ? "为上传的文件选择要替换的原版声音事件。" : "拖入文件，系统将自动重命名。"}
                    </p>
                  </div>

                  <div>
                    <label className="inline-flex cursor-pointer items-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:bg-sky-300">
                      <Plus className="mr-2 h-4 w-4" />
                      添加文件
                      <input
                        type="file"
                        multiple
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => onAddFiles(e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                <FileDropZone
                  modifyVanilla={meta.modifyVanilla}
                  files={files}
                  onAddFiles={onAddFiles}
                  onRemoveFile={onRemoveFile}
                  onUpdateVanillaEvent={onUpdateVanillaEvent}
                />

                <div className="mt-4 flex shrink-0 items-center justify-between border-t border-slate-100 pt-6">
                  <span className="text-sm font-bold text-slate-500">
                    已添加 <span className="text-sky-500">{fileCount}</span> 个文件
                  </span>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      disabled={!canStartProcess}
                      onClick={() => void startProcessing()}
                      className={[
                        "inline-flex items-center rounded-xl bg-sky-400 px-6 py-3 font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0",
                      ].join(" ")}
                    >
                      开始处理 <Play className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
                <div className="relative mb-6 h-20 w-20">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                  <div
                    className={[
                      "absolute inset-0 rounded-full border-4 border-sky-400 border-t-transparent",
                      processing.error ? "opacity-30" : "animate-spin",
                    ].join(" ")}
                  />
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-sky-500">
                    {processing.percent}%
                  </div>
                </div>

                <h2 className="mb-2 text-2xl font-extrabold text-slate-800">{processing.title}</h2>
                <p className="mb-8 text-slate-500">{processing.desc}</p>

                <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-sky-400 transition-all duration-300"
                    style={{ width: `${processing.percent}%` }}
                  />
                </div>

                <div className="rounded border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-400">
                  {processing.currentFile}
                </div>

                {processing.error ? (
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => goToStep(2)}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      返回修改
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 shadow-lg shadow-emerald-100">
                  <Check className="h-12 w-12" />
                </div>

                <h2 className="mb-4 text-3xl font-extrabold text-slate-800">打包完成！</h2>
                <p className="mb-8 max-w-md text-slate-500">
                  您的 Minecraft 音频资源包已准备就绪。所有文件已标准化，并生成了配置文件。
                </p>

                <div className="mb-8 w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
                  <h4 className="mb-3 flex items-center gap-2 font-bold text-slate-700">
                    <Package className="h-4 w-4 text-sky-500" />
                    包内容预览
                  </h4>
                  <ul className="space-y-2 font-mono text-sm text-slate-500">
                    {buildPackPreview().map((item) => (
                      <li key={item.text} className="flex items-center gap-2">
                        {item.icon}
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => void downloadPack()}
                  className="inline-flex items-center rounded-xl bg-sky-400 px-8 py-4 text-lg font-bold text-white shadow-xl shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-300"
                >
                  <Download className="mr-2 h-5 w-5" />
                  下载资源包 (.zip)
                </button>

                <button
                  type="button"
                  onClick={resetAll}
                  className="mt-6 text-sm font-bold text-slate-400 transition hover:text-slate-600"
                >
                  创建新的资源包
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>

      <datalist id="vanilla-events">
        {VANILLA_EVENTS.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

function FileDropZone({
  modifyVanilla,
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateVanillaEvent,
}: {
  modifyVanilla: boolean;
  files: FileItem[];
  onAddFiles: (list: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onUpdateVanillaEvent: (id: string, value: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={[
        "relative flex-1 overflow-y-auto rounded-2xl border-4 border-dashed bg-slate-50 p-4 transition",
        dragOver ? "border-sky-400 bg-sky-50" : "border-slate-200",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        onAddFiles(e.dataTransfer.files);
      }}
    >
      {files.length === 0 ? (
        <div className="pointer-events-none flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500">
            <UploadCloud className="h-8 w-8" />
          </div>
          <h3 className="font-bold text-slate-700">拖放音频文件到这里</h3>
          <p className="mt-1 text-sm text-slate-400">支持 MP3, WAV, OGG 等音频格式</p>
        </div>
      ) : (
        <div
          className={[
            "grid w-full content-start gap-4",
            modifyVanilla ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
          ].join(" ")}
        >
          {files.map((f) => (
            <div
              key={f.id}
              className={[
                "group flex items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm transition",
                "border-slate-100 hover:border-sky-400/30",
                f.status === "error" ? "border-red-200" : "",
              ].join(" ")}
            >
              {modifyVanilla ? (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs text-slate-400">已上传文件</div>
                    <div className="truncate text-sm font-bold text-slate-700" title={f.originalName}>
                      {f.originalName}
                    </div>
                  </div>

                  <div className="text-slate-300">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 text-xs text-sky-500">替换原版事件</div>
                    <input
                      list="vanilla-events"
                      placeholder="选择事件..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                      value={f.vanillaEvent}
                      onChange={(e) => onUpdateVanillaEvent(f.id, e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  <div className="mb-1 truncate text-xs text-slate-400" title={f.originalName}>
                    {f.originalName}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <ArrowRight className="h-3 w-3 text-sky-500" />
                    <span className="rounded bg-sky-50 px-1.5 font-mono text-sky-500">{f.newName}.ogg</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveFile(f.id)}
                className="rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
