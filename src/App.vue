<script setup>
import { store } from './store.js'
import TopBar from './components/TopBar.vue'
import FooterBar from './components/FooterBar.vue'
import OverviewView from './views/OverviewView.vue'
import ExploreView from './views/ExploreView.vue'
import CompareView from './views/CompareView.vue'
import HitRateView from './views/HitRateView.vue'

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
</style>
