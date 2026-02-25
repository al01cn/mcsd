import { pinyin } from "pinyin-pro";
import type { PackPlatform, FileItem } from "./types";

export const DEFAULT_KEY = "mcsd";
export const AUTO_DESC_SUFFIX = "By mcsd";
export const NAME_MAX_LENGTH = 10;
export const JAVA_DESC_MAX_LENGTH = 20;
export const BEDROCK_DESC_MAX_LENGTH = 40;

export function normalizeKey(input: string) {
  const cleaned = input.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return cleaned.length ? cleaned.slice(0, 5) : DEFAULT_KEY;
}

export function isChinese(text: string) {
  return /[\u4e00-\u9fa5]/.test(text);
}

export function clampText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

export function processFileName(name: string) {
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

export function getAudioBaseName(name: string) {
  const base = name.trim();
  if (!base) return "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export function collectDuplicateFileNameIds(items: Array<Pick<FileItem, "id" | "newName">>) {
  const nameToIds = new Map<string, string[]>();
  for (const item of items) {
    const name = item.newName.trim().toLowerCase();
    if (!name) continue;
    const existing = nameToIds.get(name);
    if (existing) {
      existing.push(item.id);
    } else {
      nameToIds.set(name, [item.id]);
    }
  }
  const duplicatedIds = new Set<string>();
  for (const ids of nameToIds.values()) {
    if (ids.length <= 1) continue;
    for (const id of ids) duplicatedIds.add(id);
  }
  return duplicatedIds;
}

export function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function formatBytes(bytes: number) {
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

export function getDescLimit(platform: PackPlatform) {
  return platform === "bedrock" ? BEDROCK_DESC_MAX_LENGTH : JAVA_DESC_MAX_LENGTH;
}

export function buildPackDescription(desc: string) {
  const trimmed = desc.trim();
  return trimmed ? `${trimmed} ${AUTO_DESC_SUFFIX}` : AUTO_DESC_SUFFIX;
}

export function clampDescForPlatform(desc: string, platform: PackPlatform) {
  const limit = getDescLimit(platform);
  const base = desc.trim();
  const extra = base ? 1 : 0;
  const maxBaseLen = Math.max(0, limit - AUTO_DESC_SUFFIX.length - extra);
  return clampText(base, maxBaseLen);
}

export function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function readFileHead(file: File, maxBytes: number): Promise<Uint8Array> {
  const size = Math.min(file.size, maxBytes);
  const buf = await file.slice(0, size).arrayBuffer();
  return new Uint8Array(buf);
}

function bytesToAscii(bytes: Uint8Array, start: number, len: number) {
  let out = "";
  for (let i = 0; i < len; i += 1) out += String.fromCharCode(bytes[start + i] ?? 0);
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
      if (segLen > 0) packetChunks.push(bytes.subarray(cursor, cursor + segLen));
      cursor += segLen;
      if (segLen < 255) return concatBytes(packetChunks);
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

export function isMaybeOggFile(input: Pick<FileItem, "originalFile" | "originalName">) {
  return input.originalFile.type === "audio/ogg" || input.originalName.toLowerCase().endsWith(".ogg");
}

export async function checkMinecraftOggReady(file: File): Promise<{ ready: boolean; channels: number | null; sampleRate: number | null }> {
  const head = await readFileHead(file, 256 * 1024);
  const vorbis = getOggVorbisIdHeaderInfo(head);
  if (!vorbis) {
    return { ready: false, channels: null, sampleRate: null };
  }

  const channelsOk = vorbis.channels === 2;
  const sampleRateOk = vorbis.sampleRate === 44100;
  return { ready: channelsOk && sampleRateOk, channels: vorbis.channels, sampleRate: vorbis.sampleRate };
}
