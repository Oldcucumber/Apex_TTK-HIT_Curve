<script setup>
import { computed, reactive, ref } from 'vue'
import ttks from '../../data/id_stats.js'
import classes from '../../data/Class.js'
import cn from '../../data/cn.js'
import en from '../../data/en.js'
import { CURVE_CLASS, classOf } from '../../data/meta.js'
import { store } from '../../store.js'
import { clsName, t } from '../../i18n/index.js'
import { useChart } from '../../charts/useChart.js'
import { axis, shade, slider, tooltip } from '../../charts/theme.js'

const MAX_Y = 10

const host = ref(null)
const hidden = reactive(new Set())
const names = computed(() => (store.lang === 'en' ? en.names : cn.names))

// Static structure: class -> [{ id, idx, n }]
const groups = Object.entries(classes).map(([key, ids]) => {
  const list = ids.filter(id => ttks[id])
  return { key, cls: CURVE_CLASS[key], items: list.map((id, idx) => ({ id, idx, n: list.length })) }
})

const colorOf = (tk, item, cls) => {
  const base = tk.cls[cls]
  const t0 = item.n > 1 ? -0.22 + 0.5 * (item.idx / (item.n - 1)) : 0
  return shade(base, t0)
}

const swatch = (item, cls) => {
  void store.theme // re-evaluate when the theme changes
  const cs = getComputedStyle(document.documentElement)
  const base = cs.getPropertyValue(classOf(cls).color).trim()
  return colorOf({ cls: { [cls]: base } }, item, cls)
}

const visibleIds = () => groups.flatMap(g => g.items.map(i => i.id)).filter(id => !hidden.has(id))

const build = tk => {
  const ids = visibleIds()
  let minX = 100
  let maxY = 0
  for (const id of ids) {
    for (const [x, y] of ttks[id]) {
      minX = Math.min(minX, x * 100)
      if (y <= MAX_Y) maxY = Math.max(maxY, y)
    }
  }
  if (!ids.length) { minX = 0; maxY = MAX_Y }
  const xMin = Math.max(0, Math.floor(minX / 5) * 5)
  const yMax = Math.min(MAX_Y, Math.max(1, Math.ceil(maxY * 10 * 1.04) / 10))

  const series = groups.flatMap(g => g.items
    .filter(i => !hidden.has(i.id))
    .map(i => {
      const color = colorOf(tk, i, g.cls)
      return {
        id: i.id,
        name: names.value[i.id] || i.id,
        type: 'line',
        showSymbol: false,
        symbolSize: 6,
        lineStyle: { width: 1.7, color },
        itemStyle: { color },
        emphasis: { focus: 'series', lineStyle: { width: 3 } },
        blur: { lineStyle: { opacity: 0.12 } },
        data: ttks[i.id].map(([x, y]) => [x * 100, y])
      }
    }))

  return {
    animation: false,
    grid: { top: 36, right: 24, bottom: 62, left: 12, containLabel: true },
    tooltip: {
      ...tooltip(tk),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: tk.muted, type: 'dashed' } },
      enterable: false,
      formatter: ps => {
        if (!ps?.length) return ''
        const rows = ps.filter(p => p.value?.[1] != null).sort((a, b) => a.value[1] - b.value[1])
        const top = rows.slice(0, 8)
        const rest = rows.length - top.length
        const head = `<div style="font-weight:650;margin-bottom:5px">${t('hr.rate')} ${ps[0].value[0].toFixed(1)}%</div>`
        const body = top.map(p => `<div style="display:flex;align-items:center;gap:7px;margin:2px 0"><span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span><span style="flex:1;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span><b>${p.value[1].toFixed(2)}s</b></div>`).join('')
        return head + body + (rest > 0 ? `<div style="opacity:.55;margin-top:3px">+${rest}</div>` : '')
      }
    },
    xAxis: { ...axis(tk), type: 'value', min: xMin, max: 100, axisLabel: { ...axis(tk).axisLabel, formatter: '{value}%' }, name: t('hr.rate'), nameLocation: 'middle', nameGap: 28 },
    yAxis: { ...axis(tk), type: 'value', min: 0, max: yMax, axisLabel: { ...axis(tk).axisLabel, formatter: v => `${v}s` } },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
      { ...slider(tk), type: 'slider', xAxisIndex: 0, bottom: 6, height: 16, filterMode: 'none' }
    ],
    series
  }
}

