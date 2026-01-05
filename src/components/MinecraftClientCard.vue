<script lang="ts" setup>
import { Activity, AlertCircle, Loader2 } from "lucide-vue-next"
import { Icon } from "@iconify/vue";
import { McLoginType, McModLoader } from "../lib/mcDetect";

const props = defineProps({
    loader: { type: String, default: "" },
    loaderVersion: { type: String, default: "" },
    username: { type: String, default: "" },
    uuid: { type: String, default: "" },
    loginType: { type: String, default: "" },
    provider: { type: String, default: "" },
    version: { type: String, default: "" },
    lanPorts: { type: Array, default: () => [] },
    isLan: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    // 接收索引，用于计算延迟
    index: { type: Number, default: 0 }
})

// 使用一个非响应式的变量或者只在挂载时赋值一次
const initialDelay = props.index;

function parseVersion(fullVersion: string): string | undefined {
    // 自动清洗：去掉 NeoForge, Fabric, Forge 等后缀
    // 同时也去掉你之前提到的末尾空格、点等
    return fullVersion
        .split(/[\s\-_]/)[0]      // 截取第一个分隔符前的部分
        .replace(/[\s._-]+$/, ""); // 清理残余符号
}
</script>

<template>
    <div :class="[
        'group card-v5 p-6 instance-card border-2 transition-custom duration-300',
        isLan && !loading
            ? 'cursor-pointer bg-white hover:border-[#4DB7FF] hover:shadow-lg hover:-translate-y-1'
            : 'bg-slate-50',
        selected || loading ? 'border-[#4DB7FF] bg-white! shadow-md' : 'border-transparent',
        !isLan ? 'opacity-60 cursor-not-allowed' : ''
    ]" :style="{ '--delay': initialDelay }">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-5">
                <div
                    :class="`w-16 h-16 ${isLan ? 'bg-slate-100 text-white' : 'bg-slate-200 text-slate-400'} rounded-3xl flex items-center justify-center relative transition-colors group-hover:bg-blue-50`">
                    <span class="font-black text-xl">
                        <Icon v-if="loader == McModLoader.Forge" icon="simple-icons:curseforge"
                            class="w-12 h-12 text-black" />
                        <Icon v-else-if="loader == McModLoader.Fabric" icon="material-icon-theme:minecraft-fabric"
                            class="w-12 h-12" />
                        <img v-else-if="loader == McModLoader.Quilt" src="/images/icon/quilt.png" class="w-full h-full"
                            alt="quilt">
                        <img v-else-if="loader == McModLoader.NeoForge" src="/images/icon/newforge.png"
                            class="w-full h-full" alt="newforge">
                        <Icon v-else icon="mdi:minecraft" class="w-12 h-12 text-success" />
                    </span>
                    <div v-if="isLan"
                        class="absolute -top-1 -right-1 w-5 h-5 bg-success rounded-full border-4 border-white shadow-glow-success">
                    </div>
                </div>
                <div>
                    <h4 class="font-black text-slate-800 text-lg">{{ parseVersion(version) || "Minecraft 未知版本" }}</h4>
                    <p class="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                        <span :class="`flex items-center gap-1 ${isLan ? 'text-success' : ''}`">
                            <Activity v-if="isLan" class="w-3 h-3" />
                            <AlertCircle v-else class="w-3 h-3" />
                            {{ isLan ? lanPorts[0] || '-' : "未开启局域网" }}
                        </span>
                        <span v-if="loaderVersion">{{ loaderVersion }}</span>
                        <span v-if="username">{{ username }}</span>
                        <span v-if="uuid">{{ uuid }}</span>
                    </p>
                </div>
            </div>

            <div class="relative min-h-12 flex items-center gap-4">
                <div v-if="!loading"
                    :class="`flex items-center ${isLan ? `gap-4` : 'gap-6'} transition-all duration-300 ${isLan ? `group-hover:opacity-0 group-hover:invisible group-hover:scale-95` : ''}`">
                    <div class="text-right flex flex-col justify-end min-w-15">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{{
                            loginType === McLoginType.Custom ? '第三方登录' : '登录状态' }}
                        </p>
                        <div class="h-8 flex items-center justify-end">
                            <p v-if="loginType == McLoginType.Offline"
                                class="text-lg font-black  text-slate-400 leading-none">
                                离线登录
                            </p>
                            <p v-else-if="loginType == McLoginType.Msa"
                                class="text-sm font-black text-primary leading-none">
                                微软登录</p>
                            <p v-else-if="loginType == McLoginType.Custom"
                                class="text-sm font-black text-primary leading-none">
                                {{ provider != null ? provider.toLocaleUpperCase() : '第三方' }}
                            </p>
                            <p v-else class="text-sm font-black text-slate-400 leading-none">未知的登录</p>
                        </div>
                    </div>
                </div>

                <div v-if="isLan" :class="[
                    'flex items-center justify-end gap-3 transition-all duration-300 transform min-w-35',
                    loading
                        ? 'opacity-100 visible translate-x-0'
                        : 'absolute right-0 opacity-0 invisible translate-x-4 group-hover:opacity-100 group-hover:visible group-hover:translate-x-0'
                ]">
                    <span class="text-lg font-black text-primary uppercase tracking-tight whitespace-nowrap">
                        {{ loading ? '正在创建...' : '创建房间' }}
                    </span>
                    <div
                        class="w-10 h-10 shrink-0 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
                        <Icon v-else icon="heroicons:arrow-right-20-solid" class="w-6 h-6" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card-v5 {
    border-radius: 3rem;
    background: white;
    border: 1px solid #F1F5F9;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.02);
}

.instance-card.selected {
    border-color: #4DB7FF;
    box-shadow: 0 0 0 4px rgba(77, 183, 255, 0.1);
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