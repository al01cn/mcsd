<script lang="ts" setup>
import { getVersion, openUrl } from '../lib';
import { NatFrpUserInfo, Platform, PlatformConfig } from '../lib/config';
import { ArrowRight, PlusCircle, Server, Key, Box, Trash, RotateCw, BadgeCheck } from 'lucide-vue-next';
import { nanoid } from 'nanoid';
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Dialog } from '../lib/useDialog';

interface PlatformConfigWithUser extends PlatformConfig {
    userInfo?: NatFrpUserInfo | null; // 可以根据接口具体类型改
}

const version = ref('')

const isModalOpen = ref(false)
const network = ref<Platform>("sakurafrp")
const networkKey = ref("")

const platforms = ref<PlatformConfigWithUser[]>([])

const openModal = () => {
    isModalOpen.value = !isModalOpen.value
}

const closeNetworkModal = () => {
    isModalOpen.value = !isModalOpen.value
}

const confirmNetwork = async () => {
    await addPlatform()
}

const addPlatform = async () => {
    if (!network.value || !networkKey.value) {
        toast.error("请填写完整的信息")
        return
    }

    try {
        await (window as any).platformAPI.add({
            nanoid: nanoid(),
            platform: network.value,
            secret: networkKey.value,
            enabled: true
        })

        toast.success("添加成功")

        networkKey.value = ""
        isModalOpen.value = !isModalOpen.value
        await refreshPlatforms()
    } catch (e) {
        console.log(e)
        toast.error("添加失败")
    }

}

const refreshPlatforms = async () => {
    platforms.value = []
    await getPlatforms()
    await fetchUserInfoForPlatforms()
}

const getUserInfo = async (token: string) => {
    const data = await (window as any).frp.natfrp_userInfo(token)
    return data
}

const fetchUserInfoForPlatforms = async () => {
    const updatedPlatforms = await Promise.all(
        platforms.value.map(async (platform) => {
            try {
                const info = await getUserInfo(platform.secret)
                return { ...platform, userInfo: info }
            } catch (e) {
                console.error('获取用户信息失败', e)
                return { ...platform, userInfo: null }
            }
        })
    )

    platforms.value = updatedPlatforms
}

const getPlatforms = async () => {
    try {
        const platformsList = await (window as any).platformAPI.list()
        platforms.value = platformsList
        // console.log(platformsList);

    } catch (e) {
        console.log(e)
    }
}

const delPlatform = async (nanoid: string) => {
    Dialog.warning({
        title: '删除平台',
        msg: '确定要删除此平台吗？',
        confirmText: '确定删除',
        onConfirm: async () => {
            try {
                await (window as any).platformAPI.remove(nanoid)
                toast.success("删除成功")
                await refreshPlatforms()
            } catch (e) {
                console.log(e)
                toast.error("删除失败")
            }
        }
    })

}

const togglePlatform = async (nanoid: string, sw: boolean) => {
    try {
        await (window as any).platformAPI.update(nanoid, { enabled: sw })
        await refreshPlatforms()
    } catch (e) {
        console.log(e)
        toast.error("操作失败")
    }
}



onMounted(async () => {
    await getPlatforms()
    await fetchUserInfoForPlatforms()
    const v = await getVersion()
    version.value = v
})
</script>

