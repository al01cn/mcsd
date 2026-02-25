<script setup lang="ts">
import { ref, computed } from 'vue';
import { UploadCloud, Music, Trash2, Settings, Plus, X, Search, Check, AlertTriangle, ArrowLeft } from 'lucide-vue-next';
import type { FileItem, PackMeta, SubtitleContext, VanillaEventMapping } from '../../lib/types';
import { processFileName, getAudioBaseName, buildId, formatBytes, collectDuplicateFileNameIds, normalizeKey } from '../../lib/utils';
import * as soundsMod from '../../lib/sounds';
import { buildSoundEventSearchText, fuzzyMatchSoundEventKey, translateSoundEventKeyZh } from '../../lib/SoundsTranslate';

const props = defineProps<{
  files: FileItem[];
  meta: PackMeta;
  subtitles: SubtitleContext;
}>();

const emit = defineEmits<{
  (e: 'update:files', value: FileItem[]): void;
  (e: 'update:subtitles', value: SubtitleContext): void;
  (e: 'request-process'): void;
  (e: 'prev'): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);
const eventEditorOpen = ref(false);
const editingFileId = ref<string | null>(null);
const eventEditorSearch = ref('');
const eventEditorSelection = ref<VanillaEventMapping[]>([]);

const subtitleDialogOpen = ref(false);
const subtitleDialogQuery = ref('');

const duplicateIds = computed(() => collectDuplicateFileNameIds(props.files));
const selectedEventSet = computed(() => new Set(eventEditorSelection.value.map((e) => e.event)));

type SubtitleItem =
  | { kind: 'event'; eventKey: string; fileIds: string[]; searchText: string }
  | { kind: 'custom'; eventKey: string; fileId: string; searchText: string };

const vanillaEventKeys = computed(() => {
  if (props.meta.platform === 'java') {
    return Object.keys((soundsMod as any).vanillaSoundJava || {}).sort();
  } else {
    // Bedrock logic extraction (simplified)
    const bedrock = (soundsMod as any).vanillaSoundBedrock;
    if (!bedrock) return [];
    
    const result = new Set<string>();
    const stack: any[] = [bedrock];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (Array.isArray(current)) {
        for (const item of current) stack.push(item);
        continue;
      }
      if (typeof current !== 'object') continue;
      for (const [k, v] of Object.entries(current)) {
        if ((k === 'sound' || k === 'sounds') && typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed) result.add(trimmed);
        }
        if (k === 'sounds' && Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === 'string') {
              const trimmed = item.trim();
              if (trimmed) result.add(trimmed);
            }
          }
        }
        stack.push(v);
      }
    }
    return Array.from(result).sort();
  }
});

const filteredEventKeys = computed(() => {
  const q = eventEditorSearch.value.trim();
  if (!q) return vanillaEventKeys.value.slice(0, 100);
  const qLower = q.toLowerCase();
  const qNormalized = qLower.replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");

  const scored: Array<{ key: string; score: number }> = [];
  for (const key of vanillaEventKeys.value) {
    if (!fuzzyMatchSoundEventKey(key, q)) continue;

    const keyLower = key.toLowerCase();
    if (keyLower.includes(qLower)) {
      scored.push({ key, score: 0 });
      continue;
    }

    const loose = keyLower.replace(/[:._]+/g, " ");
    if (loose.includes(qLower)) {
      scored.push({ key, score: 1 });
      continue;
    }

    const hay = buildSoundEventSearchText(key).toLowerCase();
    if (hay.includes(qLower)) {
      scored.push({ key, score: 2 });
      continue;
    }

    const hayNormalized = hay.replace(/[^0-9a-z\u4e00-\u9fff]+/g, "");
    if (qNormalized && hayNormalized.includes(qNormalized)) {
      scored.push({ key, score: 3 });
      continue;
    }

    scored.push({ key, score: 9 });
  }

  scored.sort((a, b) => a.score - b.score || a.key.localeCompare(b.key));
  return scored.slice(0, 100).map((x) => x.key);
});

const subtitleDialogFileById = computed(() => new Map(props.files.map((f) => [f.id, f] as const)));

