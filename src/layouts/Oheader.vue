<script lang="ts" setup>
import { Minus, X, ArrowRight, Loader2, AlertCircle, RefreshCw, Settings } from 'lucide-vue-next';
import config from '../lib/config'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import GlobalDialog from '../components/GlobalDialog.vue';
import Model from '../components/Model.vue';
import { PhCaretDoubleRight } from "@phosphor-icons/vue";
import { localCache } from '../lib/cache';

// Components
import Step1BasicInfo from '../components/AudioPackGenerator/Step1BasicInfo.vue';
import Step2ImportAudio from '../components/AudioPackGenerator/Step2ImportAudio.vue';
import Step3Convert from '../components/AudioPackGenerator/Step3Convert.vue';
import Step4Download from '../components/AudioPackGenerator/Step4Download.vue';

// Types & Libs
import type { PackMeta, FileItem, AudioProgressItem, ConvertLogItem, SubtitleContext } from '../lib/types';
import { DEFAULT_KEY, checkMinecraftOggReady, getAudioBaseName, isMaybeOggFile } from '../lib/utils';
import ffmpeg from '../lib/ffmpeg';

const steps = ["基本信息", "导入音频", "格式转换", "输出资源包"];
const hasStep = ref(steps[0]);

const settingsOpen = ref(false);
const packOutputDir = localCache.get<string>('settings:packOutputDir', null);
const defaultDownloadsDir = ref<string>('');

const createDefaultMeta = (): PackMeta => ({
    name: "",
    key: DEFAULT_KEY,
    desc: "",
    platform: "java",
    javaPackFormat: "15",
    javaVersion: "",
    iconFile: null,
    iconPreviewUrl: null,
    modifyVanilla: true,
});

const createDefaultProcessing = () => ({
    title: "正在准备转换器...",
    desc: "首次使用会下载转换组件，请耐心等待。",
    currentFile: "Waiting to start...",
    percent: 0,
    error: null as string | null,
});

const createDefaultSubtitles = (): SubtitleContext => ({
    customByFileId: {},
    byEventKey: {},
});

// State
const meta = ref<PackMeta>(createDefaultMeta());

const files = ref<FileItem[]>([]);
const subtitles = ref<SubtitleContext>(createDefaultSubtitles());
const processing = ref(createDefaultProcessing());
const audioProgress = ref<Record<string, AudioProgressItem>>({});
const convertLogs = ref<ConvertLogItem[]>([]);

const effectiveSubtitles = computed<SubtitleContext>(() => {
    const prefix = '音频：';
    const customByFileId: Record<string, string> = { ...subtitles.value.customByFileId };
    for (const f of files.value) {
        const has = Object.prototype.hasOwnProperty.call(customByFileId, f.id);
        const current = has ? String(customByFileId[f.id] ?? '') : '';
        if (current.trim()) continue;
        const base = getAudioBaseName(f.originalName) || f.newName;
        customByFileId[f.id] = `${prefix}${base}`;
    }
    return { customByFileId, byEventKey: { ...subtitles.value.byEventKey } };
});

const ffmpegGate = ref<{
    status: 'loading' | 'ready' | 'error';
    progress: number;
    error: string | null;
}>({
    status: 'loading',
    progress: 0,
    error: null,
});

let ffmpegUnsubStatus: null | (() => void) = null;
let ffmpegUnsubProgress: null | (() => void) = null;
let windowDropGuardCleanup: null | (() => void) = null;

const startFfmpegPreload = async () => {
    ffmpegGate.value = { status: 'loading', progress: 0, error: null };
    try {
        const timeoutMs = 60_000;
        await Promise.race([
            ffmpeg.load(),
            new Promise<void>((_, reject) => {
                window.setTimeout(() => reject(new Error(`FFmpeg 加载超时（>${Math.round(timeoutMs / 1000)}s）`)), timeoutMs);
            }),
        ]);
        ffmpegGate.value = { status: 'ready', progress: 100, error: null };
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ffmpegGate.value = { status: 'error', progress: 0, error: msg };
    }
};

