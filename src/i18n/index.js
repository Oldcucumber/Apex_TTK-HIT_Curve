// Tiny i18n layer: per-locale message files, {var} interpolation, zh fallback,
// plus helpers that localise values coming from the data files.
import { store } from '../store.js'
import zh from './locales/zh.js'
import en from './locales/en.js'

const messages = { zh, en }
export const LOCALES = ['zh', 'en']

const fill = (s, vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s)

/** Translate a UI key for the active locale (falls back to zh, then to the key). */
export const t = (key, vars) => {
  const s = messages[store.lang]?.[key] ?? zh[key]
  if (s == null) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`)
    return key
  }
  return fill(s, vars)
}

export const isEn = () => store.lang === 'en'

/** Pick the active locale from a { zh, en } object. */
export const tr = obj => (obj == null ? '' : obj[store.lang] ?? obj.zh)

export const clsName = key => t(`class.${key}`)
export const ammoName = key => t(`ammo.${key}`)
export const armorName = key => t(`armor.${key}`)
export const metricName = m => t(`metric.${m.key}`)

/** { base, state } of a weapon record (sheet or curve data) in the active locale. */
export const nameOf = w => {
  const n = w.name[store.lang] ?? w.name.zh
  return Array.isArray(n) ? { base: n[0], state: n[1] } : { base: n, state: '' }
}

export const fullName = w => {
  const { base, state } = nameOf(w)
  if (!state) return base
  return isEn() ? `${base} (${state})` : `${base}（${state}）`
}

export const shortName = (w, max = 16) => {
  const { base, state } = nameOf(w)
  const s = state ? `${base} · ${state}` : base
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

// Free-text cell values from the sheet ("打甲23 打肉26", "首发50 后续125", "待测")
const RAW_EN = [
  [/待测/g, 'TBD'],
  [/打甲/g, 'armor '],
  [/打肉/g, '/ flesh '],
  [/首发/g, 'first '],
  [/后续/g, '/ then '],
  [/s\/发/g, 's/shot']
]
export const localizeRaw = text => (isEn() ? RAW_EN.reduce((s, [re, rep]) => s.replace(re, rep), text) : text)

export const seasonLabel = meta => (meta.season ? t('season', { s: meta.season, split: t(`split.${meta.split}`) }) : '')