const subtitleDialogItems = computed<SubtitleItem[]>(() => {
  const key = normalizeKey(props.meta.key);
  const fileById = subtitleDialogFileById.value;
  const eventToFileIds = new Map<string, string[]>();
  const customFileIds: string[] = [];

  for (const f of props.files) {
    const mappings = props.meta.modifyVanilla ? (f.vanillaEvents ?? []) : [];
    if (mappings.length > 0) {
      for (const mapping of mappings) {
        const eventKey = mapping.event.trim();
        if (!eventKey) continue;
        const existing = eventToFileIds.get(eventKey);
        if (existing) existing.push(f.id);
        else eventToFileIds.set(eventKey, [f.id]);
      }
      continue;
    }
    customFileIds.push(f.id);
  }

  const items: SubtitleItem[] = [];
  for (const [eventKey, fileIds] of eventToFileIds.entries()) {
    const first = fileById.get(fileIds[0] ?? '');
    const names = first ? `${first.originalName} ${first.newName}` : '';
    items.push({
      kind: 'event',
      eventKey,
      fileIds,
      searchText: `${eventKey} ${names} ${fileIds.length}`.toLowerCase(),
    });
  }

  for (const fileId of customFileIds) {
    const f = fileById.get(fileId);
    const eventKey = f ? `${key}.${f.newName}` : `${key}.unknown`;
    const names = f ? `${f.originalName} ${f.newName}` : '';
    items.push({
      kind: 'custom',
      eventKey,
      fileId,
      searchText: `${eventKey} ${names}`.toLowerCase(),
    });
  }

  items.sort((a, b) => {
    if (a.eventKey < b.eventKey) return -1;
    if (a.eventKey > b.eventKey) return 1;
    return a.kind === 'event' && b.kind === 'custom' ? -1 : a.kind === 'custom' && b.kind === 'event' ? 1 : 0;
  });

  return items;
});

const subtitleDialogMatches = computed(() => {
  const q = subtitleDialogQuery.value.trim().toLowerCase();
  if (!q) return subtitleDialogItems.value;
  return subtitleDialogItems.value.filter((item) => item.searchText.includes(q));
});

const getCustomDefaultSubtitle = (fileId: string) => {
  const f = subtitleDialogFileById.value.get(fileId);
  const base = f ? getAudioBaseName(f.originalName) || f.newName : '';
  return base ? `音频：${base}` : '音频：unknown';
};

const openSubtitleDialog = () => {
  if (props.files.length === 0) return;
  const prev = props.subtitles;
  const nextCustom: Record<string, string> = { ...(prev.customByFileId ?? {}) };
  let changed = false;

  for (const f of props.files) {
    const existing = typeof nextCustom[f.id] === 'string' ? nextCustom[f.id] : '';
    if (existing.trim()) continue;
    const base = getAudioBaseName(f.originalName) || f.newName;
    nextCustom[f.id] = `音频：${base}`;
    changed = true;
  }

  if (changed) emit('update:subtitles', { customByFileId: nextCustom, byEventKey: { ...(prev.byEventKey ?? {}) } });
  subtitleDialogQuery.value = '';
  subtitleDialogOpen.value = true;
};

const closeSubtitleDialog = () => {
  subtitleDialogOpen.value = false;
  subtitleDialogQuery.value = '';
};

const updateSubtitles = (next: SubtitleContext) => {
  emit('update:subtitles', next);
};

const triggerUpload = () => {
  fileInput.value?.click();
};

const handleFiles = (fileList: FileList | null) => {
  if (!fileList || fileList.length === 0) return;
  
  const newFiles: FileItem[] = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const originalName = file.name;
    const id = buildId();
    const baseName = getAudioBaseName(originalName);
    const newName = processFileName(baseName);
    
    newFiles.push({
      id,
      originalFile: file,
      originalName,
      hash: id, // Temporary hash
      newName,
      status: 'pending',
      vanillaEvents: [],
      processedBlob: null
    });
  }
  
  emit('update:files', [...props.files, ...newFiles]);
  if (fileInput.value) fileInput.value.value = '';
};

const pruneCustomSubtitles = (nextFiles: FileItem[], prev: SubtitleContext): SubtitleContext => {
  const keep = new Set(nextFiles.map((f) => f.id));
  const nextCustom: Record<string, string> = {};
  for (const [k, v] of Object.entries(prev.customByFileId ?? {})) {
    if (keep.has(k)) nextCustom[k] = v;
  }
  return { customByFileId: nextCustom, byEventKey: { ...(prev.byEventKey ?? {}) } };
};

const removeFile = (id: string) => {
  const nextFiles = props.files.filter((f) => f.id !== id);
  emit('update:files', nextFiles);
  updateSubtitles(pruneCustomSubtitles(nextFiles, props.subtitles));
};

