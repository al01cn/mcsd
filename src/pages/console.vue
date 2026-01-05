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
import { Dialog } from '../lib/useDialog';

// --- 类型定义 ---
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

enum TunnelStatus {
    Loading = '1',
    Running = '2',
    Reconnecting = '3',
    Stopped = '4',
}

// --- 响应式变量 ---
const router = useRouter()
const isClient = ref(false)
const isRun = ref(false) //
const isDestoryed = ref(false); // 物理锁，防止销毁后继续执行逻辑
const status = ref<MCInfo | null>(null);
const playerHeadCache = new Map<string, string>();
let timer: number | undefined;
const intervalMs = 3000;

const token = SessionCache.get<string>('runing_token')
const isRuning = ref<TunnelStatus>(TunnelStatus.Loading)
const serverState = ref<"running" | "stopping">("stopping");
const isReconnecting = ref(false);
const IsError = ref(false)

let previousPlayers = new Map<string, { name: string; head: string }>();

const MAX_RETRY = ref(3);
const retryCount = ref(0);
const config = ref<RunConfig>()
const McClientToken = ref('')

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

// --- 核心业务逻辑 ---

/**
 * 启动入口：区分房主和客机
 */
function startTunnel() {
    if (token.value) {
        try {
            config.value = JSON.parse(atob(token.value)) as RunConfig

            // 房主模式：有隧道令牌和ID
            if (config.value?.tunnel_token && config.value?.tunnel_id) {
                isClient.value = false
                console.log("模式: 房主创建房间");
                startStatus()
                return
            }

            // 客机模式
            isClient.value = true
            console.log("模式: 客机加入房间");
            startStatus()
        } catch (e) {
            console.error("Token 解析失败");
            toRooms();
        }
    } else {
        toRooms();
    }
}

/**
 * 流程控制中心
 */
async function startStatus() {
    isRuning.value = TunnelStatus.Loading;

    if (!isClient.value) {
        // 房主：先启动 FRP 穿透，等待日志回调触发 start()
        await startFrp();
    } else {
        // 客机：直接尝试连接
        const host = config.value?.host || "127.0.0.1";
        const port = config.value?.port || 25565;
        await start(host, port);
    }
}

/**
 * 启动服务轮询与代理
 */
async function start(host: string = "127.0.0.1", port: number = 25565) {
    try {
        // 初次尝试获取状态，失败会抛出异常进入 catch
        await refreshStatus(host, port);

        // 成功后开启延迟检测和定时器
        await getTcpDelay(host, port);
        if (timer) clearInterval(timer);
        timer = window.setInterval(() => {
            refreshStatus(host, port);
            getTcpDelay(host, port);
        }, intervalMs);

        // 启动本地代理
        startServer(host, port);
        isRun.value = true;
    } catch (err) {
        console.error("启动失败，准备触发重试逻辑");
        ReconnectServer();
    }
}

/**
 * 刷新服务器状态
 */
async function refreshStatus(host: string = "127.0.0.1", port: number = 25565) {
    if (isDestoryed.value) return;

    try {
        const newStatus = (await fetchServerStatus(host, port)) as MCInfo;
        if (!newStatus) throw new Error("无法获取 Minecraft 响应");

        // 处理玩家数据与头像缓存
        if (newStatus.players?.sample) {
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

            // 过滤房主外的匿名玩家
            const ownerUUID = config.value?.uuid;
            const realPlayers = sampleWithHead.filter(p => {
                return p.name !== "Anonymous Player" || notRep(p.id) === ownerUUID;
            });

            // 进出检测日志
            const { joined, left } = detectPlayerChanges(realPlayers);
            joined.forEach(p => console.log("玩家进入:", p.name));
            left.forEach(p => console.log("玩家离开:", p.name));

            newStatus.players.sample = realPlayers;
        }

        // 更新状态机
        if (!isEqualStatus(status.value, newStatus)) {
            status.value = newStatus;
        }

        serverState.value = "running";
        isReconnecting.value = false;
        isRuning.value = TunnelStatus.Running;
        IsError.value = false;
        retryCount.value = 0;
    } catch (err) {
        if (!isRun.value) {
            // 如果是还没启动成功就报错，直接抛出，让 start() 处理
            throw err;
        } else {
            // 如果是运行中报错，执行重连
            ReconnectServer();
        }
    }
}

/**
 * 重试与重连逻辑
 */
