<script setup>
import { computed, ref } from 'vue'
import { weapons } from '../data/weapons.js'
import { CLASSES, classOf } from '../data/meta.js'
import { METRICS, METRIC, display, fullName, metricLabel, percentile, value } from '../data/metrics.js'
import { store, toggleCompare, MAX_COMPARE } from '../store.js'
import { clsName, t } from '../i18n/index.js'
import { useChart } from '../charts/useChart.js'
import { FONT, tooltip } from '../charts/theme.js'

const SLOT_VARS = ['--k1', '--k2', '--k3', '--k4']
const AXES = [
  { id: 'ttk', metric: 'ttk' },
  { id: 'ttm', metric: 'ttm' },
  { id: 'dps', metric: 'dps' },
  { id: 'reload', metric: 'reloadEmpty' },
  { id: 'ads', metric: 'ads' },
  { id: 'recoil', metric: 'recoil' },
  { id: 'hipAcc', metric: 'hipAcc' }
]

const query = ref('')
const host = ref(null)

const chosen = computed(() => store.compare.map(id => weapons.find(w => w.id === id)).filter(Boolean))
const slotColor = i => `var(${SLOT_VARS[i]})`
const full = computed(() => store.compare.length >= MAX_COMPARE)

const list = computed(() => {
  const q = query.value.trim().toLowerCase()
  const order = Object.fromEntries(CLASSES.map((c, i) => [c.key, i]))
  return weapons
    .filter(w => !q || `${fullName(w)} ${w.cls} ${clsName(w.cls)}`.toLowerCase().includes(q))
    .sort((a, b) => order[a.cls] - order[b.cls] || a.id - b.id)
})

const rows = computed(() => {
  const rowsOut = []
  for (const g of ['combat', 'tolerance', 'handling']) {
    rowsOut.push({ group: g })
    for (const m of METRICS.filter(x => x.group === g)) {
      const vals = chosen.value.map(w => value(w, m, store.armor))
      const valid = vals.filter(v => v != null)
      const best = valid.length > 1 ? (m.dir === 'low' ? Math.min(...valid) : Math.max(...valid)) : null
      rowsOut.push({
        m,
        cells: chosen.value.map((w, i) => ({
          text: display(w, m, store.armor),
          best: best != null && vals[i] === best && Math.min(...valid) !== Math.max(...valid)
        }))
      })
    }
  }
  return rowsOut
})

const build = tk => {
  const slots = SLOT_VARS.map(v => getComputedStyle(document.documentElement).getPropertyValue(v).trim())
  return {
    animationDuration: 250,
    tooltip: { ...tooltip(tk), trigger: 'item' },
    radar: {
      indicator: AXES.map(a => ({ name: t(`cp.ax.${a.id}`), max: 100 })),
      radius: '66%',
      center: ['50%', '52%'],
      splitNumber: 4,
      alignTicks: false,
      axisName: { color: tk.soft, fontSize: 12, fontFamily: FONT },
      axisLine: { lineStyle: { color: tk.line } },
      splitLine: { lineStyle: { color: tk.line } },
      splitArea: { show: false }
    },
    series: [{
      type: 'radar',
      symbolSize: 5,
      data: chosen.value.map((w, i) => ({
        name: fullName(w),
        value: AXES.map(a => percentile(w, METRIC[a.metric], store.armor) ?? 0),
        itemStyle: { color: slots[i] },
        lineStyle: { color: slots[i], width: 2 },
        areaStyle: { color: slots[i], opacity: 0.1 }
      }))
    }]
  }
}

useChart(host, build, [chosen, () => store.armor])
const clear = () => { store.compare.splice(0) }
</script>

