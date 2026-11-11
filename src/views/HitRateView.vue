<script setup>
import { computed, ref } from 'vue'
import { t } from '../i18n/index.js'
import Seg from '../components/Seg.vue'
import CurvePane from './hit/CurvePane.vue'
import SelfTestPane from './hit/SelfTestPane.vue'

const mode = ref('curve')
const options = computed(() => [
  { value: 'curve', label: t('hr.curve') },
  { value: 'test', label: t('hr.test') }
])
</script>

<template>
  <section class="view">
    <div class="toolbar">
      <Seg v-model="mode" :options="options" />
      <details class="help">
        <summary :aria-label="t('hr.help')" :title="t('hr.help')">?</summary>
        <p class="card">{{ t('hr.stale') }}</p>
      </details>
    </div>
    <div class="pane">
      <KeepAlive>
        <component :is="mode === 'curve' ? CurvePane : SelfTestPane" />
      </KeepAlive>
    </div>
  </section>
</template>

<style scoped>
.pane {
  flex: 1;
  min-height: 0;
}

.help {
  position: relative;
}

.help summary {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--track);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 650;
  list-style: none;
  cursor: pointer;
}

.help summary::-webkit-details-marker {
  display: none;
}

.help summary:hover,
.help[open] summary {
  color: var(--text);
}

.help p {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 40;
  width: min(420px, calc(100vw - 32px));
  margin: 0;
  padding: 12px 14px;
  color: var(--text-2);
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
