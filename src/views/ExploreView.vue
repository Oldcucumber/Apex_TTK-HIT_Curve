<script setup>
import { computed, ref } from 'vue'
import { GROUPS, METRICS, METRIC, display, formatValue, median, value, weapons } from '../data/metrics.js'
import { store } from '../store.js'
import { clsName, fullName, metricName, nameOf, shortName, t } from '../i18n/index.js'
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

const groupLabel = g => t(`preset.${g}`)
const optionsByGroup = computed(() =>
  GROUPS.map(g => ({
    label: groupLabel(g),
    items: METRICS.filter(m => m.group === g).map(m => ({ key: m.key, label: metricName(m) }))
  }))
)

const pool = computed(() => weapons.filter(w => !classes.value.length || classes.value.includes(w.cls)))

const axisName = m => {
  const base = metricName(m) + (m.unit && m.unit !== '%' ? ` (${m.unit})` : '')
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

const labelText = (w, sparse) => (sparse ? shortName(w, 14) : nameOf(w).base)

/**
 * Decide which points get a permanent name label: the most isolated points first,
 * skipping any whose label box would collide with one already placed.
 * Works in normalised (and, for log axes, logarithmic) data space.
 */
const pickLabels = (pts, sparse) => {
  if (!pts.length) return new Set()
  const tx = v => (log.value ? Math.log(v) : v)
  const xs = pts.map(p => tx(p.x))
  const ys = pts.map(p => tx(p.y))
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)]
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)]
  const nodes = pts.map((p, i) => ({
    id: p.w.id,
    u: (xs[i] - x0) / (x1 - x0 || 1),
    v: (ys[i] - y0) / (y1 - y0 || 1),
    len: labelText(p.w, sparse).length
  }))
  for (const n of nodes) {
    n.iso = Math.min(...nodes.filter(o => o !== n).map(o => Math.hypot(n.u - o.u, n.v - o.v)), 1)
  }
  // label box in normalised units, derived from the actual plot size
  const W = 11.5 / Math.max(200, (host.value?.clientWidth || 1200) - 120) // per character
  const H = 16 / Math.max(160, (host.value?.clientHeight || 700) - 90)
  const placed = []
  const out = new Set()
  for (const n of [...nodes].sort((a, b) => b.iso - a.iso)) {
    const box = { l: n.u + 0.006, r: n.u + 0.006 + n.len * W, t: n.v + H / 2, b: n.v - H / 2 }
    const hit = placed.some(o => box.l < o.r && box.r > o.l && box.b < o.t && box.t > o.b) ||
      nodes.some(o => o !== n && o.u > box.l && o.u < box.r && Math.abs(o.v - n.v) < H / 2)
    if (hit || box.r > 1.04) continue // collides, or would run off the right edge
    placed.push(box)
    out.add(n.id)
  }
  return out
}