const ReconnectServer = () => {
    if (isDestoryed.value) return;

    // 检查重试次数
    if (retryCount.value >= MAX_RETRY.value) {
        console.error("❌ 已达到最大重试次数");
        isDestoryed.value = true;
        IsError.value = true;
        isRuning.value = TunnelStatus.Stopped;
        isReconnecting.value = false;

        // 清理并退出
        closeServer(true);
        return;
    }

    isRuning.value = TunnelStatus.Reconnecting;
    isReconnecting.value = true;
    retryCount.value++;

    console.log(`🔄 正在进行第 ${retryCount.value}/${MAX_RETRY.value} 次尝试...`);

    setTimeout(async () => {
        if (!isDestoryed.value) {
            const host = McProxyHostAndPort.value.host || config.value?.host || "127.0.0.1";
            const port = McProxyHostAndPort.value.port || config.value?.port || 25565;

            try {
                // 再次尝试执行 start 流程
                await start(host, port);
            } catch (e) {
                // 如果 start 依然失败，它会递归调用 ReconnectServer
            }
        }
    }, 3000);
}

// --- 资源管理与生命周期 ---

const startFrp = async () => {
    const token = config.value?.tunnel_token;
    const tunnel_id = config.value?.tunnel_id;
    await (window as any).sakurafrp.start(token, tunnel_id);
}

const stopFrp = async () => {
    const tunnel_id = config.value?.tunnel_id;
    if (tunnel_id) await (window as any).sakurafrp.stop(tunnel_id);
}

const startServer = (host: string, port: number) => {
    const serverName = status.value?.motd.clean;
    const runConfig = {
        id: PROXY_ID,
        remoteHost: host,
        remotePort: port,
        fakeMotd: serverName || 'OneTunnel-局域网游戏'
    } as MCProxyConfig;

    McConfig.value = runConfig;
    (window as any).mcproxy.start(runConfig);
}

const stopServer = () => {
    if (McConfig.value) {
        (window as any).mcproxy.stop(McConfig.value.id);
    }
}

const closeServer = (isFailed = false) => {
    isDestoryed.value = true;

    stopServer();
    if (!isClient.value) stopFrp();

    if (timer) {
        clearInterval(timer);
        timer = undefined;
    }

    if (unbindStatus) { unbindStatus(); unbindStatus = null; }
    if (unbindLogs) { unbindLogs(); unbindLogs = null; }

    status.value = null;
    isRuning.value = TunnelStatus.Stopped;
    serverState.value = "stopping";

    // 如果是由于失败关闭，IsError 已经在 ReconnectServer 设置
    SessionCache.remove('runing_token');
    SessionCache.remove('isRuning');

    setTimeout(() => {
        toRooms();
    }, 3000);
};

const close = () => {
    Dialog.warning({
        title: isClient.value ? '退出联机房间' : '停止并关闭房间',
        msg: isClient.value ? '确定要退出联机房间吗？' : '确定停止并关闭房间吗？',
        cancelText: '点错了',
        confirmText: '确定',
        onConfirm() { closeServer() },
    })
}

const toRooms = () => {
    router.push('/create_rooms');
}

// --- 辅助逻辑 ---

const getTcpDelay = async (host: string, port: number) => {
    const delay = await (window as any).mcproxy.getTcpDelay(host, port);
    if (delay != McDelay.value) McDelay.value = delay;
}

function detectPlayerChanges(newPlayers: any[]) {
    const ownerUUID = config.value?.uuid;
    const newMap = new Map<string, { name: string; head: string }>();
    newPlayers.forEach(p => {
        if (p.name !== "Anonymous Player" && notRep(p.id) !== ownerUUID) {
            newMap.set(p.id, { name: p.name, head: p.head });
        }
    });
    const joined: any[] = [];
    const left: any[] = [];
    for (const [id, data] of newMap) if (!previousPlayers.has(id)) joined.push({ id, name: data.name, head: data.head });
    for (const [id, data] of previousPlayers) if (!newMap.has(id)) left.push({ id, name: data.name, head: data.head });
    previousPlayers = newMap;
    return { joined, left };
}

function isEqualStatus(a: MCInfo | null, b: MCInfo | null) {
    if (!a || !b) return false;
    if (a.players.online !== b.players.online || a.players.max !== b.players.max) return false;
    const sa = a.players.sample || [];
    const sb = b.players.sample || [];
    if (sa.length !== sb.length) return false;
    return sa.every((p, i) => p.id === sb[i].id && p.name === sb[i].name);
}

