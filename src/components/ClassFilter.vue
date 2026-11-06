<script setup>
import { CLASSES } from '../data/meta.js'
import { weapons } from '../data/metrics.js'
import { clsName, t } from '../i18n/index.js'

// Multi-select class filter. An empty selection means "all classes"; in that state every
// class chip shows as selected, so clicking one removes just that class.
const model = defineModel({ type: Array, required: true })
const ALL = CLASSES.map(c => c.key)
const isOn = key => model.value.length === 0 || model.value.includes(key)

const counts = {}
for (const w of weapons) counts[w.cls] = (counts[w.cls] || 0) + 1

const toggle = key => {
  const current = model.value.length ? model.value : ALL
  const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
  if (!next.length) return // keep at least one class
  model.value = next.length === ALL.length ? [] : ALL.filter(k => next.includes(k))
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
      :aria-pressed="isOn(c.key)"
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
