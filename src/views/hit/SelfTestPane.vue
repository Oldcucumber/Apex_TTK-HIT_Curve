<script setup>
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import ttks from '../../data/id_stats.js'
import classes from '../../data/Class.js'
import cn from '../../data/cn.js'
import en from '../../data/en.js'
import { CURVE_CLASS, classOf } from '../../data/meta.js'
import { store } from '../../store.js'
import { clsName, t } from '../../i18n/index.js'
import { useChart } from '../../charts/useChart.js'
import { axis, slider, tooltip } from '../../charts/theme.js'

const ROW_H = 18

const host = ref(null)
const names = computed(() => (store.lang === 'en' ? en.names : cn.names))
const form = reactive(Object.fromEntries(Object.keys(cn.names).map(id => [id, ''])))
const result = ref([]) // [{ id, value, valid }]
const json = ref('')
const jsonOpen = ref(false)
const toast = ref({ text: '', error: false })
let timer = null

const groups = Object.entries(classes).map(([key, ids]) => ({
  key,
  cls: CURVE_CLASS[key],
  ids: ids.filter(id => id in cn.names)
}))
const classOfId = Object.fromEntries(groups.flatMap(g => g.ids.map(id => [id, g.cls])))

const filled = computed(() => Object.values(form).filter(v => v !== '' && v != null).length)
const total = Object.keys(cn.names).length

const findTTK = (id, pct) => {
  for (const [x, y] of ttks[id] || []) if (x <= pct / 100) return y
  return 0
}

const say = (text, error = false) => {
  toast.value = { text, error }
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = { text: '', error: false } }, 3200)
}
onBeforeUnmount(() => clearTimeout(timer))

const generate = () => {
  const out = {}
  const rows = []
  for (const id of Object.keys(form)) {
    if (form[id] === '' || form[id] == null) continue
    out[id] = form[id]
    const v = findTTK(id, Number(form[id]))
    rows.push({ id, value: v || 5, valid: v !== 0 })
  }
  json.value = JSON.stringify(out, null, 2)
  rows.sort((a, b) => (a.valid === b.valid ? a.value - b.value : a.valid ? -1 : 1))
  result.value = rows
}

const clearAll = () => {
  for (const id of Object.keys(form)) form[id] = ''
  result.value = []
  json.value = ''
}

const copy = () =>
  navigator.clipboard.writeText(json.value)
    .then(() => say(t('hr.copied')))
    .catch(() => say(t('hr.copyFail'), true))

const parse = () => {
  try {
    const data = JSON.parse(json.value)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new Error(t('hr.invalid'))
    for (const k of Object.keys(data)) if (k in form) form[k] = data[k]
    if (filled.value) generate()
    say(t('hr.parsed'))
  } catch (e) {
    say(`${t('hr.parseFail')}: ${e.message}`, true)
  }
}

const build = tk => {
  const rows = result.value
  const fit = Math.max(8, Math.floor(((host.value?.clientHeight || 500) - 40) / ROW_H))
  const shown = Math.min(rows.length, fit)
  const scroll = shown < rows.length
  return {
    animationDuration: 200,
    grid: { top: 26, right: scroll ? 44 : 52, bottom: 8, left: 8, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'item',
      formatter: p => `${p.name}<br>${p.data.valid ? `TTK <b>${p.value}s</b>` : t('hr.noTtk')}`
    },
    xAxis: { ...axis(tk), type: 'value', position: 'top', axisLabel: { ...axis(tk).axisLabel, formatter: '{value}s' } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(r => names.value[r.id]),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: tk.soft, fontSize: 11, interval: 0, width: 190, overflow: 'truncate' }
    },
    dataZoom: scroll
      ? [
          { type: 'inside', yAxisIndex: 0, startValue: 0, endValue: shown - 1, zoomLock: true, moveOnMouseWheel: true },
          { ...slider(tk), type: 'slider', yAxisIndex: 0, right: 4, width: 12, startValue: 0, endValue: shown - 1, zoomLock: true, brushSelect: false, showDetail: false }
        ]
      : [],
    series: [{
      type: 'bar',
      barMaxWidth: 11,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: tk.soft, fontSize: 11, formatter: ({ data }) => (data.valid ? data.value : '—') },
      data: rows.map(r => ({
        value: r.value,
        valid: r.valid,
        itemStyle: r.valid
          ? { color: tk.cls[classOfId[r.id]] }
          : { color: 'transparent', borderColor: tk.muted, borderWidth: 1, borderType: 'dashed' }
      }))
    }]
  }
}

