// Hit-rate curves: purple-armor TTK sampled at the hit rates where the number
// of shots needed changes. points = [[hit rate %, TTK s], ...] from 100% down.
import data from './curves.json'
import { CLASSES } from './meta.js'

export const curves = data.weapons
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