const buildScatter = tk => {
  const mx = METRIC[xKey.value]
  const my = METRIC[yKey.value]
  const byClass = {}
  for (const p of points.value) (byClass[p.w.cls] ||= []).push(p)
  const sparse = points.value.length <= 16
  const labelled = pickLabels(points.value, sparse)
  const ws = points.value.map(p => p.w)
  const medX = median(mx, store.armor, ws)
  const medY = median(my, store.armor, ws)
  const xs = points.value.map(p => p.x)
  const ys = points.value.map(p => p.y)
  // "Sweet spot": the quadrant that is better than the median on both axes
  const sweet = medX != null && medY != null && xs.length > 3
    ? [[
        { coord: [mx.dir === 'low' ? Math.min(...xs) : medX, my.dir === 'low' ? Math.min(...ys) : medY], name: store.mobile ? t('ex.sweetShort') : t('ex.sweet') },
        { coord: [mx.dir === 'low' ? medX : Math.max(...xs), my.dir === 'low' ? medY : Math.max(...ys)] }
      ]]
    : []
  const markers = {
    markArea: {
      silent: true,
      itemStyle: { color: tk.grid },
      label: { color: tk.muted, fontSize: 11, position: 'insideTopLeft' },
      data: sweet
    },
    markLine: {
      silent: true,
      symbol: 'none',
      lineStyle: { color: tk.muted, type: 'dashed', width: 1, opacity: 0.6 },
      label: { show: !store.mobile, color: tk.muted, fontSize: 11, formatter: t('ex.median') },
      data: medX != null && medY != null ? [{ xAxis: medX }, { yAxis: medY, label: { position: 'insideEndTop' } }] : []
    }
  }

  return {
    animationDuration: 200,
    grid: store.mobile
      ? { top: 30, right: 16, bottom: 34, left: 4, containLabel: true }
      : { top: 18, right: 72, bottom: 62, left: 40, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'item',
      formatter: ({ data }) => {
        const w = data.w
        const row = (m, bold) => `<div style="display:flex;justify-content:space-between;gap:18px;${bold ? 'font-weight:650' : ''}"><span style="opacity:.6">${metricName(m)}</span><span>${display(w, m, store.armor, { unit: true })}</span></div>`
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
      // phones: no room for a rotated name beside the axis, put it above instead
      ...(store.mobile
        ? { nameLocation: 'end', nameGap: 6, nameTextStyle: { ...axis(tk).nameTextStyle, align: 'left' } }
        : { nameLocation: 'middle', nameGap: 40 }),
      scale: true,
      axisLabel: { ...axis(tk).axisLabel, formatter: v => (my.pct ? `${Math.round(v * 100)}%` : +v.toFixed(2)) }
    },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
      ...(store.mobile ? [] : [{ ...slider(tk), type: 'slider', xAxisIndex: 0, bottom: 6, height: 16, filterMode: 'none' }])
    ],
    series: Object.entries(byClass).map(([cls, list], i) => ({
      ...(i === 0 ? markers : {}),
      name: cls,
      type: 'scatter',
      symbolSize: store.mobile ? 9 : 11,
      itemStyle: { color: tk.cls[cls], opacity: 0.85, borderColor: tk.panel, borderWidth: 1.5 },
      emphasis: {
        scale: 1.5,
        itemStyle: { opacity: 1 },
        label: { show: true, formatter: ({ data }) => nameOf(data.w).base, position: 'top', color: tk.text, fontSize: 12, fontWeight: 600 }
      },
      // Name every point that has room; overlapping labels are dropped by labelLayout
      label: { position: 'right', distance: 4, color: tk.soft, fontSize: 11, formatter: ({ data }) => labelText(data.w, sparse) },
      labelLayout: { hideOverlap: true },
      data: list.map(p => ({ value: [p.x, p.y], w: p.w, label: { show: labelled.has(p.w.id) } }))
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
  const med = median(m, store.armor, list.map(p => p.w))

  return {
    animationDuration: 200,
    grid: { top: 26, right: scroll ? 44 : 56, bottom: 8, left: 8, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: tk.grid } },
      formatter: ps => {
        const w = list[ps[0].dataIndex]?.w
        return w ? `<b>${fullName(w)}</b><br><span style="opacity:.6">${clsName(w.cls)} · ${metricName(m)}</span> ${display(w, m, store.armor, { unit: true })}` : ''
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
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: tk.muted, type: 'dashed', width: 1 },
        label: { position: 'end', color: tk.muted, fontSize: 11, formatter: () => `${t('ex.median')} ${formatValue(med, m, { unit: true })}` },
        data: med != null ? [{ xAxis: med }] : []
      },
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', color: tk.soft, fontSize: 11, formatter: ({ dataIndex }) => display(list[dataIndex].w, m, store.armor) },
      data: list.map(p => ({ value: p.v, itemStyle: { color: tk.cls[p.w.cls] } }))
    }]
  }
}

const api = useChart(
  host,
  tk => (mode.value === 'scatter' ? buildScatter(tk) : buildRank(tk)),
  [mode, classes, xKey, yKey, metricKey, log, () => store.armor, () => store.mobile],
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
      <div class="pickers">

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
    </div>

    <div class="card stage">
      <div ref="host" class="chart-host"></div>
      <div v-if="empty" class="empty overlay">{{ t('ex.nodata') }}</div>
      <span v-if="!store.mobile" class="hint muted">{{ t('ex.hint') }}</span>
    </div>
  </section>
</template>

<style scoped>
.pickers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 14px;
}

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

@media (max-width: 760px) {
  .toolbar .grow {
    display: none;
  }

  .pickers {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    width: 100%;
    gap: 8px;
  }

  .sel {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .sel .field {
    width: 100%;
  }

  .pickers .chip {
    align-self: end;
    height: 30px;
  }

  .info {
    display: none;
  }

  .stage {
    min-height: 0;
    height: 64vh;
    padding: 4px;
  }
}
</style>
