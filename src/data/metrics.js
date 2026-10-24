// Weapon data (sheet "数据表2.0") and the metric catalogue shared by every view.
// `path` addresses a field of a weapon record; `$` is replaced by the selected armor tier.
// dir: which direction is better ('low' | 'high'). Labels live in the locale files (metric.<key>).
import data from './weapons.json'
import { localizeRaw } from '../i18n/index.js'

export const { meta, weapons } = data
export const weaponById = new Map(weapons.map(w => [w.id, w]))

export const METRICS = [
  { key: 'ttk', group: 'combat', unit: 's', dec: 2, dir: 'low', path: 'ttk.$', armor: true },
  { key: 'bullets', group: 'combat', unit: '', dec: 0, dir: 'low', path: 'bullets.$', armor: true },
  { key: 'chest', group: 'combat', unit: '', dec: 0, dir: 'high', path: 'dmg.chest' },
  { key: 'head', group: 'combat', unit: '', dec: 0, dir: 'high', path: 'dmg.head' },
  { key: 'rpm', group: 'combat', unit: '', dec: 0, dir: 'high', path: 'rpm' },
  { key: 'dps', group: 'combat', unit: '', dec: 0, dir: 'high', path: 'dps' },
  { key: 'mag', group: 'tolerance', unit: '', dec: 0, dir: 'high', path: 'mag.purple' },
  { key: 'magDmg', group: 'tolerance', unit: '', dec: 0, dir: 'high', path: 'magDmg' },
  { key: 'tolerance', group: 'tolerance', unit: '%', dec: 0, dir: 'high', path: 'tolerance', pct: true },
  { key: 'ttm', group: 'tolerance', unit: 's', dec: 2, dir: 'high', path: 'ttm' },
  { key: 'reloadEmpty', group: 'handling', unit: 's', dec: 2, dir: 'low', path: 'reloadEmpty' },
  { key: 'reloadTac', group: 'handling', unit: 's', dec: 2, dir: 'low', path: 'reloadTac' },
  { key: 'run', group: 'handling', unit: '%', dec: 0, dir: 'high', path: 'speed.run', pct: true },
  { key: 'hip', group: 'handling', unit: '%', dec: 0, dir: 'high', path: 'speed.hip', pct: true },
  { key: 'ads', group: 'handling', unit: '%', dec: 0, dir: 'high', path: 'speed.ads', pct: true },
  { key: 'recoil', group: 'handling', unit: '', dec: 0, dir: 'high', path: 'recoil' },
  { key: 'hipAcc', group: 'handling', unit: '', dec: 0, dir: 'high', path: 'hipAcc' },
  { key: 'handling', group: 'handling', unit: '', dec: 0, dir: 'high', path: 'handling' }
]

export const METRIC = Object.fromEntries(METRICS.map(m => [m.key, m]))
export const GROUPS = ['combat', 'tolerance', 'handling']

const resolve = (m, armor) => (m.armor ? m.path.replace('$', armor) : m.path)
const pick = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

/** Numeric value (or null when the sheet has none). */
export const value = (w, m, armor = 'purple') => {
  const v = pick(w, resolve(m, armor))
  return typeof v === 'number' ? v : null
}

/** Original sheet text for cells that are ranges / notes rather than a single number. */
export const rawText = (w, path) => w.raw?.[path]

/** True when the cell is a range or annotated value (not a definite single number). */
export const isApprox = (w, m, armor = 'purple') => rawText(w, resolve(m, armor)) != null

/** Format a raw number the way a metric is displayed. */
export const formatValue = (v, m, { unit = false } = {}) => {
  if (v == null) return '—'
  if (m.pct) return `${(v * 100).toFixed(m.dec)}%`
  const num = v.toFixed(m.dec)
  return unit ? `${num}${m.unit}` : num
}

/** Text for display: the sheet's original text for ranges/notes, otherwise a formatted number. */
export const display = (w, m, armor = 'purple', opts) => {
  const raw = rawText(w, resolve(m, armor))
  if (raw) return localizeRaw(raw.replace(/\s*\d+m~\d+m$/, ''))
  return formatValue(value(w, m, armor), m, opts)
}

/** Format any sheet cell by path (used for cells that are not metrics, e.g. damage zones). */
export const cell = (w, path, fmt = v => String(v)) => {
  const raw = rawText(w, path)
  if (raw) return localizeRaw(raw.replace(/\s*\d+m~\d+m$/, ''))
  const v = pick(w, path)
  return v == null ? '—' : fmt(v)
}

export const extent = (m, armor = 'purple', list = weapons) => {
  const vals = list.map(w => value(w, m, armor)).filter(v => v != null)
  return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 1]
}

/** Sort comparator putting the better value first (nulls last). */
export const byBest = (m, armor) => (a, b) => {
  const va = value(a, m, armor)
  const vb = value(b, m, armor)
  if (va == null) return vb == null ? 0 : 1
  if (vb == null) return -1
  return m.dir === 'low' ? va - vb : vb - va
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

/** Abilities (ultimates) are in the sheet for reference but are not weapon picks. */
export const isAbility = w => w.ammo === '技能'
