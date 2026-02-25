<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Package, FileText, Loader2, FolderOpen, Copy } from 'lucide-vue-next';
import JSZip from 'jszip';
import type { FileItem, PackMeta, SubtitleContext } from '../../lib/types';
import { buildJavaPackMcmetaText, buildJavaSoundsJson, buildBedrockSoundDefinitions } from '../../lib/pack-builder';
import { DEFAULT_KEY, buildPackDescription, normalizeKey, uuid } from '../../lib/utils';
import { localCache } from '../../lib/cache';

const props = defineProps<{
  files: FileItem[];
  meta: PackMeta;
  subtitles?: SubtitleContext;
}>();

const emit = defineEmits<{
  (e: 'create-new'): void;
}>();

const packOutputDir = localCache.get<string>('settings:packOutputDir', null);

const exporting = ref(false);
const exportedPath = ref<string | null>(null);
const exportError = ref<string | null>(null);
const copiedCommand = ref<string | null>(null);

const ext = computed(() => (props.meta.platform === 'bedrock' ? 'mcpack' : 'zip'));

const safeName = computed(() => {
  const name = props.meta.name.trim() || 'SoundPack';
  const cleaned = name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').trim();
  return cleaned.length ? cleaned.slice(0, 80) : 'SoundPack';
});

const fileName = computed(() => `${safeName.value}.${ext.value}`);

const readyFiles = computed(() => props.files.filter((f) => f.processedBlob && f.status === 'done'));
const isReady = computed(() => readyFiles.value.length === props.files.length && props.files.length > 0);

