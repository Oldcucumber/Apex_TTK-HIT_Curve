<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { curveGroups, curves, ttkAt } from '../../data/curves.js'
import { classVar } from '../../data/meta.js'
import { store } from '../../store.js'
import { clsName, fullName, shortName, t } from '../../i18n/index.js'
import Seg from '../../components/Seg.vue'
import { useChart } from '../../charts/useChart.js'
import { axis, distinctPalette, shade, slider, tokens, tooltip } from '../../charts/theme.js'

const MAX_Y = 10
// Up to this many curves each get their own hue, markers and an end label;
// beyond it lines are coloured by class so the families stay readable.
const FEW = 12

const host = ref(null)
// 52 curves at once are unreadable: start with the fastest weapon of each class
const suggested = new Set(curveGroups.map(g => [...g.items].sort((a, b) => a.points[0][1] - b.points[0][1])[0].id))
const hidden = reactive(new Set(curves.filter(c => !suggested.has(c.id)).map(c => c.id)))
const query = ref('')
const legendOpen = ref(true) // phones: the ranking sits under the chart, keep it open

// "My hit rate": ranks every weapon (shown or not) by TTK at that hit rate
const rate = ref(50)
const TOP = 10
const tab = ref('top')
const tabOptions = computed(() => [
  { value: 'top', label: `Top ${TOP}` },
  { value: 'all', label: t('hr.all') }
])
const ranking = computed(() =>
  curves
    .map(c => ({ c, ttk: ttkAt(c, rate.value) }))
    .filter(r => r.ttk != null)
    .sort((a, b) => a.ttk - b.ttk)
    .slice(0, TOP)
)
const showOnly = ids => {
  const keep = new Set(ids)
  for (const c of curves) keep.has(c.id) ? hidden.delete(c.id) : hidden.add(c.id)
}
const showTop = () => showOnly(ranking.value.map(r => r.c.id))
const showSuggested = () => showOnly(suggested)
const rateLine = tk => ({
  silent: true,
  symbol: 'none',
  animation: false,
  lineStyle: { color: tk.accent, width: 1.5, type: 'solid', opacity: 0.9 },
  label: { formatter: `${rate.value}%`, color: tk.accent, fontSize: 11, fontWeight: 650, position: 'start', distance: 6 },
  data: [{ xAxis: rate.value }]
})

const visible = computed(() => curves.filter(c => !hidden.has(c.id)))
const few = computed(() => visible.value.length <= FEW)

const label = c => fullName(c.weapon)
const shortLabel = c => shortName(c.weapon, 18)

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

const LABEL_GAP = 15 // px between end labels

/**
 * Vertical nudges (px, positive = down) that keep the end labels at the 100% edge apart.
 * Curves that finish within a few hundredths of a second would otherwise print on top of
 * each other; each tight group is fanned out around its own centre, in curve order.
 */
const spreadLabels = (list, yMax) => {
  const plotH = Math.max(120, (host.value?.clientHeight || 600) - 14 - 62 - 24)
  const items = list
    .map(c => ({ id: c.id, px: (c.points[0][1] / yMax) * plotH })) // height above the axis
    .sort((a, b) => a.px - b.px)
  const groups = []
  for (const it of items) {
    let g = { items: [it], centre: it.px }
    const low = x => x.centre - ((x.items.length - 1) / 2) * LABEL_GAP
    const high = x => x.centre + ((x.items.length - 1) / 2) * LABEL_GAP
    while (groups.length && high(groups[groups.length - 1]) + LABEL_GAP > low(g)) {
      const prev = groups.pop()
      const merged = [...prev.items, ...g.items]
      g = { items: merged, centre: merged.reduce((s, x) => s + x.px, 0) / merged.length }
    }
    // keep the fan inside the plot
    const half = ((g.items.length - 1) / 2) * LABEL_GAP
    g.centre = Math.min(Math.max(g.centre, half + 6), plotH - half - 6)
    groups.push(g)
  }
  const out = new Map()
  for (const g of groups) {
    g.items.forEach((it, i) => out.set(it.id, -(g.centre + (i - (g.items.length - 1) / 2) * LABEL_GAP - it.px)))
  }
  return out
}

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
  const nudge = isFew && !mobile ? spreadLabels(list, yMax) : new Map()

  return {
    // a handful of curves draw in with an ease-out; dozens would only add noise
    animation: isFew,
    animationDuration: 620,
    animationEasing: 'cubicOut',
    animationDurationUpdate: 380,
    animationEasingUpdate: 'cubicInOut',
    grid: {
      top: 14,
      right: isFew && !mobile ? 168 : mobile ? 22 : 24,
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
    series: [{ id: '__rate', type: 'line', data: [], silent: true, markLine: rateLine(tk) }, ...list.map(c => {
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
          ? { show: true, formatter: () => shortLabel(c), color, fontSize: 12, fontWeight: 600, distance: 10, offset: [0, nudge.get(c.id) ?? 0] }
          : { show: false },
        emphasis: { focus: 'series', lineStyle: { width: 3.2 } },
        blur: { lineStyle: { opacity: 0.1 }, itemStyle: { opacity: 0.1 } },
        // ascending hit rate so the end label sits at the 100% edge where curves are compared
        data: [...c.points].reverse()
      }
    })]
  }
}

const { chart, render } = useChart(host, build, [visible, () => store.mobile])
// moving the slider only moves the marker (a full re-render would reset the zoom)
watch(rate, () => chart.value?.setOption({ series: [{ id: '__rate', markLine: rateLine(tokens()) }] }))

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
    .map(g => ({ ...g, items: g.items.filter(c => [...c.weapon.name.zh, ...c.weapon.name.en].join(' ').toLowerCase().includes(q)) }))
    .filter(g => g.items.length)
})