const resolveDownloadsDir = async () => {
    const dir = await window.ipcRenderer.invoke('system:getPath', 'downloads');
    defaultDownloadsDir.value = typeof dir === 'string' ? dir : '';
    return defaultDownloadsDir.value;
};

const ensurePackOutputDir = async () => {
    if (typeof packOutputDir.value === 'string' && packOutputDir.value.trim()) {
        if (!defaultDownloadsDir.value) await resolveDownloadsDir();
        return;
    }
    const downloads = await resolveDownloadsDir();
    if (downloads) packOutputDir.value = downloads;
};

const choosePackOutputDir = async () => {
    const selected = await window.ipcRenderer.invoke('dialog:selectDirectory');
    if (typeof selected === 'string' && selected.trim()) {
        packOutputDir.value = selected.trim();
    }
};

const restoreDefaultOutputDir = async () => {
    const downloads = defaultDownloadsDir.value || (await resolveDownloadsDir());
    if (downloads) packOutputDir.value = downloads;
};

onMounted(() => {
    ffmpegUnsubStatus = ffmpeg.onStatus((status) => {
        if (ffmpegGate.value.status === 'ready') return;
        if (status === 'error') {
            ffmpegGate.value = { status: 'error', progress: ffmpegGate.value.progress, error: ffmpegGate.value.error ?? 'FFmpeg 加载失败' };
            return;
        }
        if (status === 'loading') {
            ffmpegGate.value = { status: 'loading', progress: ffmpegGate.value.progress, error: null };
            return;
        }
    });

    ffmpegUnsubProgress = ffmpeg.onProgress((p) => {
        if (ffmpegGate.value.status === 'ready') return;
        ffmpegGate.value = { ...ffmpegGate.value, progress: p };
    });

    void startFfmpegPreload();
    void ensurePackOutputDir();

    const prevent = (e: DragEvent) => {
        e.preventDefault();
    };
    window.addEventListener('dragover', prevent, true);
    window.addEventListener('drop', prevent, true);
    windowDropGuardCleanup = () => {
        window.removeEventListener('dragover', prevent, true);
        window.removeEventListener('drop', prevent, true);
    };
});

onBeforeUnmount(() => {
    ffmpegUnsubStatus?.();
    ffmpegUnsubProgress?.();
    ffmpegUnsubStatus = null;
    ffmpegUnsubProgress = null;
    windowDropGuardCleanup?.();
    windowDropGuardCleanup = null;
});

const close = () => {
    (window as any).windowControl.close();
};

const minimize = () => {
    (window as any).windowControl.minimize();
};

const goToStep = (stepName: string) => {
    if (ffmpegGate.value.status !== 'ready') return;
    // Simple validation before jumping
    const currentIndex = steps.indexOf(hasStep.value);
    const targetIndex = steps.indexOf(stepName);
    
    // Prevent jumping forward arbitrarily if not ready (simple check)
    if (targetIndex > currentIndex) {
        if (currentIndex === 0 && !meta.value.name) {
            alert("请先填写资源包名称");
            return;
        }
        if (currentIndex === 1 && files.value.length === 0) {
            alert("请先导入音频文件");
            return;
        }
    }
    
    hasStep.value = stepName;
};

const nextStep = () => {
    if (ffmpegGate.value.status !== 'ready') return;
    const idx = steps.indexOf(hasStep.value);
    if (idx < steps.length - 1) {
        goToStep(steps[idx + 1]);
    }
};

const createNewPack = () => {
    if (meta.value.iconPreviewUrl) URL.revokeObjectURL(meta.value.iconPreviewUrl);
    meta.value = createDefaultMeta();
    files.value = [];
    subtitles.value = createDefaultSubtitles();
    processing.value = createDefaultProcessing();
    audioProgress.value = {};
    convertLogs.value = [];
    hasStep.value = steps[0];
};

