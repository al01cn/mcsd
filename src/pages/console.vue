<script setup lang="ts">
import { fetchServerStatus } from '../lib/mcStatus';
import SessionCache from '../lib/cache';
import { Users, Copy, Radius, ChevronsLeftRightEllipsis, Pickaxe, BadgeCheck, House } from 'lucide-vue-next';
import type { JavaStatusResponse } from 'minecraft-server-util';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router'
import getMinecraftHead, { getMinecraftSkin } from '../lib/mcHead';
import { MCProxyConfig } from '../lib/config';
import { extractHostAndPort, MCProxyName } from '../lib';
import { useCopy } from '../lib/useCopy';

interface MCInfo extends JavaStatusResponse {
    players: {
        max: number;
        online: number;
        sample: {
            id: string;
            name: string;
            head: string
        }[];
    };
}

interface RunConfig {
    pid?: number;
    uuid?: string;
    host?: string;
    port: number;
    tunnel_token?: string;
    tunnel_id?: string;
    node_id?: number;
}

const router = useRouter()


const isClient = ref(false)
const status = ref<MCInfo | null>(null);
const playerHeadCache = new Map<string, string>();
let timer: number | undefined;
const intervalMs = 3000;

const token = SessionCache.get<string>('runing_token')

enum TunnelStatus {
    Loading = '1',
    Running = '2',
    Stopped = '3',
}

const isRuning = ref<TunnelStatus>(TunnelStatus.Loading)
const serverState = ref<"running" | "stopping">("stopping");
const isReconnecting = ref(false);

let previousPlayers = new Map<string, { name: string; head: string }>();

const MAX_RETRY = ref(3);
const retryCount = ref(0);
const config = ref<RunConfig>() // 启动配置
const McClientToken = ref('') // 客户端使用的Token

const PROXY_ID = MCProxyName();
const McConfig = ref<MCProxyConfig>();
const MclocalPort = ref(0)
const McDelay = ref()

const McProxyHostAndPort = ref<{ host: string, port: number }>({
    host: "",
    port: 0
})

let unbindStatus: (() => void) | null = null;
let unbindLogs: (() => void) | null = null;

// --- 工具函数 ---
const notRep = (text: string) => text ? text.replace(/-/g, "") : "";

const startFrp = async () => {
    const token = config.value?.tunnel_token
    const tunnel_id = config.value?.tunnel_id
    await (window as any).sakurafrp.start(token, tunnel_id);
}

const stopFrp = async () => {
    const tunnel_id = config.value?.tunnel_id;
    await (window as any).sakurafrp.stop(tunnel_id);
}

const startServer = (host: string = '127.0.0.1', port: number = 25565) => {
    const serverName = status.value?.motd.clean
    // 构造实时配置
    const runConfig = {
        id: PROXY_ID,
        remoteHost: host,
        remotePort: port,
        fakeMotd: serverName || 'OneTunnel-局域网游戏'
    } as MCProxyConfig;

    McConfig.value = runConfig

    // 强制检查 ID
    console.log("🚀 发送到主进程的 ID:", PROXY_ID);

    console.log("正在尝试启动代理:", runConfig);
    (window as any).mcproxy.start(runConfig);
}

const stopServer = () => {
    if (!McConfig.value) {
        return
    }
    (window as any).mcproxy.stop(McConfig.value?.id);
}

// --- 计算属性：负责排序和过滤显示 ---
const displayPlayers = computed(() => {
    const players = status.value?.players?.sample;
    if (!players || !players.length) return [];

    const ownerUUID = config.value?.uuid;

    // 排序逻辑：房主排第一，其余按名称字母排序（防止乱动）
    return [...players].sort((a, b) => {
        const idA = notRep(a.id);
        const idB = notRep(b.id);

        if (idA === ownerUUID) return -1;
        if (idB === ownerUUID) return 1;
        return a.name.localeCompare(b.name);
    });
});

