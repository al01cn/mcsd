"use client";

import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ArrowRight,
  AlertCircle,
  Check,
  ChevronDown,
  Copy,
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
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ffmpeg from "../lib/ffmpeg";
import mcVersions, { type JavaPackVersion } from "../lib/mcver";
import { vanillaSoundBedrock, vanillaSoundJava } from "../lib/sounds";

type PackPlatform = "java" | "bedrock";

type Step = 1 | 2 | 3 | 4 | 5;

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
  javaPackFormat: string;
  iconFile: File | null;
  iconPreviewUrl: string | null;
  modifyVanilla: boolean;
};

const DEFAULT_KEY = "mcsd";
const NAME_MAX_LENGTH = 10;
const JAVA_DESC_MAX_LENGTH = 20;
const BEDROCK_DESC_MAX_LENGTH = 40;
const AUTO_DESC_SUFFIX = "By mcsd";

function getDescLimit(platform: PackPlatform) {
  return platform === "bedrock" ? BEDROCK_DESC_MAX_LENGTH : JAVA_DESC_MAX_LENGTH;
}

function buildPackDescription(desc: string) {
  const trimmed = desc.trim();
  return trimmed ? `${trimmed} ${AUTO_DESC_SUFFIX}` : AUTO_DESC_SUFFIX;
}

function clampDescForPlatform(desc: string, platform: PackPlatform) {
  const limit = getDescLimit(platform);
  const base = desc.trim();
  const extra = base ? 1 : 0;
  const maxBaseLen = Math.max(0, limit - AUTO_DESC_SUFFIX.length - extra);
  return clampText(base, maxBaseLen);
}

type VanillaEventOption = {
  key: string;
  category: string;
};

function buildVanillaEventOptions(keys: string[]): VanillaEventOption[] {
  return keys
    .filter(Boolean)
    .map((key) => ({ key, category: key.split(".")[0] ?? "其他" }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function extractBedrockVanillaSoundEvents(source: unknown): string[] {
  const result = new Set<string>();
  const stack: unknown[] = [source];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    if (Array.isArray(current)) {
      for (const item of current) stack.push(item);
      continue;
    }

    if (typeof current !== "object") continue;

    for (const [k, v] of Object.entries(current as Record<string, unknown>)) {
      if ((k === "sound" || k === "sounds") && typeof v === "string") {
        const trimmed = v.trim();
        if (trimmed) result.add(trimmed);
      }

      if (k === "sounds" && Array.isArray(v)) {
        for (const item of v) {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (trimmed) result.add(trimmed);
          }
        }
      }

      stack.push(v);
    }
  }

  return Array.from(result).sort((a, b) => a.localeCompare(b));
}

const JAVA_VANILLA_EVENT_OPTIONS: VanillaEventOption[] = buildVanillaEventOptions(
  Object.keys(vanillaSoundJava as Record<string, unknown>)
);
const BEDROCK_VANILLA_EVENT_OPTIONS: VanillaEventOption[] = buildVanillaEventOptions(
  extractBedrockVanillaSoundEvents(vanillaSoundBedrock)
);

function buildJavaPackFormatOptions(list: JavaPackVersion[]) {
  const map = new Map<number, string>();
  for (const item of list) {
    const parsed = Number(item.pack_format);
    if (!Number.isFinite(parsed)) continue;
    const packFormat = Math.trunc(parsed);
    if (packFormat <= 0) continue;
    map.set(packFormat, item.version);
  }
  return Array.from(map.entries())
    .map(([packFormat, version]) => ({ packFormat, version }))
    .sort((a, b) => b.packFormat - a.packFormat);
}

const JAVA_PACK_FORMAT_OPTIONS = buildJavaPackFormatOptions(mcVersions);
const DEFAULT_JAVA_PACK_FORMAT = String(JAVA_PACK_FORMAT_OPTIONS[0]?.packFormat ?? 15);

function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeKey(input: string) {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned.length ? cleaned.slice(0, 5) : DEFAULT_KEY;
}

function buildJavaPackMcmeta(packFormat: number, description: string) {
  if (packFormat >= 65) {
    return {
      pack: {
        pack_format: packFormat,
        description,
        min_format: [packFormat, 0],
        max_format: [packFormat, 0],
      },
    };
  }

  if (packFormat >= 16) {
    return {
      pack: {
        pack_format: packFormat,
        description,
        supported_formats: [packFormat, packFormat],
      },
    };
  }

  return {
    pack: {
      pack_format: packFormat,
      description,
    },
  };
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

async function resizePngToSquare(file: File, size: number): Promise<File> {
  if (file.type !== "image/png") {
    throw new Error("only png supported");
  }

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas ctx init failed");

  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    try {
      ctx.drawImage(bitmap, 0, 0, size, size);
    } finally {
      bitmap.close();
    }
  } else {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      ctx.drawImage(img, 0, 0, size, size);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) reject(new Error("canvas toBlob failed"));
      else resolve(b);
    }, "image/png");
  });

  return new File([blob], file.name, { type: "image/png", lastModified: Date.now() });
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
        sounds: [{ name: `${soundPath}`, stream: true }],
      };
    } else {
      const customKey = `${key}.${f.newName}`;
      soundsJson[customKey] = {
        sounds: [{ name: `${soundPath}`, stream: true }],
      };
    }
  }
  return soundsJson;
}