const startProcessing = async () => {
    if (ffmpegGate.value.status !== 'ready') return;
    goToStep(steps[2]);

    processing.value = {
        title: "正在准备转换器...",
        desc: "加载 FFmpeg 核心组件",
        currentFile: "Initializing...",
        percent: 0,
        error: null,
    };
    convertLogs.value = [];
    audioProgress.value = {};

    const sourceFiles = files.value;
    const total = sourceFiles.length;
    let baseDone = 0;

    for (const f of sourceFiles) {
        f.status = 'pending';
        f.processedBlob = null;
        audioProgress.value[f.id] = { stage: 'queued', percent: 0 };
    }

    try {
        processing.value.title = "正在转换音频...";
        processing.value.desc = "将音频转换为 OGG 格式（44100Hz / 双声道）";

        for (const file of sourceFiles) {
            processing.value.currentFile = `正在处理: ${file.originalName}`;

            audioProgress.value[file.id] = { stage: 'checking', percent: 0 };
            file.status = 'processing';

            convertLogs.value.push({
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                at: Date.now(),
                level: 'info',
                message: `开始处理: ${file.originalName} -> ${file.newName}.ogg`
            });

            if (isMaybeOggFile(file)) {
                const ready = await checkMinecraftOggReady(file.originalFile);
                if (ready.ready) {
                    file.processedBlob = file.originalFile;
                    file.status = 'done';
                    audioProgress.value[file.id] = { stage: 'skipped', percent: 100 };
                    baseDone += 1;
                    processing.value.percent = (baseDone / total) * 100;
                    convertLogs.value.push({
                        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        at: Date.now(),
                        level: 'info',
                        message: `已符合规格，跳过转码: ${file.originalName}`
                    });
                    continue;
                }
            }

            audioProgress.value[file.id] = { stage: 'converting', percent: 0 };

            const unsubscribe = ffmpeg.onProgress((p) => {
                audioProgress.value[file.id] = { stage: 'converting', percent: p };
                processing.value.percent = ((baseDone + p / 100) / total) * 100;
            });

            try {
                const { blob } = await ffmpeg.toOGG(file.originalFile);
                file.processedBlob = blob;
                file.status = 'done';

                unsubscribe();
                audioProgress.value[file.id] = { stage: 'done', percent: 100 };
                baseDone += 1;
                processing.value.percent = (baseDone / total) * 100;

                convertLogs.value.push({
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    at: Date.now(),
                    level: 'info',
                    message: `完成: ${file.newName}.ogg`
                });
            } catch (err) {
                unsubscribe();
                file.status = 'error';
                audioProgress.value[file.id] = { stage: 'error', percent: 0 };
                const msg = err instanceof Error ? err.message : String(err);
                convertLogs.value.push({
                    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                    at: Date.now(),
                    level: 'error',
                    message: `失败: ${file.originalName} - ${msg}`
                });

                processing.value = {
                    title: "转换失败",
                    desc: "请尝试更换音频文件或重试。",
                    currentFile: file.originalName,
                    percent: processing.value.percent,
                    error: msg,
                };
                return;
            }
        }

        processing.value = {
            title: "转换完成",
            desc: "正在生成 sounds.json 与资源包元数据。",
            currentFile: "All files processed!",
            percent: 100,
            error: null,
        };

        goToStep(steps[3]);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        processing.value = {
            title: "转换器加载失败",
            desc: "请检查 FFmpeg 核心文件是否存在，或重试。",
            currentFile: "FFmpeg load failed",
            percent: 0,
            error: msg,
        };
        convertLogs.value.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            at: Date.now(),
            level: 'error',
            message: `致命错误: ${msg}`
        });
    }
};

</script>

