<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { User, CloudLightning, Minus, X, ChevronDown, Settings2, LogOut, BadgeAlert } from 'lucide-vue-next';
import { toast } from 'vue-sonner'
import config from '../lib/config'
import { Settings } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getMinecraftHead } from '../lib/mcHead'
import { useCountdown } from '../lib/useCountdown';
import SessionCache from '../lib/cache';

const route = useRoute();
const router = useRouter();

const pages = ref([
    {
        name: '创建房间',
        path: '/create_rooms'
    },
    {
        name: '加入房间',
        path: '/rooms'
    },
    {
        name: '控制台',
        path: '/console'
    }
])

const timeSakuraFrp = ref(0)
const isSakuraFrp = ref(false)
const isSakuraFrpInstalled = ref(false)
const SakuraFrpProgress = ref(0)
const headImg = ref("")
const isOpen = ref(false);
const isModalOpen = ref(false);

const isRuning = SessionCache.get<boolean>('isRuning', false)

const { start } = useCountdown(timeSakuraFrp, 5, {
    async onFinish() {
        console.log('倒计时结束');
        await (window as any).sakurafrp.download()
        return
    }
})


// 注意这里依赖 route.name 或 route.path
const showSettingsButton = computed(() => {
    // 如果你在路由配置里有 name: 'Settings'
    return route.name !== 'Settings';
    // 或者用 path 判断
    // return route.path !== '/settings';
});

const isActive = (path: string) => {
    // 只有当前 path 在 pages 里面才判断高亮
    return pages.value.some(p => p.path === route.path && p.path === path)
}

// function toggleUserDropdown(event: Event) {
//     event.stopPropagation();
//     isOpen.value = !isOpen.value;
// }

// function handleUserAction(action: string) {
//     toast('My first toast')
//     console.log(action);

// }

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
    (window as any).windowControl.close()
    closeLogoutModal()
}

async function hasSakuraFrp() {
    const hasSakuraFrp = await (window as any).sakurafrp.exists()
    isSakuraFrpInstalled.value = hasSakuraFrp
    if (!hasSakuraFrp) {
        start()
        return
    } else {
        isSakuraFrp.value = false
        return
    }
}

const closeSakuraFrpModal = () => {
    if (!isSakuraFrpInstalled.value) {
        return
    }
    isSakuraFrp.value = !isSakuraFrp.value
}


const toPage = (e: Event, path: string) => {
    // 1. 阻止 <RouterLink> 的默认 a 标签跳转
    e.preventDefault();

    if (isSakuraFrp.value) {
        toast.error('未下载核心文件，软件无法正常使用');
        return
    }

    if (isRuning.value) {
        if (path != '/console') {
            toast.error('隧道正在运行，请先停止');
            router.push('/console');
        }
        return
    }

    // 2. 你的业务逻辑拦截
    if (isModalOpen.value) {
        toast('My first toast');
        return; // 如果被拦截，直接返回，不执行跳转
    }

    // 3. 使用 router.push 执行手动跳转
    router.push(path);
}

// 点击页面其他地方关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
        isOpen.value = false;
    }
}

const getNav = (path: string) => {
    const isConsole = path === '/console';

    // 逻辑：(运行中且是控制台) OR (未运行且不是控制台) -> 启用
    const isEnabled = isRuning.value ? isConsole : !isConsole;

    if (isEnabled) {
        return 'text-slate-400 hover:text-slate-600 cursor-pointer';
    } else {
        return 'cursor-not-allowed pointer-events-none text-slate-300';
    }
};

// 生命周期挂载和卸载事件监听
onMounted(async () => {
    document.addEventListener('click', handleClickOutside);

    const skin = await getMinecraftHead("https://textures.minecraft.net/texture/ab9b62d19c7b256940b0911eee3be99f84aa25a6decf89fd588f37a214cce8a")
    headImg.value = skin

    await hasSakuraFrp();

    if (!isSakuraFrpInstalled.value) {
        (window as any).sakurafrp.onProgress(async (p: number) => {
            SakuraFrpProgress.value = p
            if (p <= 100) {
                await hasSakuraFrp();
                return
            }
        })
    }
});

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
});

