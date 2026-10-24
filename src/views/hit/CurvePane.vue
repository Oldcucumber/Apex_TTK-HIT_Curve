<script setup>
import { computed, reactive, ref } from 'vue'
import { curveGroups, curves } from '../../data/curves.js'
import { classVar } from '../../data/meta.js'
import { store } from '../../store.js'
import { clsName, t, tr } from '../../i18n/index.js'
import { useChart } from '../../charts/useChart.js'
import { axis, distinctPalette, shade, slider, tokens, tooltip } from '../../charts/theme.js'

const MAX_Y = 10
// Up to this many curves each get their own hue, markers and an end label;
// beyond it lines are coloured by class so the families stay readable.
const FEW = 12

const host = ref(null)
const hidden = reactive(new Set())
const query = ref('')
const legendOpen = ref(false)

const visible = computed(() => curves.filter(c => !hidden.has(c.id)))
const few = computed(() => visible.value.length <= FEW)

const label = c => tr(c.name)
// "R99冲锋枪(紫扩27)" -> "R99冲锋枪": attachment notes are noise on an end label
const shortLabel = c => label(c).replace(/\s*[(（][^)）]*[)）]\s*$/, '')

/** Colour of every curve for the current theme and selection. */
const colors = computed(() => {
  void store.theme
  const tk = tokens()
  const map = new Map()
  if (few.value) {
    const pal = distinctPalette(store.theme)
    visible.value.forEach((c, i) => map.set(c.id, pal[i % pal.length]))
  }
  for (const g of curveGroups) {
    g.items.forEach((c, i) => {
      if (map.has(c.id)) return
      const k = g.items.length > 1 ? -0.25 + 0.55 * (i / (g.items.length - 1)) : 0
      map.set(c.id, shade(tk.cls[g.cls], store.theme === 'dark' ? -k : k))
    })
  }
  return map
})

const build = tk => {
  const list = visible.value
  let minX = 100
  let maxY = 0
  for (const c of list) {
    for (const [x, y] of c.points) {
      minX = Math.min(minX, x)
      if (y <= MAX_Y) maxY = Math.max(maxY, y)
    }
  }
  if (!list.length) { minX = 0; maxY = MAX_Y }
  const xMin = Math.max(0, Math.floor(minX / 5) * 5)
  // round the top up to a tick-friendly value so the last label does not collide
  const step = maxY > 4 ? 1 : 0.5
  const yMax = Math.min(MAX_Y, Math.max(1, Math.ceil((maxY * 1.03) / step) * step))
  const isFew = few.value
  const mobile = store.mobile

  return {
    animation: false,
    grid: {
      top: 36,
      right: isFew && !mobile ? 130 : mobile ? 22 : 24,
      bottom: mobile ? 34 : 62,
      left: mobile ? 4 : 12,
      containLabel: true
    },
    tooltip: {
      ...tooltip(tk),
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color: tk.muted, type: 'dashed' } },
      confine: true,
      formatter: ps => {
        if (!ps?.length) return ''
        const rows = ps.filter(p => p.value?.[1] != null).sort((a, b) => a.value[1] - b.value[1])
        const top = rows.slice(0, 8)
        const rest = rows.length - top.length
        const head = `<div style="font-weight:650;margin-bottom:5px">${t('hr.rate')} ${ps[0].value[0].toFixed(1)}%</div>`
        const body = top.map(p => `<div style="display:flex;align-items:center;gap:7px;margin:2px 0"><span style="width:10px;height:3px;border-radius:2px;background:${p.color}"></span><span style="flex:1;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.seriesName}</span><b>${p.value[1].toFixed(2)}s</b></div>`).join('')
        return head + body + (rest > 0 ? `<div style="opacity:.55;margin-top:3px">+${rest}</div>` : '')
      }
    },
    xAxis: { ...axis(tk), type: 'value', min: xMin, max: 100, axisLabel: { ...axis(tk).axisLabel, formatter: '{value}%' }, name: t('hr.rate'), nameLocation: 'middle', nameGap: 26 },
    yAxis: { ...axis(tk), type: 'value', min: 0, max: yMax, axisLabel: { ...axis(tk).axisLabel, formatter: v => `${v}s` } },
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'inside', yAxisIndex: 0, filterMode: 'none' },
      ...(mobile ? [] : [{ ...slider(tk), type: 'slider', xAxisIndex: 0, bottom: 6, height: 16, filterMode: 'none' }])
    ],
    series: list.map(c => {
      const color = colors.value.get(c.id)
      return {
        id: c.id,
        name: label(c),
        type: 'line',
        step: false,
        showSymbol: isFew,
        symbol: 'circle',
        symbolSize: isFew ? 5 : 4,
        lineStyle: { width: isFew ? 2.4 : 1.6, color },
        itemStyle: { color },
        endLabel: isFew && !mobile
          ? { show: true, formatter: () => shortLabel(c), color, fontSize: 12, fontWeight: 600, distance: 8 }
          : { show: false },
        labelLayout: { moveOverlap: 'shiftY' },
        emphasis: { focus: 'series', lineStyle: { width: 3.2 } },
        blur: { lineStyle: { opacity: 0.1 }, itemStyle: { opacity: 0.1 } },
        // ascending hit rate so the end label sits at the 100% edge where curves are compared
        data: [...c.points].reverse()
      }
    })
  }
}

const { chart, render } = useChart(host, build, [visible, () => store.mobile])