<template>
  <section class="view compare">
    <aside class="card picker">
      <header>
        <b>{{ t('cp.title') }}</b>
        <button v-if="chosen.length" class="btn" @click="clear">{{ t('cp.clear') }}</button>
      </header>

      <ul class="chosen">
        <li v-for="(w, i) in chosen" :key="w.id" :style="{ '--slot': slotColor(i) }">
          <i class="swatch"></i>
          <span class="nm"><b>{{ w.base }}</b><small v-if="w.state">{{ w.state }}</small></span>
          <button class="icon-btn" :aria-label="t('dr.remove')" @click="toggleCompare(w.id)">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </li>
        <li v-if="!chosen.length" class="muted ph">{{ t('cp.pick', { n: MAX_COMPARE }) }}</li>
      </ul>

      <input v-model="query" class="field" type="search" :placeholder="t('cp.search')">

      <ul class="list">
        <li
          v-for="w in list"
          :key="w.id"
          :class="{ on: store.compare.includes(w.id), off: full && !store.compare.includes(w.id) }"
          :style="{ '--dot': `var(${classOf(w.cls)?.color})` }"
          :title="full && !store.compare.includes(w.id) ? t('cp.full', { n: MAX_COMPARE }) : ''"
          @click="toggleCompare(w.id)"
        >
          <i class="dot"></i>
          <span class="nm"><b>{{ w.base }}</b><small v-if="w.state">{{ w.state }}</small></span>
          <span class="num muted">{{ display(w, METRIC.ttk, store.armor) }}s</span>
        </li>
      </ul>
    </aside>

    <div class="card radar">
      <h3 class="label">{{ t('cp.radar') }}</h3>
      <div class="radar-host"><div ref="host" class="chart-host"></div></div>
      <div v-if="!chosen.length" class="empty cover">{{ t('cp.empty') }}</div>
    </div>

    <div class="card detail">
      <h3 class="label">{{ t('cp.table') }}</h3>
      <div v-if="chosen.length" class="scroll">
        <table>
          <thead>
            <tr>
              <th></th>
              <th v-for="(w, i) in chosen" :key="w.id" :style="{ '--slot': slotColor(i) }">
                <i class="swatch"></i>{{ w.base }}
                <small v-if="w.state">{{ w.state }}</small>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in rows" :key="r.group || r.m.key">
              <tr v-if="r.group" class="grp"><td :colspan="chosen.length + 1">{{ t(`preset.${r.group}`) }}</td></tr>
              <tr v-else>
                <td class="k">{{ metricLabel(r.m, store.lang) }}</td>
                <td v-for="(c, i) in r.cells" :key="i" class="num" :class="{ best: c.best }" :title="c.best ? t('cp.best') : ''">{{ c.text }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">{{ t('cp.empty') }}</div>
    </div>
  </section>
</template>

<style scoped>
.compare {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr) minmax(0, 1.15fr);
  grid-template-rows: minmax(0, 1fr);
  gap: 12px;
}

.picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  overflow: hidden;
}

.picker header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chosen {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chosen li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 4px 5px 10px;
  border: 1px solid var(--slot);
  border-radius: 9px;
  background: color-mix(in srgb, var(--slot) 8%, transparent);
}

.chosen li.ph {
  border: 1px dashed var(--line-2);
  background: none;
  padding: 8px 10px;
}

.chosen .icon-btn {
  width: 24px;
  height: 24px;
  margin-left: auto;
}

.swatch {
  display: inline-block;
  flex-shrink: 0;
  width: 9px;
  height: 9px;
  margin-right: 5px;
  border-radius: 3px;
  background: var(--slot);
}

.chosen .swatch {
  margin: 0;
}

.nm {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.25;
}

.nm b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

small {
  overflow: hidden;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list {
  flex: 1;
  min-height: 0;
  margin: 0 -4px;
  padding: 0 4px;
  overflow: auto;
  list-style: none;
}

.list li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 8px;
  cursor: pointer;
}

.list li:hover {
  background: var(--hover);
}

.list li.on {
  background: color-mix(in srgb, var(--ink) 9%, transparent);
}

.list li.off {
  opacity: 0.4;
  cursor: not-allowed;
}

.list .num {
  margin-left: auto;
  font-size: 11.5px;
}

.radar,
.detail {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 14px;
}

.radar h3,
.detail h3 {
  margin: 0 0 6px;
}

.radar-host {
  position: relative;
  flex: 1;
  min-height: 0;
}

.cover {
  position: absolute;
  inset: 40px 14px 14px;
  background: var(--panel);
}

.scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 4px 8px 8px;
  background: var(--panel);
  font-size: 12px;
  font-weight: 650;
  text-align: right;
  vertical-align: bottom;
}

th small {
  display: block;
  max-width: 130px;
  margin-left: auto;
}

td {
  padding: 3px 8px;
  border-top: 1px solid var(--grid);
  text-align: right;
  white-space: nowrap;
}

td.k {
  color: var(--text-2);
  text-align: left;
}

td.best {
  font-weight: 700;
  color: var(--text);
  background: color-mix(in srgb, var(--c-sniper) 13%, transparent);
}

tr.grp td {
  padding-top: 10px;
  border-top: 0;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-align: left;
  text-transform: uppercase;
}

@media (max-width: 1100px) {
  .compare {
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .detail {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px), (max-height: 560px) {
  .compare {
    grid-template-columns: 1fr;
    grid-template-rows: none;
  }

  .picker .list {
    max-height: 260px;
  }

  .radar-host {
    height: 360px;
    flex: none;
  }
}
</style>
