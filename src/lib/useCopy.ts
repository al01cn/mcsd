// useCopy.ts
import { ref } from 'vue';
import { toast } from 'vue-sonner';

export function useCopy() {
    const isCopied = ref(false);

    const copyToClipboard = async (text: string) => {
        try {
            // 现代浏览器 API
            await navigator.clipboard.writeText(text);

            // 复制成功的状态反馈
            isCopied.value = true;
            setTimeout(() => {
                isCopied.value = false;
            }, 2000);

            console.log('复制成功');
            toast.success('复制成功');
        } catch (err) {
            console.error('复制失败:', err);
            toast.error('复制失败');
            // 这里可以回退到 document.execCommand('copy') 如果需要兼容极老版本浏览器
        }
    };

    return { copyToClipboard, isCopied };
}