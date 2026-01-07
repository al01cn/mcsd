<script lang="ts" setup>
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { RotateCw, Loader2, Box, ArrowRight, BadgeCheck, Pickaxe, Workflow, Radius, CircleX } from "lucide-vue-next";
import MinecraftClientCard from '../components/MinecraftClientCard.vue';
import getDetect, { MinecraftProcessInfo } from '../lib/mcDetect';
import { SakuraFrpNode } from '../lib/config';
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router';
import SessionCache from '../lib/cache';
import { logger } from '../lib/logger';


const console = logger
const router = useRouter()

const loadingPid = ref<number | null>(null);
const clients = ref<MinecraftProcessInfo[]>([]);
const isRefreshing = ref(false);
const isModalOpen = ref(false)
const network = ref("")

const platforms = ref([])

const isCreateTunnels = ref(false)
const createTunnelType = ref<1 | 2 | 3>(1)
const createTunnelMessage = ref("")
const tunnels = ref([])
const isTunnel = ref("")
const userVipLevel = ref(0)

const nodes = ref<SakuraFrpNode[]>([])
const isNode = ref(203)
const mcOnly = ref(true)
const mcNodes = computed(() =>
    nodes.value.filter(node => {
        const vipPass = node.vip <= userVipLevel.value
        if (!mcOnly.value) return vipPass
        return vipPass && node.description.includes('MC')
    })
)

const mcPid = ref(0)
const mcPort = ref(25565)
const mcUuid = ref('')

// 用于存储定时器引用
let pollTimer: ReturnType<typeof setInterval> | null = null;

const openModal = async (pid: number, port: number, uuid: string) => {
    isModalOpen.value = !isModalOpen.value
    await getPlatforms()
    await getTunnelInfo(network.value)
    await getMergedNodes(network.value)
    mcPid.value = pid
    mcPort.value = port
    mcUuid.value = uuid
}

const closeNetworkModal = () => {
    isModalOpen.value = !isModalOpen.value
    setTimeout(() => {
        loadingPid.value = null;
        isNode.value = 0
    }, 1000);
}

const confirmNetwork = async () => {
    if (!network.value) {
        toast.error("内网穿透平台选择为空")
        return
    }

    if (!isNode.value) {
        toast.error("请选择内网穿透节点")
        return
    }

    if (!isTunnel.value) {
        isCreateTunnels.value = true
        await createTunnel(network.value, isNode.value)
        return
    }

    startServer()
}

const startServer = async () => {
    const rawData = {
        pid: mcPid.value,
        uuid: mcUuid.value,
        port: mcPort.value,
        tunnel_token: network.value,
        tunnel_id: isTunnel.value,
        node_id: isNode.value
    }
    if (!isCreateTunnels.value) {
        await editTunnel(network.value, isTunnel.value)
    }

    const token = btoa(JSON.stringify(rawData))

    SessionCache.set("runing_token", token)

    router.push('/console')

    closeNetworkModal()
}

const refreshClients = async (showLoading = false) => {
    if (isRefreshing.value) return;
    if (showLoading) isRefreshing.value = true;

    try {
        const newData = await getDetect();
        const newPids = new Set(newData.map(c => c.pid));

        // 1. 删除已不存在的
        for (let i = clients.value.length - 1; i >= 0; i--) {
            if (!newPids.has(clients.value[i].pid)) {
                clients.value.splice(i, 1);
            }
        }

        // 2. 更新或新增
        newData.forEach((newItem) => {
            const existingItem = clients.value.find(c => c.pid === newItem.pid);
            if (existingItem) {
                // 原地更新属性，不触发重新渲染
                Object.assign(existingItem, newItem);
            } else {
                clients.value.push(newItem);
            }
        });

        // 3. 【关键：显式排序】按 PID 从小到大排序
        // 只要排序规则固定，卡片就不会来回跳动
        clients.value.sort((a, b) => a.pid - b.pid);

    } catch (e) {
        console.error('[CreateRooms]：检测Minecraft实例错误', e);
    } finally {
        isRefreshing.value = false;
    }
};

