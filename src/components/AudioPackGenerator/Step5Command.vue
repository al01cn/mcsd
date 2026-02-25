<script setup lang="ts">
import { ref, computed } from 'vue';
import { Copy, Check, Download } from 'lucide-vue-next';
import { saveAs } from 'file-saver';
import type { FileItem, PackMeta } from '../../lib/types';
import { normalizeKey } from '../../lib/utils';

const props = defineProps<{
  files: FileItem[];
  meta: PackMeta;
}>();

const copiedIndex = ref<number | null>(null);

const commands = computed(() => {
  const key = normalizeKey(props.meta.key);
  const list: { name: string; cmd: string }[] = [];
  const buildCmd = (name: string) => {
    return props.meta.platform === 'java'
      ? `/playsound ${name} record @a ~ ~ ~ 10000`
      : `/playsound ${name} @a ~ ~ ~ 10000`;
  };

  for (const f of props.files) {
    if (props.meta.modifyVanilla) {
      const seen = new Set<string>();
      for (const mapping of f.vanillaEvents ?? []) {
        const ev = mapping.event.trim();
        if (!ev || seen.has(ev)) continue;
        seen.add(ev);
        list.push({
          name: ev,
          cmd: buildCmd(ev)
        });
      }
      if (seen.size > 0) continue;
    }
    
    const soundName = `${key}.${f.newName}`;
    list.push({
      name: soundName,
      cmd: buildCmd(soundName)
    });
  }
  
  return list;
});

const copyCommand = async (text: string, index: number) => {
  try {
    await navigator.clipboard.writeText(text);
    copiedIndex.value = index;
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null;
    }, 1500);
  } catch (err) {
    console.error("Copy failed", err);
  }
};

const downloadTxt = () => {
  const safeName = props.meta.name.trim() || "SoundPack";
  const content = commands.value.map(c => c.cmd).join("\n");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${safeName}_commands.txt`);
};

</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-lg font-bold text-slate-800">生成命令</h2>
        <p class="text-sm text-slate-500">复制命令到游戏中使用</p>
      </div>
      <button 
        @click="downloadTxt"
        class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2"
      >
        <Download class="w-4 h-4" />
        下载 TXT
      </button>
    </div>

    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div v-if="commands.length === 0" class="p-8 text-center text-slate-500">
        暂无可用命令
      </div>
      <div v-else class="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        <div 
          v-for="(item, idx) in commands" 
          :key="idx"
          class="p-4 flex items-center gap-4 hover:bg-slate-50 transition group"
        >
          <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-mono text-xs shrink-0">
            {{ idx + 1 }}
          </div>
          
          <div class="flex-1 min-w-0 font-mono text-xs sm:text-sm text-slate-600 break-all">
            {{ item.cmd }}
          </div>

          <button 
            @click="copyCommand(item.cmd, idx)"
            class="w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0"
            :class="copiedIndex === idx ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'text-slate-400 hover:bg-white hover:shadow-sm hover:text-blue-500'"
          >
            <Check v-if="copiedIndex === idx" class="w-4 h-4" />
            <Copy v-else class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
