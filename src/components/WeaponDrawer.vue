<script setup>
import { computed } from 'vue'
import { ARMORS, classOf } from '../data/meta.js'
import { METRIC, display, value } from '../data/metrics.js'
import { store, toggleCompare, MAX_COMPARE } from '../store.js'
import { ammoName, clsName, t } from '../i18n/index.js'

const props = defineProps({ weapon: { type: Object, required: true } })
defineEmits(['close'])

const w = computed(() => props.weapon)
const color = computed(() => `var(${classOf(w.value.cls)?.color})`)
const inCompare = computed(() => store.compare.includes(w.value.id))
const full = computed(() => !inCompare.value && store.compare.length >= MAX_COMPARE)

const raw = (path, fallback) => w.value.raw?.[path] ?? fallback
const num = v => (v == null ? '—' : v)

const armorRows = computed(() => {
  const times = ARMORS.map(a => w.value.ttk[a.key])
  const max = Math.max(0.01, ...times.filter(v => v != null))
  return ARMORS.map(a => ({
    ...a,
    ttk: raw(`ttk.${a.key}`, w.value.ttk[a.key] == null ? '—' : w.value.ttk[a.key].toFixed(2)),
    shots: raw(`bullets.${a.key}`, num(w.value.bullets[a.key])),
    pct: w.value.ttk[a.key] == null ? 0 : Math.max(3, (w.value.ttk[a.key] / max) * 100)
  }))
})

const meters = computed(() =>
  ['recoil', 'hipAcc', 'handling'].map(k => ({
    key: k,
    label: store.lang === 'en' ? METRIC[k].en : METRIC[k].cn,
    v: value(w.value, METRIC[k]),
    text: display(w.value, METRIC[k])
  }))
)

const zones = computed(() => [
  { label: t('dr.chest'), dmg: raw('dmg.chest', num(w.value.dmg.chest)), mul: '1.00x' },
  { label: t('dr.leg'), dmg: raw('dmg.leg', num(w.value.dmg.leg)), mul: raw('dmg.legMul', w.value.dmg.legMul != null ? `${w.value.dmg.legMul.toFixed(2)}x` : '') },
  { label: t('dr.head'), dmg: raw('dmg.head', num(w.value.dmg.head)), mul: raw('dmg.headMul', w.value.dmg.headMul != null ? `${w.value.dmg.headMul.toFixed(2)}x` : '') }
])

const mags = computed(() => [
  { label: t('dr.none'), v: raw('mag.none', num(w.value.mag.none)) },
  ...ARMORS.slice(0, 3).map(a => ({ label: store.lang === 'en' ? a.en : a.cn.replace('甲', '弹匣'), v: raw(`mag.${a.key}`, num(w.value.mag[a.key])) }))
])

const big = computed(() => [
  { key: 'ttk', m: METRIC.ttk },
  { key: 'ttm', m: METRIC.ttm },
  { key: 'dps', m: METRIC.dps }
].map(x => ({ label: store.lang === 'en' ? x.m.en : x.m.cn, v: display(w.value, x.m, store.armor), unit: x.m.unit })))
</script>

<template>
  <aside class="card drawer" :style="{ '--dot': color }">
    <header>
      <div class="titles">
        <div class="meta">
          <i class="dot"></i>
          <span>{{ clsName(w.cls) }}</span>
          <span class="tag">{{ ammoName(w.ammo) }}</span>
        </div>
        <h2>{{ w.base }}</h2>
        <p v-if="w.state" class="muted">{{ w.state }}</p>
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
          <span class="a-name">{{ store.lang === 'en' ? a.en : a.cn }}</span>
          <span class="track"><span :style="{ width: `${a.pct}%`, background: `var(${a.color})` }"></span></span>
          <span class="num a-val">{{ a.ttk }}<small>s</small></span>
          <span class="num muted a-shots">{{ a.shots }}{{ t('dr.shots') }}</span>
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
        <span>{{ store.lang === 'en' ? METRIC.tolerance.en : METRIC.tolerance.cn }}</span><b class="num">{{ display(w, METRIC.tolerance) }}</b>
        <span>{{ store.lang === 'en' ? METRIC.magDmg.en : METRIC.magDmg.cn }}</span><b class="num">{{ display(w, METRIC.magDmg) }}</b>
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
        <span>{{ store.lang === 'en' ? METRIC.reloadEmpty.en : METRIC.reloadEmpty.cn }}</span><b class="num">{{ display(w, METRIC.reloadEmpty, store.armor, { unit: true }) }}</b>
        <span>{{ store.lang === 'en' ? METRIC.reloadTac.en : METRIC.reloadTac.cn }}</span><b class="num">{{ display(w, METRIC.reloadTac, store.armor, { unit: true }) }}</b>
        <span>{{ store.lang === 'en' ? METRIC.run.en : METRIC.run.cn }}</span><b class="num">{{ display(w, METRIC.run) }}</b>
        <span>{{ store.lang === 'en' ? METRIC.hip.en : METRIC.hip.cn }}</span><b class="num">{{ display(w, METRIC.hip) }}</b>
        <span>{{ store.lang === 'en' ? METRIC.ads.en : METRIC.ads.cn }}</span><b class="num">{{ display(w, METRIC.ads) }}</b>
      </div>

      <template v-if="w.note">
        <h3 class="label">{{ t('dr.note') }}</h3>
        <p class="note">{{ w.note }}</p>
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
  grid-template-columns: 8px 34px minmax(0, 1fr) 52px 34px;
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
  grid-template-columns: 74px minmax(0, 1fr) 38px;
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
</style>