// 开启轮询
const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
        // 自动轮询不触发全局 loading 状态
        refreshClients(false);
    }, 2000); // 每3秒检测一次
};

// 停止轮询
const stopPolling = () => {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
};

const getPlatformBySecret = (secret: string): string => {
    const item = platforms.value.find(i => (i as any).secret === secret) as any
    return item?.platform
}

const getMergedNodes = async (token: string) => {
    try {
        const nodesList = await (window as any).frp.natfrp_getMergedNodes(token)
        nodes.value = nodesList
        // console.log(nodesList);
        console.info('[CreateRooms]：获取节点列表成功', nodesList.length)

    } catch (e) {
        console.error('[CreateRooms]：获取节点列表失败', e)
    }
}

const getTunnelInfo = async (token: string) => {
    try {
        const tunnelInfo = await (window as any).frp.natfrp_tunnelInfo(token)
        tunnels.value = tunnelInfo
        if (tunnelInfo.length > 0) {
            isTunnel.value = tunnelInfo[0].id
        }
        // console.log(tunnelInfo);

    } catch (e) {
        console.error('[CreateRooms]：获取隧道列表失败', e)
    }
}

const editTunnel = async (token: string, tunnelId: string) => {
    try {
        const tunPort = mcPort.value
        const tunnelInfo = await (window as any).frp.natfrp_tunnelEdit(token, tunnelId, tunPort)
        console.log(tunnelInfo)
        return tunnelInfo
    } catch (e) {
        console.error('[CreateRooms]：编辑隧道信息失败', e)
    }
}

const createTunnel = async (token: string, nodeId: number) => {
    try {
        const tunPort = mcPort.value
        const tunnelInfo = await (window as any).frp.natfrp_tunnelCreate(token, nodeId, tunPort)
        console.log(tunnelInfo);

        if (tunnelInfo.code) {
            createTunnelMessage.value = tunnelInfo.msg
            createTunnelType.value = 3

            setTimeout(() => {
                isCreateTunnels.value = false
                createTunnelType.value = 1
            }, 3000)
        } else {
            createTunnelType.value = 2
            isCreateTunnels.value = false
            startServer()
        }
        return tunnelInfo
    } catch (e) {
        console.error('[CreateRooms]：创建节点失败', e)
    }
}

const getPlatforms = async () => {
    try {
        const platformsList = await (window as any).platformAPI.list()
        platforms.value = platformsList
        const available = platformsList.find(
            (item: any) => item.enabled === true
        )
        network.value = available ? available.secret : ''
    } catch (e) {
        console.error('[CreateRooms]：获取平台列表失败', e)
    }
}

const toNode = (id: number) => {
    isNode.value = id
}

// 监听平台切换
watch(network, async (newSecret) => {
    if (newSecret) {
        // 重置当前选择的隧道和节点，防止跨平台数据冲突
        isTunnel.value = "";

        // 重新获取该平台下的数据
        await getTunnelInfo(newSecret);
    } else {
        tunnels.value = [];
    }
});

onMounted(async () => {
    await refreshClients(true); // 首次加载显示 loading
    startPolling();
});

onUnmounted(() => {
    stopPolling();
});

const handleCardClick = (client: any) => {
    if (client.lanPorts.length === 0 || loadingPid.value !== null) return;
    loadingPid.value = client.pid;
    openModal(client.pid, client.lanPorts[0], client.uuid)
};
</script>

