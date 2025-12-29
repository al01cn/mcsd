<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { User, Users, ChevronDown, Settings2, LogOut, Copy, ShieldCheck, Plus, Play } from 'lucide-vue-next';
import { toast } from 'vue-sonner'

const isOpen = ref(false);
const isModalOpen = ref(false);

function toggleUserDropdown(event: Event) {
    event.stopPropagation();
    isOpen.value = !isOpen.value;
}

function handleUserAction(action: string) {
    toast('My first toast')
    console.log(action);

}

// 打开退出弹窗（示例）
function openLogoutModal() {
    console.log('退出登录弹窗');
    isModalOpen.value = !isModalOpen.value;
}


const closeLogoutModal = () => {
    isModalOpen.value = false
}

const confirmLogout = () => {
    console.log("Logout");
    
    closeLogoutModal()
}

// 点击页面其他地方关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
        isOpen.value = false;
    }
}

// 生命周期挂载和卸载事件监听
onMounted(() => {
    document.addEventListener('click', handleClickOutside);
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});
</script>

<template>
    <!-- VIEW: HOME -->
    <div id="view-home" class="view-section space-y-6">
        <!-- Top Info Bar -->
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">运行控制台</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">Hybrid Link Ready
                </p>
            </div>

            <div class="flex items-center gap-3">
                <div
                    class="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                    <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    <span class="text-[10px] font-bold text-success uppercase tracking-wider">上海节点已就绪</span>
                </div>

                <div class="relative">
                    <button @click="toggleUserDropdown"
                        class="flex items-center gap-2 p-1 pr-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95">
                        <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix"
                            class="w-8 h-8 rounded-lg bg-slate-100">
                        <ChevronDown class="w-3.5 h-3.5 text-slate-300" />
                    </button>

                    <div id="user-dropdown"
                        :class="`${isOpen ? 'show-custom' : 'hidden-custom'} absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-menu border border-slate-100 py-1.5 z-50`">
                        <button @click="handleUserAction('profile')"
                            class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            <User class="w-4 h-4 text-slate-400" /> 用户中心
                        </button>
                        <button @click="handleUserAction('settings')"
                            class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                            <Settings2 class="w-4 h-4 text-slate-400" /> 账户设置
                        </button>
                        <div class="mx-3 my-1 border-t border-slate-50"></div>
                        <button @click="openLogoutModal()"
                            class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-error hover:bg-red-50 transition-colors">
                            <LogOut class="w-4 h-4" /> 退出登录
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
            <!-- IP & Port Card -->
            <div
                class="md:col-span-8 bg-white p-6 rounded-4xl shadow-soft border border-slate-100 group relative overflow-hidden flex flex-col justify-center">
                <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">当前虚拟 IP &
                    端口</p>
                <div class="flex items-end gap-3">
                    <div class="flex items-center gap-3 cursor-pointer group/ip"
                        onclick="copyText('192.168.10.45', 'IP')">
                        <h3 class="text-4xl font-black text-slate-800 font-mono tracking-tight">
                            192.168.10.45</h3>
                        <div
                            class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/ip:text-primary transition-colors">
                            <Copy class="w-4 h-4" />
                        </div>
                    </div>
                    <div class="flex items-center gap-2 mb-1 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group/port"
                        onclick="copyText('25565', '端口')">
                        <span class="text-slate-400 font-mono text-sm">:</span>
                        <span class="text-primary font-black font-mono text-xl">25565</span>
                        <Copy class="w-3 h-3 text-slate-300 group-hover/port:text-primary" />
                    </div>
                </div>
                <ShieldCheck
                    class="absolute -right-2 -bottom-2 w-24 h-24 text-slate-50 opacity-40 group-hover:text-primary/10 transition-colors" />
            </div>

            <!-- Latency & Members Card -->
            <div
                class="md:col-span-4 bg-slate-900 p-6 rounded-4xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                <div class="flex justify-between items-start">
                    <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest">实时状态</p>
                    <div
                        class="px-2 py-0.5 bg-success/20 text-success text-[10px] font-black rounded-md border border-success/30">
                        极速
                    </div>
                </div>

                <div class="my-4">
                    <div class="flex items-baseline gap-1">
                        <span class="text-4xl font-black text-primary font-mono">24</span>
                        <span class="text-primary/40 text-xs font-bold">ms</span>
                    </div>
                    <div class="flex items-center gap-2 mt-1 text-slate-400">
                        <Users class="w-3.5 h-3.5" />
                        <span class="text-xs font-bold">03 / 10 在线</span>
                    </div>
                </div>

                <div class="flex gap-1.5 mt-auto">
                    <div class="h-1.5 flex-1 bg-primary rounded-full shadow-[0_0_8px_rgba(77,183,255,0.5)]">
                    </div>
                    <div class="h-1.5 flex-1 bg-primary/40 rounded-full"></div>
                    <div class="h-1.5 flex-1 bg-primary/20 rounded-full"></div>
                    <div class="h-1.5 flex-1 bg-primary/10 rounded-full"></div>
                </div>
            </div>
        </div>

        <!-- Online Members -->
        <div class="bg-white rounded-4xl p-6 border border-slate-100 shadow-soft">
            <h4
                class="font-bold text-slate-800 mb-4 flex items-center justify-between text-xs uppercase tracking-wider">
                <span class="flex items-center gap-2">
                    <Users class="w-3.5 h-3.5 text-primary" /> 局域网在线成员 (03)
                </span>
                <span class="text-[10px] text-slate-400 normal-case font-medium">自动刷新中...</span>
            </h4>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                    class="p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Host"
                        class="w-9 h-9 rounded-lg bg-white shadow-sm">
                    <div class="overflow-hidden">
                        <p class="text-xs font-black text-slate-800 truncate">Felix (Host)</p>
                        <p class="text-[9px] text-slate-400 font-mono">192.168.10.1</p>
                    </div>
                </div>
                <div
                    class="p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
                    <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Miki"
                        class="w-9 h-9 rounded-lg bg-white shadow-sm">
                    <div class="overflow-hidden">
                        <p class="text-xs font-black text-slate-800 truncate">Miki_San</p>
                        <p class="text-[9px] text-slate-400 font-mono">192.168.10.82</p>
                    </div>
                </div>
                <div
                    class="p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-dashed border-slate-200 group cursor-pointer hover:bg-white hover:border-primary/40 transition-all">
                    <div
                        class="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center group-hover:bg-primary/10">
                        <Plus class="w-4 h-4 text-slate-400 group-hover:text-primary" />
                    </div>
                    <p class="text-xs font-bold text-slate-400 group-hover:text-primary">邀请成员</p>
                </div>
            </div>
        </div>

        <!-- Action Bar -->
        <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button
                class="flex-1 bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-black text-base shadow-float transition-all active:scale-[0.98] flex items-center justify-center gap-3">
                <Play class="w-5 h-5 fill-current" /> 启动 Minecraft
            </button>
            <button
                class="px-6 bg-white border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs">
                管理游戏版本
            </button>
        </div>

        <!-- 3. Logout Modal -->
        <div
            :class="`${isModalOpen ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onclick="closeLogoutModal()"></div>
            <div
                class="modal-content relative bg-white w-full max-w-85 rounded-4xl shadow-modal border border-slate-100 overflow-hidden transition-all duration-300">
                <div class="p-8 text-center">
                    <div
                        class="w-16 h-16 bg-red-50 text-error rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <LogOut class="w-7 h-7" />
                    </div>
                    <h3 class="text-lg font-black text-slate-800 mb-1.5">退出 SkyLink？</h3>
                    <p class="text-slate-500 text-[13px] font-medium leading-relaxed">
                        退出后将断开所有联机节点。
                    </p>
                </div>
                <div class="flex gap-2.5 p-5 pt-0">
                    <button @click="closeLogoutModal()"
                        class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-[13px]">
                        取消
                    </button>
                    <button @click="confirmLogout()"
                        class="flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-red-500 transition-all active:scale-95 text-[13px]">
                        确认退出
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped></style>