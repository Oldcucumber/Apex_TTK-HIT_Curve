import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import './store.js'

import { reloadOnce } from './reload.js'

// A dependency of a lazily loaded view failed to load (usually a stale build after a redeploy)
window.addEventListener('vite:preloadError', event => {
  if (reloadOnce()) event.preventDefault()
})

createApp(App).mount('#app')