<template>
    <div id="view-rooms" class="view-section space-y-6 min-h-screen p-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">创建房间</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">创建一个联机房间，与好友一起游玩</p>
            </div>
            <button @click="refreshClients(true)" :disabled="isRefreshing"
                class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all duration-300 active:scale-95 group disabled:opacity-50">
                <RotateCw
                    :class="['w-4 h-4 transition-transform duration-500', isRefreshing ? 'animate-spin' : 'group-hover:rotate-180']" />
                <span class="text-sm font-bold">刷新列表</span>
            </button>
        </div>

        <div class="relative min-h-100">
            <Transition name="fade-slide" mode="out-in">
                <div v-if="isRefreshing || clients.length <= 0" key="loading"
                    class="absolute inset-0 flex flex-col items-center justify-center">
                    <Loader2 class="w-10 h-10 text-[#4DB7FF] animate-spin mb-4" />
                    <p class="text-slate-400 font-bold text-sm animate-pulse">正在查找游戏...</p>
                </div>

                <div v-else key="list" class="w-full">
                    <TransitionGroup name="stagger" tag="div" class="grid grid-cols-1 gap-4">
                        <MinecraftClientCard v-for="(i, index) in clients" :key="i.pid" :index="index" v-bind="i"
                            :provider="i.provider" :isLan="i.isLan" :loading="loadingPid === i.pid"
                            @click.stop="handleCardClick(i)" />
                    </TransitionGroup>
                </div>
            </Transition>
        </div>

        <!-- 3. Network Modal -->
        <div
            :class="`${isModalOpen ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
            <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md" @click="closeNetworkModal()"></div>
            <div
                class="modal-content relative mb-12 bg-white w-full max-w-240 rounded-4xl shadow-modal border border-slate-100 overflow-hidden transition-all duration-300">
                <!-- Header -->
                <div class="w-full p-8 pb-0 flex flex-col gap-2">
                    <div class="flex w-full items-center gap-2">
                        <h3 class="text-xl font-black text-slate-800 mb-2">创建联机房间</h3>
                    </div>
                    <div v-if="!isCreateTunnels" class="flex gap-2 w-full">
                        <div class="space-y-1.5">
                            <label class="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                                <Box class="w-3.5 h-3.5"></Box> 内网穿透平台（{{ getPlatformBySecret(network) }}）
                            </label>
                            <select v-model="network"
                                class="w-64 select bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-700 focus:bg-white focus:border-primary focus:outline-none cursor-pointer">
                                <option :value="null" disabled>没有获取到账号的话，请到设置里添加一个</option>
                                <option v-for="p in platforms" :value="(p as any).secret"
                                    :disabled="!(p as any).enabled">{{ ((p as any).platform as
                                        string).toLocaleUpperCase() + `(${((p as any).secret as string)})` }}
                                </option>
                            </select>
                        </div>

                        <div class="space-y-1.5">
                            <label class="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                                <Workflow class="w-3.5 h-3.5"></Workflow> 隧道
                            </label>
                            <select v-model="isTunnel"
                                class="w-64 select bg-slate-50 border border-slate-100 rounded-2xl px-5 text-sm font-bold text-slate-700 focus:bg-white focus:border-primary focus:outline-none cursor-pointer">
                                <option :value="null" disabled>没有获取到隧道的话，将自动创建</option>
                                <option v-for="p in tunnels" :value="(p as any).id" :disabled="(p as any).online">
                                    {{ ((p as any).name) + `(${((p as any).id as string)})-${(p as any).online ? '在线' :
                                    '空闲'}` }}
                                </option>
                            </select>
                        </div>
                        <div class="space-y-2.5">
                            <label class="text-[11px] font-black text-slate-400 uppercase ml-2 flex items-center gap-2">
                                <Pickaxe class="w-3.5 h-3.5"></Pickaxe> MC筛选
                            </label>
                            <input type="checkbox" v-model="mcOnly" class="toggle bg-primary ml-1" />
                        </div>
                    </div>
                </div>

                <div v-if="!isCreateTunnels" class="p-8 pt-4 space-y-5">
                    <div class="ml-2">
                        <label class="label text-sm">请选择内网穿透节点，如果你不知道怎么选，就选地区离你最近的</label>
                    </div>
                    <div
                        :class="`grid grid-cols-1 md:grid-cols-2 gap-5 max-h-100 ${mcNodes.length >= 4 ? 'overflow-y-auto' : ''}`">
                        <!-- 节点卡片 1 -->
                        <div v-for="node in mcNodes" :key="node.id" @click="toNode(node.id)"
                            class="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-soft hover:shadow-float hover:border-primary/20 transition-all group cursor-pointer relative overflow-hidden">
                            <div class="flex justify-between items-start mb-6">
                                <div class="flex items-center gap-4">
                                    <div>
                                        <h4 class="font-black text-slate-800 text-base leading-tight">{{ node.name }}
                                        </h4>
                                        <p
                                            class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1 uppercase tracking-tight">
                                            {{ node.description }}
                                        </p>
                                    </div>
                                </div>
                                <span
                                    class="px-2.5 py-1 bg-green-50 text-success text-[10px] font-black rounded-lg border border-green-100 uppercase">{{
                                        node.id }}</span>
                            </div>

                            <div class="flex items-center justify-between pt-5 border-t border-slate-50">
                                <div class="flex items-center gap-5">
                                    <div class="flex flex-col">
                                        <span
                                            class="text-[9px] text-slate-400 font-black uppercase tracking-widest">会员等级</span>
                                        <span class="text-sm font-black text-slate-700">{{ node.vip }}</span>
                                    </div>
                                    <div v-if="node.online" class="flex flex-col">
                                        <span
                                            class="text-[9px] text-slate-400 font-black uppercase tracking-widest">带宽</span>
                                        <span class="text-sm font-black text-slate-700">{{ node.online }}</span>
                                    </div>
                                </div>
                                <div
                                    class="flex items-center gap-1.5 text-primary font-black text-xs group-hover:translate-x-1 transition-transform">
                                    {{ isNode == node.id ? '已选择隧道' : '选择隧道' }}
                                    <ArrowRight class="w-4 h-4" v-if="isNode != node.id" />
                                    <BadgeCheck class="w-4 h-4" v-else />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-else class="p-8 pt-4 space-y-5">
                    <div class="px-6 flex flex-col justify-center items-center h-80">
                        <Radius v-if="createTunnelType == 1" class="w-16 h-auto text-[#4DB7FF] animate-spin mb-4" />
                        <BadgeCheck v-if="createTunnelType == 2" class="w-16 h-auto text-success" />
                        <CircleX v-if="createTunnelType == 3" class="w-16 h-auto text-error" />
                        <h2 v-if="createTunnelType == 1" class="text-2xl font-black text-slate-800 tracking-tight">
                            正在创建中...</h2>
                        <h2 v-if="createTunnelType == 2" class="text-2xl font-black text-slate-800 tracking-tight">
                            创建成功，即将前往控制台...</h2>
                        <h2 v-if="createTunnelType == 3" class="text-2xl font-black text-slate-800 tracking-tight">
                            创建失败，即将返回...</h2>
                        <label v-if="createTunnelMessage && createTunnelType == 3" class="label text-sm mt-2">{{
                            createTunnelMessage
                        }}</label>
                    </div>
                </div>

                <div v-if="!isCreateTunnels" class="flex gap-2.5 p-5 pt-0">
                    <button @click="closeNetworkModal()"
                        class="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-[13px]">
                        取消
                    </button>
                    <button @click="confirmNetwork()"
                        class="flex-1 py-3 rounded-xl font-bold text-white bg-primary hover:bg-[#73aacf] transition-all active:scale-95 text-[13px]">
                        确认创建
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* --- 状态切换动画 (Loading <-> List) --- */
.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.4s ease;
}

.fade-slide-enter-from {
    opacity: 0;
    transform: translateY(20px);
    /* 从下方升起 */
}

.fade-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px);
    /* 向上方消失 */
}

/* --- 列表项动画微调 --- */
.stagger-enter-active {
    transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    /* 这里的 delay 可以根据 index 动态计算，
       但在 CSS 中我们保持基础设置，让它跟随父级 Transition 进入 */
}

.stagger-enter-from {
    opacity: 0;
    transform: translateX(-10px);
    /* 稍微带一点左侧滑入感，增加层次 */
}

/* 保持你原有的 move 和 leave 逻辑... */
.stagger-leave-active {
    transition: all 0.3s ease;
    position: absolute !important;
    width: 100%;
}

.stagger-move {
    transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
</style>