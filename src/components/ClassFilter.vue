<script setup>
import { CLASSES } from '../data/meta.js'
import { weapons } from '../data/metrics.js'
import { clsName, t } from '../i18n/index.js'

// Multi-select class filter. An empty selection means "all classes".
const model = defineModel({ type: Array, required: true })

const counts = {}
for (const w of weapons) counts[w.cls] = (counts[w.cls] || 0) + 1

const toggle = key => {
  model.value = model.value.includes(key) ? model.value.filter(k => k !== key) : [...model.value, key]
}
</script>

<template>
  <div class="class-filter scroll-x">
    <button class="chip" :aria-pressed="model.length === 0" @click="model = []">{{ t('ov.all') }}</button>
    <button
      v-for="c in CLASSES"
      :key="c.key"
      class="chip"
      :style="{ '--dot': `var(${c.color})` }"
      :aria-pressed="model.includes(c.key)"
      @click="toggle(c.key)"
    >
      <i class="dot"></i>{{ clsName(c.key) }} <small>{{ counts[c.key] || 0 }}</small>
    </button>
  </div>
</template>

<style scoped>
.class-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