// --- 逻辑函数 ---
function startTunnel() {
    if (token.value) {
        config.value = JSON.parse(atob(token.value)) as RunConfig
        if (config.value?.tunnel_token && config.value?.tunnel_id) {
            isClient.value = false
            console.log("房主模式");
            SessionCache.set('isRuning', true)
            startStatus()
            return
        }

        isClient.value = true
        console.log("客机模式");
        SessionCache.set('isRuning', true)
        startStatus()
    }
}

const getTcpDelay = async (host: string, port: number) => {
    const delay = await (window as any).mcproxy.getTcpDelay(host, port);
    if (delay != McDelay.value) {
        McDelay.value = delay
    }
}

function detectPlayerChanges(newPlayers: { id: string; name: string; head: string }[]) {
    const ownerUUID = config.value?.uuid;
    const newMap = new Map<string, { name: string; head: string }>();

    newPlayers.forEach(p => {
        if (p.name !== "Anonymous Player" && notRep(p.id) !== ownerUUID) {
            newMap.set(p.id, { name: p.name, head: p.head });
        }
    });

    const joined: any[] = [];
    const left: any[] = [];

    for (const [id, data] of newMap) {
        if (!previousPlayers.has(id)) joined.push({ id, name: data.name, head: data.head });
    }
    for (const [id, data] of previousPlayers) {
        if (!newMap.has(id)) left.push({ id, name: data.name, head: data.head });
    }

    previousPlayers = newMap;
    return { joined, left };
}

function isEqualStatus(a: MCInfo | null, b: MCInfo | null) {
    if (!a || !b) return false;
    if (a.players.online !== b.players.online || a.players.max !== b.players.max) return false;

    const sa = a.players.sample || [];
    const sb = b.players.sample || [];
    if (sa.length !== sb.length) return false;

    return sa.every((p, i) => p.id === sb[i].id && p.name === sb[i].name && p.head === sb[i].head);
}

async function refreshStatus(host: string = "127.0.0.1", port: number = 25565) {
    const ownerUUID = config.value?.uuid;

    try {
        const newStatus = (await fetchServerStatus(host, port)) as MCInfo;
        if (!newStatus) throw new Error("无法获取状态");

        if (newStatus.players?.sample) {
            // 1. 处理头像缓存
            const sampleWithHead = await Promise.all(
                newStatus.players.sample.map(async player => {
                    let head = playerHeadCache.get(player.id) || "";
                    if (!head) {
                        const skinUrl = await getMinecraftSkin(player.id);
                        if (skinUrl) {
                            head = await getMinecraftHead(skinUrl);
                            playerHeadCache.set(player.id, head);
                        }
                    }
                    return { ...player, head };
                })
            );

            // 2. 过滤掉房主以外的 Anonymous Player
            const realPlayers = sampleWithHead.filter(p => {
                return p.name !== "Anonymous Player" || notRep(p.id) === ownerUUID;
            });

            // 3. 进出检测
            const { joined, left } = detectPlayerChanges(realPlayers);
            joined.forEach(p => console.log("玩家进入:", p.name));
            left.forEach(p => console.log("玩家离开:", p.name));

            newStatus.players.sample = realPlayers;
        }

        // 4. 统一更新状态 (只在数据变化时触发，且不再此处手动排序)
        if (!isEqualStatus(status.value, newStatus)) {
            status.value = newStatus;
        }

        serverState.value = "running";
        isReconnecting.value = false;
        retryCount.value = 0;
    } catch (err) {
        console.warn("无法连接 Minecraft 服务:", err);
        if (retryCount.value < MAX_RETRY.value) {
            isReconnecting.value = true;
            retryCount.value++;
            setTimeout(refreshStatus, 2000);
        } else {
            serverState.value = "stopping";
            isReconnecting.value = false;
        }
    }
}

