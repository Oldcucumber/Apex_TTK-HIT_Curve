<script setup>
import { computed, ref } from 'vue'
import { weapons } from '../data/weapons.js'
import { METRICS, METRIC, display, fullName, metricLabel, shortName, value } from '../data/metrics.js'
import { store } from '../store.js'
import { clsName, t } from '../i18n/index.js'
import { useChart } from '../charts/useChart.js'
import { axis, slider, tooltip } from '../charts/theme.js'
import ClassFilter from '../components/ClassFilter.vue'
import Seg from '../components/Seg.vue'

const ROW_H = 18

const mode = ref('scatter')
const classes = ref([])
const xKey = ref('ttk')
const yKey = ref('ttm')
const metricKey = ref('ttk')
const log = ref(true) // TTM has a few extreme outliers; log scale keeps the main cluster readable
const host = ref(null)

const modeOptions = computed(() => [
  { value: 'scatter', label: t('ex.scatter') },
  { value: 'rank', label: t('ex.rank') }
])

const groups = ['combat', 'tolerance', 'handling']
const groupLabel = g => t(`preset.${g}`)
const optionsByGroup = computed(() =>
  groups.map(g => ({
    label: groupLabel(g),
    items: METRICS.filter(m => m.group === g).map(m => ({ key: m.key, label: metricLabel(m, store.lang) }))
  }))
)

const pool = computed(() => weapons.filter(w => !classes.value.length || classes.value.includes(w.cls)))

const axisName = m => {
  const base = metricLabel(m, store.lang) + (m.unit && m.unit !== '%' ? ` (${m.unit})` : '')
  return `${base} · ${t(`ex.better.${m.dir}`)}`
}

const points = computed(() => {
  const mx = METRIC[xKey.value]
  const my = METRIC[yKey.value]
  return pool.value
    .map(w => ({ w, x: value(w, mx, store.armor), y: value(w, my, store.armor) }))
    .filter(p => p.x != null && p.y != null && (!log.value || (p.x > 0 && p.y > 0)))
})

const info = computed(() =>
  mode.value === 'scatter'
    ? t('ex.points', { n: points.value.length })
    : t('ov.count', { n: pool.value.filter(w => value(w, METRIC[metricKey.value], store.armor) != null).length })
)

const buildScatter = tk => {
  const mx = METRIC[xKey.value]
  const my = METRIC[yKey.value]
  const byClass = {}
  for (const p of points.value) (byClass[p.w.cls] ||= []).push(p)
  const sparse = points.value.length <= 16

  return {
    animationDuration: 200,
    grid: { top: 18, right: 28, bottom: 62, left: 28, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'item',
      formatter: ({ data }) => {
        const w = data.w
        const row = (m, bold) => `<div style="display:flex;justify-content:space-between;gap:18px;${bold ? 'font-weight:650' : ''}"><span style="opacity:.6">${metricLabel(m, store.lang)}</span><span>${display(w, m, store.armor, { unit: true })}</span></div>`
        return `<div style="font-weight:650;margin-bottom:5px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${tk.cls[w.cls]};margin-right:6px"></span>${fullName(w)}</div>${row(mx, true)}${row(my, true)}`
      }
    },
    xAxis: {
      ...axis(tk),
      type: log.value ? 'log' : 'value',
      logBase: 2,
      name: axisName(mx),
      nameLocation: 'middle',
      nameGap: 30,
      scale: true,
      axisLabel: { ...axis(tk).axisLabel, formatter: v => (mx.pct ? `${Math.round(v * 100)}%` : +v.toFixed(2)) }
    },
    yAxis: {
      ...axis(tk),
      type: log.value ? 'log' : 'value',
      logBase: 2,
      name: axisName(my),
      nameLocation: 'middle',
      nameGap: 44,
      scale: true,
      axisLabel: { ...axis(tk).axisLabel, formatter: v => (my.pct ? `${Math.round(v * 100)}%` : +v.toFixed(2)) }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
      { ...slider(tk), type: 'slider', xAxisIndex: 0, bottom: 6, height: 16, filterMode: 'none' }
    ],
    series: Object.entries(byClass).map(([cls, list]) => ({
      name: cls,
      type: 'scatter',
      symbolSize: 11,
      itemStyle: { color: tk.cls[cls], opacity: 0.85, borderColor: tk.panel, borderWidth: 1.5 },
      emphasis: {
        scale: 1.5,
        itemStyle: { opacity: 1 },
        label: { show: true, formatter: ({ data }) => data.w.base, position: 'top', color: tk.text, fontSize: 12, fontWeight: 600 }
      },
      label: sparse
        ? { show: true, formatter: ({ data }) => shortName(data.w, 12), position: 'right', color: tk.soft, fontSize: 11 }
        : { show: false },
      data: list.map(p => ({ value: [p.x, p.y], w: p.w }))
    }))
  }
}

