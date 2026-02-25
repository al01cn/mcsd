<script setup lang="ts">
import { ref, computed } from 'vue';
import { Package, Folder, Image as ImageIcon, Trash2, Edit2, Info } from 'lucide-vue-next';
import type { PackMeta } from '../../lib/types';
import mcVersions from '../../lib/mcver';

const props = defineProps<{
  meta: PackMeta;
}>();

const emit = defineEmits<{
  (e: 'update:meta', value: PackMeta): void;
}>();

const fileInput = ref<HTMLInputElement | null>(null);

const javaPackFormatOptions = computed(() => {
  return mcVersions
    .map((item) => {
      const packFormat = String(item.pack_format ?? "").trim();
      const packFormatNumeric = Number(packFormat);
      return { packFormat, packFormatNumeric, version: item.version };
    })
    .filter((item) => item.packFormat.length > 0 && Number.isFinite(item.packFormatNumeric) && item.packFormatNumeric > 0)
    .sort((a, b) => {
      if (b.packFormatNumeric !== a.packFormatNumeric) return b.packFormatNumeric - a.packFormatNumeric;
      return b.version.localeCompare(a.version);
    });
});

const updateMeta = (updates: Partial<PackMeta>) => {
  emit('update:meta', { ...props.meta, ...updates });
};

const handleIconPick = async (file: File | null) => {
  if (!file) {
    if (props.meta.iconPreviewUrl) {
      URL.revokeObjectURL(props.meta.iconPreviewUrl);
    }
    updateMeta({ iconFile: null, iconPreviewUrl: null });
    return;
  }

  // Resize to 256x256 if needed
  try {
    const resized = await resizePngToSquare(file, 256);
    const url = URL.createObjectURL(resized);
    if (props.meta.iconPreviewUrl) {
      URL.revokeObjectURL(props.meta.iconPreviewUrl);
    }
    updateMeta({ iconFile: resized, iconPreviewUrl: url });
  } catch (err) {
    console.error("Icon process failed", err);
    // Fallback
    const url = URL.createObjectURL(file);
    updateMeta({ iconFile: file, iconPreviewUrl: url });
  }
};

// Helper functions for image processing
const loadHtmlImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = url;
  });
};

