<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue';
import { RotateCw, Loader2 } from "lucide-vue-next";
import MinecraftClientCard from '../components/MinecraftClientCard.vue';
import getDetect, { MinecraftProcessInfo } from '../lib/mcDetect';

const loadingPid = ref<number | null>(null);
const clients = ref<MinecraftProcessInfo[]>([]);
const isRefreshing = ref(false);

const refreshClients = async () => {
    if (isRefreshing.value) return;

    isRefreshing.value = true;
    clients.value = []; // 先清空列表，触发“离场”动画

    // 模拟接口耗时
    setTimeout(async () => {
        // const data = await getDetect();
        isRefreshing.value = false;
        // nextTick 确保 Loading 消失后再开始填充数据，防止动画卡顿
        nextTick(() => {
            clients.value = [
                {
                    pid: 0,
                    java: "Java",
                    version: "1.20.1",
                    loader: "Vanilla",
                    loaderVersion: "1.20.1",
                    username: "OneTunnel",
                    uuid: "00000000-0000-0000-0000-000000000000",
                    loginType: "offline",
                    lanPorts: [25565]
                },
                {
                    pid: 2,
                    java: "Java",
                    version: "1.20.1",
                    loader: "Forge",
                    loaderVersion: undefined,
                    username: "OneTunnel",
                    uuid: "00000000-0000-0000-0000-000000000000",
                    loginType: "offline",
                    lanPorts: []
                }
            ]
        });
    }, 1000);
};

onMounted(async () => {
    refreshClients();
});

const handleCardClick = (client: any) => {
    if (client.lanPorts.length === 0 || loadingPid.value !== null) return;
    loadingPid.value = client.pid;
    setTimeout(() => { loadingPid.value = null; }, 3000);
};
</script>

<template>
    <div id="view-rooms" class="view-section space-y-6 min-h-screen p-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">创建房间</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">创建一个联机房间</p>
            </div>
            <button @click="refreshClients" :disabled="isRefreshing"
                class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all duration-300 active:scale-95 group disabled:opacity-50">
                <RotateCw
                    :class="['w-4 h-4 transition-transform duration-500', isRefreshing ? 'animate-spin' : 'group-hover:rotate-180']" />
                <span class="text-sm font-bold">刷新列表</span>
            </button>
        </div>

        <div class="relative min-h-100">
            <div v-if="isRefreshing" class="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 class="w-10 h-10 text-[#4DB7FF] animate-spin mb-4" />
                <p class="text-slate-400 font-bold text-sm animate-pulse">正在查找游戏...</p>
            </div>

            <TransitionGroup name="stagger" tag="div" class="grid grid-cols-1 gap-4">
                <MinecraftClientCard v-for="(i, index) in clients" :key="i.pid" :index="index" v-bind="i"
                    :isLan="i.lanPorts.length > 0" :loading="loadingPid === i.pid" @click.stop="handleCardClick(i)" />
            </TransitionGroup>
        </div>
    </div>
</template>

<style scoped>
/* 依次展示动画的关键 CSS */
.stagger-enter-active {
    transition: all 0.5s cubic-bezier(0.3, 0, 0.2, 1);
    /* 通过子组件传出的 --delay 变量计算延迟 */
    transition-delay: calc(var(--delay) * 0.1s);
}

.stagger-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
}

/* 离开时的动画 */
.stagger-leave-active {
    transition: all 0.3s ease;
}

.stagger-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

/* 当元素改变位置时的平滑移动 */
.stagger-move {
    transition: transform 0.4s ease;
}
</style>