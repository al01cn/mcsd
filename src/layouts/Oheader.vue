<script lang="ts" setup>
import { Minus, X } from 'lucide-vue-next';
import config from '../lib/config'
import { onMounted, ref } from 'vue';
import GlobalDialog from '../components/GlobalDialog.vue';
import { PhCaretDoubleRight } from "@phosphor-icons/vue";

const steps = ["基本信息", "导入音频", "格式转换", "打包下载", "生成命令"]
const hasStep = ref(steps[0]);

onMounted(() => {
    // Dialog.info({
    //     title: '提示',
    //     msg: '这里点击遮罩不会关闭',
    //     closeOnMask: false
    // })
})

const close = () => {
    (window as any).windowControl.close();
};

const minimize = () => {
    (window as any).windowControl.minimize();
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

        <nav class="flex items-center gap-4 h-full">
            <div v-for="step in steps" :key="step" class="flex items-center gap-2">
                <div class="flex items-center bg-blue-300 rounded-full active">
                    <div
                        class="bg-blue-400 text-white w-6 h-6 rounded-full flex justify-center items-center text-center">
                        {{ steps.indexOf(step) + 1 }}
                    </div>
                    <a class="nav-tab text-white font-bold text-[13px] h-full px-4 text-center">
                        {{ step }}
                    </a>
                </div>
                <PhCaretDoubleRight class="text-blue-400" v-if="step !== steps[steps.length - 1]" :size="16" />
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

    <main class="flex-1 relative bg-slate-50/50 h-screen">
        <div class="max-w-4xl mx-auto px-6 py-10 pb-24 overflow-y-auto">
            <!-- 基本信息 -->
            <div v-if="hasStep === steps[0]">
                基本信息
            </div>
            <!-- 导入音频 -->
            <div v-if="hasStep === steps[1]">
                导入音频
            </div>
            <!-- 格式转换 -->
            <div v-if="hasStep === steps[2]">
                格式转换
            </div>
            <!-- 打包下载 -->
            <div v-if="hasStep === steps[3]">
                打包下载
            </div>
            <!-- 生成命令 -->
            <div v-if="hasStep === steps[4]">
                生成命令
            </div>
        </div>

        <!-- 全局确认框 -->
        <GlobalDialog />
    </main>
</template>

<style scoped>
/* Titlebar */
.app-titlebar {
    -webkit-app-region: drag;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
    position: relative;
    font-family: var(--font-main) !important;
}

.app-titlebar button {
    -webkit-app-region: no-drag;
}

.app-titlebar a {
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
</style>