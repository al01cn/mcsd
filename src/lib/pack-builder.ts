import type { FileItem, PackMeta } from "./types";
import JSZip from "jszip";
import { DEFAULT_KEY } from "./utils";

export function parsePackFormatText(input: string): { raw: string; major: number; minor: number } | null {
  const raw = input.trim();
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return null;
  const [majorText, minorText] = raw.split(".", 2);
  if (majorText.length > 1 && majorText.startsWith("0")) return null;
  const major = Number(majorText);
  const minor = minorText ? Number(minorText) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor)) return null;
  if (major <= 0 || minor < 0) return null;
  return { raw, major, minor };
}

export function buildJavaPackMcmetaText(packFormatRaw: string, description: string) {
  const parsed = parsePackFormatText(packFormatRaw);
  const safe = parsed ?? { raw: "15", major: 15, minor: 0 };
  const descriptionJson = JSON.stringify(description);

  if (safe.major >= 65) {
    return `{
  "pack": {
    "pack_format": ${safe.raw},
    "description": ${descriptionJson},
    "min_format": [${safe.raw}, 0],
    "max_format": [${safe.raw}, 0]
  }
}`;
  }

  if (safe.major >= 16) {
    return `{
  "pack": {
    "pack_format": ${safe.raw},
    "description": ${descriptionJson},
    "supported_formats": [${safe.major}, ${safe.major}]
  }
}`;
  }

  return `{
  "pack": {
    "pack_format": ${safe.raw},
    "description": ${descriptionJson}
  }
}`;
}

export function buildJavaSoundsJson(
  key: string,
  files: Array<Pick<FileItem, "id" | "newName" | "vanillaEvents">>,
  modifyVanilla: boolean
) {
  const soundsJson: Record<string, unknown> = {};
  for (const f of files) {
    const soundPath = `${key}/${f.newName}`;
    const mappings = modifyVanilla ? (f.vanillaEvents ?? []) : [];
    if (mappings.length > 0) {
      const seen = new Set<string>();
      for (const mapping of mappings) {
        const eventKey = mapping.event.trim();
        if (!eventKey || seen.has(eventKey)) continue;
        seen.add(eventKey);

        const existing = soundsJson[eventKey] as
          | {
              replace?: boolean;
              sounds?: Array<{ name: string; stream?: boolean; weight?: number; pitch?: number; volume?: number }>;
            }
          | undefined;
        const sounds = Array.isArray(existing?.sounds) ? [...existing.sounds] : [];
        sounds.push(
          [
            { name: `${soundPath}`, stream: true },
            Number.isFinite(mapping.weight) && mapping.weight > 0 ? { weight: mapping.weight } : null,
            Number.isFinite(mapping.pitch) ? { pitch: mapping.pitch } : null,
            Number.isFinite(mapping.volume) ? { volume: mapping.volume } : null,
          ].reduce((acc, part) => (part ? { ...acc, ...part } : acc), {} as Record<string, unknown>) as any
        );
        
        soundsJson[eventKey] = {
          replace: true,
          sounds,
        };
      }
      continue;
    }

    const customKey = `${key}.${f.newName}`;
    const existing = soundsJson[customKey] as
      | { sounds?: Array<{ name: string; stream?: boolean }> }
      | undefined;
    const sounds = Array.isArray(existing?.sounds) ? [...existing.sounds] : [];
    sounds.push({ name: `${soundPath}`, stream: true });
    
    soundsJson[customKey] = {
      sounds,
    };
  }
  return soundsJson;
}

