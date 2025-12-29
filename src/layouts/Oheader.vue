<script lang="ts" setup>
import { useRoute } from 'vue-router'
import { CloudLightning, Minus, X } from 'lucide-vue-next';
import config from '../lib/config'
import { Settings } from 'lucide-vue-next';
import { computed } from 'vue';

const route = useRoute();

// 注意这里依赖 route.name 或 route.path
const showSettingsButton = computed(() => {
  // 如果你在路由配置里有 name: 'Settings'
  return route.name !== 'Settings';
  // 或者用 path 判断
  // return route.path !== '/settings';
});

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
            <div class="w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-white">
                <CloudLightning class="w-3.5 h-3.5" />
            </div>
            <span class="font-black text-sm tracking-tight text-slate-800 text-nowrap">{{ config.appName }}</span>
        </div>

        <nav class="flex items-center gap-4 h-full">
            <RouterLink to="/" active-class="active"
                class="nav-tab font-bold text-[13px] text-slate-400 hover:text-slate-600 h-full px-4">
                控制台
            </RouterLink>
            <RouterLink to="/network" active-class="active"
                class="nav-tab font-bold text-[13px] text-slate-400 hover:text-slate-600 h-full px-4">
                节点发现
            </RouterLink>
        </nav>

        <div class="flex items-center w-40 justify-end h-full gap-1">
            <button @click="minimize()"
                class="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                <Minus class="w-4 h-4" />
            </button>
            <button @click="close()"
                class="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-colors">
                <X class="w-4 h-4" />
            </button>
        </div>
    </header>

    <main class="flex-1 overflow-y-auto relative bg-slate-50/50">
        <!-- Decorator -->
        <div
            class="fixed top-0 right-0 w-125 h-125 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] pointer-events-none">
        </div>

        <div class="max-w-4xl mx-auto px-6 py-10 pb-24">
            <router-view />

            <!-- Side Setting Ball -->
            <RouterLink v-if="showSettingsButton" to="/settings"
                class="fab left-6 bg-white text-slate-400 border border-slate-100 hover:text-primary transition-colors group">
                <Settings class="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" />
            </RouterLink>
        </div>
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