const updateFile = (id: string, updates: Partial<FileItem>) => {
  const newFiles = props.files.map(f => f.id === id ? { ...f, ...updates } : f);
  emit('update:files', newFiles);
};

const clearFiles = () => {
  emit('update:files', []);
  updateSubtitles({ customByFileId: {}, byEventKey: { ...(props.subtitles.byEventKey ?? {}) } });
};

const subtitleSecondaryText = (item: SubtitleItem) => {
  if (item.kind === 'event') return `关联 ${item.fileIds.length} 个音频`;
  return subtitleDialogFileById.value.get(item.fileId)?.originalName || '';
};

const subtitleInputValue = (item: SubtitleItem) => {
  if (item.kind === 'event') {
    return Object.prototype.hasOwnProperty.call(props.subtitles.byEventKey ?? {}, item.eventKey)
      ? (props.subtitles.byEventKey[item.eventKey] ?? '')
      : '';
  }
  const has = Object.prototype.hasOwnProperty.call(props.subtitles.customByFileId ?? {}, item.fileId);
  return has ? (props.subtitles.customByFileId[item.fileId] ?? '') : getCustomDefaultSubtitle(item.fileId);
};

const subtitlePlaceholder = (item: SubtitleItem) => {
  return item.kind === 'event' ? '留空=使用原版字幕' : getCustomDefaultSubtitle(item.fileId);
};

const subtitleAuto = (item: SubtitleItem) => {
  const prev = props.subtitles;
  if (item.kind === 'event') {
    if (!Object.prototype.hasOwnProperty.call(prev.byEventKey ?? {}, item.eventKey)) return;
    const nextByEventKey = { ...(prev.byEventKey ?? {}) };
    delete nextByEventKey[item.eventKey];
    updateSubtitles({ customByFileId: { ...(prev.customByFileId ?? {}) }, byEventKey: nextByEventKey });
    return;
  }
  const nextCustomByFileId = { ...(prev.customByFileId ?? {}) };
  nextCustomByFileId[item.fileId] = getCustomDefaultSubtitle(item.fileId);
  updateSubtitles({ customByFileId: nextCustomByFileId, byEventKey: { ...(prev.byEventKey ?? {}) } });
};

const subtitleChange = (item: SubtitleItem, nextValue: string) => {
  const prev = props.subtitles;
  if (item.kind === 'event') {
    const trimmed = nextValue.trim();
    const nextByEventKey = { ...(prev.byEventKey ?? {}) };
    if (!trimmed) {
      if (!Object.prototype.hasOwnProperty.call(nextByEventKey, item.eventKey)) return;
      delete nextByEventKey[item.eventKey];
      updateSubtitles({ customByFileId: { ...(prev.customByFileId ?? {}) }, byEventKey: nextByEventKey });
      return;
    }
    nextByEventKey[item.eventKey] = nextValue;
    updateSubtitles({ customByFileId: { ...(prev.customByFileId ?? {}) }, byEventKey: nextByEventKey });
    return;
  }
  const nextCustomByFileId = { ...(prev.customByFileId ?? {}) };
  nextCustomByFileId[item.fileId] = nextValue;
  updateSubtitles({ customByFileId: nextCustomByFileId, byEventKey: { ...(prev.byEventKey ?? {}) } });
};

const onDragOver = (e: DragEvent) => {
  e.preventDefault();
  dragging.value = true;
};

const onDragLeave = (e: DragEvent) => {
  e.preventDefault();
  dragging.value = false;
};

const onDrop = (e: DragEvent) => {
  e.preventDefault();
  dragging.value = false;
  handleFiles(e.dataTransfer?.files || null);
};

// Event Editor Logic
const openEventEditor = (fileId: string) => {
  const file = props.files.find(f => f.id === fileId);
  if (!file) return;
  editingFileId.value = fileId;
  eventEditorSelection.value = JSON.parse(JSON.stringify(file.vanillaEvents || []));
  eventEditorSearch.value = '';
  eventEditorOpen.value = true;
};

const closeEventEditor = () => {
  eventEditorOpen.value = false;
  editingFileId.value = null;
};

const saveEvents = () => {
  if (editingFileId.value) {
    updateFile(editingFileId.value, { vanillaEvents: eventEditorSelection.value });
  }
  closeEventEditor();
};

const addEvent = (eventKey: string) => {
  if (eventEditorSelection.value.some(e => e.event === eventKey)) return;
  eventEditorSelection.value.push({
    event: eventKey,
    weight: 1,
    pitch: 1,
    volume: 1
  });
};

