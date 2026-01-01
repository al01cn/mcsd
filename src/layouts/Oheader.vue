<script lang="ts" setup>
import { useRoute, useRouter } from 'vue-router'
import { User, CloudLightning, Minus, X, ChevronDown, Settings2, LogOut } from 'lucide-vue-next';
import { toast } from 'vue-sonner'
import config from '../lib/config'
import { Settings } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { getMinecraftHead } from '../lib/mcHead'

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
    },
    {
        name: '节点管理',
        path: '/network'
    }
])

const isLogin = ref(false)
const headImg = ref("")
const isOpen = ref(false);
const isModalOpen = ref(false);
const hasPage = ref("/create_rooms")


// 注意这里依赖 route.name 或 route.path
const showSettingsButton = computed(() => {
    // 如果你在路由配置里有 name: 'Settings'
    return route.name !== 'Settings';
    // 或者用 path 判断
    // return route.path !== '/settings';
});

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

const toPage = (e: Event, path: string) => {
    // 1. 阻止 <RouterLink> 的默认 a 标签跳转
    e.preventDefault();

    // 2. 你的业务逻辑拦截
    if (isModalOpen.value) {
        toast('My first toast');
        return; // 如果被拦截，直接返回，不执行跳转
    }

    // 3. 使用 router.push 执行手动跳转
    router.push(path);
    hasPage.value = path
}

// 点击页面其他地方关闭下拉菜单
function handleClickOutside(event: MouseEvent) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdown.contains(event.target as Node)) {
        isOpen.value = false;
    }
}

// 生命周期挂载和卸载事件监听
onMounted(async () => {
    document.addEventListener('click', handleClickOutside);

    const skin = await getMinecraftHead("https://textures.minecraft.net/texture/ab9b62d19c7b256940b0911eee3be99f84aa25a6decf89fd588f37a214cce8a")
    headImg.value = skin
});
onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutside);
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
            <a v-for="page in pages" :key="page.name" @click.prevent="toPage($event, page.path)"
                :class="`nav-tab font-bold text-[13px] text-slate-400 hover:text-slate-600 h-full px-4 ${hasPage === page.path ? 'active' : ''}`">
                {{ page.name }}
            </a>
        </nav>

        <div class="flex items-center gap-1">
            <div class="relative">
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
            </div>

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
        </div>

    </header>

    <main class="flex-1 relative bg-slate-50/50 h-screen">
        <div class="max-w-4xl mx-auto px-6 py-10 pb-24 overflow-y-auto">
            <router-view />
        </div>

        <!-- Side Setting Ball -->
        <RouterLink v-if="showSettingsButton" to="/settings"
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