const resizePngToSquare = async (file: File, size: number): Promise<File> => {
  if (file.type !== "image/png") {
    // Attempt to convert or throw? For now throw as per original logic
    // But original logic says "only png supported"
    // Actually the input accept="image/png"
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

  return new File([blob], "pack.png", { type: "image/png", lastModified: Date.now() });
};

const triggerFileInput = () => {
  fileInput.value?.click();
};

const removeIcon = (e: Event) => {
  e.preventDefault();
  e.stopPropagation();
  if (fileInput.value) fileInput.value.value = "";
  handleIconPick(null);
};

const sanitizeKey = (val: string) => {
  const cleaned = val.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  updateMeta({ key: cleaned.slice(0, 5) });
};

</script>

<template>
  <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
    <div class="flex items-center gap-3 pb-4 border-b border-slate-100">
      <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
        <Package class="w-5 h-5" />
      </div>
      <div>
        <h2 class="text-lg font-bold text-slate-800">基本信息</h2>
        <p class="text-sm text-slate-500">设置资源包的名称、图标与适用版本</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-8">
      <!-- Icon Upload -->
      <div class="flex flex-col items-center gap-3">
        <div class="group relative w-32 h-32">
          <button 
            v-if="meta.iconPreviewUrl"
            type="button"
            @click="removeIcon"
            class="absolute -right-2 -top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 transition hover:bg-red-50 hover:text-red-500 text-slate-400"
          >
            <Trash2 class="w-4 h-4" />
          </button>
          
          <button
            type="button"
            @click="triggerFileInput"
            class="relative flex h-full w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition duration-200"
            :class="meta.iconPreviewUrl ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-400 hover:text-blue-500'"
          >
            <img 
              v-if="meta.iconPreviewUrl"
              :src="meta.iconPreviewUrl" 
              alt="pack icon" 
              class="w-full h-full object-cover"
            />
            <div v-else class="flex flex-col items-center gap-2">
              <ImageIcon class="w-8 h-8" />
              <span class="text-xs font-bold">上传图标</span>
            </div>
            
            <div class="absolute bottom-2 right-2 rounded-full bg-blue-500 p-1.5 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100">
              <Edit2 class="w-3 h-3" />
            </div>
          </button>
          
          <input
            ref="fileInput"
            type="file"
            accept="image/png"
            class="hidden"
            @change="(e) => {
              const file = (e.target as HTMLInputElement).files?.[0] || null;
              handleIconPick(file);
            }"
          />
        </div>
        <div class="text-center">
          <div class="text-xs font-medium text-slate-500">建议尺寸</div>
          <div class="text-xs font-bold text-slate-700">256 x 256</div>
        </div>
      </div>

      <!-- Form Fields -->
      <div class="space-y-5">
        <!-- Name -->
        <div class="space-y-1.5">
          <label class="block text-sm font-bold text-slate-700">资源包名称</label>
          <input
            type="text"
            :value="meta.name"
            @input="e => updateMeta({ name: (e.target as HTMLInputElement).value })"
            class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition"
            placeholder="例如：我的声音包"
          />
        </div>

        <!-- Key -->
        <div class="space-y-1.5">
          <label class="block text-sm font-bold text-slate-700 flex items-center gap-2">
            <span>主 Key (Namespace)</span>
            <div class="group relative cursor-help">
              <Info class="w-3.5 h-3.5 text-slate-400" />
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg bg-slate-800 p-2 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                决定了资源文件的文件夹名称，建议使用纯英文。
              </div>
            </div>
          </label>
          <div class="relative">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <Folder class="w-4 h-4" />
            </div>
            <input
              type="text"
              :value="meta.key"
              @input="e => sanitizeKey((e.target as HTMLInputElement).value)"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm font-mono font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition uppercase"
              placeholder="MCSD"
              maxlength="5"
            />
          </div>
          <p class="text-xs text-slate-500">
            文件将位于：<span class="font-mono bg-slate-100 px-1 rounded text-slate-600">assets/minecraft/sounds/<span class="text-blue-600 font-bold">{{ meta.key || 'mcsd' }}</span>/</span>
          </p>
        </div>

        <!-- Platform & Version -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-bold text-slate-700">游戏版本</label>
            <div class="flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                @click="updateMeta({ platform: 'java' })"
                class="flex-1 rounded-lg py-1.5 text-xs font-bold transition-all"
                :class="meta.platform === 'java' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              >
                Java 版
              </button>
              <button
                type="button"
                @click="updateMeta({ platform: 'bedrock' })"
                class="flex-1 rounded-lg py-1.5 text-xs font-bold transition-all"
                :class="meta.platform === 'bedrock' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
              >
                基岩版
              </button>
            </div>
          </div>

          <div v-if="meta.platform === 'java'" class="space-y-1.5">
            <label class="block text-sm font-bold text-slate-700">资源包格式 (pack_format)</label>
            <select
              :value="meta.javaPackFormat"
              @change="e => updateMeta({ javaPackFormat: (e.target as HTMLSelectElement).value })"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition appearance-none"
            >
              <option 
                v-for="opt in javaPackFormatOptions" 
                :key="opt.packFormat" 
                :value="opt.packFormat"
              >
                {{ opt.packFormat }} ({{ opt.version }})
              </option>
            </select>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
          <label class="block text-sm font-bold text-slate-700">简介 (可选)</label>
          <div class="relative">
            <textarea
              :value="meta.desc"
              @input="e => updateMeta({ desc: (e.target as HTMLTextAreaElement).value })"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 transition resize-none h-20"
              placeholder="输入资源包简介..."
              :maxlength="meta.platform === 'bedrock' ? 40 : 20"
            ></textarea>
            <div class="absolute bottom-2 right-2 text-[10px] font-bold text-slate-400 bg-white/80 px-1 rounded">
              {{ meta.desc.length }} / {{ meta.platform === 'bedrock' ? 40 : 20 }}
            </div>
          </div>
          <p class="text-xs text-slate-400">
            会自动追加后缀 <span class="font-mono">By mcsd</span>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