const removeEvent = (index: number) => {
  eventEditorSelection.value.splice(index, 1);
};

</script>

<template>
  <div class="space-y-6">
    <!-- Header Actions -->
    <div class="flex items-center justify-between">
      <div class="flex items-start gap-3">
        <button
          type="button"
          @click="emit('prev')"
          class="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition"
        >
          <ArrowLeft class="w-4 h-4" />
        </button>
        <div>
          <h2 class="text-lg font-bold text-slate-800">导入音频</h2>
          <p class="text-sm text-slate-500">添加音频文件，重命名并配置事件</p>
        </div>
      </div>
      <div class="flex gap-3">
        <button 
          v-if="files.length > 0"
          @click="clearFiles"
          class="px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition"
        >
          清空列表
        </button>
        <button
          type="button"
          :disabled="files.length === 0"
          @click="openSubtitleDialog"
          class="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          管理字幕
        </button>
        <button 
          @click="triggerUpload"
          class="px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-sm font-bold hover:bg-blue-100 transition flex items-center gap-2"
        >
          <UploadCloud class="w-4 h-4" />
          添加文件
        </button>
      </div>
    </div>

    <!-- Drop Zone / List -->
    <div 
      class="min-h-[300px] rounded-3xl border-2 border-dashed transition-all relative"
      :class="[
        dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50',
        files.length === 0 ? 'flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-slate-100' : 'block p-4'
      ]"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
      @click="files.length === 0 ? triggerUpload() : null"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="audio/*"
        class="hidden"
        @change="(e) => handleFiles((e.target as HTMLInputElement).files)"
      />

      <!-- Empty State -->
      <div v-if="files.length === 0" class="text-center pointer-events-none">
        <div class="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <UploadCloud class="w-8 h-8" />
        </div>
        <h3 class="text-lg font-bold text-slate-700">拖入文件或点击上传</h3>
        <p class="text-sm text-slate-400 mt-1">支持 MP3, WAV, OGG 等格式</p>
      </div>

      <!-- File List -->
      <div v-else class="space-y-3" @click.stop>
        <div 
          v-for="file in files" 
          :key="file.id"
          class="bg-white rounded-xl border p-3 flex items-center gap-4 group transition hover:shadow-sm"
          :class="duplicateIds.has(file.id) ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'"
        >
          <!-- Icon -->
          <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
            <Music class="w-5 h-5" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <!-- Name Input -->
            <div class="min-w-0">
              <div class="text-[10px] font-bold text-slate-400 mb-0.5 truncate">{{ file.originalName }} ({{ formatBytes(file.originalFile.size) }})</div>
              <input 
                type="text" 
                :value="file.newName"
                @input="e => updateFile(file.id, { newName: processFileName((e.target as HTMLInputElement).value) })"
                class="w-full text-sm font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none transition px-0 py-0.5"
                placeholder="sound_name"
              />
            </div>

            <!-- Events (if modifyVanilla) -->
            <div v-if="meta.modifyVanilla" class="flex items-center gap-2">
              <button 
                @click="openEventEditor(file.id)"
                class="flex-1 text-left px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-blue-300 transition text-xs flex items-center justify-between group/btn"
              >
                <span class="truncate text-slate-600 font-medium">
                  {{ file.vanillaEvents.length > 0 ? `已绑定 ${file.vanillaEvents.length} 个事件` : '点击绑定原版事件' }}
                </span>
                <Settings class="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-blue-500" />
              </button>
            </div>
          </div>

          <!-- Actions -->
          <button 
            @click="removeFile(file.id)"
            class="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div v-if="duplicateIds.size > 0" class="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100">
      <AlertTriangle class="w-4 h-4" />
      <span>存在重复的文件名，请修改高亮的文件名称。</span>
    </div>

    <!-- Actions Footer -->
    <div class="flex justify-end pt-4">
      <button 
        @click="emit('request-process')"
        :disabled="files.length === 0 || duplicateIds.size > 0"
        class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
      >
        <span>开始处理</span>
        <Check class="w-4 h-4" />
      </button>
    </div>

    <!-- Event Editor Modal -->
    <div v-if="eventEditorOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 class="text-lg font-bold text-slate-800">原版事件配置</h3>
          <button @click="closeEventEditor" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="flex-1 overflow-hidden flex flex-col md:flex-row">
          <!-- Left: Selected Events -->
          <div class="flex-1 p-6 overflow-y-auto border-b md:border-b-0 md:border-r border-slate-100 bg-slate-50/50">
            <h4 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">已添加事件</h4>
            
            <div v-if="eventEditorSelection.length === 0" class="text-center py-10 text-slate-400 text-sm">
              暂未添加任何事件
            </div>

            <div v-else class="space-y-4">
              <div v-for="(item, idx) in eventEditorSelection" :key="idx" class="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <div class="flex items-start justify-between gap-2 mb-2">
                  <div class="text-xs font-mono font-bold text-slate-700 break-all">{{ item.event }}</div>
                  <button @click="removeEvent(idx)" class="text-slate-400 hover:text-red-500 p-1">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div class="grid grid-cols-3 gap-2">
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400">权重 (Weight)</label>
                    <input type="number" v-model.number="item.weight" class="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" min="1" step="1" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400">音高 (Pitch)</label>
                    <input type="number" v-model.number="item.pitch" class="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" step="0.1" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-[10px] font-bold text-slate-400">音量 (Volume)</label>
                    <input type="number" v-model.number="item.volume" class="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-400" step="0.1" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Search & Add -->
          <div class="flex-1 flex flex-col min-h-[300px]">
            <div class="p-4 border-b border-slate-100">
              <div class="relative">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  v-model="eventEditorSearch" 
                  type="text" 
                  class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
                  placeholder="搜索原版事件（支持中文）"
                />
              </div>
            </div>
            
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
              <button 
                v-for="key in filteredEventKeys" 
                :key="key"
                @click="addEvent(key)"
                :disabled="selectedEventSet.has(key)"
                class="w-full text-left px-3 py-2 rounded-lg text-slate-600 transition flex items-center justify-between gap-3 group disabled:opacity-60 disabled:cursor-not-allowed"
                :class="selectedEventSet.has(key) ? 'bg-emerald-50 hover:bg-emerald-50' : 'hover:bg-blue-50 hover:text-blue-700'"
              >
                <div class="min-w-0">
                  <div class="truncate text-xs font-mono">{{ key }}</div>
                  <div class="truncate text-[11px] font-bold text-slate-400 group-hover:text-blue-500">
                    {{ translateSoundEventKeyZh(key) }}
                  </div>
                </div>
                <Check v-if="selectedEventSet.has(key)" class="w-4 h-4 text-emerald-600" />
                <Plus v-else class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" />
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button @click="closeEventEditor" class="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-200 transition">取消</button>
          <button @click="saveEvents" class="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition shadow-lg shadow-blue-500/20">保存配置</button>
        </div>
      </div>
    </div>

    <div v-if="subtitleDialogOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div class="min-w-0">
            <h3 class="text-lg font-bold text-slate-800">字幕管理</h3>
            <div class="mt-1 text-sm text-slate-500">字幕属于声音事件；同一事件只会显示一个字幕。</div>
          </div>
          <button @click="closeSubtitleDialog" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <X class="w-4 h-4" />
          </button>
        </div>

        <div class="p-5 shrink-0">
          <div class="relative">
            <input
              v-model="subtitleDialogQuery"
              class="w-full rounded-2xl border-2 border-transparent bg-slate-50 py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,1)]"
              placeholder="搜索事件 / 文件名"
            />
            <button
              v-if="subtitleDialogQuery"
              type="button"
              aria-label="清空输入"
              @click="subtitleDialogQuery = ''"
              class="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          <div class="mb-2 text-[11px] font-bold text-slate-400">匹配结果: {{ subtitleDialogMatches.length }}</div>
          <div v-if="subtitleDialogMatches.length === 0" class="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-400">
            暂无可管理的字幕（请先添加音频）。
          </div>
          <div v-else class="grid gap-3">
            <div
              v-for="item in subtitleDialogMatches"
              :key="item.kind === 'event' ? `event-${item.eventKey}` : `file-${item.fileId}`"
              class="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-extrabold text-slate-800" :title="item.eventKey">{{ item.eventKey }}</div>
                  <div class="mt-1 text-[11px] font-bold text-slate-400">{{ subtitleSecondaryText(item) }}</div>
                </div>
                <button
                  type="button"
                  @click="subtitleAuto(item)"
                  class="inline-flex shrink-0 items-center rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-slate-800"
                >
                  自动生成
                </button>
              </div>

              <div class="mt-3">
                <input
                  :value="subtitleInputValue(item)"
                  @input="(e) => subtitleChange(item, (e.target as HTMLInputElement).value)"
                  :placeholder="subtitlePlaceholder(item)"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(219,234,254,1)]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