<template>
    <!-- VIEW: NETWORK (节点发现 - 网格布局) -->
    <div id="view-settings" class="view-section space-y-6">
        <div class="flex items-center justify-between mb-8">
            <div>
                <h2 class="text-3xl font-black text-slate-800 tracking-tight">设置</h2>
                <p class="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">软件设置</p>
            </div>
        </div>

        <!-- 节点网格 -->
        <!-- <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            1
        </div>


        <hr class="border-t border-slate-200 mb-4"> -->

        <!-- VIEW: NETWORK (节点发现 - 网格布局) -->
        <div id="view-settings-network" class="view-section space-y-6">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h4
                        class="text-xl font-black text-slate-800 tracking-tight border-l-4 border-primary pl-2.5 bg-slate-100">
                        内网穿透</h4>
                    <p class="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-1">内网穿透平台管理</p>
                </div>

                <button @click="refreshPlatforms()"
                    class="p-2 bg-white border border-slate-100 rounded-2xl shadow-soft text-slate-400 hover:text-primary transition-all active:scale-95">
                    <RotateCw class="w-5 h-5" />
                </button>
            </div>

            <!-- 节点网格 -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <!-- 节点卡片 1 -->
                <div v-for="i in platforms" :key="i.nanoid"
                    class="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-soft hover:shadow-float hover:border-primary/20 transition-all group cursor-pointer relative overflow-hidden">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-4">
                            <div class="flex flex-col">
                                <h4 class="font-black text-slate-800 text-base leading-tight gap-4">
                                    <span>{{ i.userInfo?.name ? i.userInfo?.name : i.platform.toLocaleUpperCase()
                                        }}</span>
                                </h4>
                                <p class="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1 uppercase
                                    tracking-tight">
                                    <ArrowRight class="w-3 h-3 text-slate-300" />
                                    <span>
                                        {{ i.secret }}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" :checked="i.enabled"
                                @change="togglePlatform(i.nanoid, ($event.currentTarget as HTMLInputElement).checked)"
                                className="toggle bg-primary" />
                            <button class="hover:bg-slate-50 hover:text-primary transition-all"
                                @click="delPlatform(i.nanoid)">
                                <Trash class="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div v-if="i.userInfo" class="flex items-center justify-between pt-5 border-t border-slate-50">
                        <div class="flex items-center gap-5">
                            <div v-if="i.userInfo?.group.name" class="flex flex-col">
                                <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">会员等级</span>
                                <span class="text-sm font-black text-slate-700">{{ i.userInfo?.group.name }}</span>
                            </div>
                            <div v-if="i.userInfo?.speed" class="flex flex-col">
                                <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">带宽</span>
                                <span class="text-sm font-black text-slate-700">{{ i.userInfo?.speed }}</span>
                            </div>
                            <div v-if="i.userInfo?.sign.traffic" class="flex flex-col">
                                <span class="text-[9px] text-slate-400 font-black uppercase tracking-widest">可用流量</span>
                                <span class="text-sm font-black text-slate-700">{{ i.userInfo?.sign.traffic + ' Gib'
                                }}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 text-primary font-black text-sm">
                            {{ i.platform.toLocaleUpperCase() }}
                            <BadgeCheck class="w-4 h-4" />
                        </div>
                    </div>
                </div>

                <!-- 添加新节点 -->
                <div @click="openModal()"
                    class="rounded-[2.2rem] border-2 border-dashed border-slate-200 flex items-center justify-center gap-3 hover:border-primary/50 hover:bg-white transition-all group cursor-pointer">
                    <div
                        class="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-primary/5 group-hover:text-primary transition-all">
                        <PlusCircle class="w-8 h-8" />
                    </div>
                    <div class="text-center">
                        <p class="text-sm font-black text-slate-500 group-hover:text-primary transition-colors">添加平台</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-widest">添加支持的内网穿透平台</p>
                    </div>
                </div>

                <!-- 3. Network Modal -->
                <div
                    :class="`${isModalOpen ? 'show-modal' : 'hidden-modal'} absolute inset-0 z-200 flex items-center justify-center px-4 transition-all duration-300`">
                    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-md"></div>
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
                                        <option value="sakurafrp">SakuraFrp (natfrp.com)</option>
                                        <option value="locyanfrp" disabled>Locyanfrp (locyanfrp.cn)（暂未适配）</option>
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

        <div id="view-settings-about" class="view-section space-y-6">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h4
                        class="text-xl font-black text-slate-800 tracking-tight border-l-4 border-primary pl-2.5 bg-slate-100">
                        关于软件</h4>
                    <label class="label text-slate-400 font-bold text-[12px] mt-1">软件版本：v{{ version }}</label>
                </div>
            </div>

            <div class="relative min-h-100">
                <div class="flex flex-col gap-2 mb-2 text-center font-black text-xl">
                    <h1>支持的内网穿透平台</h1>
                </div>
                <div class="flex">
                    <div class="flex flex-col items-center gap-4 p-4 rounded-xl cursor-pointer 
                               transition-all duration-300 ease-in-out 
                               hover:bg-white/10 hover:scale-105 active:scale-95"
                        @click="openUrl('https://www.natfrp.com/')">
                        <img src="/images/frp/sakurafrp.ico" class="w-24 h-auto" alt="sakurafrp">
                        <Label class="label font-bold uppercase cursor-pointer">sakurafrp</Label>
                        <Label class="label -mt-4 text-sm font-bold uppercase cursor-pointer">樱花内网穿透</Label>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>