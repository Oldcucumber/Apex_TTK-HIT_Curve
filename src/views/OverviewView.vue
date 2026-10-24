<script setup>
import { computed, ref } from 'vue'
import { ARMORS, classVar } from '../data/meta.js'
import { METRIC, display, extent, isAbility, isApprox, value, weaponById, weapons } from '../data/metrics.js'
import { store, toggleCompare, MAX_COMPARE } from '../store.js'
import { ammoName, clsName, fullName, metricName, nameOf, t } from '../i18n/index.js'
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

// Search text covers both languages, so "R-99" or "冲锋枪" work whatever the UI language
const haystack = new Map(
  weapons.map(w => [w.id, [...w.name.zh, ...w.name.en, w.cls, w.ammo].join(' ').toLowerCase()])
)

const rows = computed(() => {
  const q = query.value.trim().toLowerCase()
  const list = weapons.filter(w => {
    if (classes.value.length && !classes.value.includes(w.cls)) return false
    if (!q) return true
    return haystack.get(w.id).includes(q) || `${clsName(w.cls)} ${ammoName(w.ammo)}`.toLowerCase().includes(q)
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
    if (key === 'name') return fullName(a).localeCompare(fullName(b), store.lang) * mul
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

// Leaders of the current selection, shown as tiles above the table
const LEADERS = ['ttk', 'dps', 'ttm', 'reloadEmpty']
const leaders = computed(() =>
  LEADERS.map(key => {
    const m = METRIC[key]
    const ranked = rows.value
      .map(w => ({ w, v: value(w, m, store.armor) }))
      // abilities are not weapon picks, and ranged values are not a definite lead
      .filter(x => x.v != null && !isAbility(x.w) && !isApprox(x.w, m, store.armor))
      .sort((a, b) => (m.dir === 'low' ? a.v - b.v : b.v - a.v))
    const [first, second] = ranked
    return {
      key,
      label: t(`ov.lead.${key}`),
      m,
      w: first?.w,
      text: first ? display(first.w, m, store.armor, { unit: true }) : '—',
      gap: first && second ? Math.abs(first.v - second.v) : null,
      second: second?.w
    }
  })
)

const gapText = l => {
  if (l.gap == null) return ''
  // a gap that rounds to zero at display precision reads as a tie
  if (Number((l.m.pct ? l.gap * 100 : l.gap).toFixed(l.m.dec)) === 0) return t('ov.lead.tie', { n: nameOf(l.second).base })
  const v = l.m.pct ? `${(l.gap * 100).toFixed(0)}%` : `${l.gap.toFixed(l.m.dec)}${l.m.unit}`
  return t('ov.lead.gap', { v })
}

const selected = computed(() => weaponById.get(store.selected) ?? null)
const select = w => { store.selected = store.selected === w.id ? null : w.id }
const color = w => classVar(w.cls)
// On phones the sorted metric is shown next to each name instead of a wide table
const sortMetric = computed(() => METRIC[sort.value.key] ?? METRIC.ttk)
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

    <div class="leaders">
      <button
        v-for="l in leaders"
        :key="l.key"
        class="card lead"
        :class="{ on: l.w && store.selected === l.w.id }"
        :style="l.w ? { '--dot': color(l.w) } : null"
        :disabled="!l.w"
        @click="l.w && select(l.w)"
      >
        <span class="lead-label">
          {{ l.label }}
          <i v-if="l.m.armor" class="dot armor-dot" :style="{ '--dot': armorColor }"></i>
        </span>
        <strong class="num">{{ l.text }}</strong>
        <span v-if="l.w" class="lead-name"><i class="dot"></i><b>{{ nameOf(l.w).base }}</b><em v-if="nameOf(l.w).state">{{ nameOf(l.w).state }}</em></span>
        <span class="lead-gap muted">{{ gapText(l) }}</span>
      </button>
    </div>

    <div class="body" :class="{ withDrawer: selected }">
      <div v-if="store.mobile" class="card mlist-card">
        <div class="msort">
          <span class="label">{{ t('ov.sortBy') }}</span>
          <select :value="sort.key" class="field" @change="sortBy($event.target.value)">
            <option v-for="m in columns" :key="m.key" :value="m.key">{{ metricName(m) }}</option>
          </select>
        </div>
        <ul class="mlist">
          <li
            v-for="(w, i) in rows"
            :key="w.id"
            :class="{ active: store.selected === w.id }"
            :style="{ '--dot': color(w) }"
            @click="select(w)"
          >
            <span class="m-idx muted num">{{ i + 1 }}</span>
            <i class="dot"></i>
            <span class="m-name">
              <b>{{ nameOf(w).base }}</b>
              <small>{{ [nameOf(w).state, clsName(w.cls)].filter(Boolean).join(' · ') }}</small>
            </span>
            <span class="m-val num">
              <span class="bar" :style="{ '--w': `${barWidth(w, sortMetric)}%` }"></span>
              <b>{{ display(w, sortMetric, store.armor, { unit: true }) }}</b>
            </span>
          </li>
        </ul>
        <div v-if="!rows.length" class="empty">{{ t('ov.empty') }}</div>
      </div>

      <div v-else class="card table-card">
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
                  :title="t(`ex.better.${m.dir}`)"
                  :aria-sort="ariaSort(m.key)"
                  @click="sortBy(m.key)"
                >
                  <i v-if="m.armor" class="dot armor-dot" :style="{ '--dot': armorColor }"></i>{{ metricName(m) }}<i class="arrow"></i>
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
                  <b>{{ nameOf(w).base }}</b>
                  <span v-if="nameOf(w).state" class="muted">{{ nameOf(w).state }}</span>
                </td>
                <td class="c-cls">{{ clsName(w.cls) }}</td>
                <td class="c-ammo"><span class="tag">{{ ammoName(w.ammo) }}</span></td>
                <td v-for="m in columns" :key="m.key" class="c-num" :class="{ sorted: m.key === sort.key }">
                  <span v-if="m.key === sort.key" class="bar" :style="{ '--w': `${barWidth(w, m)}%` }"></span>
                  <span class="val" :class="{ nil: value(w, m, store.armor) == null }">{{ display(w, m, store.armor) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!rows.length" class="empty">{{ t('ov.empty') }}</div>
        </div>
      </div>

      <WeaponDrawer v-if="selected" :weapon="selected" :sheet="store.mobile" @close="store.selected = null" />
    </div>
  </section>
</template>

<style scoped>
.search {
  width: 190px;
}

.leaders {
  display: grid;
  flex-shrink: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.lead {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    'label label'
    'value value'
    'name gap';
  align-items: baseline;
  gap: 2px 10px;
  padding: 11px 14px 12px;
  color: var(--text);
  text-align: left;
  transition: border-color 140ms ease, transform 140ms ease;
}

.lead:hover:not(:disabled) {
  border-color: var(--line-2);
}

.lead.on {
  border-color: var(--dot);
}

.lead-label {
  grid-area: label;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-3);
  font-size: 12px;
}

.lead strong {
  grid-area: value;
  font-size: 24px;
  font-weight: 650;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.lead-name {
  grid-area: name;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}

.lead-name b {
  font-weight: 600;
}

.lead-name em {
  overflow: hidden;
  color: var(--text-3);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
}

.lead-gap {
  grid-area: gap;
  font-size: 11.5px;
  white-space: nowrap;
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
  width: 30%;
  max-width: 0;
  min-width: 190px;
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

/* keep th sticky: only body cells are positioned (for the in-cell bar) */
th.c-num,
td.c-num {
  width: 96px;
  min-width: 86px;
  text-align: right;
}

td.c-num {
  position: relative;
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
    color-mix(in srgb, var(--dot) 24%, transparent) var(--w),
    transparent var(--w)
  );
  pointer-events: none;
}

.val {
  position: relative;
}

td.sorted .val {
  font-weight: 650;
}

.val.nil {
  color: var(--text-3);
}

@media (max-height: 700px) {
  .lead-gap,
  .lead-name em {
    display: none;
  }

  .lead {
    padding: 8px 12px;
  }

  .lead strong {
    font-size: 20px;
  }
}

@media (max-width: 900px), (max-height: 560px) {
  .leaders {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .lead-gap {
    display: none;
  }

  .body.withDrawer {
    grid-template-columns: minmax(0, 1fr);
  }

  .table-card {
    max-height: 70vh;
  }
}
.mlist-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.msort {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--line);
}

.mlist {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mlist li {
  display: grid;
  grid-template-columns: 22px 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 52px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--grid);
}

.mlist li.active {
  background: color-mix(in srgb, var(--dot) 10%, transparent);
}

.m-idx {
  font-size: 12px;
  text-align: right;
}

.m-name {
  display: grid;
  min-width: 0;
  line-height: 1.3;
}

.m-name b,
.m-name small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-name b {
  font-weight: 600;
}

.m-name small {
  color: var(--text-3);
  font-size: 12px;
}

.m-val {
  position: relative;
  min-width: 84px;
  padding: 4px 8px;
  text-align: right;
}

.m-val .bar {
  inset: 2px 0;
}

.m-val b {
  position: relative;
  font-weight: 650;
}

@media (max-width: 760px) {
  .toolbar {
    flex-wrap: wrap;
  }

  .toolbar .grow,
  .count {
    display: none;
  }

  .search {
    flex: 1;
    min-width: 0;
    width: auto;
  }

  .leaders {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .lead {
    padding: 9px 11px;
  }

  .lead strong {
    font-size: 19px;
  }

  .lead-gap {
    display: none;
  }

  .body,
  .body.withDrawer {
    display: block;
  }
}

/* laptops: make room for the drawer by dropping the least useful columns */
@media (max-width: 1500px) {
  .count {
    display: none;
  }

  .withDrawer .c-ammo {
    display: none;
  }
}

@media (max-width: 1280px) {
  .withDrawer .c-cls {
    display: none;
  }
}
</style>