const buildRank = tk => {
  const m = METRIC[metricKey.value]
  const list = pool.value
    .map(w => ({ w, v: value(w, m, store.armor) }))
    .filter(p => p.v != null)
    .sort((a, b) => (m.dir === 'low' ? a.v - b.v : b.v - a.v))
  const fit = Math.max(8, Math.floor(((host.value?.clientHeight || 600) - 40) / ROW_H))
  const rows = Math.min(list.length, fit)
  const scroll = rows < list.length

  return {
    animationDuration: 200,
    grid: { top: 26, right: scroll ? 44 : 56, bottom: 8, left: 8, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: tk.grid } },
      formatter: ps => {
        const w = list[ps[0].dataIndex]?.w
        return w ? `<b>${fullName(w)}</b><br><span style="opacity:.6">${clsName(w.cls)} · ${metricLabel(m, store.lang)}</span> ${display(w, m, store.armor, { unit: true })}` : ''
      }
    },
    xAxis: { ...axis(tk), type: 'value', position: 'top', splitNumber: 6, axisLabel: { ...axis(tk).axisLabel, formatter: v => (m.pct ? `${Math.round(v * 100)}%` : v) } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: list.map(p => shortName(p.w, 22)),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: tk.soft, fontSize: 11, interval: 0, width: 200, overflow: 'truncate' }
    },
    dataZoom: scroll
      ? [
          { type: 'inside', yAxisIndex: 0, startValue: 0, endValue: rows - 1, zoomLock: true, moveOnMouseWheel: true },
          { ...slider(tk), type: 'slider', yAxisIndex: 0, right: 4, width: 12, startValue: 0, endValue: rows - 1, zoomLock: true, brushSelect: false, showDetail: false }
        ]
      : [],
    series: [{
      type: 'bar',
      barMaxWidth: 11,
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: tk.soft, fontSize: 11, formatter: ({ dataIndex }) => display(list[dataIndex].w, m, store.armor) },
      data: list.map(p => ({ value: p.v, itemStyle: { color: tk.cls[p.w.cls] } }))
    }]
  }
}

const api = useChart(
  host,
  tk => (mode.value === 'scatter' ? buildScatter(tk) : buildRank(tk)),
  [mode, classes, xKey, yKey, metricKey, log, () => store.armor],
  () => mode.value === 'rank' && api.render()
)

const empty = computed(() => (mode.value === 'scatter' ? !points.value.length : false))
</script>

<template>
  <section class="view">
    <div class="toolbar">
      <Seg v-model="mode" :options="modeOptions" />
      <ClassFilter v-model="classes" />
      <div class="grow"></div>

      <template v-if="mode === 'scatter'">
        <label class="sel"><span class="label">{{ t('ex.x') }}</span>
          <select v-model="xKey" class="field">
            <optgroup v-for="g in optionsByGroup" :key="g.label" :label="g.label">
              <option v-for="o in g.items" :key="o.key" :value="o.key">{{ o.label }}</option>
            </optgroup>
          </select>
        </label>
        <label class="sel"><span class="label">{{ t('ex.y') }}</span>
          <select v-model="yKey" class="field">
            <optgroup v-for="g in optionsByGroup" :key="g.label" :label="g.label">
              <option v-for="o in g.items" :key="o.key" :value="o.key">{{ o.label }}</option>
            </optgroup>
          </select>
        </label>
        <button class="chip" :aria-pressed="log" @click="log = !log">{{ t('ex.log') }}</button>
      </template>
      <label v-else class="sel"><span class="label">{{ t('ex.metric') }}</span>
        <select v-model="metricKey" class="field">
          <optgroup v-for="g in optionsByGroup" :key="g.label" :label="g.label">
            <option v-for="o in g.items" :key="o.key" :value="o.key">{{ o.label }}</option>
          </optgroup>
        </select>
      </label>
      <span class="muted num info">{{ info }}</span>
    </div>

    <div class="card stage">
      <div ref="host" class="chart-host"></div>
      <div v-if="empty" class="empty overlay">{{ t('ex.nodata') }}</div>
      <span class="hint muted">{{ t('ex.hint') }}</span>
    </div>
  </section>
</template>

<style scoped>
.sel {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.info {
  min-width: 64px;
  text-align: right;
}

.stage {
  position: relative;
  flex: 1;
  padding: 8px 10px;
}

.overlay {
  position: absolute;
  inset: 0;
}

.hint {
  position: absolute;
  top: 8px;
  right: 14px;
  font-size: 11px;
  pointer-events: none;
}

@media (max-width: 900px), (max-height: 560px) {
  .stage {
    min-height: 480px;
  }
}
</style>
