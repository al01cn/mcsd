import { createMemoryHistory, createRouter } from 'vue-router'

import ConsoleView from '../pages/console.vue'
import NetworkView from '../pages/network.vue'
import settingsView from '../pages/settings.vue'
import CreateRoomsView from '../pages/CreateRooms.vue'
import RoomsView from '../pages/rooms.vue'

const routes = [
  { path: '/', redirect: '/create_rooms' },
  { path: '/rooms', name: 'Rooms', component: RoomsView },
  { path: '/create_rooms', name: 'CreateRooms', component: CreateRoomsView },
  { path: '/console', name: 'Home', component: ConsoleView },
  { path: '/network', name: 'Network', component: NetworkView },
  { path: '/settings', name: 'Settings', component: settingsView },
]

const router = createRouter({
  history: createMemoryHistory(),
  routes,
})

export default router