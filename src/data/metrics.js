// Metric catalogue shared by the table, charts and compare view.
// `path` addresses a field of a weapon record; `$` is replaced by the selected armor tier.
// dir: which direction is better ('low' | 'high').
import { weapons } from './weapons.js'

export const METRICS = [
  { key: 'ttk', group: 'combat', cn: 'TTK', en: 'TTK', unit: 's', dec: 2, dir: 'low', path: 'ttk.$', armor: true },
  { key: 'bullets', group: 'combat', cn: '击杀子弹数', en: 'Shots to kill', unit: '', dec: 0, dir: 'low', path: 'bullets.$', armor: true },
  { key: 'chest', group: 'combat', cn: '单发伤害', en: 'Damage / shot', unit: '', dec: 0, dir: 'high', path: 'dmg.chest' },
  { key: 'head', group: 'combat', cn: '爆头伤害', en: 'Headshot dmg', unit: '', dec: 0, dir: 'high', path: 'dmg.head' },
  { key: 'rpm', group: 'combat', cn: '射速 RPM', en: 'RPM', unit: '', dec: 0, dir: 'high', path: 'rpm' },
  { key: 'dps', group: 'combat', cn: 'DPS', en: 'DPS', unit: '', dec: 0, dir: 'high', path: 'dps' },
  { key: 'mag', group: 'tolerance', cn: '弹匣(紫)', en: 'Mag (purple)', unit: '', dec: 0, dir: 'high', path: 'mag.purple' },
  { key: 'magDmg', group: 'tolerance', cn: '弹匣总伤', en: 'Mag damage', unit: '', dec: 0, dir: 'high', path: 'magDmg' },
  { key: 'tolerance', group: 'tolerance', cn: '容错率', en: 'Tolerance', unit: '%', dec: 0, dir: 'high', path: 'tolerance', pct: true },
  { key: 'ttm', group: 'tolerance', cn: 'TTM', en: 'TTM', unit: 's', dec: 2, dir: 'high', path: 'ttm' },
  { key: 'reloadEmpty', group: 'handling', cn: '空仓换弹', en: 'Empty reload', unit: 's', dec: 2, dir: 'low', path: 'reloadEmpty' },
  { key: 'reloadTac', group: 'handling', cn: '战术换弹', en: 'Tactical reload', unit: 's', dec: 2, dir: 'low', path: 'reloadTac' },
  { key: 'run', group: 'handling', cn: '跑速', en: 'Run speed', unit: '%', dec: 0, dir: 'high', path: 'speed.run', pct: true },
  { key: 'hip', group: 'handling', cn: '腰射移速', en: 'Hipfire speed', unit: '%', dec: 0, dir: 'high', path: 'speed.hip', pct: true },
  { key: 'ads', group: 'handling', cn: '开镜移速', en: 'ADS speed', unit: '%', dec: 0, dir: 'high', path: 'speed.ads', pct: true },
  { key: 'recoil', group: 'handling', cn: '后坐力控制', en: 'Recoil control', unit: '', dec: 0, dir: 'high', path: 'recoil' },
  { key: 'hipAcc', group: 'handling', cn: '腰射精准', en: 'Hipfire accuracy', unit: '', dec: 0, dir: 'high', path: 'hipAcc' },
  { key: 'handling', group: 'handling', cn: '武器操控', en: 'Handling', unit: '', dec: 0, dir: 'high', path: 'handling' }
]

export const METRIC = Object.fromEntries(METRICS.map(m => [m.key, m]))

const resolve = (m, armor) => (m.armor ? m.path.replace('$', armor) : m.path)
const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

export const metricLabel = (m, lang) => (lang === 'en' ? m.en : m.cn)

/** Numeric value (or null when the sheet has none). */
export const value = (w, m, armor = 'purple') => {
  const v = pick(w, resolve(m, armor))
  return typeof v === 'number' ? v : null
}

/** Text for display: the sheet's original text for ranges/notes, otherwise a formatted number. */
export const display = (w, m, armor = 'purple', { unit = false } = {}) => {
  const path = resolve(m, armor)
  const raw = w.raw?.[path]
  if (raw) return raw === '待测' ? raw : raw.replace(/\s*\d+m~\d+m$/, '')
  return formatValue(value(w, m, armor), m, { unit })
}

/** Format a raw number the way a metric is displayed. */
export const formatValue = (v, m, { unit = false } = {}) => {
  if (v == null) return '—'
  if (m.pct) return `${(v * 100).toFixed(m.dec)}%`
  const num = v.toFixed(m.dec)
  return unit ? `${num}${m.unit}` : num
}

export const extent = (m, armor = 'purple', list = weapons) => {
  const vals = list.map(w => value(w, m, armor)).filter(v => v != null)
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1]
}

const columnCache = new Map()
/** All non-null values of a metric (cached; the dataset is static). */
const column = (m, armor) => {
  const key = `${m.key}:${m.armor ? armor : ''}`
  if (!columnCache.has(key)) columnCache.set(key, weapons.map(x => value(x, m, armor)).filter(x => x != null))
  return columnCache.get(key)
}

/** Percentile (0-100, higher is better) of a weapon on a metric across all weapons. */
export const percentile = (w, m, armor = 'purple') => {
  const v = value(w, m, armor)
  if (v == null) return null
  const vals = column(m, armor)
  const worse = vals.filter(x => (m.dir === 'low' ? x > v : x < v)).length
  const same = vals.filter(x => x === v).length
  return Math.round(((worse + (same - 1) / 2) / Math.max(1, vals.length - 1)) * 100)
}

/** Median of a metric over a list of weapons. */
export const median = (m, armor = 'purple', list = weapons) => {
  const vals = list.map(w => value(w, m, armor)).filter(v => v != null).sort((a, b) => a - b)
  if (!vals.length) return null
  const mid = vals.length >> 1
  return vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
}

export const fullName = w => (w.state ? `${w.base}（${w.state}）` : w.base)

export const shortName = (w, max = 16) => {
  const s = w.state ? `${w.base} · ${w.state}` : w.base
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
