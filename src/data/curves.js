// Hit-rate curves, derived from the 2.0 sheet (purple armor).
//
// To kill you need N hits (bullets.purple). At hit rate p you fire about N / p shots,
// so with k misses: hit rate = N / (N + k) and TTK = TTK(100%) + k × shot interval.
// k runs until the purple magazine is empty (or the hit rate drops below MIN_HIT).
// The interval is the weapon's steady fire rate (60 / RPM; for spin-up weapons the top
// of the RPM range); when the sheet has no RPM (burst weapons) it is TTK / (N - 1).
import { CLASSES } from './meta.js'
import { isAbility, rawText, weapons } from './metrics.js'

const MIN_HIT = 10 // %

const steadyInterval = w => {
  const raw = rawText(w, 'rpm')
  if (raw) {
    const nums = raw.match(/\d+(\.\d+)?/g)?.map(Number)
    if (nums?.length) return 60 / Math.max(...nums)
  }
  if (typeof w.rpm === 'number' && w.rpm > 0) return 60 / w.rpm
  const n = w.bullets.purple
  return n > 1 ? w.ttk.purple / (n - 1) : null
}

/** Why a weapon has no curve (null when it has one). */
const skipReason = w => {
  if (isAbility(w)) return 'ability'
  if (w.ttk.purple == null || w.bullets.purple == null) return 'no-ttk'
  // ranges (damage grows with distance, L-STAR heat) have no single shots-to-kill
  if (rawText(w, 'bullets.purple') || rawText(w, 'ttk.purple')) return 'range'
  if (typeof w.mag.purple !== 'number') return 'no-mag'
  return null
}

const build = w => {
  const n = w.bullets.purple
  const ttk = w.ttk.purple
  const iv = steadyInterval(w)
  const points = [[100, round(ttk)]]
  if (iv) {
    for (let k = 1; n + k <= w.mag.purple; k++) {
      const hit = (n / (n + k)) * 100
      if (hit < MIN_HIT) break
      points.push([round(hit), round(ttk + k * iv)])
    }
  }
  return { id: w.key, cls: w.cls, weapon: w, points }
}

const round = v => Math.round(v * 10000) / 10000

export const curves = weapons.filter(w => !skipReason(w)).map(build)
export const skipped = weapons.filter(w => skipReason(w)).map(w => ({ weapon: w, reason: skipReason(w) }))
export const curveById = new Map(curves.map(c => [c.id, c]))

/** Curves grouped by class, in the app-wide class order. */
export const curveGroups = CLASSES
  .map(c => ({ cls: c.key, items: curves.filter(w => w.cls === c.key) }))
  .filter(g => g.items.length)

/** TTK at a given hit rate (%): the curve is a step function, use the nearest sample at or below. */
export const ttkAt = (curve, pct) => {
  for (const [x, y] of curve.points) if (x <= pct) return y
  return null
}

/**
 * Self-test JSON saved by earlier versions used these ids. Mapped to the closest
 * current sheet entry; ids for weapons no longer in the sheet are left out.
 */
export const LEGACY_IDS = {
  R99: 'r-99-smg',
  CAR: 'c-a-r-smg-care-package',
  PB: 'prowler-burst-pdw-5-round-burst',
  Auto_PB: 'prowler-burst-pdw-full-auto',
  Volt: 'volt-smg-standard',
  Volt_Ballistic: 'volt-smg-ballistic',
  Alternator: 'alternator-smg-standard',
  P2020_Dual: 'dual-p2020-standard',
  RE45: 're-45-auto',
  Mozambique_Dual: 'dual-mozambique-purple-bolt',
  Eva_8: 'eva-8-auto-purple-bolt',
  Peacekeeper: 'peacekeeper-purple-bolt',
  Mastiff: 'mastiff-shotgun-purple-bolt',
  HAVOC: 'havoc-rifle',
  VK47: 'vk-47-flatline-standard',
  R301: 'r-301-carbine',
  NemesisB: 'nemesis-burst-ar-cold-start-full-rate-after-6-shots',
  NemesisB_warp: 'nemesis-burst-ar-at-max-fire-rate',
  Hemlok_Triple: 'hemlok-burst-ar-standard',
  Devotion: 'devotion-lmg-no-turbocharger-cold-start',
  Devotion_warp: 'devotion-lmg-turbocharger-cold-start',
  Spitfire: 'm600-spitfire-standard',
  Rampage: 'rampage-lmg-standard',
  Rampage_warp: 'rampage-lmg-revved-up',
  Triple: 'triple-take-ads',
  G7: 'g7-scout-single-fire-sniper-stock',
  3030: '30-30-repeater-care-package-standard',
  '3030_Charged': '30-30-repeater-care-package-first-shot-fully-charged',
  Bocek: 'bocek-bow-full-draw',
  Wingman: 'wingman-default',
  Longbow: 'longbow-dmr-standard',
  Sentinel: 'sentinel-standard',
  Sentinel_Charged: 'sentinel-charged'
}
