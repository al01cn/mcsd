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
  Package,
  Play,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { pinyin } from "pinyin-pro";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import ffmpeg from "../lib/ffmpeg";
import mcVersions, { type JavaPackVersion } from "../lib/mcver";
import { vanillaSoundBedrock, vanillaSoundJava } from "../lib/sounds";
import WebConfig from "../lib/config";
import updateLogs from "../lib/update_logs";

type PackPlatform = "java" | "bedrock";

type Step = 1 | 2 | 3 | 4 | 5;

function noop() {}

function noopGoToStep() {}

type FileItem = {
  id: string;
  originalFile: File;
  originalName: string;
  hash: string;
  newName: string;
  status: "pending" | "processing" | "done" | "error";
  vanillaEvent: string;
  processedBlob: Blob | null;
};

type ConvertLogItem = {
  id: string;
  at: number;
  level: "info" | "error";
  message: string;
};

type AudioProgressStage = "queued" | "checking" | "loading" | "converting" | "skipped" | "done" | "error";

type AudioProgressItem = {
  stage: AudioProgressStage;
  percent: number;
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

type GuideAnchorKey =
  | "step1Icon"
  | "step1Name"
  | "step1Key"
  | "step1Platform"
  | "step1JavaPackFormat"
  | "step1ModifyVanilla"
  | "step1Desc"
  | "step1Next"
  | "step2AddFiles"
  | "step2DropZone"
  | "step2VanillaEvent"
  | "step2StartProcessing"
  | "step3ProgressCard"
  | "step3LogCard"
  | "step4Download"
  | "step4Next"
  | "step5DownloadTxt";

type GuideItem = {
  title: string;
  desc: string;
  anchorKey?: GuideAnchorKey;
  primaryAction?: () => void;
  primaryLabel?: string;
};

const DEFAULT_KEY = "mcsd";
const NAME_MAX_LENGTH = 10;
const JAVA_DESC_MAX_LENGTH = 20;
const BEDROCK_DESC_MAX_LENGTH = 40;
const AUTO_DESC_SUFFIX = "By mcsd";
const GUIDE_ACK_KEY = "mcsd_immersive_guide_ack_v1";
const FFMPEG_WASM_MAX_INPUT_BYTES = 256 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"] as const;
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const decimals = value >= 100 || unitIndex === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function getDescLimit(platform: PackPlatform) {
  return platform === "bedrock" ? BEDROCK_DESC_MAX_LENGTH : JAVA_DESC_MAX_LENGTH;
}

function buildPackDescription(desc: string) {
  const trimmed = desc.trim();
  return trimmed ? `${trimmed} ${AUTO_DESC_SUFFIX}` : AUTO_DESC_SUFFIX;
}

function buildImmersiveGuideItems({
  step,
  platform,
  guidePhase,
  processingError,
  goToStep,
  startProcessing,
  downloadPack,
  enableModifyVanilla,
  startVanillaGuide,
}: {
  step: Step;
  platform: PackPlatform;
  guidePhase: "main" | "vanilla";
  processingError: string | null;
  goToStep: (target: Step) => void;
  startProcessing: () => void;
  downloadPack: () => void;
  enableModifyVanilla: () => void;
  startVanillaGuide: () => void;
}): GuideItem[] {
  if (guidePhase === "vanilla") {
    const step1: GuideItem[] = [
      {
        title: "打开“修改原版音频”",
        desc: "如果想替换原版声音事件，需要打开开关。",
        anchorKey: "step1ModifyVanilla",
      },
      {
        title: "继续下一步",
        desc: "点击“下一步”返回导入音频，继续完成替换原版事件与开始处理。",
        anchorKey: "step1Next",
        primaryLabel: "下一步",
        primaryAction: () => {
          enableModifyVanilla();
          goToStep(2);
        },
      },
    ];

    const step2: GuideItem[] = [
      {
        title: "选择要替换的原版事件",
        desc: "为每个文件选择 minecraft:... 原版声音事件；留空则不替换。",
        anchorKey: "step2VanillaEvent",
      },
      {
        title: "进入第三步",
        desc: "确认无误后点击“开始处理”，进入第三步继续引导。",
        anchorKey: "step2StartProcessing",
        primaryLabel: "开始处理",
        primaryAction: startProcessing,
      },
    ];

    if (step === 1) return step1;
    if (step === 2) return step2;
    return [];
  }

  const step1: GuideItem[] = [
    {
      title: "上传封面（可选）",
      desc: "建议上传 256×256 PNG；会用于资源包图标显示。",
      anchorKey: "step1Icon",
    },
    { title: "填写音频包名称", desc: "必填，用于资源包显示名称。", anchorKey: "step1Name" },
    { title: "确认主 Key", desc: "必填，用于 assets/.../sounds/<主Key>/ 的文件夹名。", anchorKey: "step1Key" },
    { title: "选择游戏版本", desc: "Java / 基岩版会影响打包格式与命令生成。", anchorKey: "step1Platform" },
    ...(platform === "java"
      ? [
          {
            title: "选择资源包版本",
            desc: "仅 Java 版需要选择；选错不会影响使用，但新版本里可能出现“不兼容”提示。",
            anchorKey: "step1JavaPackFormat",
          } as const,
        ]
      : []),
    { title: "填写简介（可选）", desc: "会自动追加 By mcsd。", anchorKey: "step1Desc" },
    {
      title: "进入下一步",
      desc: "完成后点击“下一步”开始导入音频。",
      anchorKey: "step1Next",
      primaryLabel: "前往下一步",
      primaryAction: () => goToStep(2),
    },
  ];

  const step2: GuideItem[] = [
    { title: "添加音频文件", desc: "点击“添加文件”，或直接把文件拖入页面。", anchorKey: "step2AddFiles" },
    {
      title: "拖拽区与重命名",
      desc: "可在列表里重命名；移动端会弹窗编辑。点击“下一步”进入“修改原版音频”。",
      anchorKey: "step2DropZone",
      primaryLabel: "下一步",
      primaryAction: startVanillaGuide,
    },
  ];

  const step3: GuideItem[] = [
    { title: "查看转换进度", desc: "这里会显示总进度与当前处理的文件。", anchorKey: "step3ProgressCard" },
    {
      title: "查看转换日志",
      desc: processingError
        ? "出现错误时可根据日志定位原因，并点击“返回修改”。"
        : "点击“下一步”直接进入打包下载步骤（引导模式使用模拟数据）。",
      anchorKey: "step3LogCard",
      primaryLabel: processingError ? "返回修改" : "下一步",
      primaryAction: processingError ? () => goToStep(2) : () => goToStep(4),
    },
  ];

  const step4: GuideItem[] = [
    {
      title: "下载资源包",
      desc: "点击下载 zip / mcpack 文件。",
      anchorKey: "step4Download",
      primaryLabel: "下载",
      primaryAction: downloadPack,
    },
    {
      title: "生成命令",
      desc: "继续进入下一步，生成 /playsound 命令。",
      anchorKey: "step4Next",
      primaryLabel: "前往生成命令",
      primaryAction: () => goToStep(5),
    },
  ];

  const step5: GuideItem[] = [
    { title: "下载命令 TXT", desc: "可导出命令列表，便于复制到游戏或备份。", anchorKey: "step5DownloadTxt" },
    { title: "复制命令", desc: "每条命令右侧可一键复制。", anchorKey: undefined },
  ];

  if (step === 1) return step1;
  if (step === 2) return step2;
  if (step === 3) return step3;
  if (step === 4) return step4;
  return step5;
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

function sanitizeSoundName(input: string) {
  const cleaned = input.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return clampText(cleaned, 8);
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

function readFileAsArrayBuffer(file: File) {
  return file.arrayBuffer();
}

function bytesToHex(bytes: Uint8Array) {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, "0");
  }
  return out;
}

async function getFileSha256(file: File): Promise<string> {
  if (typeof crypto === "undefined" || !("subtle" in crypto) || !crypto.subtle) {
    throw new Error("crypto.subtle is not available");
  }
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return bytesToHex(new Uint8Array(digest));
}

async function readFileHead(file: File, maxBytes: number): Promise<Uint8Array> {
  const size = Math.min(file.size, maxBytes);
  const buf = await file.slice(0, size).arrayBuffer();
  return new Uint8Array(buf);
}

function bytesToAscii(bytes: Uint8Array, start: number, len: number) {
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += String.fromCharCode(bytes[start + i] ?? 0);
  }
  return out;
}

