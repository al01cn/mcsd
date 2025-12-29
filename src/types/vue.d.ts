import { ComponentCustomProperties } from 'vue'

// Toast 函数参数类型
export interface ToastOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'
  timeout?: number
  closeOnClick?: boolean
  pauseOnFocusLoss?: boolean
  pauseOnHover?: boolean
  draggable?: boolean
  draggablePercent?: number
  showCloseButtonOnHover?: boolean
  hideProgressBar?: boolean
  closeButton?: 'button' | 'icon' | false
  icon?: boolean
  rtl?: boolean
}

// 全局属性扩展
declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $toast: (message: string, options?: ToastOptions) => void
  }
}