const closeServer = () => {
    // 1. 停止轮询定时器，防止后台继续请求 API
    stopServer()
    if (!isClient) {
        stopFrp()
    }

    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }

    if (unbindStatus) unbindStatus();

    if (unbindLogs) unbindLogs()

    // 2. 重置所有响应式状态，回到初始值
    status.value = null;
    isRuning.value = TunnelStatus.Stopped; // 设为停止状态
    serverState.value = "stopping";
    retryCount.value = 0;
    isReconnecting.value = false;

    // 3. 清理玩家相关缓存，防止下次启动时逻辑冲突
    playerHeadCache.clear();
    previousPlayers.clear();

    // 4. 清除 Token (SessionCache)
    // 根据你的需求，如果不希望下次进来还自动启动，则清除它
    SessionCache.remove('runing_token');
    SessionCache.remove('isRuning')

    // 5. 如果有进行中的重连逻辑，可以在这里中断（可选）
    // ...

    setTimeout(() => {
        toRooms()
    }, 3000)

    console.log("服务已成功关闭并重置数据");
};

const toRooms = () => {
    // 6. 执行路由跳转
    router.push('/create_rooms');
}

async function startStatus() {
    if (!isClient.value) {
        await startFrp()
        return
    }

    const host = config.value?.host
    const port = config.value?.port
    start(host, port)
}

async function start(host: string = "127.0.0.1", port: number = 25565) {
    await refreshStatus(host, port)
    await getTcpDelay(host, port);
    timer = window.setInterval(() => { refreshStatus(host, port); getTcpDelay(host, port); }, intervalMs);
    startServer(host, port)
}

const { copyToClipboard } = useCopy();

onMounted(() => {
    // 先挂载监听器，再启动服务
    unbindStatus = (window as any).mcproxy.onStatus((data: any) => {
        console.log("📥 收到主进程反馈:", data);

        if (data.id !== PROXY_ID) {
            console.warn(`ID 匹配失败! 收到:${data.id}, 当前预期:${PROXY_ID}`);
            return;
        }

        if (data.success) {
            console.log("✅ 服务器启动成功");
            // isRuning.value = TunnelStatus.Running; // 在这里切换状态！
            if (data.localPort) {
                MclocalPort.value = data.localPort
            }

            setTimeout(() => {
                isRuning.value = TunnelStatus.Running
            }, 3000)
        } else {
            console.error("❌ 启动失败:", data.message);
            // 这里可以弹窗提示用户端口被占用
        }
    });

    // 监听日志输出
    unbindLogs = (window as any).sakurafrp.onLog((data: any) => {
        const line = data.message;
        // 1. 打印原始日志方便排查
        console.log("收到日志:", line);

        // 2. 尝试提取
        const result = extractHostAndPort(data.message);

        if (result) {
            McProxyHostAndPort.value = {
                host: result.host,
                port: Number(result.port),
            }

            if (!isClient.value) {
                const uuid = config.value?.uuid
                const rawData: RunConfig = {
                    host: result.host,
                    port: Number(result.port),
                    uuid: uuid
                }
                const token = btoa(JSON.stringify(rawData))
                McClientToken.value = token
            }

            const host = McProxyHostAndPort.value.host
            const port = McProxyHostAndPort.value.port

            start(host, port)
        }
    })

    startTunnel()
})
onUnmounted(() => { if (timer) clearInterval(timer); if (unbindStatus) unbindStatus(); if (unbindLogs) unbindLogs(); });
</script>

