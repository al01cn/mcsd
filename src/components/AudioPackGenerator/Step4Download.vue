<script setup lang="ts">
import { ref } from 'vue';
import { Download, ChevronRight, Package, FileText, Loader2 } from 'lucide-vue-next';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { FileItem, PackMeta } from '../../lib/types';
import { buildJavaPackMcmetaText, buildJavaSoundsJson, buildBedrockSoundDefinitions } from '../../lib/pack-builder';
import { DEFAULT_KEY, buildPackDescription, normalizeKey, uuid } from '../../lib/utils';

const props = defineProps<{
  files: FileItem[];
  meta: PackMeta;
}>();

const emit = defineEmits<{
  (e: 'next'): void;
}>();

const generating = ref(false);

const downloadPack = async () => {
  if (generating.value) return;
  generating.value = true;

  try {
    const zip = new JSZip();
    const key = normalizeKey(props.meta.key || DEFAULT_KEY);
    const desc = buildPackDescription(props.meta.desc);
    const safeName = props.meta.name.trim() || "SoundPack";
    const readyFiles = props.files.filter((f) => f.processedBlob && f.status === "done");
    if (readyFiles.length !== props.files.length) {
      alert("存在未成功转换的文件，请重新处理后再下载。");
      return;
    }

    if (props.meta.platform === 'java') {
      // pack.mcmeta
      const mcmeta = buildJavaPackMcmetaText(props.meta.javaPackFormat, desc);
      zip.file("pack.mcmeta", mcmeta);

      // pack.png
      if (props.meta.iconFile) {
        zip.file("pack.png", props.meta.iconFile);
      }

      // sounds.json
      const soundsJson = buildJavaSoundsJson(key, readyFiles, props.meta.modifyVanilla);
      zip.file("assets/minecraft/sounds.json", JSON.stringify(soundsJson, null, 2));

      // audio files
      const soundFolder = zip.folder(`assets/minecraft/sounds/${key}`);
      if (soundFolder) {
        for (const file of readyFiles) {
          if (file.processedBlob) {
            soundFolder.file(`${file.newName}.ogg`, file.processedBlob);
          }
        }
      }
    } else {
      // manifest.json
      const uuid1 = uuid();
      const uuid2 = uuid();
      
      const manifest = {
        format_version: 2,
        header: {
          description: desc,
          name: safeName,
          uuid: uuid1,
          version: [1, 0, 0],
          min_engine_version: [1, 16, 0]
        },
        modules: [
          {
            type: "resources",
            uuid: uuid2,
            version: [1, 0, 0]
          }
        ]
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      // pack_icon.png
      if (props.meta.iconFile) {
        zip.file("pack_icon.png", props.meta.iconFile);
      }

      // sound_definitions.json
      const definitions = buildBedrockSoundDefinitions(key, readyFiles, props.meta.modifyVanilla);
      zip.file("sounds/sound_definitions.json", JSON.stringify(definitions, null, 2));

      // audio files
      const soundFolder = zip.folder(`sounds/${key}`);
      if (soundFolder) {
        for (const file of readyFiles) {
          if (file.processedBlob) {
            soundFolder.file(`${file.newName}.ogg`, file.processedBlob);
          }
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    const ext = props.meta.platform === 'bedrock' ? 'mcpack' : 'zip';
    saveAs(content, `${safeName}.${ext}`);
    
  } catch (err) {
    console.error("Pack generation failed", err);
    alert("打包失败，请查看控制台日志");
  } finally {
    generating.value = false;
  }
};

</script>

<template>
  <div class="space-y-6">
    <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center space-y-6">
      <div class="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto">
        <Package class="w-10 h-10" />
      </div>
      
      <div>
        <h2 class="text-2xl font-bold text-slate-800">资源包准备就绪</h2>
        <p class="text-slate-500 mt-2">您的音频包已完成转换与打包准备</p>
      </div>

      <div class="flex flex-col sm:flex-row justify-center gap-4">
        <button 
          @click="downloadPack"
          :disabled="generating"
          class="bg-green-500 hover:bg-green-600 disabled:opacity-70 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-500/20 transition flex items-center justify-center gap-2 min-w-[200px]"
        >
          <Download class="w-5 h-5" v-if="!generating" />
          <Loader2 class="w-5 h-5 animate-spin" v-else />
          <span>{{ generating ? '打包中...' : '下载资源包' }}</span>
        </button>
      </div>
      
      <p class="text-xs text-slate-400">
        {{ meta.platform === 'bedrock' ? '将会下载 .mcpack 文件' : '将会下载 .zip 文件' }}
      </p>
    </div>

    <div class="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
          <FileText class="w-6 h-6" />
        </div>
        <div>
          <h3 class="font-bold text-slate-800">生成 Playsound 命令</h3>
          <p class="text-sm text-slate-600">获取用于在游戏中播放这些音频的命令</p>
        </div>
      </div>
      <button 
        @click="emit('next')"
        class="bg-white text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold shadow-sm border border-blue-100 transition flex items-center gap-2"
      >
        <span>前往生成</span>
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