const focus = (id, on) => {
  if (!hidden.has(id)) chart.value?.dispatchAction({ type: on ? 'highlight' : 'downplay', seriesId: id })
}
</script>

<template>
  <div class="curve">
    <div class="card stage">
      <div class="rate-bar">
        <label class="rate">
          <span class="label">{{ t('hr.myRate') }}</span>
          <input v-model.number="rate" type="range" min="10" max="100" step="1" :style="{ '--p': `${((rate - 10) / 90) * 100}%` }">
          <b class="num">{{ rate }}%</b>
        </label>
        <button class="btn reset" @click="render">{{ t('hr.reset') }}</button>
      </div>
      <div class="plot">
        <div ref="host" class="chart-host"></div>
        <div v-if="!visible.length" class="empty cover">{{ t('hr.pickHint') }}</div>
      </div>
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
      <div class="tabs">
        <Seg v-model="tab" :options="tabOptions" />
      </div>
      <div v-if="tab === 'top'" class="scroll top">
        <p class="top-head muted">{{ t('hr.top') }} · <b class="num">{{ rate }}%</b></p>
        <TransitionGroup tag="ol" name="rank">
          <li
            v-for="(r, i) in ranking"
            :key="r.c.id"
            :class="{ off: hidden.has(r.c.id) }"
            @mouseenter="focus(r.c.id, true)"
            @mouseleave="focus(r.c.id, false)"
          >
            <button class="item rank" :aria-pressed="!hidden.has(r.c.id)" @click="toggle(r.c.id)">
              <em class="num">{{ i + 1 }}</em>
              <i class="sw" :style="{ background: colors.get(r.c.id) }"></i>
              <span>{{ label(r.c) }}</span>
              <b class="num">{{ r.ttk.toFixed(2) }}s</b>
            </button>
          </li>
        </TransitionGroup>
        <div class="top-acts">
          <button class="btn" @click="showTop">{{ t('hr.showTop') }}</button>
          <button class="btn" @click="showSuggested">{{ t('hr.default') }}</button>
        </div>
      </div>
      <div v-if="tab === 'all'" class="search-row">
        <input v-model="query" class="field" type="search" :placeholder="t('hr.search')">
      </div>
      <div v-if="tab === 'all'" class="scroll">
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
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 12px 8px;
}

.rate-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 2px 4px 6px;
}

.rate {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.rate .label {
  flex-shrink: 0;
}

.rate b {
  flex-shrink: 0;
  min-width: 44px;
  color: var(--accent);
  font-size: 15px;
  font-weight: 650;
}

.rate input {
  flex: 1;
  min-width: 0;
  max-width: 420px;
  height: 18px;
  margin: 0;
  background: none;
  appearance: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.rate input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent) var(--p), var(--track) var(--p));
}

.rate input::-moz-range-track {
  height: 4px;
  border-radius: 4px;
  background: linear-gradient(90deg, var(--accent) var(--p), var(--track) var(--p));
}

.rate input::-webkit-slider-thumb {
  width: 16px;
  height: 16px;
  margin-top: -6px;
  border: 0;
  border-radius: 50%;
  background: var(--raised);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent), 0 2px 6px rgba(0, 0, 0, 0.18);
  appearance: none;
  -webkit-appearance: none;
}

.rate input::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 50%;
  background: var(--raised);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 55%, transparent), 0 2px 6px rgba(0, 0, 0, 0.18);
}

.reset {
  flex-shrink: 0;
  height: 26px;
}

.plot {
  position: relative;
  flex: 1;
  min-height: 0;
}

.cover {
  position: absolute;
  inset: 10px;
  height: auto;
  pointer-events: none;
}

.tabs {
  padding: 10px 10px 2px;
}

.tabs .seg {
  display: flex;
}

.tabs .seg :deep(button) {
  flex: 1;
  justify-content: center;
}

.top-head {
  margin: 8px 8px 6px;
  font-size: 12px;
}

.top-head b {
  color: var(--accent);
}

ol {
  position: relative;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* rows glide to their new rank as the slider moves */
.rank-move {
  transition: transform 460ms var(--ease-out);
}

.rank-enter-active {
  transition: opacity 320ms var(--ease-out), transform 420ms var(--ease-out);
}

.rank-leave-active {
  position: absolute;
  right: 0;
  left: 0;
  transition: opacity 160ms ease-in;
}

.rank-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.rank-leave-to {
  opacity: 0;
}

.sw {
  transition: background-color 260ms var(--ease-out);
}

.rate input::-webkit-slider-thumb {
  transition: transform 260ms var(--ease-spring);
}

.rate input:active::-webkit-slider-thumb {
  transform: scale(1.2);
}

.item.rank {
  padding: 6px 8px;
}

.rank em {
  width: 16px;
  color: var(--text-3);
  font-size: 11.5px;
  font-style: normal;
  text-align: right;
}

.rank span {
  flex: 1;
}

.rank b {
  color: var(--text);
  font-weight: 650;
}

li.off .rank .sw {
  background: var(--line-2) !important;
}

/* in the ranking a hidden curve is still a result: dim it, do not strike it out */
li.off .item.rank {
  opacity: 0.62;
}

li.off .item.rank span {
  text-decoration: none;
}

.top-acts {
  display: flex;
  gap: 6px;
  padding: 10px 8px 2px;
}

.top-acts .btn {
  flex: 1;
  height: 28px;
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
    height: 62vh;
    padding: 10px 6px 4px;
  }

  .rate .label {
    display: none;
  }

  .legend-title {
    cursor: pointer;
  }

  .legend:not(.open) .search-row,
  .legend:not(.open) .tabs,
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
