import { h, render } from 'vue'
import MyDialog from '../components/Dialog.vue'

interface DialogOptions {
    title?: string
    msg?: string
    confirmText?: string
    cancelText?: string
}

const showDialog = (type: string, options: DialogOptions) => {
    return new Promise((resolve) => {
        const container = document.createElement('div')
        
        const vnode = h(MyDialog, {
            ...options,
            type,
            resolve,
            remove: () => {
                render(null, container)
                container.remove()
            }
        })

        render(vnode, container)
        document.body.appendChild(container)
    })
}

export const Dialog = {
    success: (opts: DialogOptions) => showDialog('success', { confirmText: '确定', ...opts }),
    warning: (opts: DialogOptions) => showDialog('warning', { confirmText: '我知道了', ...opts }),
    error: (opts: DialogOptions) => showDialog('error', { confirmText: '删除', ...opts }),
    info: (opts: DialogOptions) => showDialog('info', { confirmText: '确定', ...opts }),
    loading: (opts: DialogOptions) => showDialog('loading', opts),
}