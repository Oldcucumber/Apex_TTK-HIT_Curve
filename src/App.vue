<script setup>
import { defineAsyncComponent } from 'vue'
import { store } from './store.js'
import { reloadOnce } from './reload.js'
import TopBar from './components/TopBar.vue'
import FooterBar from './components/FooterBar.vue'
import OverviewView from './views/OverviewView.vue'

// Chart views pull in ECharts; they load after the first screen, then stay in memory.
const loaders = {
  explore: () => import('./views/ExploreView.vue'),
  compare: () => import('./views/CompareView.vue'),
  hitrate: () => import('./views/HitRateView.vue')
}
// A failed chunk request is retried once (flaky network); if it still fails the build has
// probably been replaced, so reload to get the new one.
const lazy = loader => defineAsyncComponent({
  loader,
  onError: (err, retry, fail, attempts) => {
    if (attempts <= 1) setTimeout(retry, 300)
    else if (!reloadOnce()) fail()
  }
})
const ExploreView = lazy(loaders.explore)
const CompareView = lazy(loaders.compare)
const HitRateView = lazy(loaders.hitrate)

// Load every view (and ECharts) once the browser is idle, so later tab switches need no
// network and keep working even after a redeploy replaces the old asset files.
// (the timeout matters: an animating page may never report idle time)
const idle = cb => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 600))
idle(() => Object.values(loaders).forEach(load => load().catch(() => {})))

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
