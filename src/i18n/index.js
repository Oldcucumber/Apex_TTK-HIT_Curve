import { store } from '../store.js'
import { AMMO_EN, classOf } from '../data/meta.js'
import dict from './ui.js'

/** Translate a UI key for the active language. */
export const t = (key, vars) => {
  let s = dict[store.lang]?.[key] ?? dict.cn[key] ?? key
  if (vars) for (const k of Object.keys(vars)) s = s.replace(`{${k}}`, vars[k])
  return s
}

export const isEn = () => store.lang === 'en'
export const clsName = key => (isEn() ? classOf(key)?.en ?? key : key)
export const ammoName = key => (isEn() ? AMMO_EN[key] ?? key : key)