const api = useChart(host, build, [result, names], () => result.value.length && api.render())
const color = g => `var(${classOf(g.cls).color})`
</script>

<template>
  <div class="test">
    <div class="card form">
      <header>
        <span class="label">{{ t('hr.rate') }} (%)</span>
        <span class="muted num">{{ t('hr.fill') }} {{ filled }} / {{ total }}</span>
      </header>
      <div class="scroll">
        <section v-for="g in groups" :key="g.key" :style="{ '--dot': color(g) }">
          <h4><i class="dot"></i>{{ clsName(g.cls) }}</h4>
          <div class="grid">
            <label v-for="id in g.ids" :key="id">
              <span :title="names[id]">{{ names[id] }}</span>
              <input
                v-model="form[id]"
                class="field"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
                placeholder="%"
                @keydown.enter="generate"
              >
            </label>
          </div>
        </section>
      </div>
    </div>

    <div class="card out">
      <header>
        <span class="label">{{ t('hr.ranking') }}</span>
        <span class="grow"></span>
        <span v-if="toast.text" class="toast" :class="{ error: toast.error }" role="status">{{ toast.text }}</span>
        <button class="btn" :aria-pressed="jsonOpen" @click="jsonOpen = !jsonOpen">{{ t('hr.json') }}</button>
        <button class="btn" :disabled="!filled" @click="clearAll">{{ t('hr.clearAll') }}</button>
        <button class="btn primary" :disabled="!filled" @click="generate">{{ t('hr.generate') }}</button>
      </header>

      <div class="chart">
        <div ref="host" class="chart-host"></div>
        <div v-if="!result.length" class="empty cover">{{ t('hr.fillHint') }}</div>
      </div>

      <div v-if="jsonOpen" class="json">
        <textarea v-model="json" class="field" :placeholder="t('hr.paste')" spellcheck="false"></textarea>
        <div class="acts">
          <button class="btn" :disabled="!json" @click="copy">{{ t('hr.copy') }}</button>
          <button class="btn" :disabled="!json" @click="parse">{{ t('hr.parse') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
  gap: 12px;
  height: 100%;
}

.form,
.out {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 12px 0 16px;
  border-bottom: 1px solid var(--line);
}

header .btn {
  height: 26px;
  padding: 0 10px;
}

.btn[aria-pressed='true'] {
  background: var(--hover);
  border-color: var(--line-2);
}

.form header {
  justify-content: space-between;
}

.scroll {
  flex: 1;
  min-height: 0;
  padding: 4px 16px 14px;
  overflow: auto;
}

h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 6px;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-2);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 4px 18px;
}

label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 30px;
}

label span {
  overflow: hidden;
  color: var(--text-2);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

label .field {
  flex-shrink: 0;
  width: 66px;
  height: 26px;
  text-align: right;
}

.chart {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 6px 10px;
}

.cover {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.toast {
  max-width: 260px;
  overflow: hidden;
  color: var(--c-sniper);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toast.error {
  color: var(--c-shotgun);
}

.json {
  display: flex;
  gap: 8px;
  height: 108px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
}

.json textarea {
  flex: 1;
  height: 100%;
  padding: 8px 10px;
  resize: none;
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 11.5px;
}

.acts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 150px;
}

.acts .btn {
  flex: 1;
  white-space: normal;
  line-height: 1.2;
}

@media (max-width: 900px), (max-height: 560px) {
  .test {
    grid-template-columns: 1fr;
    height: auto;
  }

  .scroll {
    max-height: 520px;
  }

  .chart {
    height: 420px;
    flex: none;
  }
}
</style>