// ---- legend actions ----
const toggle = id => { hidden.has(id) ? hidden.delete(id) : hidden.add(id) }
const solo = id => {
  for (const c of curves) if (c.id !== id) hidden.add(c.id)
  hidden.delete(id)
}
const showAll = () => hidden.clear()
const hideAll = () => { for (const c of curves) hidden.add(c.id) }
const groupVisible = g => g.items.some(c => !hidden.has(c.id))
const toggleGroup = g => {
  const show = !groupVisible(g)
  for (const c of g.items) show ? hidden.delete(c.id) : hidden.add(c.id)
}

const filteredGroups = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return curveGroups
  return curveGroups
    .map(g => ({ ...g, items: g.items.filter(c => `${c.name.zh} ${c.name.en} ${c.id}`.toLowerCase().includes(q)) }))
    .filter(g => g.items.length)
})

const focus = (id, on) => {
  if (!hidden.has(id)) chart.value?.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesId: id })
}
</script>

<template>
  <div class="curve">
    <div class="card stage">
      <div ref="host" class="chart-host"></div>
      <span v-if="!store.mobile" class="hint muted">{{ t('hr.hint') }}</span>
      <button class="btn reset" @click="render">{{ t('hr.reset') }}</button>
      <div v-if="!visible.length" class="empty cover">{{ t('hr.pickHint') }}</div>
    </div>

    <aside class="card legend" :class="{ open: legendOpen }">
      <header>
        <button class="legend-title" @click="legendOpen = !legendOpen">
          <span class="label">{{ t('hr.legend') }}<i v-if="store.mobile" class="chev">{{ legendOpen ? '▴' : '▾' }}</i></span>
          <span class="muted num">{{ t('hr.visible', { n: visible.length, total: curves.length }) }}</span>
        </button>
        <div class="acts">
          <button class="btn" :disabled="!hidden.size" @click="showAll">{{ t('hr.showAll') }}</button>
          <button class="btn" :disabled="!visible.length" @click="hideAll">{{ t('hr.none') }}</button>
        </div>
      </header>
      <div class="search-row">
        <input v-model="query" class="field" type="search" :placeholder="t('hr.search')">
      </div>
      <div class="scroll">
        <section v-for="g in filteredGroups" :key="g.cls" :style="{ '--dot': classVar(g.cls) }">
          <button class="gh" :aria-pressed="groupVisible(g)" @click="toggleGroup(g)">
            <i class="dot"></i>{{ clsName(g.cls) }}<small>{{ g.items.filter(c => !hidden.has(c.id)).length }}/{{ g.items.length }}</small>
          </button>
          <ul>
            <li
              v-for="c in g.items"
              :key="c.id"
              :class="{ off: hidden.has(c.id) }"
              @mouseenter="focus(c.id, true)"
              @mouseleave="focus(c.id, false)"
            >
              <button class="item" :aria-pressed="!hidden.has(c.id)" @click="toggle(c.id)">
                <i class="sw" :style="{ background: colors.get(c.id) }"></i>
                <span>{{ label(c) }}</span>
              </button>
              <button class="solo" :title="t('hr.solo')" :aria-label="t('hr.solo')" @click="solo(c.id)">
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8" /></svg>
              </button>
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
  grid-template-columns: minmax(0, 1fr) 272px;
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
  font-size: 11.5px;
  pointer-events: none;
}

.reset {
  position: absolute;
  top: 6px;
  right: 10px;
  height: 26px;
}

.cover {
  position: absolute;
  inset: 40px 10px 10px;
  height: auto;
  pointer-events: none;
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
  gap: 8px;
  min-height: 42px;
  padding: 0 8px 0 14px;
  border-bottom: 1px solid var(--line);
}

.legend-title {
  display: grid;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  cursor: default;
}

.chev {
  margin-left: 6px;
  font-style: normal;
}

.legend-title .num {
  font-size: 11.5px;
}

.acts {
  display: flex;
  gap: 4px;
}

.acts .btn {
  height: 26px;
  padding: 0 8px;
  font-size: 12px;
}

.search-row {
  padding: 8px 10px 4px;
}

.search-row .field {
  width: 100%;
  height: 28px;
}

.scroll {
  flex: 1;
  min-height: 0;
  padding: 2px 6px 10px;
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
  border-radius: 6px;
}

li:hover {
  background: var(--hover);
}

.item {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 4px 4px 22px;
  border: 0;
  background: none;
  color: var(--text-2);
  font-size: 12.5px;
  text-align: left;
}

li:hover .item {
  color: var(--text);
}

li.off .item {
  opacity: 0.4;
}

li.off .item span {
  text-decoration: line-through;
}

.item span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sw {
  flex-shrink: 0;
  width: 16px;
  height: 4px;
  border-radius: 2px;
}

.solo {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 26px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--text-3);
  opacity: 0;
}

li:hover .solo,
.solo:focus-visible {
  opacity: 1;
}

.solo:hover {
  color: var(--text);
  background: var(--hover);
}

.solo svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
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
    max-height: 420px;
  }
}

@media (max-width: 760px) {
  .stage {
    height: 58vh;
    padding: 4px;
  }

  .reset {
    top: 4px;
    right: 6px;
  }

  .legend-title {
    cursor: pointer;
  }

  .legend:not(.open) .search-row,
  .legend:not(.open) .scroll {
    display: none;
  }

  .legend.open {
    max-height: none;
  }

  /* touch: the solo button is always visible */
  .solo {
    opacity: 1;
  }
}
</style>
