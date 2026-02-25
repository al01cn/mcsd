<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { RefreshCw, ArrowRight } from 'lucide-vue-next';
import CircleProgress from './CircleProgress.vue';
import type { AudioProgressItem, ConvertLogItem, FileItem } from '../../lib/types';
import { formatBytes } from '../../lib/utils';

const props = defineProps<{
  processing: {
    title: string;
    desc: string;
    currentFile: string;
    percent: number;
    error: string | null;
  };
  logs: ConvertLogItem[];
  audioProgress: Record<string, AudioProgressItem>;
  files: FileItem[];
}>();

const emit = defineEmits<{
  (e: 'next'): void;
  (e: 'retry'): void;
}>();

const logsContainer = ref<HTMLDivElement | null>(null);

watch(() => props.logs.length, () => {
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight;
    }
  });
});

const isDone = computed(() => props.processing.percent === 100 && !props.processing.error);
const isError = computed(() => !!props.processing.error);

</script>

<template>
  <div class="space-y-6">
    <!-- Progress Card -->
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
        <div class="relative w-20 h-20 flex items-center justify-center shrink-0">
          <svg class="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="36" stroke-width="6" class="fill-none stroke-slate-100" />
            <circle 
              cx="40" cy="40" r="36" stroke-width="6" 
              class="fill-none stroke-blue-500 transition-all duration-300"
              stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * 36"
              :stroke-dashoffset="2 * Math.PI * 36 * (1 - processing.percent / 100)"
            />
          </svg>
          <div class="text-xl font-bold text-slate-800">{{ Math.round(processing.percent) }}%</div>
        </div>
        
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2 justify-center sm:justify-start">
            {{ processing.title }}
            <span v-if="isError" class="text-red-500 bg-red-50 text-xs px-2 py-0.5 rounded-full border border-red-100">失败</span>
            <span v-else-if="isDone" class="text-green-500 bg-green-50 text-xs px-2 py-0.5 rounded-full border border-green-100">完成</span>
          </h2>
          <p class="text-slate-500 text-sm mb-1">{{ processing.desc }}</p>
          <div class="text-xs font-mono bg-slate-100 text-slate-600 rounded px-2 py-1 inline-block max-w-full truncate">
            {{ processing.currentFile }}
          </div>
        </div>

        <div v-if="isDone" class="shrink-0">
          <button 
            @click="emit('next')"
            class="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
          >
            <span>下一步</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
        <div v-else-if="isError" class="shrink-0">
          <button 
            @click="emit('retry')"
            class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-6 py-3 rounded-xl font-bold transition flex items-center gap-2"
          >
            <RefreshCw class="w-4 h-4" />
            <span>重试</span>
          </button>
        </div>
      </div>
      
      <!-- Progress Bar (Detailed) -->
      <div class="bg-slate-50 border-t border-slate-100 p-4 sm:p-6 max-h-[300px] overflow-y-auto space-y-2">
        <div 
          v-for="file in files" 
          :key="file.id"
          class="flex items-center gap-3 p-2 rounded-lg bg-white border border-slate-100 shadow-sm"
        >
          <div class="shrink-0">
            <CircleProgress 
              :percent="audioProgress[file.id]?.percent || 0" 
              :size="24" 
              :stroke-width="3" 
            />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between text-xs mb-0.5">
              <span class="font-bold text-slate-700 truncate mr-2">{{ file.newName }}</span>
              <span class="text-slate-400 font-mono">{{ formatBytes(file.originalFile.size) }}</span>
            </div>
            <div class="text-[10px] text-slate-400 truncate">
              {{ file.originalName }}
            </div>
          </div>
          <div class="shrink-0">
             <span 
              class="text-[10px] font-bold px-1.5 py-0.5 rounded"
              :class="{
                'bg-slate-100 text-slate-500': !audioProgress[file.id] || audioProgress[file.id].stage === 'queued',
                'bg-blue-50 text-blue-600': audioProgress[file.id]?.stage === 'converting',
                'bg-green-50 text-green-600': audioProgress[file.id]?.stage === 'done',
                'bg-yellow-50 text-yellow-600': audioProgress[file.id]?.stage === 'skipped',
                'bg-red-50 text-red-600': audioProgress[file.id]?.stage === 'error',
              }"
             >
               {{ 
                 audioProgress[file.id]?.stage === 'done' ? '完成' :
                 audioProgress[file.id]?.stage === 'converting' ? '转换中' :
                 audioProgress[file.id]?.stage === 'skipped' ? '跳过' :
                 audioProgress[file.id]?.stage === 'error' ? '错误' : '等待'
               }}
             </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Logs -->
    <div class="bg-slate-900 rounded-3xl overflow-hidden text-slate-300 font-mono text-xs shadow-lg">
      <div class="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between">
        <span class="font-bold text-slate-400">运行日志</span>
        <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-500">{{ logs.length }} 条记录</span>
      </div>
      <div ref="logsContainer" class="h-[200px] overflow-y-auto p-4 space-y-1.5 scroll-smooth">
        <div v-if="logs.length === 0" class="text-slate-600 italic text-center py-4">等待开始...</div>
        <div 
          v-for="log in logs" 
          :key="log.id"
          class="flex gap-2 group"
          :class="log.level === 'error' ? 'text-red-400' : 'text-slate-300'"
        >
          <span class="shrink-0 text-slate-600 w-[70px]">{{ new Date(log.at).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' }) }}</span>
          <span class="break-all">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
