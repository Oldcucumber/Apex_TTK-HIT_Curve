<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { ARMORS, classVar } from '../data/meta.js'
import { METRIC, cell, display, value } from '../data/metrics.js'
import { store, toggleCompare, MAX_COMPARE } from '../store.js'
import { ammoName, armorName, clsName, metricName, nameOf, t, tr } from '../i18n/index.js'

const props = defineProps({
  weapon: { type: Object, required: true },
  // phones: render as a bottom sheet over the page
  sheet: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const w = computed(() => props.weapon)
const name = computed(() => nameOf(w.value))
const color = computed(() => classVar(w.value.cls))
const inCompare = computed(() => store.compare.includes(w.value.id))
const full = computed(() => !inCompare.value && store.compare.length >= MAX_COMPARE)

const sec = v => v.toFixed(2)
const mul = v => `${v.toFixed(2)}x`

const armorRows = computed(() => {
  const times = ARMORS.map(a => w.value.ttk[a.key]).filter(v => v != null)
  const max = Math.max(0.01, ...times)
  return ARMORS.map(a => ({
    ...a,
    ttk: cell(w.value, `ttk.${a.key}`, sec),
    shots: cell(w.value, `bullets.${a.key}`),
    pct: w.value.ttk[a.key] == null ? 0 : Math.max(3, (w.value.ttk[a.key] / max) * 100)
  }))
})

const zones = computed(() => [
  { label: t('dr.chest'), dmg: cell(w.value, 'dmg.chest'), mul: '1.00x' },
  { label: t('dr.leg'), dmg: cell(w.value, 'dmg.leg'), mul: cell(w.value, 'dmg.legMul', mul) },
  { label: t('dr.head'), dmg: cell(w.value, 'dmg.head'), mul: cell(w.value, 'dmg.headMul', mul) }
])

const mags = computed(() => [
  { label: t('dr.none'), v: cell(w.value, 'mag.none') },
  ...['white', 'blue', 'purple'].map(k => ({ label: t(`dr.mag.${k}`), v: cell(w.value, `mag.${k}`) }))
])

const big = computed(() => ['ttk', 'ttm', 'dps'].map(k => ({
  label: metricName(METRIC[k]),
  v: display(w.value, METRIC[k], store.armor),
  unit: METRIC[k].unit
})))

const meters = computed(() => ['recoil', 'hipAcc', 'handling'].map(k => ({
  key: k,
  label: metricName(METRIC[k]),
  v: value(w.value, METRIC[k]),
  text: display(w.value, METRIC[k])
})))

const kv = keys => keys.map(k => ({ k, label: metricName(METRIC[k]), v: display(w.value, METRIC[k], store.armor, { unit: true }) }))

const onKey = e => { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="sheet" class="scrim" @click="$emit('close')"></div>
  <aside class="card drawer" :class="{ sheet }" :style="{ '--dot': color }" role="dialog" :aria-label="name.base">
    <header>
      <div class="titles">
        <div class="meta">
          <i class="dot"></i>
          <span>{{ clsName(w.cls) }}</span>
          <span class="tag">{{ ammoName(w.ammo) }}</span>
        </div>
        <h2>{{ name.base }}</h2>
        <p v-if="name.state" class="muted">{{ name.state }}</p>
      </div>
      <button class="icon-btn" :aria-label="t('dr.close')" @click="$emit('close')">
        <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </header>

    <div class="scroll">
      <div class="big">
        <div v-for="b in big" :key="b.label">
          <span class="label">{{ b.label }}</span>
          <strong class="num">{{ b.v }}<small v-if="b.unit && b.v !== '—'">{{ b.unit }}</small></strong>
        </div>
      </div>

      <h3 class="label">{{ t('dr.armor') }}</h3>
      <ul class="armor">
        <li v-for="a in armorRows" :key="a.key" :class="{ cur: a.key === store.armor }">
          <i class="dot" :style="{ '--dot': `var(${a.color})` }"></i>
          <span class="a-name">{{ armorName(a.key) }}</span>
          <span class="track"><span :style="{ width: `${a.pct}%`, background: `var(${a.color})` }"></span></span>
          <span class="num a-val">{{ a.ttk }}<small>s</small></span>
          <span class="num muted a-shots">{{ a.shots }} {{ t('dr.shots') }}</span>
        </li>
      </ul>

      <h3 class="label">{{ t('dr.damage') }}</h3>
      <div class="zones">
        <div v-for="z in zones" :key="z.label">
          <span class="muted">{{ z.label }}</span>
          <b class="num">{{ z.dmg }}</b>
          <small class="muted">{{ z.mul }}</small>
        </div>
      </div>

      <h3 class="label">{{ t('dr.mag') }}</h3>
      <div class="mags">
        <div v-for="m in mags" :key="m.label">
          <span class="muted">{{ m.label }}</span>
          <b class="num">{{ m.v }}</b>
        </div>
      </div>

      <h3 class="label">{{ t('dr.tol') }}</h3>
      <div class="kv">
        <template v-for="r in kv(['tolerance', 'magDmg'])" :key="r.k"><span>{{ r.label }}</span><b class="num">{{ r.v }}</b></template>
      </div>

      <h3 class="label">{{ t('dr.handling') }}</h3>
      <ul class="meters">
        <li v-for="m in meters" :key="m.key">
          <span>{{ m.label }}</span>
          <span class="track"><span :style="{ width: `${m.v ?? 0}%` }"></span></span>
          <b class="num">{{ m.text }}</b>
        </li>
      </ul>
      <div class="kv">
        <template v-for="r in kv(['reloadEmpty', 'reloadTac', 'run', 'hip', 'ads'])" :key="r.k"><span>{{ r.label }}</span><b class="num">{{ r.v }}</b></template>
      </div>

      <template v-if="w.note">
        <h3 class="label">{{ t('dr.note') }}</h3>
        <p class="note">{{ tr(w.note) }}</p>
      </template>
    </div>

    <footer>
      <button class="btn" :class="{ primary: !inCompare }" :disabled="full" @click="toggleCompare(w.id)">
        {{ inCompare ? t('dr.remove') : t('dr.add') }}
      </button>
    </footer>
  </aside>
</template>

<style scoped>
.drawer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 10px 10px 16px;
  border-bottom: 1px solid var(--line);
}

.meta {
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--text-2);
  font-size: 12px;
}

h2 {
  margin: 6px 0 0;
  font-size: 18px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

header p {
  margin: 2px 0 0;
  font-size: 12px;
}

.scroll {
  flex: 1;
  min-height: 0;
  padding: 4px 16px 14px;
  overflow: auto;
}

h3.label {
  margin: 16px 0 8px;
}

.big {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.big > div {
  padding: 9px 10px;
  border-radius: 10px;
  background: var(--panel-2);
}

.big .label {
  display: block;
  font-size: 10px;
}

.big strong {
  display: block;
  margin-top: 2px;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: -0.02em;
}

small {
  margin-left: 2px;
  color: var(--text-3);
  font-size: 11px;
  font-weight: 400;
}

.armor,
.meters {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.armor li {
  display: grid;
  grid-template-columns: 8px 50px minmax(0, 1fr) 52px 58px;
  white-space: nowrap;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}

.armor li.cur {
  color: var(--text);
  font-weight: 600;
}

.a-val {
  text-align: right;
}

.a-shots {
  font-size: 11px;
  text-align: right;
}

.track {
  display: block;
  height: 5px;
  overflow: hidden;
  border-radius: 4px;
  background: var(--panel-2);
}

.track > span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--dot);
}

.zones,
.mags {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.mags {
  grid-template-columns: repeat(4, 1fr);
}

.zones > div,
.mags > div {
  display: grid;
  gap: 1px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 9px;
}

.zones b,
.mags b {
  font-size: 14px;
  font-weight: 650;
}

.kv {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 5px 12px;
  margin-top: 8px;
}

.kv span {
  color: var(--text-3);
}

.kv b {
  font-weight: 600;
  text-align: right;
}

.meters li {
  display: grid;
  grid-template-columns: minmax(70px, max-content) minmax(0, 1fr) 38px;
  align-items: center;
  gap: 8px;
  color: var(--text-2);
}

.meters b {
  text-align: right;
  font-weight: 600;
}

.note {
  margin: 0;
  padding: 8px 10px;
  border-radius: 9px;
  background: var(--panel-2);
  color: var(--text-2);
  font-size: 12px;
}

footer {
  padding: 10px 16px 14px;
  border-top: 1px solid var(--line);
}

footer .btn {
  width: 100%;
  height: 34px;
}
.scrim {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.38);
}

.drawer.sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 61;
  max-height: 86vh;
  border-radius: 18px 18px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.drawer.sheet header::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  width: 36px;
  height: 4px;
  margin-left: -18px;
  border-radius: 4px;
  background: var(--line-2);
}

.drawer.sheet header {
  position: relative;
  padding-top: 18px;
}
</style>
