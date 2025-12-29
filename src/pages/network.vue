<script lang="ts" setup>
import { MapPin, ArrowRight, RotateCw, PlusCircle } from 'lucide-vue-next';

const info = [{
    name: "上海 核心节点 B2",
    s: "华东 · 联通核心网",
    p: "在线/空闲"
}, {
    name: "广州 核心节点 B2",
    s: "华东 · 联通核心网",
    p: "在线/空闲"
}]

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
                        class="px-2.5 py-1 bg-green-50 text-success text-[10px] font-black rounded-lg border border-green-100 uppercase">{{ i.p }}</span>
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
            <div
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

        </div>
    </div>
</template>