const displayPlayers = computed(() => {
    const players = status.value?.players?.sample;
    if (!players || !players.length) return [];
    const ownerUUID = config.value?.uuid;
    return [...players].sort((a, b) => {
        const idA = notRep(a.id);
        const idB = notRep(b.id);
        if (idA === ownerUUID) return -1;
        if (idB === ownerUUID) return 1;
        return a.name.localeCompare(b.name);
    });
});

const { copyToClipboard } = useCopy();

// --- 生命周期钩子 ---

onMounted(() => {
    unbindStatus = (window as any).mcproxy.onStatus((data: any) => {
        if (data.id !== PROXY_ID) return;
        if (data.success) {
            if (data.localPort) MclocalPort.value = data.localPort;
            if (isRun.value) {
                setTimeout(() => {
                    isRuning.value = TunnelStatus.Running;
                    SessionCache.set('isRuning', true);
                }, 1000);
            }
        } else {
            // 如果本地代理启动失败（端口占用等），也触发重试
            console.error("代理启动失败", data.message);
            ReconnectServer();
        }
    });

    unbindLogs = (window as any).sakurafrp.onLog((data: any) => {
        const result = extractHostAndPort(data.message);
        if (result) {
            McProxyHostAndPort.value = { host: result.host, port: Number(result.port) };
            if (!isClient.value) {
                const rawData: RunConfig = {
                    host: result.host,
                    port: Number(result.port),
                    uuid: config.value?.uuid
                };
                McClientToken.value = btoa(JSON.stringify(rawData));
            }
            start(McProxyHostAndPort.value.host, McProxyHostAndPort.value.port);
        }
    })

    startTunnel()
})

onUnmounted(() => {
    if (isRuning.value !== TunnelStatus.Stopped) {
        stopServer();
        if (!isClient.value) stopFrp();
    }
    if (timer) clearInterval(timer);
    if (unbindStatus) unbindStatus();
    if (unbindLogs) unbindLogs();
});
</script>

<template>
    <div id="view-console-loading" v-if="isRuning == TunnelStatus.Loading || isRuning == TunnelStatus.Reconnecting"
        class="view-section w-full space-y-6 flex flex-col justify-center items-center">
        <div class="px-6 flex flex-col justify-center items-center h-150">
            <Radius class="w-32 h-32 text-[#4DB7FF] animate-spin mb-4" />
            <h2 class="text-2xl font-black text-slate-800 tracking-tight text-center">
                <template v-if="isRuning == TunnelStatus.Loading">
                    {{ isClient ? '正在加入房间...' : '正在创建联机服务...' }}
                </template>
                <template v-else>
                    检测到{{ isClient ? '房间连接' : '服务' }}异常<br />
                    <span class="text-primary">正在尝试第 {{ retryCount }}/{{ MAX_RETRY }} 次重连...</span>
                </template>
            </h2>
            <p class="text-slate-400 text-sm mt-2 font-medium">请稍候...</p>
        </div>
    </div>

    <div id="view-console-stopping" v-if="isRuning == TunnelStatus.Stopped"
        class="view-section w-full space-y-6 flex flex-col justify-center items-center">
        <div class="px-6 flex flex-col justify-center items-center h-150">
            <Radius class="w-32 h-32 text-[#4DB7FF] animate-spin mb-4" />
            <h2 class="text-2xl font-black text-slate-800 tracking-tight text-center">
                <template v-if="IsError">
                    {{ isClient ? '加入房间失败' : '创建房间失败' }}<br />
                    <span class="text-sm font-medium text-slate-500">{{ isClient ? '请检查联机码是否正确或网络是否通畅，可能房间已经不在了' : '请检查内网穿透平台密钥是否填写正确，隧道是否被占用' }}</span>
                </template>
                <template v-else>
                    {{ isClient ? '正在退出房间...' : '正在销毁房间...' }}
                </template>
            </h2>
            <p class="mt-4 text-slate-400 font-bold">3秒后自动回到主页</p>
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
                    <button @click="close()"
                        class="w-full flex-1 py-3 rounded-xl font-bold text-white bg-error hover:bg-red-500 transition-all active:scale-95 text-[13px]">
                        {{ isClient ? '退出联机房间' : '停止并关闭房间' }}
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