function findAscii(bytes: Uint8Array, needle: string) {
  if (!needle.length) return -1;
  const n0 = needle.charCodeAt(0);
  for (let i = 0; i <= bytes.length - needle.length; i += 1) {
    if ((bytes[i] ?? 0) !== n0) continue;
    let ok = true;
    for (let j = 1; j < needle.length; j += 1) {
      if ((bytes[i + j] ?? 0) !== needle.charCodeAt(j)) {
        ok = false;
        break;
      }
    }
    if (ok) return i;
  }
  return -1;
}

function sliceBytes(bytes: Uint8Array, start: number, length: number) {
  return bytes.subarray(start, Math.min(bytes.length, start + length));
}

function concatBytes(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

function readOggFirstPacket(bytes: Uint8Array): Uint8Array | null {
  const oggPos = findAscii(bytes, "OggS");
  if (oggPos < 0) return null;

  let offset = oggPos;
  const packetChunks: Uint8Array[] = [];

  while (offset + 27 <= bytes.length) {
    if (bytesToAscii(bytes, offset, 4) !== "OggS") {
      const next = findAscii(sliceBytes(bytes, offset + 1, bytes.length - (offset + 1)), "OggS");
      if (next < 0) return null;
      offset = offset + 1 + next;
      continue;
    }

    const version = bytes[offset + 4] ?? 0xff;
    if (version !== 0) return null;

    const pageSegments = bytes[offset + 26] ?? 0;
    const segmentTableStart = offset + 27;
    const dataStart = segmentTableStart + pageSegments;
    if (dataStart > bytes.length) return null;

    const segmentTable = bytes.subarray(segmentTableStart, dataStart);
    let dataLen = 0;
    for (let i = 0; i < segmentTable.length; i += 1) dataLen += segmentTable[i] ?? 0;
    const pageEnd = dataStart + dataLen;
    if (pageEnd > bytes.length) return null;

    let cursor = dataStart;
    for (let i = 0; i < segmentTable.length; i += 1) {
      const segLen = segmentTable[i] ?? 0;
      if (segLen > 0) {
        packetChunks.push(bytes.subarray(cursor, cursor + segLen));
      }
      cursor += segLen;
      if (segLen < 255) {
        return concatBytes(packetChunks);
      }
    }

    offset = pageEnd;
  }

  return null;
}

function getOggVorbisIdHeaderInfo(bytes: Uint8Array): { channels: number; sampleRate: number } | null {
  const firstPacket = readOggFirstPacket(bytes);
  if (!firstPacket) return null;

  if (bytesToAscii(firstPacket, 0, 8) === "OpusHead") return null;
  if (firstPacket.length < 30) return null;
  if ((firstPacket[0] ?? 0) !== 0x01) return null;
  if (bytesToAscii(firstPacket, 1, 6) !== "vorbis") return null;

  const dv = new DataView(firstPacket.buffer, firstPacket.byteOffset, firstPacket.byteLength);
  const version = dv.getUint32(7, true);
  if (version !== 0) return null;

  const channels = firstPacket[11] ?? 0;
  const sampleRate = dv.getUint32(12, true);
  const framingFlag = firstPacket[29] ?? 0;
  if (framingFlag !== 1) return null;
  if (!channels || !sampleRate) return null;
  return { channels, sampleRate };
}

async function checkMinecraftOggReady(file: File): Promise<{
  ready: boolean;
  channels: number | null;
  sampleRate: number | null;
}> {
  const head = await readFileHead(file, 256 * 1024);
  const vorbis = getOggVorbisIdHeaderInfo(head);
  if (!vorbis) {
    return { ready: false, channels: null, sampleRate: null };
  }

  const channelsOk = vorbis.channels === 2;
  const sampleRateOk = vorbis.sampleRate === 44100;
  return { ready: channelsOk && sampleRateOk, channels: vorbis.channels, sampleRate: vorbis.sampleRate };
}

function isMaybeOggFile(input: Pick<FileItem, "originalFile" | "originalName">) {
  return input.originalFile.type === "audio/ogg" || input.originalName.toLowerCase().endsWith(".ogg");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
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

function CircleProgress({
  percent,
  size = 28,
  strokeWidth = 3,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        className="fill-none stroke-slate-200"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="fill-none stroke-sky-400 transition-[stroke-dashoffset] duration-300"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
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
        className: "border-none text-emerald-700",
        dot: "bg-emerald-500",
        showSpinner: false,
      };
    }
    if (giveUp) {
      return {
        label: "加载失败",
        className: "border-none text-red-700",
        dot: "bg-red-500",
        showSpinner: false,
      };
    }
    if (retryCount > 0) {
      return {
        label: `重试中（${retryCount}/${maxRetries}）`,
        className: "border-none text-sky-700",
        dot: "bg-sky-500",
        showSpinner: true,
      };
    }
    return {
      label: "加载中",
      className: "border-none text-slate-700",
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
    : "加载FFmpeg中，请耐心等待，加载期间禁止任何操作。";
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

function DisclaimerOverlay({ onClose }: { onClose: () => void }) {
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
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
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

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDownCapture={onKeyDownCapture}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="免责声明"
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-extrabold text-slate-800">免责声明</div>
            <div className="mt-1 text-sm text-slate-500">关于文件与转换方式的说明</div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm text-slate-600">
          <p className="wrap-break-word">
            这是一个在线 Minecraft 音频包生成器。音频格式转换在浏览器端使用 FFmpeg（WebAssembly）直接完成，
            无需上传服务器。
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] text-slate-700">
            <div className="font-bold">要点</div>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>音频文件在本地处理，不会被上传到服务器。</li>
              <li>首次加载会下载 FFmpeg 相关 wasm 资源，可能较慢。</li>
              <li>转换效果与文件质量、浏览器环境有关。</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}

function UpdateLogsOverlay({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    lastActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => {
      lastActiveRef.current?.focus?.();
    };
  }, []);

  const buildCollapsedText = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n").trim();
    if (!normalized) return { text: "暂无内容", truncated: false };

    const lines = normalized.split("\n");
    const maxLines = 4;
    const maxChars = 180;

    const linePart = lines.slice(0, Math.min(maxLines, lines.length)).join("\n").trimEnd();
    if (linePart.length >= maxChars) {
      return { text: `${linePart.slice(0, maxChars).trimEnd()}…`, truncated: true };
    }
    const truncated = lines.length > maxLines || normalized.length > linePart.length;
    return { text: truncated ? `${linePart}\n…` : linePart, truncated };
  };

  const compareVersionsDesc = (a: string, b: string) => {
    const ap = a.split(".").map((v) => Number(v));
    const bp = b.split(".").map((v) => Number(v));
    const maxLen = Math.max(ap.length, bp.length);
    for (let i = 0; i < maxLen; i += 1) {
      const av = Number.isFinite(ap[i]) ? ap[i] : 0;
      const bv = Number.isFinite(bp[i]) ? bp[i] : 0;
      if (av > bv) return -1;
      if (av < bv) return 1;
    }
    return b.localeCompare(a);
  };

  const entries = (Object.entries(updateLogs) as Array<[string, { date?: string; logs: string }]>).sort(
    ([a], [b]) => compareVersionsDesc(a, b)
  );

  const onKeyDownCapture = (e: ReactKeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
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

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDownCapture={onKeyDownCapture}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="更新日志"
        tabIndex={-1}
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-base font-extrabold text-slate-800">更新日志</div>
            <div className="mt-1 text-sm text-slate-500">当前版本：v{WebConfig.appVersion}</div>
          </div>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="relative pl-6">
            <div className="absolute bottom-2 left-2 top-2 w-px bg-slate-200" />
            <div className="space-y-5">
              {entries.map(([version, item]) => {
                const isCurrent = version === WebConfig.appVersion;
                const rawLogsText = item.logs?.trim() ? item.logs.trim() : "暂无内容";
                const isExpanded = expanded[version] === true;
                const collapsed = buildCollapsedText(rawLogsText);
                const logsText = isExpanded ? rawLogsText : collapsed.text;
                return (
                  <div key={version} className="relative">
                    <div
                      className={[
                        "absolute left-2 top-1 h-3 w-3 -translate-x-1/2 rounded-full ring-4",
                        isCurrent ? "bg-sky-400 ring-sky-100" : "bg-slate-300 ring-slate-100",
                      ].join(" ")}
                    />
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-extrabold text-slate-800">v{version}</div>
                          {isCurrent ? (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-extrabold text-sky-700">
                              当前
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.date ? <div className="text-xs font-bold text-slate-400">{item.date}</div> : null}
                          {collapsed.truncated ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              onClick={() =>
                                setExpanded((prev) => ({
                                  ...prev,
                                  [version]: !(prev[version] === true),
                                }))
                              }
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                            >
                              <span>{isExpanded ? "收起" : "展开"}</span>
                              <ChevronDown className={["h-3.5 w-3.5 transition", isExpanded ? "rotate-180" : ""].join(" ")} />
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-[13px] text-slate-700">{logsText}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

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
            <NextImage
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

function ImmersiveGuideOverlay({
  step,
  stepTitle,
  itemIndex,
  itemTotal,
  item,
  anchorRect,
  onPrev,
  onNext,
  onSkip,
}: {
  step: Step;
  stepTitle: string;
  itemIndex: number;
  itemTotal: number;
  item: GuideItem;
  anchorRect: { top: number; left: number; width: number; height: number } | null;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const padding = 12;
  const viewportW = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportH = typeof window === "undefined" ? 0 : window.innerHeight;

  const tooltipW = Math.min(360, Math.max(280, viewportW - padding * 2));
  const tooltipHalfW = tooltipW / 2;

  const anchorCenterX = anchorRect ? anchorRect.left + anchorRect.width / 2 : viewportW / 2;
  const anchorBottomY = anchorRect ? anchorRect.top + anchorRect.height : viewportH / 2;
  const anchorTopY = anchorRect ? anchorRect.top : viewportH / 2;

  const preferTop = anchorRect ? anchorBottomY + 12 + 220 > viewportH : false;
  const tooltipTop = preferTop ? Math.max(padding, anchorTopY - 12 - 220) : Math.min(viewportH - 220 - padding, anchorBottomY + 12);
  const tooltipLeft = Math.min(
    Math.max(padding, anchorCenterX - tooltipHalfW),
    Math.max(padding, viewportW - tooltipW - padding)
  );

  const highlightStyle = anchorRect
    ? ({
        top: anchorRect.top,
        left: anchorRect.left,
        width: anchorRect.width,
        height: anchorRect.height,
        boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.55)",
      } as const)
    : null;

  return (
    <div className="fixed inset-0 z-20 pointer-events-none">
      {anchorRect ? (
        <div className="fixed rounded-2xl ring-2 ring-sky-300/80" style={highlightStyle ?? undefined} />
      ) : (
        <div className="fixed inset-0 bg-slate-950/55" />
      )}

      <div
        className="fixed pointer-events-auto"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: tooltipW,
        }}
      >
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-slate-400">
                第 {step} 步 · {stepTitle} · {itemIndex + 1}/{itemTotal}
              </div>
              <div className="mt-1 text-base font-extrabold text-slate-800">{item.title}</div>
              <div className="mt-1 text-sm text-slate-600">{item.desc}</div>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="inline-flex shrink-0 items-center rounded-xl px-3 py-2 text-xs font-bold text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            >
              跳过
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onPrev}
              disabled={itemIndex <= 0}
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              上一个
            </button>

            <button
              type="button"
              onClick={onNext}
              className="inline-flex items-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:bg-sky-300"
            >
              {itemIndex + 1 >= itemTotal ? item.primaryLabel ?? (item.primaryAction ? "继续" : "学会了") : "下一个"}
            </button>
          </div>
        </div>
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
  onOpenUpdateLogs,
}: {
  step: Step;
  ffmpegLoaded: boolean;
  ffmpegGiveUp: boolean;
  ffmpegRetryCount: number;
  ffmpegMaxRetries: number;
  onOpenUpdateLogs: () => void;
}) {
  const steps: Array<{ index: Step; title: string }> = [
    { index: 1, title: "基本信息" },
    { index: 2, title: "导入音频" },
    { index: 3, title: "格式转换" },
    { index: 4, title: "打包下载" },
    { index: 5, title: "生成命令" },
  ];

  return (
    <div className="lg:hidden">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-3 py-3 sm:px-4 sm:py-4 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center">
              <NextImage src="/note_block.png" alt="note block icon" width={18} height={18} className="h-9 w-9" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-800 sm:text-base">MC SoundsGen</div>
              <button
                type="button"
                onClick={onOpenUpdateLogs}
                className="text-left text-[11px] font-bold text-slate-400 underline decoration-dotted underline-offset-2 transition hover:text-slate-600 sm:text-xs"
              >
                版本：v{WebConfig.appVersion}
              </button>
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
  onOpenUpdateLogs,
}: {
  step: Step;
  ffmpegLoaded: boolean;
  ffmpegGiveUp: boolean;
  ffmpegRetryCount: number;
  ffmpegMaxRetries: number;
  onOpenUpdateLogs: () => void;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col space-y-8 lg:flex">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center">
            <NextImage src="/note_block.png" alt="note block icon" width={20} height={20} className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800">MC SoundsGen</h1>
            <button
              type="button"
              onClick={onOpenUpdateLogs}
              className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-400 underline decoration-dotted underline-offset-2 transition hover:bg-slate-50 hover:text-slate-600"
            >
              v{WebConfig.appVersion}
            </button>

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
  const filesRef = useRef<FileItem[]>([]);
  const addingFilesRef = useRef(false);
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
  const [convertLogs, setConvertLogs] = useState<ConvertLogItem[]>([]);
  const [audioProgress, setAudioProgress] = useState<Record<string, AudioProgressItem>>({});
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);
  const [updateLogsOpen, setUpdateLogsOpen] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guidePhase, setGuidePhase] = useState<"main" | "vanilla">("main");
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideAnchorRect, setGuideAnchorRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const guideAnchorsRef = useRef<Record<GuideAnchorKey, HTMLElement | null>>({
    step1Icon: null,
    step1Name: null,
    step1Key: null,
    step1Platform: null,
    step1JavaPackFormat: null,
    step1ModifyVanilla: null,
    step1Desc: null,
    step1Next: null,
    step2AddFiles: null,
    step2DropZone: null,
    step2VanillaEvent: null,
    step2StartProcessing: null,
    step3ProgressCard: null,
    step3LogCard: null,
    step4Download: null,
    step4Next: null,
    step5DownloadTxt: null,
  });
  const guideAutoFillRef = useRef<{
    original: Pick<PackMeta, "name" | "key" | "desc">;
    sample: Pick<PackMeta, "name" | "key" | "desc">;
  } | null>(null);
  const guideSecondRoundModifyVanillaOpenedRef = useRef(false);
  const guideDemoFilesRef = useRef<FileItem[] | null>(null);

  const nameCount = meta.name.length;
  const descLimit = getDescLimit(meta.platform);
  const descSuffix = buildPackDescription(meta.desc);
  const descCount = descSuffix.length;
  const descInputMaxLength = Math.max(0, descLimit - AUTO_DESC_SUFFIX.length - (meta.desc.trim() ? 1 : 0));

  const fileCount = files.length;
  const canStartProcess = fileCount > 0;

  const getGuideDemoFiles = useCallback((): FileItem[] => {
    if (guideDemoFilesRef.current) return guideDemoFilesRef.current;

    const create = ({
      id,
      originalName,
      newName,
      vanillaEvent,
      status,
    }: {
      id: string;
      originalName: string;
      newName: string;
      vanillaEvent: string;
      status: FileItem["status"];
    }): FileItem => ({
      id,
      originalFile: new File([new Uint8Array()], originalName, { type: "audio/mpeg" }),
      originalName,
      hash: id,
      newName,
      status,
      vanillaEvent,
      processedBlob: new Blob(),
    });

    guideDemoFilesRef.current = [
      create({
        id: "guide-demo-bell",
        originalName: "bell.mp3",
        newName: "bell",
        vanillaEvent: "minecraft:block.note_block.harp",
        status: "done",
      }),
      create({
        id: "guide-demo-click",
        originalName: "click.wav",
        newName: "click",
        vanillaEvent: "",
        status: "done",
      }),
      create({
        id: "guide-demo-boom",
        originalName: "boom.ogg",
        newName: "boom",
        vanillaEvent: "",
        status: "done",
      }),
    ];

    return guideDemoFilesRef.current;
  }, []);

  const buildCommandSoundNames = (sourceFiles: FileItem[]) => {
    const key = normalizeKey(meta.key);
    return sourceFiles.map((f) => {
      if (meta.modifyVanilla) {
        const event = f.vanillaEvent.trim();
        return event || `${key}.${f.newName}`;
      }
      return `${key}.${f.newName}`;
    });
  };

  const pushConvertLog = (message: string, level: ConvertLogItem["level"] = "info") => {
    setConvertLogs((prev) => {
      const next: ConvertLogItem[] = [
        ...prev,
        { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, at: Date.now(), level, message },
      ];
      return next.length > 300 ? next.slice(next.length - 300) : next;
    });
  };

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    if (step !== 3) return;
    logsEndRef.current?.scrollIntoView({ block: "end" });
  }, [step, convertLogs.length]);

  useEffect(() => {
    if (!guideOpen) return;
    if (step !== 3) return;
    if (files.length > 0) return;

    const demoFiles = getGuideDemoFiles();
    const now = Date.now();

    setProcessing({
      title: "转换完成（演示）",
      desc: "引导模式会展示模拟的进度与日志，不会真的进行转码。",
      currentFile: "Done",
      percent: 100,
      error: null,
    });

    setAudioProgress({
      [demoFiles[0]!.id]: { stage: "skipped", percent: 100 },
      [demoFiles[1]!.id]: { stage: "done", percent: 100 },
      [demoFiles[2]!.id]: { stage: "done", percent: 100 },
    });

    setConvertLogs([
      { id: "guide-log-1", at: now - 6200, level: "info", message: "开始处理：共 3 个文件（演示）" },
      { id: "guide-log-2", at: now - 5200, level: "info", message: "检查 OGG 格式：boom.ogg 已符合规格，跳过转码" },
      { id: "guide-log-3", at: now - 3800, level: "info", message: "转码：bell.mp3 -> bell.ogg" },
      { id: "guide-log-4", at: now - 2400, level: "info", message: "转码：click.wav -> click.ogg" },
      { id: "guide-log-5", at: now - 900, level: "info", message: "处理完成：已生成可打包的 OGG 文件（演示）" },
    ]);
  }, [files.length, getGuideDemoFiles, guideOpen, step]);

  useEffect(() => {
    if (!ffmpegLoaded) return;
    try {
      const key = "mcsd_disclaimer_ack_v1";
      const acknowledged = localStorage.getItem(key) === "1";
      if (!acknowledged) setDisclaimerOpen(true);
    } catch {
      setDisclaimerOpen(true);
    }
  }, [ffmpegLoaded]);

  const closeDisclaimer = () => {
    setDisclaimerOpen(false);
    try {
      localStorage.setItem("mcsd_disclaimer_ack_v1", "1");
    } catch {
      void 0;
    }
  };

  const closeUpdateLogs = () => {
    setUpdateLogsOpen(false);
  };

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
    const sourceFiles = guideOpen && files.length === 0 ? getGuideDemoFiles() : files;
    const soundNames = buildCommandSoundNames(sourceFiles);

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
    if (step !== 2) return;
    if (vanillaEventOptions.length > 0 && !vanillaEventLoading && !vanillaEventLoadFailed) return;
    setVanillaEventLoading(true);
    setVanillaEventOptions(meta.platform === "bedrock" ? BEDROCK_VANILLA_EVENT_OPTIONS : JAVA_VANILLA_EVENT_OPTIONS);
    setVanillaEventLoading(false);
    setVanillaEventLoadFailed(false);
  }, [meta.modifyVanilla, meta.platform, step, vanillaEventLoadFailed, vanillaEventLoading, vanillaEventOptions.length]);

  useEffect(() => {
    if (meta.modifyVanilla && (files.length > 0 || (guideOpen && guidePhase === "vanilla" && step === 2))) return;
    guideAnchorsRef.current.step2VanillaEvent = null;
  }, [files.length, guideOpen, guidePhase, meta.modifyVanilla, step]);

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
    if (!ffmpegLoaded) return;
    let acked = false;
    try {
      acked = localStorage.getItem(GUIDE_ACK_KEY) === "1";
    } catch {
      acked = false;
    }
    if (acked) return;
    setGuideOpen(true);
    setGuidePhase("main");
    setGuideIndex(0);
  }, [ffmpegLoaded]);

  useEffect(() => {
    if (!guideOpen) return;
    setMeta((prev) => (prev.modifyVanilla ? { ...prev, modifyVanilla: false } : prev));
  }, [guideOpen]);

  useEffect(() => {
    if (guideOpen) {
      if (guideAutoFillRef.current) return;
      const sample: Pick<PackMeta, "name" | "key" | "desc"> = {
        name: "示例音频包",
        key: "demo",
        desc: "示例简介",
      };
      setMeta((prev) => {
        guideAutoFillRef.current = {
          original: { name: prev.name, key: prev.key, desc: prev.desc },
          sample,
        };
        return {
          ...prev,
          name: prev.name.trim() ? prev.name : sample.name,
          key: prev.key === DEFAULT_KEY ? sample.key : prev.key,
          desc: prev.desc.trim() ? prev.desc : sample.desc,
        };
      });
      return;
    }

    const info = guideAutoFillRef.current;
    guideAutoFillRef.current = null;
    if (!info) return;

    setMeta((prev) => {
      const next = { ...prev };
      if (!info.original.name.trim() && prev.name === info.sample.name) next.name = info.original.name;
      if (info.original.key === DEFAULT_KEY && prev.key === info.sample.key) next.key = info.original.key;
      if (!info.original.desc.trim() && prev.desc === info.sample.desc) next.desc = info.original.desc;
      return next;
    });
  }, [guideOpen]);

  useEffect(() => {
    if (!guideOpen) return;
    setGuideIndex(0);
  }, [guideOpen, step]);

  useEffect(() => {
    if (!guideOpen) {
      setGuideAnchorRect(null);
      return;
    }
    const items = buildImmersiveGuideItems({
      step,
      platform: meta.platform,
      guidePhase,
      processingError: processing.error,
      goToStep: noopGoToStep,
      startProcessing: noop,
      downloadPack: noop,
      enableModifyVanilla: noop,
      startVanillaGuide: noop,
    });
    const maxIndex = Math.max(0, items.length - 1);
    if (guideIndex > maxIndex) {
      setGuideIndex(maxIndex);
      return;
    }

    const item = items[guideIndex] ?? null;
    const anchorEl = item?.anchorKey ? guideAnchorsRef.current[item.anchorKey] : null;
    if (!anchorEl) {
      setGuideAnchorRect(null);
      return;
    }

    let raf = 0;
    const update = () => {
      const rect = anchorEl.getBoundingClientRect();
      const expand = 10;
      setGuideAnchorRect({
        top: Math.max(0, rect.top - expand),
        left: Math.max(0, rect.left - expand),
        width: rect.width + expand * 2,
        height: rect.height + expand * 2,
      });
    };
    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    try {
      anchorEl.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    } catch {
      void 0;
    }

    schedule();
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);

    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(schedule);
      ro.observe(anchorEl);
    } catch {
      ro = null;
    }

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [guideIndex, guideOpen, guidePhase, meta.platform, processing.error, step]);

  useEffect(() => {
    if (!guideOpen) return;
    if (guidePhase !== "vanilla") return;
    if (step !== 1) return;
    if (meta.modifyVanilla) {
      guideSecondRoundModifyVanillaOpenedRef.current = true;
      return;
    }
    if (guideSecondRoundModifyVanillaOpenedRef.current) return;

    const items = buildImmersiveGuideItems({
      step,
      platform: meta.platform,
      guidePhase: "vanilla",
      processingError: processing.error,
      goToStep: noopGoToStep,
      startProcessing: noop,
      downloadPack: noop,
      enableModifyVanilla: noop,
      startVanillaGuide: noop,
    });
    const itemTotal = items.length;
    if (itemTotal === 0) return;
    const itemIndex = Math.min(Math.max(0, guideIndex), itemTotal - 1);
    const item = items[itemIndex] ?? null;
    if (item?.anchorKey !== "step1ModifyVanilla") return;

    const timer = window.setTimeout(() => {
      setMeta((prev) => ({
        ...prev,
        modifyVanilla: true,
      }));
      guideSecondRoundModifyVanillaOpenedRef.current = true;
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [guideIndex, guideOpen, guidePhase, meta.modifyVanilla, meta.platform, processing.error, step]);

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
    setAudioProgress({});
  };

  const startVanillaGuide = () => {
    guideSecondRoundModifyVanillaOpenedRef.current = false;
    setGuidePhase("vanilla");
    setGuideIndex(0);
    setGuideAnchorRect(null);
    setStep(1);
    setMeta((prev) => ({
      ...prev,
      modifyVanilla: false,
    }));
  };

  const finishGuide = () => {
    try {
      localStorage.setItem(GUIDE_ACK_KEY, "1");
    } catch {
      void 0;
    }
    setGuideOpen(false);
    setGuideIndex(0);
    setGuideAnchorRect(null);
    resetAll();
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

  const onAddFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (addingFilesRef.current) return;
    addingFilesRef.current = true;

    try {
      const rawIncoming = Array.from(list).filter((f) => f.type.startsWith("audio/"));
      const incoming = rawIncoming.filter((f) => f.size <= FFMPEG_WASM_MAX_INPUT_BYTES);
      const skippedTooLarge = rawIncoming.length - incoming.length;
      if (incoming.length === 0) {
        if (skippedTooLarge > 0) {
          alert(`已跳过：文件过大 ${skippedTooLarge} 个（单个文件最大 ${formatBytes(FFMPEG_WASM_MAX_INPUT_BYTES)}）`);
        }
        return;
      }

      const current = filesRef.current;
      const usedNames = new Set(current.map((f) => f.newName));
      const usedHashes = new Set(current.map((f) => f.hash).filter(Boolean));

      const nextItems: FileItem[] = [];
      let skippedDuplicate = 0;
      let skippedNameConflict = 0;
      let skippedHashError = 0;

      for (const file of incoming) {
        let hash = "";
        try {
          hash = await getFileSha256(file);
        } catch {
          skippedHashError += 1;
          continue;
        }

        if (usedHashes.has(hash)) {
          skippedDuplicate += 1;
          continue;
        }

        const dot = file.name.lastIndexOf(".");
        const originalBase = dot > 0 ? file.name.slice(0, dot) : file.name;
        const base = processFileName(originalBase);
        const newName = clampText(base || "sound", 8);

        if (usedNames.has(newName)) {
          skippedNameConflict += 1;
          continue;
        }

        usedHashes.add(hash);
        usedNames.add(newName);
        nextItems.push({
          id: buildId(),
          originalFile: file,
          originalName: file.name,
          hash,
          newName,
          status: "pending",
          vanillaEvent: "",
          processedBlob: null,
        });
      }

      if (nextItems.length > 0) {
        setFiles((prev) => [...prev, ...nextItems]);
      }

      if (skippedDuplicate > 0 || skippedNameConflict > 0 || skippedHashError > 0 || skippedTooLarge > 0) {
        const parts: string[] = [];
        if (skippedDuplicate > 0) parts.push(`重复音频 ${skippedDuplicate} 个`);
        if (skippedNameConflict > 0) parts.push(`命名冲突 ${skippedNameConflict} 个`);
        if (skippedHashError > 0) parts.push(`哈希失败 ${skippedHashError} 个`);
        if (skippedTooLarge > 0)
          parts.push(`文件过大 ${skippedTooLarge} 个（单个文件最大 ${formatBytes(FFMPEG_WASM_MAX_INPUT_BYTES)}）`);
        alert(`已跳过：${parts.join("，")}`);
      }
    } finally {
      addingFilesRef.current = false;
    }
  };

  const onRemoveFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const onUpdateVanillaEvent = (id: string, value: string) => {
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, vanillaEvent: value } : f)));
  };

  const onRenameFile = (id: string, value: string) => {
    const next = sanitizeSoundName(value);
    if (!next) return "名称不能为空";

    const current = filesRef.current;
    if (current.some((f) => f.id !== id && f.newName === next)) return "名称已被占用";

    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, newName: next } : f)));
    return null;
  };

  const goToStep = (target: Step) => {
    if (guideOpen) {
      setGuideIndex(0);
      setGuideAnchorRect(null);
    }
    if (!guideOpen) {
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
    }

    setStep(target);
  };

  const startProcessing = async () => {
    goToStep(3);

    const total = files.length;
    if (total === 0) return;

    setConvertLogs([]);
    setAudioProgress(
      Object.fromEntries(files.map((f) => [f.id, { stage: "queued" as const, percent: 0 }]))
    );
    setProcessing({
      title: "准备开始处理...",
      desc: "即将开始检查与转换音频格式。",
      currentFile: "Starting...",
      percent: 0,
      error: null,
    });
    pushConvertLog(`开始处理：共 ${total} 个文件`);

    const results: Record<string, Blob> = {};
    const oggCandidates = files.filter(isMaybeOggFile);
    const oggReadyMap = new Map<string, { channels: number; sampleRate: number }>();
    if (oggCandidates.length > 0) {
      setProcessing({
        title: "正在检查 OGG 格式...",
        desc: "符合 Minecraft 规格的 OGG 将直接复用，无需转码。",
        currentFile: "Checking...",
        percent: 0,
        error: null,
      });
      pushConvertLog(`开始检查 OGG 格式：${oggCandidates.length} 个候选文件`);

      for (let i = 0; i < oggCandidates.length; i += 1) {
        const item = oggCandidates[i];
        setAudioProgress((prev) => ({
          ...prev,
          [item.id]: { stage: "checking", percent: prev[item.id]?.percent ?? 0 },
        }));
        setProcessing((prev) => ({
          ...prev,
          currentFile: `Checking: ${item.originalName}`,
        }));
        const info = await checkMinecraftOggReady(item.originalFile);
        if (info.ready && info.channels != null && info.sampleRate != null) {
          oggReadyMap.set(item.id, { channels: info.channels, sampleRate: info.sampleRate });
        }
        setProcessing((prev) => ({
          ...prev,
          percent: Math.min(99, Math.round((oggReadyMap.size / total) * 100)),
        }));
      }

      if (oggReadyMap.size > 0) {
        pushConvertLog(`检测到 ${oggReadyMap.size} 个合规 OGG：将跳过转码`);
        setAudioProgress((prev) => {
          const next = { ...prev };
          for (const id of oggReadyMap.keys()) next[id] = { stage: "skipped", percent: 100 };
          return next;
        });
        setFiles((prev) =>
          prev.map((f) =>
            oggReadyMap.has(f.id) ? { ...f, status: "done", processedBlob: f.originalFile } : f
          )
        );
        for (const f of files) {
          if (oggReadyMap.has(f.id)) results[f.id] = f.originalFile;
        }
      } else {
        pushConvertLog("未检测到可直接复用的合规 OGG");
      }

      setAudioProgress((prev) => {
        const next = { ...prev };
        for (const item of oggCandidates) {
          if (oggReadyMap.has(item.id)) continue;
          if (next[item.id]?.stage === "checking") next[item.id] = { stage: "queued", percent: 0 };
        }
        return next;
      });
    }

    const toConvert = files.filter((f) => !oggReadyMap.has(f.id));
    const baseDone = oggReadyMap.size;
    if (toConvert.length === 0) {
      setProcessing({
        title: "无需转换",
        desc: "全部音频已符合 Minecraft 的 OGG (Vorbis) 规格。",
        currentFile: "All files ready",
        percent: 100,
        error: null,
      });
      pushConvertLog("全部文件无需转码，跳过转换器加载");
      await sleep(1000);
      setFiles((prev) => prev.map((f) => ({ ...f, processedBlob: results[f.id] ?? f.processedBlob })));
      pushConvertLog("准备进入打包下载步骤");
      goToStep(4);
      return;
    }

    setProcessing({
      title: "正在加载转换器...",
      desc: "首次加载需要下载 wasm 资源，后续会更快。",
      currentFile: "Loading...",
      percent: Math.min(99, Math.round((baseDone / total) * 100)),
      error: null,
    });

    try {
      pushConvertLog("加载转换器中...");
      await ffmpeg.load();
      pushConvertLog("转换器已就绪");
    } catch {
      pushConvertLog("转换器加载失败", "error");
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
      percent: Math.min(99, Math.round((baseDone / total) * 100)),
      error: null,
    });

    for (let i = 0; i < toConvert.length; i += 1) {
      const item = toConvert[i];
      setFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: "processing" } : f))
      );

      setProcessing((prev) => ({
        ...prev,
        currentFile: `Processing: ${item.originalName}`,
      }));

      let unsubscribe: (() => void) | null = null;
      try {
        const indexLabel = baseDone + i + 1;
        setAudioProgress((prev) => ({ ...prev, [item.id]: { stage: "loading", percent: 0 } }));
        await sleep(1000);
        setAudioProgress((prev) => ({ ...prev, [item.id]: { stage: "converting", percent: 0 } }));
        pushConvertLog(`[${indexLabel}/${total}] 转换：${item.originalName} -> ${item.newName}.ogg`);
        unsubscribe = ffmpeg.onProgress(
          (p) => {
          setAudioProgress((prev) => ({
            ...prev,
            [item.id]: { stage: "converting", percent: Math.min(100, Math.max(0, p)) },
          }));
          const overall = Math.min(100, Math.round(((baseDone + i + p / 100) / total) * 100));
          setProcessing((prev) => ({ ...prev, percent: overall }));
          },
          { immediate: false }
        );
        const converted = await ffmpeg.toOGG(item.originalFile, { sampleRate: 44100, channels: 2 });
        results[item.id] = converted.blob;
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: "done", processedBlob: converted.blob } : f
          )
        );
        pushConvertLog(`[${indexLabel}/${total}] 完成：${item.newName}.ogg`);
        setAudioProgress((prev) => ({ ...prev, [item.id]: { stage: "done", percent: 100 } }));
        await sleep(1000);
      } catch (err) {
        pushConvertLog(
          `[${baseDone + i + 1}/${total}] 失败：${err instanceof Error ? err.message : "convert failed"}`,
          "error"
        );
        setAudioProgress((prev) => ({ ...prev, [item.id]: { stage: "error", percent: 0 } }));
        await sleep(1000);
        setFiles((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, status: "error" } : f))
        );
        setProcessing((prev) => ({
          ...prev,
          title: "转换失败",
          desc: "请尝试更换音频文件或刷新后重试。",
          error: err instanceof Error ? err.message : "convert failed",
        }));
        return;
      } finally {
        unsubscribe?.();
      }
    }

    pushConvertLog("全部文件转换完成，生成配置文件...");
    setProcessing((prev) => ({
      ...prev,
      title: "生成配置文件...",
      desc: "正在生成 sounds.json 与资源包元数据。",
      currentFile: "All files processed!",
      percent: 100,
    }));

    setFiles((prev) => prev.map((f) => ({ ...f, processedBlob: results[f.id] ?? f.processedBlob })));
    pushConvertLog("准备进入打包下载步骤");
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
      {(() => {
        if (!guideOpen) return null;
        const guideItems = buildImmersiveGuideItems({
          step,
          platform: meta.platform,
          guidePhase,
          processingError: processing.error,
          goToStep,
          startProcessing: () => {
            if (guidePhase === "vanilla") setGuidePhase("main");
            void startProcessing();
          },
          downloadPack: () => void downloadPack(),
          enableModifyVanilla: () =>
            setMeta((prev) => (prev.modifyVanilla ? prev : { ...prev, modifyVanilla: true })),
          startVanillaGuide,
        });
        const itemTotal = guideItems.length;
        if (itemTotal === 0) return null;
        const itemIndex = Math.min(Math.max(0, guideIndex), itemTotal - 1);
        const rawItem = guideItems[itemIndex];
        const isLast = itemIndex + 1 >= itemTotal;
        const item =
          isLast && guidePhase === "main" && step < 3 && !rawItem.primaryAction
            ? { ...rawItem, primaryLabel: rawItem.primaryLabel ?? "下一步" }
            : rawItem;
        const stepTitle =
          (
            {
              1: "基本信息",
              2: "导入音频",
              3: "格式转换",
              4: "打包下载",
              5: "生成命令",
            } as const
          )[step] ?? "引导";
        const guideTitle = guidePhase === "vanilla" ? "修改原版音频" : stepTitle;

        return (
          <ImmersiveGuideOverlay
            step={step}
            stepTitle={guideTitle}
            itemIndex={itemIndex}
            itemTotal={itemTotal}
            item={item}
            anchorRect={guideAnchorRect}
            onPrev={() => setGuideIndex((prev) => Math.max(0, prev - 1))}
            onNext={() => {
              if (itemIndex + 1 < itemTotal) {
                setGuideIndex((prev) => Math.min(itemTotal - 1, prev + 1));
                return;
              }
              if (item.primaryAction) {
                item.primaryAction();
                return;
              }
              if (guidePhase === "main" && step === 5) {
                finishGuide();
              }
            }}
            onSkip={finishGuide}
          />
        );
      })()}
      {disclaimerOpen ? <DisclaimerOverlay onClose={closeDisclaimer} /> : null}
      {updateLogsOpen ? <UpdateLogsOverlay onClose={closeUpdateLogs} /> : null}
      <div
        ref={contentRef}
        aria-hidden={overlayActive}
        className="mx-auto flex h-full max-w-6xl flex-col gap-4 p-4 md:gap-6 md:p-6 lg:flex-row lg:gap-8 lg:p-8"
      >
        <MobileStepBar
          step={step}
          ffmpegLoaded={ffmpegLoaded}
          ffmpegGiveUp={ffmpegGiveUp}
          ffmpegRetryCount={ffmpegRetryCount}
          ffmpegMaxRetries={3}
          onOpenUpdateLogs={() => setUpdateLogsOpen(true)}
        />
        <Sidebar
          step={step}
          ffmpegLoaded={ffmpegLoaded}
          ffmpegGiveUp={ffmpegGiveUp}
          ffmpegRetryCount={ffmpegRetryCount}
          ffmpegMaxRetries={3}
          onOpenUpdateLogs={() => setUpdateLogsOpen(true)}
        />

        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <TopBar />

          <div
            className={[
              "flex-1 p-4 md:p-6 lg:p-8",
              step === 5 || step === 3 ? "overflow-hidden" : "overflow-y-auto",
            ].join(" ")}
          >
            {step === 1 ? (
              <div className="mx-auto max-w-xl">
                <div className="mb-8 text-center">
                  <h2 className="mb-2 text-2xl font-extrabold text-slate-800">创建新的音频包</h2>
                  <p className="text-slate-500">填写资源包的基本元数据。</p>
                </div>

                <div className="space-y-6">
                  <div
                    ref={(el) => {
                      guideAnchorsRef.current.step1Icon = el;
                    }}
                  >
                    <IconPreview iconPreviewUrl={meta.iconPreviewUrl} onPick={onPickIcon} />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1Name = el;
                      }}
                      className="col-span-1 sm:col-span-2"
                    >
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

                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1Key = el;
                      }}
                      className="col-span-1 sm:col-span-2"
                    >
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

                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1Platform = el;
                      }}
                    >
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

                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1JavaPackFormat = el;
                      }}
                    >
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
                            选择版本不对不会影响使用，但如果版本不匹配，在新版本游戏里会有[不兼容]的提示
                          </p>
                        </>
                      ) : null}
                    </div>

                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1ModifyVanilla = el;
                      }}
                      className="col-span-1 sm:col-span-2"
                    >
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

                    <div
                      ref={(el) => {
                        guideAnchorsRef.current.step1Desc = el;
                      }}
                      className="col-span-1 sm:col-span-2"
                    >
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
                      ref={(el) => {
                        guideAnchorsRef.current.step1Next = el;
                      }}
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
                <div className="mb-6 flex shrink-0 flex-row gap-4 sm:flex-row sm:items-center sm:justify-between items-center justify-center">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-800">添加音频文件</h2>
                    <p className="text-sm text-slate-500">
                      {meta.modifyVanilla ? "选择要替换的原版声音事件。" : "拖入文件，系统将自动重命名。"}
                    </p>
                  </div>

                  <div>
                    <label
                      ref={(el) => {
                        guideAnchorsRef.current.step2AddFiles = el;
                      }}
                      className="inline-flex cursor-pointer items-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:bg-sky-300"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      添加文件
                      <input
                        type="file"
                        multiple
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => void onAddFiles(e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                <div
                  ref={(el) => {
                    guideAnchorsRef.current.step2DropZone = el;
                  }}
                  className="flex-1 min-h-0"
                >
                  <FileDropZone
                    guideDemo={guideOpen}
                    modifyVanilla={meta.modifyVanilla}
                    files={files}
                    onAddFiles={onAddFiles}
                    onRemoveFile={onRemoveFile}
                    onRenameFile={onRenameFile}
                    onUpdateVanillaEvent={onUpdateVanillaEvent}
                    onVanillaEventAnchor={(el) => {
                      if (!meta.modifyVanilla) return;
                      guideAnchorsRef.current.step2VanillaEvent = el;
                    }}
                    vanillaEventOptions={vanillaEventOptions}
                    vanillaEventLoading={vanillaEventLoading}
                    vanillaEventLoadFailed={vanillaEventLoadFailed}
                  />
                </div>

                <div className="mt-4 flex shrink-0 flex-col gap-4 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm font-bold text-slate-500">
                    已添加 <span className="text-sky-500">{fileCount}</span> 个文件
                  </span>
                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <button
                      type="button"
                      onClick={() => goToStep(1)}
                      className="inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 sm:w-auto"
                    >
                      上一步
                    </button>
                    <button
                      ref={(el) => {
                        guideAnchorsRef.current.step2StartProcessing = el;
                      }}
                      type="button"
                      disabled={!canStartProcess && !guideOpen}
                      onClick={() => void startProcessing()}
                      className={[
                        "inline-flex w-full items-center justify-center rounded-xl bg-sky-400 px-6 py-3 font-bold text-white shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition hover:-translate-y-0.5 hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0 sm:w-auto",
                      ].join(" ")}
                    >
                      开始处理 <Play className="ml-2 h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="mx-auto flex h-full min-h-0 max-w-5xl flex-col gap-4 overflow-hidden">
                {(() => {
                  const viewFiles = guideOpen && files.length === 0 ? getGuideDemoFiles() : files;
                  const viewFileCount = viewFiles.length;
                  const viewFinishedAudioCount = viewFiles.reduce((sum, f) => {
                    const stage = audioProgress[f.id]?.stage;
                    if (stage === "done" || stage === "skipped") return sum + 1;
                    if (!stage && f.status === "done") return sum + 1;
                    return sum;
                  }, 0);

                  return (
                    <>
                <div
                  ref={(el) => {
                    guideAnchorsRef.current.step3ProgressCard = el;
                  }}
                  className="shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="border-b border-slate-100 px-3 py-3 sm:px-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div>
                        <div className="text-sm font-extrabold text-slate-800">格式转换进度</div>
                        <div className="text-[11px] font-bold text-slate-400 sm:text-xs">
                          总进度 {processing.percent}% · 已完成 {viewFinishedAudioCount}/{viewFileCount}
                        </div>
                      </div>
                      <div className="wrap-break-word max-w-full rounded bg-slate-50 px-3 py-1 font-mono text-[11px] text-slate-400 sm:text-xs">
                        {processing.currentFile}
                      </div>
                    </div>

                    <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${processing.percent}%` }}
                      />
                    </div>

                    {processing.error ? (
                      <div className="mt-3 flex justify-end">
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

                  <div className="max-h-56 overflow-y-auto sm:max-h-80">
                    {viewFiles.length ? (
                      <div className="divide-y divide-slate-100">
                        {viewFiles.map((f) => {
                          const stage = audioProgress[f.id]?.stage;
                          const percent = audioProgress[f.id]?.percent ?? 0;
                          const viewStage =
                            stage ??
                            (f.status === "error"
                              ? ("error" as const)
                              : f.status === "done"
                                ? ("done" as const)
                                : f.status === "processing"
                                  ? ("converting" as const)
                                  : ("queued" as const));

                          const rowActive =
                            viewStage === "checking" ||
                            viewStage === "loading" ||
                            viewStage === "converting";
                          const rowClass = [
                            "flex items-center justify-between gap-3 px-3 py-2.5 transition-colors duration-1000 sm:px-4 sm:py-3",
                            rowActive ? "bg-sky-50" : "bg-white",
                          ].join(" ");

                          return (
                            <div key={f.id} className={rowClass}>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-slate-700">
                                  {f.originalName}
                                </div>
                                {viewStage === "skipped" ? (
                                  <div className="mt-1 inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-500">
                                    符合格式，已跳过
                                  </div>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="transition-opacity duration-1000">
                                  {viewStage === "loading" || viewStage === "checking" ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
                                  ) : viewStage === "converting" ? (
                                    <CircleProgress percent={percent} />
                                  ) : viewStage === "skipped" ? (
                                    <ChevronDown className="h-5 w-5 text-slate-400" />
                                  ) : viewStage === "done" ? (
                                    <Check className="h-5 w-5 text-emerald-500" />
                                  ) : viewStage === "error" ? (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="px-3 py-6 text-center text-sm font-bold text-slate-400 sm:px-4">
                        暂无音频
                      </div>
                    )}
                  </div>
                </div>

                <div
                  ref={(el) => {
                    guideAnchorsRef.current.step3LogCard = el;
                  }}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="shrink-0 border-b border-slate-100 px-3 py-3 sm:px-4">
                    <div className="text-sm font-extrabold text-slate-800">转换日志</div>
                    <div className="text-[11px] font-bold text-slate-400 sm:text-xs">仅显示最近 300 条</div>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 px-3 py-3 font-mono text-[10px] text-slate-600 sm:px-4 sm:text-xs">
                    {convertLogs.length ? (
                      <div className="space-y-1">
                        {convertLogs.map((line) => (
                          <div
                            key={line.id}
                            className={line.level === "error" ? "text-red-600" : "text-slate-600"}
                          >
                            <span className="text-slate-400">
                              {new Date(line.at).toLocaleTimeString("zh-CN", { hour12: false })}
                            </span>
                            <span className="px-2 text-slate-300">|</span>
                            <span className="wrap-break-word">{line.message}</span>
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    ) : (
                      <div className="text-slate-400">暂无日志</div>
                    )}
                  </div>
                </div>
                    </>
                  );
                })()}
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
                  ref={(el) => {
                    guideAnchorsRef.current.step4Download = el;
                  }}
                  type="button"
                  onClick={() => void downloadPack()}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-sky-400 px-6 py-3 text-base font-bold text-white shadow-xl shadow-sky-200 transition hover:-translate-y-0.5 hover:bg-sky-300 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  下载资源包 (.{meta.platform === "bedrock" ? "mcpack" : "zip"})
                </button>

                <button
                  ref={(el) => {
                    guideAnchorsRef.current.step4Next = el;
                  }}
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
                      ref={(el) => {
                        guideAnchorsRef.current.step5DownloadTxt = el;
                      }}
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
                    const sourceFiles = guideOpen && files.length === 0 ? getGuideDemoFiles() : files;
                    const soundNames = buildCommandSoundNames(sourceFiles);

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
      {meta.modifyVanilla && step === 2 && files.length > 0 && vanillaEventOptions.length > 0 ? (
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
  guideDemo,
  modifyVanilla,
  files,
  onAddFiles,
  onRemoveFile,
  onRenameFile,
  onUpdateVanillaEvent,
  onVanillaEventAnchor,
  vanillaEventOptions,
  vanillaEventLoading,
  vanillaEventLoadFailed,
}: {
  guideDemo: boolean;
  modifyVanilla: boolean;
  files: FileItem[];
  onAddFiles: (list: FileList | null) => void | Promise<void>;
  onRemoveFile: (id: string) => void;
  onRenameFile: (id: string, value: string) => string | null;
  onUpdateVanillaEvent: (id: string, value: string) => void;
  onVanillaEventAnchor?: (el: HTMLElement | null) => void;
  vanillaEventOptions: VanillaEventOption[];
  vanillaEventLoading: boolean;
  vanillaEventLoadFailed: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingError, setEditingError] = useState<string | null>(null);
  const inlineInputRef = useRef<HTMLInputElement | null>(null);

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameDialogId, setRenameDialogId] = useState<string | null>(null);
  const [renameDialogValue, setRenameDialogValue] = useState("");
  const [renameDialogError, setRenameDialogError] = useState<string | null>(null);
  const dialogInputRef = useRef<HTMLInputElement | null>(null);
  const lastActiveRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!renameDialogOpen) return;
    lastActiveRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    requestAnimationFrame(() => {
      dialogInputRef.current?.focus();
    });
    return () => {
      lastActiveRef.current?.focus?.();
    };
  }, [renameDialogOpen]);

  const beginInlineEdit = (item: FileItem) => {
    setEditingId(item.id);
    setEditingValue(item.newName);
    setEditingError(null);
    requestAnimationFrame(() => {
      inlineInputRef.current?.focus();
      inlineInputRef.current?.select();
    });
  };

  const cancelInlineEdit = () => {
    setEditingId(null);
    setEditingValue("");
    setEditingError(null);
  };

  const commitInlineEdit = (id: string) => {
    const err = onRenameFile(id, editingValue);
    if (err) {
      setEditingError(err);
      requestAnimationFrame(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      });
      return;
    }
    cancelInlineEdit();
  };

  const openRenameDialog = (item: FileItem) => {
    setRenameDialogId(item.id);
    setRenameDialogValue(item.newName);
    setRenameDialogError(null);
    setRenameDialogOpen(true);
  };

  const closeRenameDialog = () => {
    setRenameDialogOpen(false);
    setRenameDialogId(null);
    setRenameDialogValue("");
    setRenameDialogError(null);
  };

  const submitRenameDialog = () => {
    if (!renameDialogId) return;
    const err = onRenameFile(renameDialogId, renameDialogValue);
    if (err) {
      setRenameDialogError(err);
      requestAnimationFrame(() => {
        dialogInputRef.current?.focus();
        dialogInputRef.current?.select();
      });
      return;
    }
    closeRenameDialog();
  };

  const renameDialogItem = renameDialogId ? (files.find((f) => f.id === renameDialogId) ?? null) : null;

  return (
    <div
      className={[
        "relative h-full min-h-0 overflow-y-auto rounded-2xl border-4 border-dashed bg-slate-50 p-4 transition",
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
        void onAddFiles(e.dataTransfer.files);
      }}
    >
      {files.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="pointer-events-none flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-sky-500">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-700">拖放音频文件到这里</h3>
            <p className="mt-1 text-sm text-slate-400">支持 MP3, WAV, OGG 等音频格式</p>
            <div className="mt-4 w-full max-w-md rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-left">
              <div className="text-[11px] font-extrabold text-slate-500">文件大小提示</div>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-[11px] font-bold leading-relaxed text-slate-400">
                <li>单个文件建议 ≤ 100MB（不同浏览器内存策略不同，过大可能卡死）</li>
                <li>单个文件超过 {formatBytes(FFMPEG_WASM_MAX_INPUT_BYTES)} 将被跳过</li>
              </ul>
            </div>
          </div>

          {guideDemo ? (
            <div className="pointer-events-none mt-8 w-full max-w-2xl text-left">
              <div className="mb-2 text-xs font-extrabold text-slate-400">示例（引导模式）</div>
              {modifyVanilla ? (
                <div className="grid gap-3">
                  {[
                    {
                      originalName: "demo_song.mp3",
                      newName: "song1",
                      vanillaEvent: "minecraft:entity.player.hurt",
                    },
                    {
                      originalName: "bgm.ogg",
                      newName: "bgm1",
                      vanillaEvent: "minecraft:music.overworld",
                    },
                  ].map((item, idx) => (
                    <div
                      key={item.originalName}
                      className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 text-xs text-slate-400">已上传文件</div>
                        <div className="truncate text-sm font-bold text-slate-700" title={item.originalName}>
                          {item.originalName}
                        </div>
                        <div className="mt-2 flex flex-col items-start gap-1 text-sm font-bold text-slate-700 sm:flex-row sm:items-center sm:gap-2">
                          <span className="text-xs font-bold text-slate-400">重命名</span>
                          <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600">{item.newName}</span>
                        </div>
                      </div>

                      <div className="hidden text-slate-300 sm:block">
                        <ArrowRight className="h-4 w-4" />
                      </div>

                      <div ref={idx === 0 ? onVanillaEventAnchor : undefined} className="min-w-0 flex-1">
                        <div className="mb-1 text-xs text-sky-500">替换原版事件（可选）</div>
                        <input
                          list="vanilla-events"
                          disabled
                          readOnly
                          placeholder={
                            vanillaEventLoading
                              ? "正在加载事件列表..."
                              : vanillaEventLoadFailed
                                ? "事件列表加载失败，请刷新页面"
                                : "留空则不替换"
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                          value={item.vanillaEvent}
                        />
                        <div className="mt-1 text-[11px] font-bold text-slate-400">
                          {vanillaEventLoading
                            ? "正在加载..."
                            : vanillaEventLoadFailed
                              ? "加载失败"
                              : `已加载 ${vanillaEventOptions.length} 个事件`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate text-xs text-slate-400" title="demo_song.mp3">
                        demo_song.mp3
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <ArrowRight className="h-3 w-3 text-sky-500" />
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600">song1</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 truncate text-xs text-slate-400" title="bgm.ogg">
                        bgm.ogg
                      </div>
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <ArrowRight className="h-3 w-3 text-sky-500" />
                        <span className="rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600">bgm1</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
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
                "group rounded-xl border bg-white p-4 shadow-sm transition",
                modifyVanilla
                  ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  : "flex items-center justify-between gap-4",
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
                    <div className="mt-2 flex flex-col items-start gap-1 text-sm font-bold text-slate-700 sm:flex-row sm:items-center sm:gap-2">
                      <span className="text-xs font-bold text-slate-400">重命名</span>
                      {editingId === f.id ? (
                        <div className="min-w-0">
                          <input
                            ref={inlineInputRef}
                            value={editingValue}
                            onChange={(e) => {
                              setEditingError(null);
                              setEditingValue(sanitizeSoundName(e.target.value));
                            }}
                            onBlur={() => commitInlineEdit(f.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                commitInlineEdit(f.id);
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                cancelInlineEdit();
                              }
                            }}
                            className="w-28 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 outline-none ring-1 ring-sky-200 transition focus:bg-white focus:ring-2 focus:ring-sky-400"
                          />
                          {editingError ? (
                            <div className="mt-1 text-[11px] font-bold text-red-500">{editingError}</div>
                          ) : null}
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openRenameDialog(f)}
                            className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 transition hover:bg-sky-100 md:hidden"
                          >
                            {f.newName}
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => beginInlineEdit(f)}
                            className="hidden items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 transition hover:bg-sky-100 md:inline-flex"
                          >
                            {f.newName}
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="hidden text-slate-300 sm:block">
                    <ArrowRight className="h-4 w-4" />
                  </div>

                  <div
                    ref={f === files[0] ? onVanillaEventAnchor : undefined}
                    className="min-w-0 flex-1"
                  >
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
                    {editingId === f.id ? (
                      <div className="min-w-0">
                        <input
                          ref={inlineInputRef}
                          value={editingValue}
                          onChange={(e) => {
                            setEditingError(null);
                            setEditingValue(sanitizeSoundName(e.target.value));
                          }}
                          onBlur={() => commitInlineEdit(f.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              commitInlineEdit(f.id);
                            }
                            if (e.key === "Escape") {
                              e.preventDefault();
                              cancelInlineEdit();
                            }
                          }}
                          className="w-28 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 outline-none ring-1 ring-sky-200 transition focus:bg-white focus:ring-2 focus:ring-sky-400"
                        />
                        {editingError ? (
                          <div className="mt-1 text-[11px] font-bold text-red-500">{editingError}</div>
                        ) : null}
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => openRenameDialog(f)}
                          className="inline-flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 transition hover:bg-sky-100 md:hidden"
                        >
                          {f.newName}
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => beginInlineEdit(f)}
                          className="hidden items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 font-mono text-sky-600 transition hover:bg-sky-100 md:inline-flex"
                        >
                          {f.newName}
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveFile(f.id)}
                className="self-end rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-500 sm:self-auto"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {renameDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRenameDialog();
          }}
          onKeyDownCapture={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              closeRenameDialog();
            }
            if (e.key === "Enter") {
              e.preventDefault();
              submitRenameDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl outline-none"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-800">重命名音频</div>
                <div className="mt-1 text-sm text-slate-500">仅支持 a-z、0-9，最多 8 位</div>
              </div>
              <button
                type="button"
                aria-label="关闭"
                onClick={closeRenameDialog}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4">
              {renameDialogItem ? (
                <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-[11px] font-bold text-slate-400">音频原名称</div>
                  <div
                    className="mt-0.5 truncate text-sm font-bold text-slate-700"
                    title={renameDialogItem.originalName}
                  >
                    {renameDialogItem.originalName}
                  </div>
                </div>
              ) : null}
              <input
                ref={dialogInputRef}
                value={renameDialogValue}
                onChange={(e) => {
                  setRenameDialogError(null);
                  setRenameDialogValue(sanitizeSoundName(e.target.value));
                }}
                className="w-full rounded-xl border-2 border-transparent bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(224,242,254,1)]"
                placeholder="例如：sound1"
              />
              {renameDialogError ? (
                <div className="mt-2 text-sm font-bold text-red-500">{renameDialogError}</div>
              ) : null}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeRenameDialog}
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitRenameDialog}
                className="inline-flex items-center rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-300"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