export function buildBedrockSoundDefinitions(
  key: string,
  files: Array<Pick<FileItem, "id" | "newName" | "vanillaEvents">>,
  modifyVanilla: boolean
) {
  const definitions: Record<string, unknown> = {
    format_version: "1.14.0",
    sound_definitions: {},
  };

  const soundDefinitions = definitions.sound_definitions as Record<
    string,
    {
      category: string;
      sounds: Array<string | { name: string; volume?: number; pitch?: number; weight?: number }>;
    }
  >;

  for (const f of files) {
    const soundValue = `sounds/${key}/${f.newName}`;
    const mappings = modifyVanilla ? (f.vanillaEvents ?? []) : [];
    if (mappings.length > 0) {
      const seen = new Set<string>();
      for (const mapping of mappings) {
        const eventKey = mapping.event.trim();
        if (!eventKey || seen.has(eventKey)) continue;
        seen.add(eventKey);

        const existing = soundDefinitions[eventKey];
        if (existing) {
          const already = existing.sounds.some((s) => (typeof s === "string" ? s === soundValue : s?.name === soundValue));
          if (!already) {
            existing.sounds = [
              ...existing.sounds,
              [
                { name: soundValue },
                Number.isFinite(mapping.volume) ? { volume: mapping.volume } : null,
                Number.isFinite(mapping.pitch) ? { pitch: mapping.pitch } : null,
                Number.isFinite(mapping.weight) && mapping.weight > 0 ? { weight: mapping.weight } : null,
              ].reduce((acc, part) => (part ? { ...acc, ...part } : acc), {} as Record<string, unknown>) as any,
            ];
          }
          continue;
        }
        
        soundDefinitions[eventKey] = {
          category: "record",
          sounds: [
            [
              { name: soundValue },
              Number.isFinite(mapping.volume) ? { volume: mapping.volume } : null,
              Number.isFinite(mapping.pitch) ? { pitch: mapping.pitch } : null,
              Number.isFinite(mapping.weight) && mapping.weight > 0 ? { weight: mapping.weight } : null,
            ].reduce((acc, part) => (part ? { ...acc, ...part } : acc), {} as Record<string, unknown>) as any,
          ],
        };
      }
      continue;
    }

    const customKey = `${key}.${f.newName}`;
    const existing = soundDefinitions[customKey];
    if (existing) {
      if (!existing.sounds.includes(soundValue)) existing.sounds = [...existing.sounds, soundValue];
      continue;
    }
    
    soundDefinitions[customKey] = {
      category: "record",
      sounds: [soundValue],
    };
  }

  return definitions;
}

export async function generatePackZip(meta: PackMeta, files: FileItem[]): Promise<Blob> {
  const zip = new JSZip();
  const safeName = meta.name.trim() || "SoundPack";
  const key = meta.key.trim() || DEFAULT_KEY;
  const description = (meta.desc.trim() ? `${meta.desc.trim()} ` : "") + "By mcsd";

  if (meta.platform === "java") {
    // Java Pack
    zip.file("pack.mcmeta", buildJavaPackMcmetaText(meta.javaPackFormat, description));
    
    if (meta.iconFile) {
      zip.file("pack.png", meta.iconFile);
    }

    const soundsJson = buildJavaSoundsJson(key, files, meta.modifyVanilla);
    zip.file("assets/minecraft/sounds.json", JSON.stringify(soundsJson, null, 2));

    const soundsFolder = zip.folder(`assets/minecraft/sounds/${key}`);
    if (soundsFolder) {
      for (const file of files) {
        if (file.processedBlob) {
          soundsFolder.file(`${file.newName}.ogg`, file.processedBlob);
        }
      }
    }
  } else {
    // Bedrock Pack
    const manifest = {
      format_version: 2,
      header: {
        description: description,
        name: safeName,
        uuid: crypto.randomUUID(),
        version: [1, 0, 0],
        min_engine_version: [1, 16, 0]
      },
      modules: [
        {
          description: description,
          type: "resources",
          uuid: crypto.randomUUID(),
          version: [1, 0, 0]
        }
      ]
    };
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    
    if (meta.iconFile) {
      zip.file("pack_icon.png", meta.iconFile);
    }

    const soundDefinitions = buildBedrockSoundDefinitions(key, files, meta.modifyVanilla);
    zip.file("sounds/sound_definitions.json", JSON.stringify(soundDefinitions, null, 2));

    const soundsFolder = zip.folder(`sounds/${key}`);
    if (soundsFolder) {
      for (const file of files) {
        if (file.processedBlob) {
          soundsFolder.file(`${file.newName}.ogg`, file.processedBlob);
        }
      }
    }
  }

  return await zip.generateAsync({ type: "blob" });
}