function buildBedrockSoundDefinitions(
  key: string,
  files: Array<Pick<FileItem, "newName" | "vanillaEvent">>,
  modifyVanilla: boolean
) {
  const definitions: Record<string, unknown> = {
    format_version: "1.14.0",
    sound_definitions: {},
  };

  const soundDefinitions = definitions.sound_definitions as Record<
    string,
    { category: string; sounds: string[] }
  >;

  for (const f of files) {
    const eventKey = modifyVanilla && f.vanillaEvent?.trim() ? f.vanillaEvent.trim() : `${key}.${f.newName}`;
    soundDefinitions[eventKey] = {
      category: "record",
      sounds: [`sounds/${key}/${f.newName}`],
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
        "inline-flex max-w-full flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-xl border px-3 py-2 text-[11px] font-bold sm:text-xs",
        view.className,
      ].join(" ")}
    >
      <span className={["h-2 w-2 shrink-0 rounded-full", view.dot].join(" ")} />
      <span className="shrink-0">FFmpeg</span>
      <span className="text-slate-400">·</span>
      <span className="wrap-break-word text-right">{view.label}</span>
      {view.showSpinner ? (
        <Loader2 className="hidden h-3.5 w-3.5 shrink-0 animate-spin md:inline-block" />
      ) : null}
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
        {iconPreviewUrl ? (
          <button
            type="button"
            aria-label="删除封面"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (inputRef.current) inputRef.current.value = "";
              void onPick(null);
            }}
            className="absolute right-2 top-2 z-20 inline-flex items-center justify-center rounded-full bg-white/90 p-2 text-slate-500 shadow-md ring-1 ring-slate-200 transition hover:bg-white hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
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

function TopBar() {
  return <div className="h-2 bg-linear-to-r from-sky-400 via-sky-300 to-sky-500" />;
}

function MobileStepBar({
  step,
  ffmpegLoaded,
  ffmpegGiveUp,
  ffmpegRetryCount,
  ffmpegMaxRetries,
}: {
  step: Step;
  ffmpegLoaded: boolean;
  ffmpegGiveUp: boolean;
  ffmpegRetryCount: number;
  ffmpegMaxRetries: number;
}) {
  const steps: Array<{ index: Step; title: string }> = [
    { index: 1, title: "基本信息" },
    { index: 2, title: "导入音频" },
    { index: 3, title: "格式转换" },
    { index: 4, title: "打包下载" },
    { index: 5, title: "生成命令" },
  ];

  return (
    <div className="md:hidden">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-sky-500 text-white shadow-lg">
              <Music className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-800 sm:text-base">MC SoundsGen</div>
              <div className="text-[11px] font-bold text-slate-400 sm:text-xs">步骤 {step}/5</div>
            </div>
          </div>

          <div className="flex justify-end px-3 pb-2 sm:px-4">
            <FfmpegInlineStatus
              loaded={ffmpegLoaded}
              giveUp={ffmpegGiveUp}
              retryCount={ffmpegRetryCount}
              maxRetries={ffmpegMaxRetries}
            />
          </div>
        </div>


        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          <div className="flex gap-2 overflow-x-auto">
            {steps.map((s) => {
              const active = step === s.index;
              const completed = step > s.index;
              return (
                <div
                  key={s.index}
                  className={[
                    "shrink-0 rounded-xl border px-2.5 py-2 sm:px-3",
                    active
                      ? "border-sky-200 bg-sky-50"
                      : completed
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-slate-200 bg-slate-50",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={[
                        "flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold",
                        active
                          ? "bg-sky-400 text-white"
                          : completed
                            ? "bg-emerald-400 text-white"
                            : "bg-white text-slate-500 ring-1 ring-slate-200",
                      ].join(" ")}
                    >
                      {completed ? <Check className="h-3.5 w-3.5" /> : s.index}
                    </div>
                    <div
                      className={[
                        "whitespace-nowrap text-[11px] font-bold sm:text-xs",
                        active ? "text-sky-700" : "text-slate-600",
                      ].join(" ")}
                    >
                      {s.title}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  step,
  ffmpegLoaded,
  ffmpegGiveUp,
  ffmpegRetryCount,
  ffmpegMaxRetries,
}: {
  step: Step;
  ffmpegLoaded: boolean;
  ffmpegGiveUp: boolean;
  ffmpegRetryCount: number;
  ffmpegMaxRetries: number;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col space-y-8 md:flex">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-sky-400 to-sky-500 text-white shadow-lg">
            <Music className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">MC SoundsGen</h1>
            <p className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-400">
              v1.1
            </p>

            <FfmpegInlineStatus
              loaded={ffmpegLoaded}
              giveUp={ffmpegGiveUp}
              retryCount={ffmpegRetryCount}
              maxRetries={ffmpegMaxRetries}
            />
          </div>
        </div>
      </div>

      <div className="relative flex flex-col gap-6 pl-2">
        <div className="absolute bottom-4 left-6.75 top-4 w-0.5 bg-slate-100" />

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
          completed={step > 4}
          title="打包下载"
          desc="生成资源包"
        />
        <StepIndicator
          index={5}
          active={step === 5}
          completed={false}
          title="生成命令"
          desc="游戏内播放"
        />
      </div>
    </aside>
  );
}

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
    javaPackFormat: DEFAULT_JAVA_PACK_FORMAT,
    iconFile: null,
    iconPreviewUrl: null,
    modifyVanilla: false,
  });
  const [vanillaEventOptions, setVanillaEventOptions] = useState<VanillaEventOption[]>([]);
  const [vanillaEventLoading, setVanillaEventLoading] = useState(false);
  const [vanillaEventLoadFailed, setVanillaEventLoadFailed] = useState(false);

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
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const nameCount = meta.name.length;
  const descLimit = getDescLimit(meta.platform);
  const descSuffix = buildPackDescription(meta.desc);
  const descCount = descSuffix.length;
  const descInputMaxLength = Math.max(0, descLimit - AUTO_DESC_SUFFIX.length - (meta.desc.trim() ? 1 : 0));

  const fileCount = files.length;
  const canStartProcess = fileCount > 0;

  const copyCommand = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "true");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }

    setCopiedCommand(text);
    window.setTimeout(() => setCopiedCommand((prev) => (prev === text ? null : prev)), 1200);
  };

  const downloadCommandsTxt = () => {
    const safeName = meta.name.trim() || "SoundPack";
    const key = normalizeKey(meta.key);
    const soundNames = files.map((f) => {
      if (meta.modifyVanilla) {
        const event = f.vanillaEvent.trim();
        return event || `${key}.${f.newName}`;
      }
      return `${key}.${f.newName}`;
    });

    const linesOldJava = soundNames.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`);
    const linesNewJava = soundNames.map((s) => `/playsound ${s} record @a ~ ~ ~ 10000`);
    const linesStopJava = soundNames.map((s) => `/stopsound @a record ${s}`);
    const linesBedrock = soundNames.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`);
    const linesStopBedrock = soundNames.map((s) => `/stopsound @a ${s}`);

    const content =
      meta.platform === "java"
        ? [
          `主Key: ${key}`,
          "",
          "Java 1.7.10 及以下",
          ...(linesOldJava.length ? linesOldJava : ["暂无音频文件"]),
          "",
          "Java 1.8 及以上",
          ...(linesNewJava.length ? linesNewJava : ["暂无音频文件"]),
          "",
          "Java 停止声音 (1.9.3 及以上支持)",
          ...(linesStopJava.length ? linesStopJava : ["暂无音频文件"]),
          "",
        ].join("\n")
        : [
          `主Key: ${key}`,
          "",
          "基岩版",
          ...(linesBedrock.length ? linesBedrock : ["暂无音频文件"]),
          "",
          "基岩版 停止声音",
          ...linesStopBedrock,
          "",
        ].join("\n");

    saveAs(new Blob([content], { type: "text/plain;charset=utf-8" }), `${safeName}_playsound.txt`);
  };

  useEffect(() => {
    setMeta((prev) => {
      const nextDesc = clampDescForPlatform(prev.desc, meta.platform);
      return nextDesc === prev.desc ? prev : { ...prev, desc: nextDesc };
    });
  }, [meta.platform]);

  useEffect(() => {
    if (!meta.modifyVanilla) return;
    setVanillaEventOptions(meta.platform === "bedrock" ? BEDROCK_VANILLA_EVENT_OPTIONS : JAVA_VANILLA_EVENT_OPTIONS);
    setVanillaEventLoading(false);
    setVanillaEventLoadFailed(false);
  }, [meta.modifyVanilla, meta.platform]);

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

  const overlayActive = !ffmpegLoaded;

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const inertEl = el as HTMLElement & { inert?: boolean };
    inertEl.inert = overlayActive;
    return () => {
      inertEl.inert = false;
    };
  }, [overlayActive]);

  useEffect(() => {
    if (step < 2) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [step]);

  const resetAll = () => {
    setStep(1);
    setFiles([]);
    setMeta({
      name: "",
      key: DEFAULT_KEY,
      desc: "",
      platform: "java",
      javaPackFormat: DEFAULT_JAVA_PACK_FORMAT,
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
      if (file.type !== "image/png") {
        alert("封面必须是 PNG 图片。");
        return;
      }
      const { width, height } = await getImageNaturalSize(file);
      const isSquare = width === height;
      if (!isSquare) {
        alert(`封面必须是 1:1 正方形（当前 ${width}×${height}）。`);
        return;
      }
      const resized = await resizePngToSquare(file, 256);
      setMeta((prev) => ({ ...prev, iconFile: resized }));
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

    const key = normalizeKey(meta.key);
    return [
      { icon: <FileIcon className="h-3 w-3" />, text: "manifest.json" },
      { icon: <ImageIcon className="h-3 w-3" />, text: "pack_icon.png" },
      { icon: <FileIcon className="h-3 w-3" />, text: "sounds/sound_definitions.json" },
      { icon: <Folder className="h-3 w-3" />, text: `sounds/${key}/...` },
    ];
  };

  const downloadPack = async () => {
    const zip = new JSZip();
    const safeName = meta.name.trim() || "SoundPack";
    const outputExt = meta.platform === "bedrock" ? "mcpack" : "zip";

    const readyFiles = files.filter((f) => f.processedBlob && f.status === "done");
    if (readyFiles.length !== files.length) {
      alert("存在未成功转换的文件，请重新处理后再下载。");
      return;
    }

    if (meta.platform === "java") {
      const parsedPackFormat = Number.parseInt(meta.javaPackFormat, 10);
      const packFormat = Number.isFinite(parsedPackFormat) && parsedPackFormat > 0 ? parsedPackFormat : 15;
      const mcmeta = buildJavaPackMcmeta(packFormat, buildPackDescription(meta.desc));
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
      const key = normalizeKey(meta.key);
      const uuid1 = uuid();
      const uuid2 = uuid();
      const manifest = {
        format_version: 2,
        header: {
          name: safeName,
          description: buildPackDescription(meta.desc),
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

      const soundFolder = zip.folder("sounds")?.folder(key);
      if (!soundFolder) throw new Error("zip folder init failed");
      for (const f of readyFiles) {
        soundFolder.file(`${f.newName}.ogg`, f.processedBlob as Blob);
      }

      const definitions = buildBedrockSoundDefinitions(
        key,
        readyFiles.map((f) => ({ newName: f.newName, vanillaEvent: f.vanillaEvent })),
        meta.modifyVanilla
      );
      zip
        .folder("sounds")
        ?.file("sound_definitions.json", JSON.stringify(definitions, null, 2));
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `${safeName}.${outputExt}`);
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
      <div
        ref={contentRef}
        aria-hidden={overlayActive}
        className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4 md:flex-row md:gap-8 md:p-8"
      >
        <MobileStepBar
          step={step}
          ffmpegLoaded={ffmpegLoaded}
          ffmpegGiveUp={ffmpegGiveUp}
          ffmpegRetryCount={ffmpegRetryCount}
          ffmpegMaxRetries={3}
        />
        <Sidebar
          step={step}
          ffmpegLoaded={ffmpegLoaded}
          ffmpegGiveUp={ffmpegGiveUp}
          ffmpegRetryCount={ffmpegRetryCount}
          ffmpegMaxRetries={3}
        />

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TopBar />

          <div className={["flex-1 p-4 md:p-8", step === 5 ? "overflow-hidden" : "overflow-y-auto"].join(" ")}>
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
                          maxLength={NAME_MAX_LENGTH}
                          value={meta.name}
                          onChange={(e) =>
                            setMeta((prev) => ({ ...prev, name: clampText(e.target.value, NAME_MAX_LENGTH) }))
                          }
                          required
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {nameCount}/{NAME_MAX_LENGTH}
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

                    <div>
                      {meta.platform === "java" ? (
                        <>
                          <label className="mb-2 block text-sm font-bold text-slate-600">
                            资源包版本 <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <select
                              className="w-full appearance-none rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-10 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                              value={meta.javaPackFormat}
                              onChange={(e) => setMeta((prev) => ({ ...prev, javaPackFormat: e.target.value }))}
                            >
                              {JAVA_PACK_FORMAT_OPTIONS.map((opt) => (
                                <option key={opt.packFormat} value={String(opt.packFormat)}>
                                  {opt.version}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                          </div>
                          <p className="ml-1 mt-1.5 text-xs text-slate-400">
                            不会影响新版本的使用；但如果版本不匹配，游戏内可能会显示为“旧版资源包”，并出现兼容性问题。
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div className="col-span-2">
                      <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div>
                          <div className="text-sm font-bold text-slate-700">修改原版音频?</div>
                          <div className="text-xs text-slate-400">
                            {meta.platform === "bedrock"
                              ? "开启后可替换基岩版原版声音事件。"
                              : "开启后可替换原版声音事件，如受伤、走路等。"}
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
                            <div className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-sky-400" />
                            <div className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <label className="mb-2 block text-sm font-bold text-slate-600">简介 (可选)</label>
                      <div className="relative">
                        <input
                          className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 pr-16 text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          placeholder="简短描述..."
                          maxLength={descInputMaxLength}
                          value={meta.desc}
                          onChange={(e) => {
                            const next = clampDescForPlatform(e.target.value, meta.platform);
                            setMeta((prev) => ({ ...prev, desc: next }));
                          }}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                          {descCount}/{descLimit}
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
                  vanillaEventOptions={vanillaEventOptions}
                  vanillaEventLoading={vanillaEventLoading}
                  vanillaEventLoadFailed={vanillaEventLoadFailed}
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
                  下载资源包 (.{meta.platform === "bedrock" ? "mcpack" : "zip"})
                </button>

                <button
                  type="button"
                  onClick={() => goToStep(5)}
                  className="mt-4 inline-flex items-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  下一步：生成命令 <ArrowRight className="ml-2 h-4 w-4" />
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

            {step === 5 ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col overflow-hidden">
                <div className="shrink-0 border-b border-slate-100 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="mb-1 text-xl font-extrabold text-slate-800 sm:text-2xl md:mb-2 md:text-3xl">
                        生成命令
                      </h2>
                      <p className="text-[11px] text-slate-500 sm:text-xs md:text-sm">
                        在游戏内使用 /playsound 播放资源包里的声音。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadCommandsTxt}
                      className="inline-flex items-center rounded-xl bg-slate-900 px-2.5 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs md:px-4 md:text-sm"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      下载 TXT
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pt-4">
                  {(() => {
                    const key = normalizeKey(meta.key);
                    const soundNames = files.map((f) => {
                      if (meta.modifyVanilla) {
                        const event = f.vanillaEvent.trim();
                        return event || `${key}.${f.newName}`;
                      }
                      return `${key}.${f.newName}`;
                    });

                    const linesOldJava = soundNames.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`);
                    const linesNewJava = soundNames.map((s) => `/playsound ${s} record @a ~ ~ ~ 10000`);
                    const linesStopJava = soundNames.map((s) => `/stopsound @a record ${s}`);
                    const linesBedrock = soundNames.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`);
                    const linesStopBedrock = soundNames.map((s) => `/stopsound @a ${s}`);

                    const CommandList = ({
                      lines,
                    }: {
                      lines: string[];
                    }) => {
                      if (lines.length === 0) {
                        return (
                          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
                            暂无音频文件
                          </div>
                        );
                      }

                      return (
                        <ul className="space-y-2">
                          {lines.map((cmd, idx) => (
                            <li
                              key={`${idx}-${cmd}`}
                              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                            >
                              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                                {cmd}
                              </code>
                              <button
                                type="button"
                                onClick={() => void copyCommand(cmd)}
                                className="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                              >
                                <Copy className="mr-1.5 h-3.5 w-3.5" />
                                {copiedCommand === cmd ? "已复制" : "复制"}
                              </button>
                            </li>
                          ))}
                        </ul>
                      );
                    };

                    return meta.platform === "java" ? (
                      <div className="grid gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                          <div className="mb-2 text-sm font-extrabold text-slate-700">Java 1.7.10 及以下</div>
                          <CommandList lines={linesOldJava} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                          <div className="mb-2 text-sm font-extrabold text-slate-700">Java 1.8 及以上</div>
                          <CommandList lines={linesNewJava} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                          <div className="mb-2 text-sm font-extrabold text-slate-700">
                            停止声音 (1.9.3 及以上支持)
                          </div>
                          <CommandList lines={linesStopJava} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                          <div className="mb-2 text-sm font-extrabold text-slate-700">基岩版</div>
                          <CommandList lines={linesBedrock} />
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                          <div className="mb-2 text-sm font-extrabold text-slate-700">停止声音</div>
                          <CommandList lines={linesStopBedrock} />
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="shrink-0 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => goToStep(4)}
                      className="inline-flex items-center rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:px-3 sm:text-xs md:px-4 md:text-sm"
                    >
                      上一步
                    </button>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="inline-flex items-center rounded-xl bg-sky-400 px-4 py-2.5 text-[11px] font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:bg-sky-300 sm:px-5 sm:text-xs md:px-6 md:py-3 md:text-sm"
                    >
                      创建新的资源包
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </div>
      {vanillaEventOptions.length > 0 ? (
        <datalist id="vanilla-events">
          {vanillaEventOptions.map((v) => (
            <option key={v.key} value={v.key} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function FileDropZone({
  modifyVanilla,
  files,
  onAddFiles,
  onRemoveFile,
  onUpdateVanillaEvent,
  vanillaEventOptions,
  vanillaEventLoading,
  vanillaEventLoadFailed,
}: {
  modifyVanilla: boolean;
  files: FileItem[];
  onAddFiles: (list: FileList | null) => void;
  onRemoveFile: (id: string) => void;
  onUpdateVanillaEvent: (id: string, value: string) => void;
  vanillaEventOptions: VanillaEventOption[];
  vanillaEventLoading: boolean;
  vanillaEventLoadFailed: boolean;
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
                    <div className="mb-1 text-xs text-sky-500">替换原版事件（可选）</div>
                    <input
                      list="vanilla-events"
                      placeholder={
                        vanillaEventLoading
                          ? "正在加载事件列表..."
                          : vanillaEventLoadFailed
                            ? "事件列表加载失败，请刷新页面"
                            : "留空则不替换"
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                      value={f.vanillaEvent}
                      onChange={(e) => onUpdateVanillaEvent(f.id, e.target.value)}
                    />
                    <div className="mt-1 text-[11px] font-bold text-slate-400">
                      {vanillaEventLoading
                        ? "正在加载..."
                        : vanillaEventLoadFailed
                          ? "加载失败"
                          : `已加载 ${vanillaEventOptions.length} 个事件`}
                    </div>
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
