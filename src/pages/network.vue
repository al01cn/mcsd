<script lang="ts" setup>
import { MapPin, ArrowRight, RotateCw, PlusCircle, Server, ChevronDown, Key, Box } from 'lucide-vue-next';
import { ref } from 'vue';

const isModalOpen = ref(false)
const network = ref("natfrp")
const networkKey = ref("")

const info = [{
    name: "上海 核心节点 B2",
    s: "华东 · 联通核心网",
    p: "在线/空闲"
}, {
    name: "广州 核心节点 B2",
    s: "华东 · 联通核心网",
    p: "在线/空闲"
}]

const openModal = () => {
    isModalOpen.value = !isModalOpen.value
}

const closeNetworkModal = () => {
    isModalOpen.value = !isModalOpen.value
}

const confirmNetwork = () => {
    console.log("Network");

    closeNetworkModal()
}

</script>

<template>
    <!-- VIEW: NETWORK (节点发现 - 网格布局) -->
    <div id="view-network" class="view-section space-y-6">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">节点发现</h2>
                <p class="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">发现并连接最快的混合动力节点</p>
            </div>
            <button
                class="p-3.5 bg-white border border-slate-100 rounded-2xl shadow-soft text-slate-400 hover:text-primary transition-all active:scale-95">
                <RotateCw class="w-5 h-5" />
            </button>
        </div>

        <!-- 节点网格 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

            <!-- 节点卡片 1 -->
            <div v-for="i in info"
                class="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-soft hover:shadow-float hover:border-primary/20 transition-all group cursor-pointer relative overflow-hidden">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-4">
                        <div
                            class="w-12 h-12 bg-blue-50 text-primary rounded-2xl flex items-center justify-center font-black text-xl">
                            CN</div>
                        <div>
                            <h4 class="font-black text-slate-800 text-base leading-tight">{{ i.name }}</h4>
                            <p
                                class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-tight">
                                <MapPin class="w-3 h-3 text-slate-300" /> {{ i.s }}
                            </p>
                        </div>
                    </div>
                    <span
                        class="px-2.5 py-1 bg-green-50 text-success text-[10px] font-black rounded-lg border border-green-100 uppercase">{{
                            i.p }}</span>
                </div>

                <div class="flex items-center justify-between pt-5 border-t border-slate-50">
                    <div class="flex items-center gap-5">
                        <div class="flex flex-col">
                            <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">延迟</span>
                            <span class="text-sm font-black text-success font-mono">12ms</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">带宽</span>
                            <span class="text-sm font-black text-slate-700 font-mono">1.0Gbps</span>
                        </div>
                    </div>
                    <div
                        class="flex items-center gap-1.5 text-primary font-black text-xs group-hover:translate-x-1 transition-transform">
                        连接节点
                        <ArrowRight class="w-4 h-4" />
                    </div>
                </div>
            </div>

            <!-- 添加新节点 -->
            <div @click="openModal()"
                class="p-6 rounded-[2.2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-white transition-all group cursor-pointer min-h-[180px]">
                <div
                    class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                    <PlusCircle class="w-8 h-8" />
                </div>
                <div class="text-center">
                    <p class="text-sm font-black text-slate-500 group-hover:text-primary transition-colors">添加自定义节点</p>
                    <p class="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">支持私有联机服务器</p>
                </div>
            </div>

            <!-- 3. Network Modal -->
            <div
                :class="`${isModalOpen ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
                <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="closeNetworkModal()"></div>
                <div
                    class="modal-content relative bg-white w-full max-w-85 rounded-4xl shadow-modal border border-slate-100 overflow-hidden transition-all duration-300">
                    <!-- Header -->
                    <div class="p-8 pb-0 text-center">
                        <div
                            class="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                            <Server class="w-8 h-8" />
                        </div>
                        <h3 class="text-xl font-black text-slate-800 mb-2">添加平台</h3>
                        <p class="text-slate-400 text-[11px] font-bold uppercase tracking-widest">配置内网穿透平台</p>
                    </div>

                    <div class="p-8 pt-4 space-y-5">
                        <!-- 基础选项 (必须) -->
                        <div class="space-y-4">
                            <div class="space-y-1.5">
                                <label
                                    class="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                                    <Box class="w-3.5 h-3.5"></Box> 内网穿透平台
                                </label>
                                <select v-model="network"
                                    class="input-modern select w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-700 focus:bg-white focus:border-primary focus:outline-none cursor-pointer">
                                    <option value="natfrp">SakuraFrp (natfrp.com)</option>
                                    <option value="locyanfrp">Locyanfrp (locyanfrp.cn)</option>
                                </select>
                            </div>

                            <div class="space-y-1.5">
                                <label
                                    class="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                                    <Key class="w-3.5 h-3.5" /> 平台密钥 (Token)
                                </label>
                                <input type="password" placeholder="输入 API Key 或访问令牌" v-model="networkKey"
                                    class="input-modern input w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 font-mono text-sm font-bold text-slate-700 focus:bg-white focus:border-primary focus:outline-none">
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2.5 p-5 pt-0">
                        <button @click="closeNetworkModal()"
                            class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-[13px]">
                            取消
                        </button>
                        <button @click="confirmNetwork()"
                            class="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-[#73aacf] transition-all active:scale-95 text-[13px]">
                            确认退出
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>