<script lang="ts" setup>
import { ref, onMounted, nextTick, computed } from 'vue';
import { RotateCw, Loader2, Box, ArrowRight, BadgeCheck, Pickaxe, Workflow } from "lucide-vue-next";
import MinecraftClientCard from '../components/MinecraftClientCard.vue';
import getDetect, { MinecraftProcessInfo } from '../lib/mcDetect';
import { SakuraFrpNode } from '../lib/config';
import { toast } from 'vue-sonner'
import { useRouter } from 'vue-router';
import SessionCache from '../lib/cache';

const router = useRouter()

const loadingPid = ref<number | null>(null);
const clients = ref<MinecraftProcessInfo[]>([]);
const isRefreshing = ref(false);
const isModalOpen = ref(false)
const network = ref("")

const platforms = ref([])

const tunnels = ref([])
const isTunnel = ref("")
const userVipLevel = ref(0)

const nodes = ref<SakuraFrpNode[]>([])
const isNode = ref(0)
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

const confirmNetwork = async() => {
    if (!network.value) {
        toast.error("内网穿透平台选择为空")
        return
    }

    if(!isNode.value){
        toast.error("请选择内网穿透节点")
        return
    }

    const rawData = {
        pid: mcPid.value,
        uuid: mcUuid.value,
        port: mcPort.value,
        tunnel_token: network.value,
        tunnel_id: isTunnel.value,
        node_id: isNode.value
    }

    await editTunnel(network.value, isTunnel.value)

    const token = btoa(JSON.stringify(rawData))

    SessionCache.set("runing_token", token)

    // console.log(rawData);

    router.push('/console')

    closeNetworkModal()
}

const refreshClients = async () => {
    if (isRefreshing.value) return;

    isRefreshing.value = true;
    clients.value = []; // 先清空列表，触发“离场”动画

    // 模拟接口耗时
    setTimeout(async () => {
        const data = await getDetect();
        isRefreshing.value = false;
        // nextTick 确保 Loading 消失后再开始填充数据，防止动画卡顿
        nextTick(async () => {
            clients.value = data
        });
    }, 1000);
};

const getPlatformBySecret = (secret: string): string => {
    const item = platforms.value.find(i => (i as any).secret === secret) as any
    return item?.platform
}

const getMergedNodes = async (token: string) => {
    try {
        const nodesList = await (window as any).frp.natfrp_getMergedNodes(token)
        nodes.value = nodesList
        console.log(nodesList);

    } catch (e) {
        console.log(e)
    }
}

const getTunnelInfo = async (token: string) => {
    try {
        const tunnelInfo = await (window as any).frp.natfrp_tunnelInfo(token)
        tunnels.value = tunnelInfo
        isTunnel.value = tunnelInfo[0].id
        console.log(tunnelInfo);

    } catch (e) {
        console.log(e)
    }
}

const editTunnel = async (token: string, tunnelId: string) => {
    try {
        const tunPort = mcPort.value
        console.log(token, tunnelId, tunPort);

        const tunnelInfo = await (window as any).frp.natfrp_tunnelEdit(token, tunnelId, tunPort)
        console.log(tunnelInfo)
        return tunnelInfo
    } catch (e) {
        console.log(e)
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
        console.log(e)
    }
}

const toNode = (id: number) => {
    isNode.value = id
}

onMounted(async () => {
    refreshClients();
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
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">创建一个联机房间</p>
            </div>
            <button @click="refreshClients" :disabled="isRefreshing"
                class="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all duration-300 active:scale-95 group disabled:opacity-50">
                <RotateCw
                    :class="['w-4 h-4 transition-transform duration-500', isRefreshing ? 'animate-spin' : 'group-hover:rotate-180']" />
                <span class="text-sm font-bold">刷新列表</span>
            </button>
        </div>

        <div class="relative min-h-100">
            <div v-if="isRefreshing" class="absolute inset-0 flex flex-col items-center justify-center">
                <Loader2 class="w-10 h-10 text-[#4DB7FF] animate-spin mb-4" />
                <p class="text-slate-400 font-bold text-sm animate-pulse">正在查找游戏...</p>
            </div>

            <TransitionGroup name="stagger" tag="div" class="grid grid-cols-1 gap-4">
                <MinecraftClientCard v-for="(i, index) in clients" :key="i.pid" :index="index" v-bind="i"
                    :isLan="i.lanPorts.length > 0" :loading="loadingPid === i.pid" @click.stop="handleCardClick(i)" />
            </TransitionGroup>
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
                    <div class="flex gap-2 w-full">
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
                                <option v-for="p in tunnels" :value="(p as any).id">{{ ((p as any).name) + `(${((p as
                                    any).id as
                                    string)})` }}
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

                <div class="p-8 pt-4 space-y-5">
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

                <div class="flex gap-2.5 p-5 pt-0">
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
/* 依次展示动画的关键 CSS */
.stagger-enter-active {
    transition: all 0.5s cubic-bezier(0.3, 0, 0.2, 1);
    /* 通过子组件传出的 --delay 变量计算延迟 */
    transition-delay: calc(var(--delay) * 0.1s);
}

.stagger-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
}

/* 离开时的动画 */
.stagger-leave-active {
    transition: all 0.3s ease;
}

.stagger-leave-to {
    opacity: 0;
    transform: scale(0.95);
}

/* 当元素改变位置时的平滑移动 */
.stagger-move {
    transition: transform 0.4s ease;
}
</style>