<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue';
import { RotateCw, Loader2, PlusCircle } from "lucide-vue-next";
import MinecraftFriendRoomCard from '../components/MinecraftFriendRoomCard.vue';

const loadingPid = ref<number | null>(null);
const rooms = ref<any[]>([]);
const isRefreshing = ref(false);

// 模拟房间数据
const rawData = [
    { pid: 1, hostName: "Summer_Miku", version: "1.20.1", ping: "24", players: "3/10", isPublic: false },
    { pid: 2, hostName: "Technical_Server", version: "1.20.1", ping: "56", players: "12/50", isPublic: true },
];

const refreshRooms = async () => {
    if (isRefreshing.value) return;
    isRefreshing.value = true;
    rooms.value = []; // 触发消失动画

    setTimeout(() => {
        isRefreshing.value = false;
        nextTick(() => {
            rooms.value = [...rawData]; // 触发进入动画
        });
    }, 1000);
};

onMounted(() => { refreshRooms(); });

const handleJoinRoom = (room: any) => {
    if (loadingPid.value === null) {
        loadingPid.value = room.pid;
        setTimeout(() => { loadingPid.value = null; }, 3000);
    }
};
</script>

<template>
    <div id="view-rooms" class="view-section space-y-6 min-h-screen p-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">加入房间</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">寻找好友或公开的联机房间</p>
            </div>

            <div class="flex items-center gap-3">
                <button @click="refreshRooms" :disabled="isRefreshing"
                    class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all duration-300 active:scale-95 group disabled:opacity-50">
                    <RotateCw
                        :class="['w-4 h-4 transition-transform duration-500', isRefreshing ? 'animate-spin' : 'group-hover:rotate-180']" />
                    <span class="text-sm font-bold">刷新列表</span>
                </button>
                <button
                    class="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5e88a4] text-white rounded-2xl transition-all duration-300 active:scale-95 group disabled:opacity-50">
                    <PlusCircle class="w-4 h-4" />
                    <span class="text-sm font-bold">加入房间</span>
                </button>
            </div>
        </div>

        <div class="relative min-h-100">
            <div v-if="isRefreshing" class="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 class="w-10 h-10 text-[#4DB7FF] animate-spin mb-4" />
                <p class="text-slate-400 font-bold text-sm animate-pulse">正在查找房间...</p>
            </div>

            <TransitionGroup name="stagger" tag="div" class="grid grid-cols-1 gap-4">
                <MinecraftFriendRoomCard v-for="(i, index) in rooms" :key="i.pid" :index="index" v-bind="i"
                    :loading="loadingPid === i.pid" @click.stop="handleJoinRoom(i)" />
            </TransitionGroup>
        </div>
    </div>
</template>

<style scoped>
/* 保持你认可的依次展示动画关键 CSS */
.stagger-enter-active {
    transition: all 0.5s cubic-bezier(0.3, 0, 0.2, 1);
    transition-delay: calc(var(--delay) * 0.1s);
}

.stagger-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
}

.stagger-leave-active {
    transition: all 0.3s ease;
}

.stagger-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

.stagger-move {
    transition: transform 0.4s ease;
}
</style>