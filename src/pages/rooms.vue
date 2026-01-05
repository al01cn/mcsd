<script lang="ts" setup>
import { ref } from 'vue';
import { PlusCircle } from "lucide-vue-next";
import SessionCache from '../lib/cache';
import { useRouter } from 'vue-router';

const router = useRouter();
const McClientToken = ref()

const confirmJoinNetwork = async() => {

    SessionCache.set("runing_token", McClientToken.value)

    // console.log(rawData);

    router.push('/console')
}

</script>

<template>
    <div id="view-rooms" class="view-section space-y-6 min-h-screen p-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">加入房间</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">输入联机码，与朋友进行联机游玩</p>
            </div>
        </div>

        <div class="px-6 flex justify-center items-center h-100">
            <div class="w-full flex gap-2">
                <input type="password" placeholder="请输入联机码" v-model="McClientToken"
                    class="input w-full bg-slate-50 border rounded-2xl px-5 py-3.5 text-sm font-bold text-slate-700 focus:bg-white border-primary outline-none">
                <button @click="confirmJoinNetwork()"
                    class="flex w-50 items-center gap-2 px-4 py-2 bg-primary hover:bg-[#5e88a4] text-white rounded-2xl transition-all duration-300 active:scale-95 group">
                    <PlusCircle class="w-4 h-4" />
                    <span class="text-sm font-bold">加入房间</span>
                </button>
            </div>
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