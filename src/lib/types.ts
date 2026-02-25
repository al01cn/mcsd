export type PackPlatform = "java" | "bedrock";

export type Step = 1 | 2 | 3 | 4 | 5;

export type VanillaEventMapping = {
  event: string;
  weight: number;
  pitch: number;
  volume: number;
};

export type FileItem = {
  id: string;
  originalFile: File;
  originalName: string;
  hash: string;
  newName: string;
  status: "pending" | "processing" | "done" | "error";
  vanillaEvents: VanillaEventMapping[];
  processedBlob: Blob | null;
};

export type PackMeta = {
  name: string;
  key: string;
  desc: string;
  platform: PackPlatform;
  javaPackFormat: string;
  javaVersion: string;
  iconFile: File | null;
  iconPreviewUrl: string | null;
  modifyVanilla: boolean;
};

export type AudioProgressStage = "queued" | "checking" | "loading" | "converting" | "skipped" | "done" | "error";

export type AudioProgressItem = {
  stage: AudioProgressStage;
  percent: number;
};

export type ConvertLogItem = {
  id: string;
  at: number;
  level: "info" | "error";
  message: string;
};