<template>
    <div id="view-console-loading" v-if="isRuning == TunnelStatus.Loading"
        class="view-section w-full space-y-6 flex flex-col justify-center items-center">
        <div class="px-6 flex flex-col justify-center items-center h-150">
            <Radius class="w-32 h-32 text-[#4DB7FF] animate-spin mb-4" />
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">正在启动中...</h2>
        </div>
    </div>

    <div id="view-console-stopping" v-if="isRuning == TunnelStatus.Stopped"
        class="view-section w-full space-y-6 flex flex-col justify-center items-center">
        <div class="px-6 flex flex-col justify-center items-center h-150">
            <Radius class="w-32 h-32 text-[#4DB7FF] animate-spin mb-4" />
            <h2 class="text-2xl font-black text-slate-800 tracking-tight">正在关闭中，3秒后回到主页...</h2>
        </div>
    </div>

    <div id="view-console" v-if="isRuning == TunnelStatus.Running" class="view-section space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">运行控制台</h2>
                <p class="text-slate-400 font-bold text-xs uppercase tracking-wider">Hybrid Link Ready</p>
            </div>
            <div class="flex items-center gap-3">
                <div
                    class="hidden sm:flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                    <span class="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                    <span class="text-[10px] font-bold text-success uppercase tracking-wider">服务状态正常</span>
                </div>

                <div class="w-67">
                    <button @click="closeServer()"
                        class="w-full flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-red-500 transition-all active:scale-95 text-[13px]">
                        停止并关闭房间
                    </button>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div
                class="md:col-span-8 bg-white p-6 pl-12 pr-12 rounded-4xl shadow-soft border border-slate-100 group relative overflow-hidden flex items-center">
                <div class="flex w-full">
                    <div v-if="status?.favicon" class="w-20 flex justify-center items-center gap-2">
                        <img :src="status?.favicon" class="rounded-lg w-32 h-auto">
                    </div>
                    <div class="w-full flex flex-col justify-center items-center">
                        <div v-if="!isClient && McClientToken" @click="copyToClipboard(String(McClientToken))"
                            class="flex items-center gap-3 cursor-pointer group/ip">
                            <h3 class="text-sm font-black text-slate-800 tracking-tight">点击复制联机码</h3>
                            <div
                                class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/ip:text-primary transition-colors">
                                <Copy class="w-4 h-4" />
                            </div>
                        </div>
                        <div class="text-slate-500 text-sm">{{ status?.motd.clean }}</div>
                    </div>
                </div>
            </div>

            <div
                class="md:col-span-4 bg-slate-900 p-6 rounded-4xl shadow-xl text-white flex flex-col justify-between relative overflow-hidden">
                <div class="flex justify-between items-start">
                    <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest">实时状态</p>
                    <div v-if="McDelay !== undefined" :class="[
                        'px-2 py-0.5 text-[10px] font-black rounded-md border transition-colors duration-300',
                        McDelay <= 50 ? 'bg-success/20 border-success/30 text-success' :
                            McDelay <= 100 ? 'bg-warning/20 border-warning/30 text-warning' :
                                'bg-error/20 border-error/30 text-error'
                    ]">
                        {{ McDelay <= 50 ? "极速" : McDelay <= 100 ? "中等" : "缓慢" }} </div>
                    </div>
                    <div class="my-4">
                        <div class="flex items-baseline gap-1">
                            <span :class="[
                                'text-4xl font-black font-mono transition-colors duration-300',
                                McDelay <= 50 ? 'text-primary' :
                                    McDelay <= 100 ? 'text-warning' :
                                        'text-error'
                            ]">
                                {{ McDelay }}
                            </span>
                            <span class="text-primary/40 text-xs font-bold">ms</span>
                        </div>

                        <div class="flex items-center gap-2 mt-1 text-slate-400">
                            <Users class="w-3.5 h-3.5" />
                            <span class="text-xs font-bold">
                                {{ status?.players.online || 0 }} / {{ status?.players.max || 0 }} 在线
                            </span>
                        </div>
                    </div>

                    <div class="flex gap-1.5 mt-auto">
                        <div :class="[
                            'h-1.5 flex-1 rounded-full transition-all duration-500',
                            (status?.players.online || 0) / (status?.players.max || 1) > 0
                                ? 'bg-primary shadow-[0_0_8px_rgba(77,183,255,0.5)]'
                                : 'bg-white/10'
                        ]"></div>

                        <div :class="[
                            'h-1.5 flex-1 rounded-full transition-all duration-500',
                            (status?.players.online || 0) / (status?.players.max || 1) >= 0.5
                                ? 'bg-primary/80 shadow-[0_0_8px_rgba(77,183,255,0.4)]'
                                : 'bg-white/10'
                        ]"></div>

                        <div :class="[
                            'h-1.5 flex-1 rounded-full transition-all duration-500',
                            (status?.players.online || 0) / (status?.players.max || 1) >= 0.75
                                ? 'bg-primary/60 shadow-[0_0_8px_rgba(77,183,255,0.3)]'
                                : 'bg-white/10'
                        ]"></div>

                        <div :class="[
                            'h-1.5 flex-1 rounded-full transition-all duration-500',
                            (status?.players.online || 0) / (status?.players.max || 1) >= 1
                                ? 'bg-primary/40 shadow-[0_0_8px_rgba(77,183,255,0.2)]'
                                : 'bg-white/10'
                        ]"></div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-4xl p-6 border border-slate-100 shadow-soft">
                <h4
                    class="font-bold text-slate-800 mb-4 flex items-center justify-between text-xs uppercase tracking-wider">
                    <span class="flex items-center gap-2">
                        <Users class="w-3.5 h-3.5 text-primary" /> 局域网在线成员 {{ status?.players.online || '-' }}/{{
                            status?.players.max || '-' }}
                    </span>
                    <span class="text-[10px] text-slate-400 normal-case font-medium">自动刷新中...</span>
                </h4>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div v-for="player in displayPlayers" :key="player.id"
                        class="p-3 bg-slate-50 rounded-xl flex items-center gap-3 border border-transparent hover:border-primary/20 transition-all">
                        <img v-if="player.head" :src="player.head" class="w-9 h-9 rounded-lg">
                        <Pickaxe v-else class="w-9 h-9 rounded-lg" />

                        <div class="flex flex-col overflow-hidden">
                            <div class="flex items-center gap-1">
                                <span
                                    :class="`text-xs font-black truncate ${notRep(player.id) === config?.uuid ? 'text-primary' : 'text-slate-800'}`">
                                    {{ player.name }}
                                </span>
                                <BadgeCheck v-if="player.head" class="w-3 h-3 text-warning" />
                                <House v-if="notRep(player.id) === config?.uuid" class="w-3 h-3 text-primary" />
                            </div>
                            <span class="text-[9px] text-slate-400">
                                {{ notRep(player.id) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white rounded-4xl p-6 border border-slate-100 shadow-soft">
                <h4
                    class="font-bold text-slate-800 mb-4 flex items-center justify-between text-xs uppercase tracking-wider">
                    <span class="flex items-center gap-2">
                        <ChevronsLeftRightEllipsis class="w-3.5 h-3.5 text-primary" /> 联机的域名与端口（备用）
                    </span>
                </h4>
                <div class="flex items-center justify-center gap-2">
                    <div class="flex items-end gap-3">
                        <div @click="copyToClipboard(String(McProxyHostAndPort.host ? McProxyHostAndPort.host : config?.host))"
                            class="flex items-center gap-3 cursor-pointer group/ip">
                            <h3 class="text-4xl font-black text-slate-800 font-mono tracking-tight">
                                {{ McProxyHostAndPort.host ? McProxyHostAndPort.host : config?.host }} </h3>
                            <div
                                class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover/ip:text-primary transition-colors">
                                <Copy class="w-4 h-4" />
                            </div>
                        </div>
                        <div @click="copyToClipboard(String(McProxyHostAndPort.port ? McProxyHostAndPort.port : config?.port))"
                            class="flex items-center gap-2 mb-1 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/30 transition-all cursor-pointer group/port">
                            <span class="text-slate-400 font-mono text-sm">:</span>
                            <span class="text-primary font-black font-mono text-xl">{{ McProxyHostAndPort.port ?
                                McProxyHostAndPort.port : config?.port }}</span>
                            <Copy class="w-3 h-3 text-slate-300 group-hover/port:text-primary" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
</template>