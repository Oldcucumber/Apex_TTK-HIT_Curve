<script setup>
import { defineAsyncComponent } from 'vue'
import { store } from './store.js'
import TopBar from './components/TopBar.vue'
import FooterBar from './components/FooterBar.vue'
import OverviewView from './views/OverviewView.vue'

// Chart views pull in ECharts; load them on demand so the first screen stays light.
const ExploreView = defineAsyncComponent(() => import('./views/ExploreView.vue'))
const CompareView = defineAsyncComponent(() => import('./views/CompareView.vue'))
const HitRateView = defineAsyncComponent(() => import('./views/HitRateView.vue'))

// Warm the chart chunk once the browser is idle
const idle = window.requestIdleCallback || (cb => setTimeout(cb, 1200))
idle(() => import('./charts/echarts.js'))

const views = {
  overview: OverviewView,
  explore: ExploreView,
  compare: CompareView,
  hitrate: HitRateView
}
</script>

<template>
  <div class="app">
    <TopBar />
    <main class="main">
      <KeepAlive>
        <component :is="views[store.tab]" />
      </KeepAlive>
    </main>
    <FooterBar />
  </div>
</template>

<style scoped>
.app {
  display: grid;
  /* minmax(0, 1fr): never let a wide child (e.g. a sideways-scrolling chip row) widen the page */
  grid-template-columns: minmax(0, 1fr);
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
}

.main {
  min-height: 0;
  padding: 4px 24px 6px;
}

@media (max-width: 900px), (max-height: 560px) {
  .app {
    height: auto;
    min-height: 100vh;
  }

  .main {
    padding: 8px 12px;
  }
}

@media (max-width: 760px) {
  .app {
    padding-bottom: calc(64px + env(safe-area-inset-bottom));
  }

  .main {
    padding: 4px 12px 12px;
  }
}
</style>