const buildZipBytes = async () => {
  const zip = new JSZip();
  const key = normalizeKey(props.meta.key || DEFAULT_KEY);
  const desc = buildPackDescription(props.meta.desc);

  if (props.meta.platform === 'java') {
    zip.file('pack.mcmeta', buildJavaPackMcmetaText(props.meta.javaPackFormat, desc));
    if (props.meta.iconFile) zip.file('pack.png', props.meta.iconFile);

    const soundsJson = buildJavaSoundsJson(key, readyFiles.value, props.meta.modifyVanilla, props.subtitles);
    zip.file('assets/minecraft/sounds.json', JSON.stringify(soundsJson, null, 2));

    const soundFolder = zip.folder(`assets/minecraft/sounds/${key}`);
    if (soundFolder) {
      for (const file of readyFiles.value) {
        if (file.processedBlob) soundFolder.file(`${file.newName}.ogg`, file.processedBlob);
      }
    }
  } else {
    const manifest = {
      format_version: 2,
      header: {
        description: desc,
        name: safeName.value,
        uuid: uuid(),
        version: [1, 0, 0],
        min_engine_version: [1, 16, 0],
      },
      modules: [
        {
          type: 'resources',
          uuid: uuid(),
          version: [1, 0, 0],
        },
      ],
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    if (props.meta.iconFile) zip.file('pack_icon.png', props.meta.iconFile);

    const definitions = buildBedrockSoundDefinitions(key, readyFiles.value, props.meta.modifyVanilla, props.subtitles);
    zip.file('sounds/sound_definitions.json', JSON.stringify(definitions, null, 2));

    const soundFolder = zip.folder(`sounds/${key}`);
    if (soundFolder) {
      for (const file of readyFiles.value) {
        if (file.processedBlob) soundFolder.file(`${file.newName}.ogg`, file.processedBlob);
      }
    }
  }

  return zip.generateAsync({ type: 'uint8array' });
};

const exportPack = async () => {
  if (exporting.value) return;
  exportedPath.value = null;
  exportError.value = null;

  if (!isReady.value) {
    exportError.value = '存在未成功转换的文件，请返回重新处理后再导出。';
    return;
  }

  const directory = typeof packOutputDir.value === 'string' ? packOutputDir.value.trim() : '';
  if (!directory) {
    exportError.value = '请先在设置中选择音频包输出路径。';
    return;
  }

  exporting.value = true;
  try {
    const bytes = await buildZipBytes();
    const savedPath = await window.ipcRenderer.invoke('pack:saveToDirectory', {
      directory,
      fileName: fileName.value,
      data: bytes,
    });

    if (typeof savedPath !== 'string' || !savedPath.trim()) {
      throw new Error('保存失败：未返回有效路径');
    }

    exportedPath.value = savedPath;
  } catch (err) {
    exportError.value = err instanceof Error ? err.message : String(err);
  } finally {
    exporting.value = false;
  }
};

const openOutputDir = async () => {
  const directory = typeof packOutputDir.value === 'string' ? packOutputDir.value.trim() : '';
  if (!directory) return;
  await window.ipcRenderer.invoke('shell:openPath', directory);
};

const soundNames = computed(() => {
  const key = normalizeKey(props.meta.key);
  const list: string[] = [];
  const dedupe = new Set<string>();

  for (const f of props.files) {
    if (props.meta.modifyVanilla) {
      const seen = new Set<string>();
      for (const mapping of f.vanillaEvents ?? []) {
        const ev = mapping.event.trim();
        if (!ev || seen.has(ev)) continue;
        seen.add(ev);
        if (!dedupe.has(ev)) {
          dedupe.add(ev);
          list.push(ev);
        }
      }
      if (seen.size > 0) continue;
    }

    const soundName = `${key}.${f.newName}`;
    if (!dedupe.has(soundName)) {
      dedupe.add(soundName);
      list.push(soundName);
    }
  }

  return list;
});

const linesOldJava = computed(() => soundNames.value.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`));
const linesNewJava = computed(() => soundNames.value.map((s) => `/playsound ${s} record @a ~ ~ ~ 10000`));
const linesStopJava = computed(() => soundNames.value.map((s) => `/stopsound @a record ${s}`));
const linesBedrock = computed(() => soundNames.value.map((s) => `/playsound ${s} @a ~ ~ ~ 10000`));
const linesStopBedrock = computed(() => soundNames.value.map((s) => `/stopsound @a ${s}`));

const copyCommand = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedCommand.value = text;
    setTimeout(() => {
      if (copiedCommand.value === text) copiedCommand.value = null;
    }, 1500);
  } catch (err) {
    console.error('Copy failed', err);
  }
};

onMounted(() => {
  void exportPack();
});
</script>

<template>
  <div class="space-y-6">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
      <div class="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
        <Package class="w-10 h-10" />
      </div>

      <div>
        <h2 class="text-2xl font-bold text-slate-800">输出资源包</h2>
        <p class="text-slate-500 mt-2">完成转换后会自动打包，并直接输出到设置的路径</p>
      </div>

      <div class="space-y-3">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
          <div class="text-xs font-bold text-slate-400">输出文件</div>
          <div class="mt-1 font-mono text-xs text-slate-700 break-all">{{ fileName }}</div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
          <div class="text-xs font-bold text-slate-400">输出路径</div>
          <div class="mt-1 font-mono text-xs text-slate-700 break-all">{{ packOutputDir || '（请先在设置里选择）' }}</div>
        </div>

        <div v-if="exportError" class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-bold text-red-600">
          {{ exportError }}
        </div>

        <div v-if="exportedPath" class="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left">
          <div class="text-xs font-bold text-emerald-700">已输出</div>
          <div class="mt-1 font-mono text-xs text-emerald-800 break-all">{{ exportedPath }}</div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-center gap-3">
        <button
          type="button"
          @click="emit('create-new')"
          class="bg-sky-400 hover:bg-sky-300 disabled:opacity-70 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold shadow-[0_4px_14px_0_rgba(56,189,248,0.35)] transition flex items-center justify-center gap-2 min-w-[200px]"
        >
          <span>创建新的资源包</span>
        </button>

        <button
          type="button"
          @click="openOutputDir"
          class="bg-white text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold shadow-sm border border-slate-200 transition flex items-center justify-center gap-2 min-w-[200px]"
        >
          <FolderOpen class="w-5 h-5" />
          <span>打开输出目录</span>
        </button>
      </div>

      <button
        v-if="exportError"
        type="button"
        @click="exportPack"
        :disabled="exporting"
        class="mx-auto inline-flex items-center gap-2 text-sm font-bold text-slate-400 transition hover:text-slate-600 disabled:opacity-70"
      >
        <Loader2 class="h-4 w-4 animate-spin" v-if="exporting" />
        <span v-else>重试导出</span>
      </button>
    </div>

    <div class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
          <FileText class="w-6 h-6" />
        </div>
        <div>
          <h2 class="text-lg font-bold text-slate-800">生成命令</h2>
          <p class="text-sm text-slate-500">复制命令到游戏中使用</p>
        </div>
      </div>

      <div v-if="soundNames.length === 0" class="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
        暂无音频文件
      </div>

      <div v-else class="grid gap-6">
        <template v-if="meta.platform === 'java'">
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-2 text-sm font-extrabold text-slate-700">Java 1.7.10 及以下</div>
            <ul class="space-y-2">
              <li
                v-for="(cmd, idx) in linesOldJava"
                :key="`${idx}-${cmd}`"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                  {{ cmd }}
                </code>
                <button
                  type="button"
                  @click="copyCommand(cmd)"
                  class="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                >
                  <Copy class="mr-1.5 h-3.5 w-3.5" />
                  <span>{{ copiedCommand === cmd ? '已复制' : '复制' }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-2 text-sm font-extrabold text-slate-700">Java 1.8 及以上</div>
            <ul class="space-y-2">
              <li
                v-for="(cmd, idx) in linesNewJava"
                :key="`${idx}-${cmd}`"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                  {{ cmd }}
                </code>
                <button
                  type="button"
                  @click="copyCommand(cmd)"
                  class="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                >
                  <Copy class="mr-1.5 h-3.5 w-3.5" />
                  <span>{{ copiedCommand === cmd ? '已复制' : '复制' }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-2 text-sm font-extrabold text-slate-700">停止声音 (1.9.3 及以上支持)</div>
            <ul class="space-y-2">
              <li
                v-for="(cmd, idx) in linesStopJava"
                :key="`${idx}-${cmd}`"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                  {{ cmd }}
                </code>
                <button
                  type="button"
                  @click="copyCommand(cmd)"
                  class="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                >
                  <Copy class="mr-1.5 h-3.5 w-3.5" />
                  <span>{{ copiedCommand === cmd ? '已复制' : '复制' }}</span>
                </button>
              </li>
            </ul>
          </div>
        </template>

        <template v-else>
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-2 text-sm font-extrabold text-slate-700">基岩版</div>
            <ul class="space-y-2">
              <li
                v-for="(cmd, idx) in linesBedrock"
                :key="`${idx}-${cmd}`"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                  {{ cmd }}
                </code>
                <button
                  type="button"
                  @click="copyCommand(cmd)"
                  class="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                >
                  <Copy class="mr-1.5 h-3.5 w-3.5" />
                  <span>{{ copiedCommand === cmd ? '已复制' : '复制' }}</span>
                </button>
              </li>
            </ul>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <div class="mb-2 text-sm font-extrabold text-slate-700">停止声音</div>
            <ul class="space-y-2">
              <li
                v-for="(cmd, idx) in linesStopBedrock"
                :key="`${idx}-${cmd}`"
                class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <code class="min-w-0 flex-1 overflow-x-auto font-mono text-[11px] text-slate-700 sm:text-xs">
                  {{ cmd }}
                </code>
                <button
                  type="button"
                  @click="copyCommand(cmd)"
                  class="inline-flex shrink-0 items-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-slate-800 sm:px-3 sm:text-xs"
                >
                  <Copy class="mr-1.5 h-3.5 w-3.5" />
                  <span>{{ copiedCommand === cmd ? '已复制' : '复制' }}</span>
                </button>
              </li>
            </ul>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
