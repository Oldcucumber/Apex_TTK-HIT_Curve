<script setup>
import { computed, ref } from 'vue'
import { weapons } from '../data/weapons.js'
import { ARMORS, classOf } from '../data/meta.js'
import { METRIC, display, extent, fullName, metricLabel, value } from '../data/metrics.js'
import { store, toggleCompare, MAX_COMPARE } from '../store.js'
import { ammoName, clsName, t } from '../i18n/index.js'
import ClassFilter from '../components/ClassFilter.vue'
import Seg from '../components/Seg.vue'
import WeaponDrawer from '../components/WeaponDrawer.vue'

const PRESETS = {
  combat: ['chest', 'rpm', 'bullets', 'ttk', 'dps', 'mag'],
  tolerance: ['ttk', 'mag', 'magDmg', 'tolerance', 'ttm'],
  handling: ['reloadEmpty', 'reloadTac', 'run', 'hip', 'ads', 'recoil', 'hipAcc', 'handling']
}

const classes = ref([])
const query = ref('')
const preset = ref('combat')
const sort = ref({ key: 'ttk', dir: 'asc' })

const presetOptions = computed(() =>
  Object.keys(PRESETS).map(k => ({ value: k, label: t(`preset.${k}`) }))
)

const columns = computed(() => PRESETS[preset.value].map(k => METRIC[k]))

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = weapons.filter(w => {
    if (classes.value.length && !classes.value.includes(w.cls)) return false
    if (!q) return true
    return `${fullName(w)} ${w.cls} ${w.ammo} ${clsName(w.cls)} ${ammoName(w.ammo)}`.toLowerCase().includes(q)
  })
  const { key, dir } = sort.value
  const m = METRIC[key]
  const mul = dir === 'asc' ? 1 : -1
  return [...list].sort((a, b) => {
    if (m) {
      const va = value(a, m, store.armor)
      const vb = value(b, m, store.armor)
      if (va == null) return 1
      if (vb == null) return -1
      return (va - vb) * mul || a.id - b.id
    }
    if (key === 'name') return fullName(a).localeCompare(fullName(b), 'zh') * mul
    if (key === 'cls') return a.cls.localeCompare(b.cls, 'zh') * mul || a.id - b.id
    return (a.id - b.id) * mul
  })
})

const ranges = computed(() => Object.fromEntries(columns.value.map(m => [m.key, extent(m, store.armor)])))

const barWidth = (w, m) => {
  const v = value(w, m, store.armor)
  if (v == null) return 0
  const [lo, hi] = ranges.value[m.key]
  return hi === lo ? 100 : Math.max(4, ((v - lo) / (hi - lo)) * 100)
}

const sortBy = key => {
  const m = METRIC[key]
  const best = m ? (m.dir === 'low' ? 'asc' : 'desc') : 'asc'
  sort.value = sort.value.key === key
    ? { key, dir: sort.value.dir === 'asc' ? 'desc' : 'asc' }
    : { key, dir: best }
}

const ariaSort = key => (sort.value.key === key ? (sort.value.dir === 'asc' ? 'ascending' : 'descending') : 'none')

const selected = computed(() => weapons.find(w => w.id === store.selected) || null)
const select = w => { store.selected = store.selected === w.id ? null : w.id }
const color = w => `var(${classOf(w.cls)?.color})`
const inCompare = w => store.compare.includes(w.id)
const compareFull = computed(() => store.compare.length >= MAX_COMPARE)

const armorColor = computed(() => `var(${ARMORS.find(a => a.key === store.armor).color})`)
</script>

