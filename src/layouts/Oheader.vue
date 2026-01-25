<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { Minus, X } from 'lucide-vue-next';
import config from '../lib/config'
import { ref } from 'vue';
import GlobalDialog from '../components/GlobalDialog.vue';

const route = useRoute();
const router = useRouter();

const pages = ref([
    {
        name: '主页',
        path: '/'
    }
])

const isActive = (path: string) => {
    // 只有当前 path 在 pages 里面才判断高亮
    return pages.value.some(p => p.path === route.path && p.path === path)
}


const toPage = (e: Event, path: string) => {
    // 1. 阻止 <RouterLink> 的默认 a 标签跳转
    e.preventDefault();
    // 3. 使用 router.push 执行手动跳转
    router.push(path);
}

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
                <img src="/ficon.png" alt="logo">
            </div>
            <span class="font-black text-sm tracking-tight text-slate-800 text-nowrap">{{ config.appName }}</span>
        </div>

        <nav class="flex items-center gap-4 h-full">
            <a v-for="page in pages" :key="page.name" @click.prevent="toPage($event, page.path)"
                :class="`nav-tab font-bold text-[13px] h-full px-4 ${isActive(page.path) ? 'active' : ''}`">
                {{ page.name }}
            </a>
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
            <router-view />
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

.nav-tab.active {
    color: #4DB7FF;
}

.nav-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 20px;
    height: 3px;
    background: #4DB7FF;
    border-radius: 99px 99px 0 0;
}
</style>