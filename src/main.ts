import { createApp } from 'vue'
import router from './router'
import 'vue-sonner/style.css'
import './style.css'
import App from './App.vue'

createApp(App).use(router).mount('#app').$nextTick(() => {
  // Use contextBridge
  window.ipcRenderer.on('main-process-message', (_event, message) => {
    console.log(message)
  })
})
