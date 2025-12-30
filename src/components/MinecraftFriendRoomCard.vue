<script lang="ts" setup>
import { Activity, AlertCircle, Loader2 } from "lucide-vue-next"
import { Icon } from "@iconify/vue";

defineProps({
    // 保持原来的字段，或者映射到新字段
    hostName: { type: String, default: "" },
    version: { type: String, default: "" },
    ping: { type: String, default: "" },
    isPublic: { type: Boolean, default: false },
    players: { type: String, default: "" },

    // 逻辑控制
    loading: { type: Boolean, default: false },
    index: { type: Number, default: 0 }
})
</script>

<template>
    <div :class="[
        'group card-v5 p-6 instance-card border-2 transition-all duration-300',
        !loading
            ? 'cursor-pointer bg-white hover:border-[#4DB7FF] hover:shadow-lg hover:-translate-y-1'
            : 'bg-slate-50',
        loading ? 'border-[#4DB7FF] bg-white! shadow-md' : 'border-transparent'
    ]" :style="{ '--delay': index }">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
                <div
                    :class="`w-16 h-16 ${!loading ? 'bg-slate-100 text-white' : 'bg-slate-200 text-slate-400'} rounded-3xl flex items-center justify-center relative transition-colors group-hover:bg-blue-50`">
                    <span class="font-black text-xl">
                        <Icon v-if="!isPublic" icon="mdi:account-group" class="w-12 h-12 text-primary" />
                        <Icon v-else icon="mdi:earth" class="w-12 h-12 text-success" />
                    </span>
                    <div
                        class="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full border-4 border-white shadow-glow-success">
                    </div>
                </div>
                <div>
                    <h4 class="font-black text-slate-800 text-lg">{{ hostName || "未知房间" }}</h4>
                    <p class="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span class="flex items-center gap-1">
                            <Activity class="w-3 h-3 text-success" />
                            {{ isPublic ? "公开房间" : "好友房间" }}
                        </span>
                        <span>{{ version }}</span>
                        <span>在线: {{ players }}</span>
                    </p>
                </div>
            </div>

            <div class="relative min-h-12 flex items-center">
                <div v-if="!loading"
                    class="flex items-center gap-6 transition-all duration-300 group-hover:opacity-0 group-hover:invisible group-hover:scale-95">
                    <div class="text-right flex flex-col justify-end min-w-15">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">连接延迟
                        </p>
                        <div class="h-8 flex items-center justify-end">
                            <p class="text-lg font-black text-primary font-mono leading-none">{{ ping }}ms</p>
                        </div>
                    </div>
                    <div class="text-right flex flex-col justify-end min-w-15">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">当前人数
                        </p>
                        <div class="h-8 flex items-center justify-end">
                            <p class="text-2xl font-black text-primary font-mono leading-none">{{ players }}</p>
                        </div>
                    </div>
                </div>

                <div :class="[
                    'flex items-center justify-end gap-2 transition-all duration-300 transform',
                    loading ? 'opacity-100 visible translate-x-0' : 'absolute inset-0 opacity-0 invisible translate-x-4 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0'
                ]">
                    <span class="text-lg font-black text-primary uppercase tracking-tight">{{ loading ? '正在加入...' :
                        '加入房间' }}</span>
                    <div
                        class="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
                        <Icon v-else icon="heroicons:arrow-right-20-solid" class="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* 完全还原你的原始 CSS */
.card-v5 {
    border-radius: 3rem;
    background: white;
    border: 1px solid #F1F5F9;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02);
}

.text-success {
    color: #10b981;
}

.text-primary {
    color: #4DB7FF;
}

.bg-primary {
    background-color: #4DB7FF;
}

.shadow-glow-success {
    box-shadow: 0 0 15px rgba(16, 185, 129, 0.4);
}

.instance-card:not(.opacity-60):hover {
    box-shadow: 0 20px 40px rgba(77, 183, 255, 0.1);
}
</style>