const close = () => {
    if(isRuning.value){
        openLogoutModal();
        return
    }
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
            <a v-for="page in pages" :key="page.name" @click.prevent="toPage($event, page.path)"
                :class="`nav-tab font-bold text-[13px] h-full px-4 ${isActive(page.path) ? 'active' : ''} ${getNav(page.path)}`">
                {{ page.name }}
            </a>
        </nav>

        <div class="flex items-center gap-1">
            <!-- <div class="relative">
                <button @click="toggleUserDropdown"
                    class="flex items-center gap-2 p-1 pr-3 bg-white border-slate-100 rounded-xl transition-all">
                    <img :src="headImg" alt="head-avatar" class="w-8 h-8 rounded-lg bg-slate-100">
                    <ChevronDown class="w-3.5 h-3.5 text-slate-300" />
                </button>

                <div id="user-dropdown"
                    :class="`${isOpen ? 'show-custom' : 'hidden-custom'} absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-menu border border-slate-100 py-1.5 z-100`">
                    <button @click="handleUserAction('profile')"
                        class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors">
                        <User class="w-4 h-4 text-slate-400" /> 用户中心
                    </button>
                    <button @click="handleUserAction('settings')"
                        class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors">
                        <Settings2 class="w-4 h-4 text-slate-400" /> 账户设置
                    </button>
                    <div class="mx-3 my-1 border-t border-slate-50"></div>
                    <button @click="openLogoutModal()"
                        class="w-full px-4 py-2 flex items-center gap-3 text-xs font-bold text-error hover:bg-red-100 rounded-2xl transition-colors">
                        <LogOut class="w-4 h-4" /> 退出登录
                    </button>
                </div>
            </div> -->

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

        <!-- Side Setting Ball -->
        <RouterLink v-if="showSettingsButton && !isRuning" to="/settings"
            class="fab left-6 bg-white text-slate-400 border border-slate-100 hover:text-primary transition-colors group">
            <Settings class="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" />
        </RouterLink>

        <!-- 3. Logout Modal -->
        <div
            :class="`${isModalOpen ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="closeLogoutModal()"></div>
            <div
                class="modal-content relative bg-white w-full max-w-85 rounded-4xl shadow-modal border border-slate-100 overflow-hidden transition-all duration-300">
                <div class="p-8 text-center">
                    <div
                        class="w-16 h-16 bg-red-50 text-error rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <LogOut class="w-7 h-7" />
                    </div>
                    <h3 class="text-lg font-black text-slate-800 mb-1.5">退出 {{ config.appName }}？</h3>
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

        <div
            :class="`${isSakuraFrp ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="closeSakuraFrpModal()"></div>
            <div
                class="modal-content relative bg-white w-full max-w-85 rounded-4xl shadow-modal border border-slate-100 overflow-hidden transition-all duration-300">
                <!-- Header -->
                <div class="p-8 pb-0 text-center">
                    <div
                        class="w-16 h-16 bg-blue-50 text-error rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <BadgeAlert class="w-8 h-8" />
                    </div>
                    <h3 class="text-xl font-black text-slate-800 mb-2">系统检测</h3>
                    <p class="text-slate-400 text-[11px] font-bold uppercase tracking-widest">内网穿透核心文件未找到</p>
                </div>

                <div class="p-8 pt-4 space-y-5">
                    <!-- 基础选项 (必须) -->
                    <div class="flex flex-col gap-1 justify-center items-center">
                        <progress class="progress progress-info w-full" :value="SakuraFrpProgress" max="100"></progress>
                        <!-- <span class="label text-black text-center">加载中...</span> -->
                    </div>
                </div>

                <div class="flex gap-2.5 p-5 pt-0 items-center justify-center">
                    <span v-if="!isSakuraFrpInstalled" class="text-sm">{{ timeSakuraFrp }}秒钟后自动下载...</span>
                    <button v-else @click="closeSakuraFrpModal()"
                        class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-[13px]">
                        取消
                    </button>
                </div>
            </div>
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