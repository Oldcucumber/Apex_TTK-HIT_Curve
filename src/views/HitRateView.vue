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
      <span class="muted stale">{{ t('hr.stale') }}</span>
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

.stale {
  font-size: 12px;
}
</style>
