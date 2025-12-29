import { createMemoryHistory, createRouter } from 'vue-router'

import HomeView from '../pages/index.vue'
import NetworkView from '../pages/network.vue'
import settingsView from '../pages/settings.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/network', name: 'Network', component: NetworkView },
  { path: '/settings', name: 'Settings', component: settingsView },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router