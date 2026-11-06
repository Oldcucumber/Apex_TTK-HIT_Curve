// Hit-rate curves, derived from the 2.0 sheet (purple armor).
//
// To kill you need N hits (bullets.purple). At hit rate p you fire about N / p shots,
// so with k misses: hit rate = N / (N + k) and TTK = TTK(100%) + k × shot interval.
// k runs until the purple magazine is empty (or the hit rate drops below MIN_HIT).
// Burst weapons use their average interval (the sheet's averaged RPM).
import { CLASSES } from './meta.js'
import { isAbility, rawText, weapons } from './metrics.js'
import { curvePoints } from './curveMath.js'
export { ttkAt } from './curveMath.js'

/** Why a weapon has no curve (null when it has one). */
const skipReason = w => {
  if (isAbility(w)) return 'ability'
  if (w.ttk.purple == null || w.bullets.purple == null) return 'no-ttk'
  // ranges (damage grows with distance, L-STAR heat) have no single shots-to-kill
  if (rawText(w, 'bullets.purple') || rawText(w, 'ttk.purple')) return 'range'
  if (typeof w.mag.purple !== 'number') return 'no-mag'
  return null
}

const build = w => ({ id: w.key, cls: w.cls, weapon: w, points: curvePoints(w) })

export const curves = weapons.filter(w => !skipReason(w)).map(build)
export const skipped = weapons.filter(w => skipReason(w)).map(w => ({ weapon: w, reason: skipReason(w) }))
export const curveById = new Map(curves.map(c => [c.id, c]))

/** Curves grouped by class, in the app-wide class order. */
export const curveGroups = CLASSES
  .map(c => ({ cls: c.key, items: curves.filter(w => w.cls === c.key) }))
  .filter(g => g.items.length)

/** Keys used by the S30 (数据表2.0) data, mapped to the current entry. */
export const KEY_ALIASES = {
  'devotion-lmg-spun-up-to-max-rate': 'devotion-lmg-max-fire-rate',
  'dual-mozambique-purple-bolt': 'dual-mozambique-care-package',
  'nemesis-burst-ar-at-max-fire-rate': 'nemesis-burst-ar-max-fire-rate',
  'eva-8-auto-double-tap-purple-bolt': 'eva-8-auto-disruptor-purple-bolt',
  'vk-47-flatline-standard': 'vk-47-flatline',
  'c-a-r-smg-care-package': 'c-a-r-smg',
  'l-star-emg-care-package': 'l-star-emg-out-of-care-package',
  'm600-spitfire-standard': 'm600-spitfire',
  'dual-p2020-standard': 'dual-p2020',
  'volt-smg-standard': 'volt-smg',
  'nemesis-burst-ar-turbocharger-cold-start-full-rate-after-2-shots': 'nemesis-burst-ar-turbocharger-cold-start',
  'nemesis-burst-ar-cold-start-full-rate-after-6-shots': 'nemesis-burst-ar-cold-start',
  'wingman-default': 'wingman-single',
  'alternator-smg-standard': 'alternator-smg',
  'hemlok-burst-ar-standard': 'hemlok-burst-ar-3-round-burst',
  'rampage-lmg-standard': 'rampage-lmg',
  'g7-scout-single-fire-sniper-stock': 'g7-scout-single-fire-damaged-sniper-stock',
  'g7-scout-care-package-single-fire': 'g7-scout-single-fire',
  'bocek-bow-charged-full-draw-sniper-stock': 'bocek-bow-charged-full-draw-damaged-sniper-stock',
  'bocek-bow-full-draw-sniper-stock': 'bocek-bow-full-draw-damaged-sniper-stock',
  'triple-take-hipfire-faster-rate-sniper-stock': 'triple-take-hipfire-damaged-sniper-stock',
  'triple-take-hipfire-faster-rate': 'triple-take-hipfire',
  'triple-take-ads-sniper-stock': 'triple-take-ads-damaged-sniper-stock',
  'longbow-dmr-standard-sniper-stock': 'longbow-dmr-damaged-sniper-stock',
  'longbow-dmr-standard': 'longbow-dmr',
  '30-30-repeater-care-package-standard': '30-30-repeater-care-package',
  'sentinel-charged-sniper-stock': 'sentinel-charged-damaged-sniper-stock',
  'sentinel-standard-sniper-stock': 'sentinel-damaged-sniper-stock',
  'sentinel-standard': 'sentinel',
  'charge-rifle-damage-grows-with-range-burst-mode-sniper-stock': 'charge-rifle-burst-damaged-sniper-stock',
  'charge-rifle-damage-grows-with-range-burst-mode': 'charge-rifle-burst',
  'charge-rifle-damage-grows-with-range-standard-mode-sniper-stock': 'charge-rifle-damaged-sniper-stock',
  'charge-rifle-damage-grows-with-range-standard-mode': 'charge-rifle'
}

/**
 * Self-test JSON saved by the first versions used these ids. Mapped to the closest
 * current sheet entry; ids for weapons no longer in the sheet are left out.
 */
export const LEGACY_IDS = {
  R99: 'r-99-smg',
  CAR: 'c-a-r-smg',
  PB: 'prowler-burst-pdw-5-round-burst',
  Volt: 'volt-smg',
  Volt_Ballistic: 'volt-smg-ballistic',
  Alternator: 'alternator-smg',
  P2020_Dual: 'dual-p2020',
  RE45: 're-45-auto',
  Mozambique_Dual: 'dual-mozambique-care-package',
  Eva_8: 'eva-8-auto-purple-bolt',
  Peacekeeper: 'peacekeeper-purple-bolt',
  Mastiff: 'mastiff-shotgun-purple-bolt',
  HAVOC: 'havoc-rifle',
  VK47: 'vk-47-flatline',
  R301: 'r-301-carbine',
  NemesisB: 'nemesis-burst-ar-cold-start',
  NemesisB_warp: 'nemesis-burst-ar-max-fire-rate',
  Hemlok_Triple: 'hemlok-burst-ar-3-round-burst',
  Devotion: 'devotion-lmg-no-turbocharger-cold-start',
  Devotion_warp: 'devotion-lmg-turbocharger-cold-start',
  Spitfire: 'm600-spitfire',
  Rampage: 'rampage-lmg',
  Rampage_warp: 'rampage-lmg-revved-up',
  Triple: 'triple-take-ads',
  G7: 'g7-scout-single-fire-damaged-sniper-stock',
  3030: '30-30-repeater-care-package',
  '3030_Charged': '30-30-repeater-care-package-first-shot-fully-charged',
  Bocek: 'bocek-bow-full-draw',
  Wingman: 'wingman-single',
  Longbow: 'longbow-dmr',
  Sentinel: 'sentinel',
  Sentinel_Charged: 'sentinel-charged',
  ...KEY_ALIASES
}