const version = ref(0)
const { chart, render } = useChart(host, build, [version, names])

const refresh = () => { version.value++ }

const toggle = id => { hidden.has(id) ? hidden.delete(id) : hidden.add(id); refresh() }
const groupVisible = g => g.items.some(i => !hidden.has(i.id))
const toggleGroup = g => {
  const show = !groupVisible(g)
  for (const i of g.items) show ? hidden.delete(i.id) : hidden.add(i.id)
  refresh()
}
const showAll = () => { hidden.clear(); refresh() }

const focus = (id, on) => chart.value?.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesId: id })
const color = g => `var(${classOf(g.cls).color})`
</script>

<template>
  <div class="curve">
    <div class="card stage">
      <div ref="host" class="chart-host"></div>
      <span class="hint muted">{{ t('hr.hint') }}</span>
      <button class="btn reset" @click="render">{{ t('hr.reset') }}</button>
    </div>

    <aside class="card legend">
      <header>
        <span class="label">{{ t('hr.groups') }}</span>
        <button v-if="hidden.size" class="btn" @click="showAll">{{ t('hr.showAll') }}</button>
      </header>
      <div class="scroll">
        <section v-for="g in groups" :key="g.key" :style="{ '--dot': color(g) }">
          <button class="gh" :aria-pressed="groupVisible(g)" @click="toggleGroup(g)">
            <i class="dot"></i>{{ clsName(g.cls) }}<small>{{ g.items.length }}</small>
          </button>
          <ul>
            <li
              v-for="i in g.items"
              :key="i.id"
              :class="{ off: hidden.has(i.id) }"
              @click="toggle(i.id)"
              @mouseenter="focus(i.id, true)"
              @mouseleave="focus(i.id, false)"
            >
              <i class="sw" :style="{ background: swatch(i, g.cls) }"></i>
              <span>{{ names[i.id] }}</span>
            </li>
          </ul>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.curve {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 248px;
  gap: 12px;
  height: 100%;
}

.stage {
  position: relative;
  padding: 8px 10px;
}

.hint {
  position: absolute;
  top: 9px;
  left: 16px;
  font-size: 11px;
  pointer-events: none;
}

.reset {
  position: absolute;
  top: 6px;
  right: 10px;
  height: 26px;
}

.legend {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.legend header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 38px;
  padding: 0 10px 0 14px;
  border-bottom: 1px solid var(--line);
}

.legend .btn {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}

.scroll {
  flex: 1;
  min-height: 0;
  padding: 4px 6px 10px;
  overflow: auto;
}

.gh {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 30px;
  padding: 0 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: 12.5px;
  font-weight: 650;
  text-align: left;
}

.gh:hover {
  background: var(--hover);
}

.gh[aria-pressed='false'] {
  color: var(--text-3);
}

.gh[aria-pressed='false'] .dot {
  opacity: 0.35;
}

.gh small {
  margin-left: auto;
  color: var(--text-3);
  font-weight: 400;
}

ul {
  margin: 0 0 4px;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px 3px 22px;
  border-radius: 6px;
  color: var(--text-2);
  font-size: 12px;
  cursor: pointer;
}

li:hover {
  background: var(--hover);
  color: var(--text);
}

li.off {
  opacity: 0.38;
  text-decoration: line-through;
}

li span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sw {
  flex-shrink: 0;
  width: 14px;
  height: 3px;
  border-radius: 2px;
}

@media (max-width: 900px), (max-height: 560px) {
  .curve {
    grid-template-columns: 1fr;
    height: auto;
  }

  .stage {
    height: 460px;
  }

  .legend {
    max-height: 360px;
  }
}
</style>