<template>
  <section class="view">
    <div class="toolbar">
      <ClassFilter v-model="classes" />
      <div class="grow"></div>
      <Seg v-model="preset" :options="presetOptions" />
      <input v-model="query" class="field search" type="search" :placeholder="t('ov.search')">
      <span class="muted num count">{{ t('ov.count', { n: rows.length }) }}</span>
    </div>

    <div class="body" :class="{ withDrawer: selected }">
      <div class="card table-card">
        <div class="scroll">
          <table>
            <thead>
              <tr>
                <th class="c-pick"></th>
                <th class="c-idx">#</th>
                <th class="c-name" :aria-sort="ariaSort('name')" @click="sortBy('name')">
                  {{ t('col.weapon') }}<i class="arrow"></i>
                </th>
                <th class="c-cls" :aria-sort="ariaSort('cls')" @click="sortBy('cls')">
                  {{ t('col.class') }}<i class="arrow"></i>
                </th>
                <th class="c-ammo">{{ t('col.ammo') }}</th>
                <th
                  v-for="m in columns"
                  :key="m.key"
                  class="c-num"
                  :aria-sort="ariaSort(m.key)"
                  @click="sortBy(m.key)"
                >
                  <i v-if="m.armor" class="dot armor-dot" :style="{ '--dot': armorColor }"></i>{{ metricLabel(m, store.lang) }}<i class="arrow"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(w, i) in rows"
                :key="w.id"
                :class="{ active: store.selected === w.id }"
                :style="{ '--dot': color(w) }"
                @click="select(w)"
              >
                <td class="c-pick">
                  <button
                    class="pick"
                    :class="{ on: inCompare(w) }"
                    :disabled="!inCompare(w) && compareFull"
                    :aria-pressed="inCompare(w)"
                    :aria-label="t('dr.add')"
                    @click.stop="toggleCompare(w.id)"
                  >
                    <svg viewBox="0 0 24 24"><path v-if="inCompare(w)" d="m5 12.5 4.5 4.5L19 7.5" /><path v-else d="M12 6v12M6 12h12" /></svg>
                  </button>
                </td>
                <td class="c-idx muted">{{ i + 1 }}</td>
                <td class="c-name">
                  <i class="dot"></i>
                  <b>{{ w.base }}</b>
                  <span v-if="w.state" class="muted">{{ w.state }}</span>
                </td>
                <td class="c-cls">{{ clsName(w.cls) }}</td>
                <td class="c-ammo"><span class="tag">{{ ammoName(w.ammo) }}</span></td>
                <td v-for="m in columns" :key="m.key" class="c-num">
                  <span class="bar" :style="{ '--w': `${barWidth(w, m)}%` }"></span>
                  <span class="val" :class="{ nil: value(w, m, store.armor) == null }">{{ display(w, m, store.armor) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!rows.length" class="empty">{{ t('ov.empty') }}</div>
        </div>
      </div>

      <WeaponDrawer v-if="selected" :weapon="selected" @close="store.selected = null" />
    </div>
  </section>
</template>

<style scoped>
.search {
  width: 190px;
}

.count {
  min-width: 56px;
  text-align: right;
}

.body {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  min-height: 0;
}

.body.withDrawer {
  grid-template-columns: minmax(0, 1fr) 340px;
}

.table-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scroll {
  flex: 1;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  height: 34px;
  padding: 0 10px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
  color: var(--text-3);
  font-size: 11.5px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

thead th:hover {
  color: var(--text);
}

thead th[aria-sort='ascending'],
thead th[aria-sort='descending'] {
  color: var(--text);
}

.armor-dot {
  width: 6px;
  height: 6px;
  margin-right: 5px;
  vertical-align: 1px;
}

.arrow {
  display: inline-block;
  width: 10px;
  margin-left: 3px;
  font-style: normal;
}

th[aria-sort='ascending'] .arrow::before {
  content: '↑';
}

th[aria-sort='descending'] .arrow::before {
  content: '↓';
}

tbody td {
  height: 31px;
  padding: 0 10px;
  border-bottom: 1px solid var(--grid);
  white-space: nowrap;
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover td {
  background: var(--hover);
}

tbody tr.active td {
  background: color-mix(in srgb, var(--dot) 9%, transparent);
}

tbody tr.active td:nth-child(2) {
  box-shadow: inset 2px 0 0 var(--dot);
}

.c-pick {
  width: 34px;
  padding-right: 0 !important;
}

.c-idx {
  width: 36px;
  text-align: right;
  font-size: 11.5px;
}

.c-name {
  max-width: 0;
  min-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.c-cls {
  width: 84px;
}

.c-ammo {
  width: 74px;
}

td.c-name {
  display: table-cell;
}

td.c-name .dot {
  margin-right: 8px;
  vertical-align: 0;
}

td.c-name b {
  font-weight: 600;
}

td.c-name span {
  margin-left: 7px;
  font-size: 12px;
}

.c-cls {
  color: var(--text-2);
}

.pick {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid var(--line-2);
  border-radius: 6px;
  background: transparent;
  color: var(--text-3);
  opacity: 0;
  transition: opacity 100ms ease;
}

tr:hover .pick,
.pick.on,
tr.active .pick {
  opacity: 1;
}

.pick svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pick:hover:not(:disabled) {
  border-color: var(--ink);
  color: var(--text);
}

.pick.on {
  border-color: var(--ink);
  background: var(--ink);
  color: var(--on-ink);
}

.pick:disabled {
  cursor: not-allowed;
  opacity: 0.25 !important;
}

th.c-num,
td.c-num {
  position: relative;
  width: 96px;
  min-width: 86px;
  text-align: right;
}

.bar {
  position: absolute;
  top: 6px;
  right: 6px;
  bottom: 6px;
  left: 6px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    color-mix(in srgb, var(--dot) 15%, transparent) var(--w),
    transparent var(--w)
  );
  pointer-events: none;
}

.val {
  position: relative;
}

.val.nil {
  color: var(--text-3);
}

@media (max-width: 900px), (max-height: 560px) {
  .body.withDrawer {
    grid-template-columns: minmax(0, 1fr);
  }

  .table-card {
    max-height: 70vh;
  }
}
</style>