<template>
    <!-- 1. Header & Navigation -->
    <header class="app-titlebar h-14 shrink-0 flex items-center justify-between px-6 z-60">
        <div class="flex items-center gap-2.5 w-40">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-white">
                <img src="/note_block.png" alt="logo">
            </div>
            <span class="font-black text-sm tracking-tight text-slate-800 text-nowrap">{{ config.appName }}</span>
        </div>

        <nav class="step-nav flex-1 mx-4 flex items-center justify-center gap-4 h-full overflow-x-auto">
            <div 
                v-for="(step, index) in steps" 
                :key="step" 
                class="flex items-center gap-2 select-none"
            >
                <div 
                    class="flex items-center rounded-full transition-all duration-300 px-1 py-1 pr-4"
                    :class="hasStep === step ? 'bg-blue-50 ring-1 ring-blue-200' : ''"
                >
                    <div
                        class="w-6 h-6 rounded-full flex justify-center items-center text-center text-[10px] font-bold mr-2 transition-colors"
                        :class="hasStep === step ? 'bg-blue-500 text-white' : (steps.indexOf(hasStep) > index ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-500')"
                    >
                        {{ index + 1 }}
                    </div>
                    <span 
                        class="text-[13px] font-bold transition-colors"
                        :class="hasStep === step ? 'text-blue-600' : (steps.indexOf(hasStep) > index ? 'text-green-600' : 'text-slate-400')"
                    >
                        {{ step }}
                    </span>
                </div>
                <PhCaretDoubleRight class="text-slate-300" v-if="step !== steps[steps.length - 1]" :size="14" />
            </div>

        </nav>

        <div class="flex items-center gap-1">
            <div class="flex items-center w-40 justify-end h-full gap-1">
                <button @click="minimize()"
                    class="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                    <Minus class="w-4 h-4" />
                </button>
                <button @click="close()"
                    :class="`h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors`">
                    <X class="w-4 h-4" />
                </button>
            </div>
        </div>

    </header>

    <main class="flex-1 min-h-0 relative bg-slate-50/50 h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col">
        <div v-if="ffmpegGate.status !== 'ready'" class="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-6">
            <div class="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
                <div class="flex items-center gap-3">
                    <div class="flex h-10 w-10 items-center justify-center rounded-full" :class="ffmpegGate.status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'">
                        <AlertCircle v-if="ffmpegGate.status === 'error'" class="h-5 w-5" />
                        <Loader2 v-else class="h-5 w-5 animate-spin" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-base font-extrabold text-slate-800">
                            {{ ffmpegGate.status === 'error' ? 'FFmpeg 加载失败' : '正在加载音频转换器' }}
                        </div>
                        <div class="text-sm text-slate-500">
                            {{ ffmpegGate.status === 'error' ? (ffmpegGate.error || '请重试') : '首次启动需要加载核心组件，请稍候。' }}
                        </div>
                    </div>
                </div>

                <div v-if="ffmpegGate.status !== 'error'" class="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    进度：{{ Math.min(100, Math.max(0, Math.round(ffmpegGate.progress))) }}%
                </div>

                <div v-if="ffmpegGate.status === 'error'" class="mt-5 flex justify-end">
                    <button
                        type="button"
                        @click="startFfmpegPreload"
                        class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                        <RefreshCw class="h-4 w-4" />
                        重试
                    </button>
                </div>
            </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto">
            <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
                <!-- Transition wrapper could be added here -->
                
                <!-- 基本信息 -->
                <div v-if="hasStep === steps[0]">
                    <Step1BasicInfo v-model:meta="meta" />
                    
                    <div class="flex justify-end mt-8">
                        <button 
                            @click="nextStep"
                            :disabled="ffmpegGate.status !== 'ready' || !meta.name"
                            class="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition flex items-center gap-2"
                        >
                            <span>下一步</span>
                            <ArrowRight class="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <!-- 导入音频 -->
                <div v-if="hasStep === steps[1]">
                    <Step2ImportAudio 
                        v-model:files="files" 
                        v-model:subtitles="subtitles"
                        :meta="meta" 
                        @request-process="startProcessing"
                        @prev="goToStep(steps[0])"
                    />
                </div>

                <!-- 格式转换 -->
                <div v-if="hasStep === steps[2]">
                    <Step3Convert 
                        :processing="processing"
                        :logs="convertLogs"
                        :audio-progress="audioProgress"
                        :files="files"
                        @next="nextStep"
                        @retry="startProcessing"
                    />
                </div>

                <!-- 打包下载 -->
                <div v-if="hasStep === steps[3]">
                    <Step4Download 
                        :files="files"
                        :meta="meta"
                        :subtitles="effectiveSubtitles"
                        @create-new="createNewPack"
                    />
                </div>
            </div>
        </div>

        <!-- 全局确认框 -->
        <GlobalDialog />

        <button
            type="button"
            @click="settingsOpen = true"
            class="fixed bottom-6 right-6 z-70 h-12 w-12 rounded-2xl bg-slate-900 text-white shadow-xl shadow-slate-900/20 transition hover:bg-slate-800"
        >
            <Settings class="h-5 w-5 mx-auto" />
        </button>

        <Model v-model:open="settingsOpen" title="设置">
            <div class="space-y-4">
                <div>
                    <div class="text-sm font-extrabold text-slate-800">音频包输出路径</div>
                    <div class="mt-1 text-xs font-bold text-slate-400">打包完成后会直接输出到该文件夹</div>
                </div>

                <div class="flex items-center gap-3">
                    <input
                        class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none"
                        :value="(packOutputDir || '').toString()"
                        readonly
                    />
                    <button
                        type="button"
                        @click="choosePackOutputDir"
                        class="rounded-xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-blue-700"
                    >
                        选择文件夹
                    </button>
                </div>

                <div class="flex items-center justify-between">
                    <div class="text-xs font-bold text-slate-400 truncate">
                        默认：{{ defaultDownloadsDir || '（正在读取...）' }}
                    </div>
                    <button
                        type="button"
                        @click="restoreDefaultOutputDir"
                        class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                    >
                        恢复默认
                    </button>
                </div>

                <div class="pt-4 border-t border-slate-100 space-y-3">
                    <div class="text-sm font-extrabold text-slate-800">关于</div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <div class="flex items-center justify-between gap-3">
                            <div class="text-sm font-extrabold text-slate-700 truncate">{{ config.appName }}</div>
                            <div class="shrink-0 font-mono text-[11px] font-bold text-slate-500">v{{ config.appVersion }}</div>
                        </div>
                        <div class="text-[11px] font-medium text-slate-500 leading-relaxed">
                            本软件为第三方工具，与 Mojang Studios / Microsoft 不存在从属或授权关系；Minecraft 为其各自所有者的商标。
                            请确保导入的音频与资源遵守版权及相关法律法规；因使用本软件导致的任何后果由使用者自行承担。
                        </div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                        <div class="text-sm font-extrabold text-slate-800">开源与收费声明</div>
                        <div class="text-[11px] font-medium text-slate-600 leading-relaxed">
                            本软件开源且免费，任何形式的收费售卖均与作者无关。若您通过收费渠道获得本软件，请立即向支付渠道申请退款，并向该平台举报相关售卖行为。
                        </div>
                    </div>
                </div>
            </div>
        </Model>
    </main>
</template>

<style scoped>
/* Titlebar */
.app-titlebar {
    -webkit-app-region: drag;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    position: relative;
    font-family: var(--font-main) !important;
}

.app-titlebar button, .app-titlebar .cursor-pointer {
    -webkit-app-region: no-drag;
}

/* Navigation Tabs */
.nav-tab {
    position: relative;
    transition: all 0.3s var(--ease-spring);
    display: flex;
    align-items: center;
    justify-content: center;
}

.active {
    color: #4DB7FF;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.step-nav::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
