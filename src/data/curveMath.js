// Pure curve calculations; the public curve records and UI stay in curves.js.
const MIN_HIT = 10 // %
const round = v => Math.round(v * 10000) / 10000

const steadyInterval = w => {
  const raw = w.raw?.rpm
  if (raw) {
    const nums = raw.match(/\d+(\.\d+)?/g)?.map(Number)
    if (nums?.length) return 60 / Math.max(...nums)
  }
  if (typeof w.rpm === 'number' && w.rpm > 0) return 60 / w.rpm
  const n = w.bullets.purple
  return n > 1 ? w.ttk.purple / (n - 1) : null
}

// 数据表2.0, EVA-8 Double Tap: 0.14s within a pair, 0.56s to the next pair.
const doubleTapTime = shots => Math.floor((shots - 1) / 2) * (0.14 + 0.56) + ((shots - 1) % 2) * 0.14

export const curvePoints = w => {
  const n = w.bullets.purple
  const ttk = w.ttk.purple
  const iv = steadyInterval(w)
  const doubleTap = w.key === 'eva-8-auto-double-tap-purple-bolt'
  const points = [[100, round(ttk)]]
  if (iv || doubleTap) {
    for (let k = 1; n + k <= w.mag.purple; k++) {
      const hit = (n / (n + k)) * 100
      if (hit < MIN_HIT) break
      const extra = doubleTap ? doubleTapTime(n + k) - doubleTapTime(n) : k * iv
      points.push([round(hit), round(ttk + extra)])
    }
  }
  return points
}

/** Query by integer shot count, without using rounded chart coordinates as thresholds. */
export const ttkAt = (curve, pct) => {
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null
  const n = curve.weapon.bullets.purple
  const shots = (n * 100) / pct
  // Exact N / shots boundaries can acquire a few floating-point rounding bits.
  const count = Math.ceil(shots - Number.EPSILON * Math.max(1, shots) * 4)
  return curve.points[count - n]?.[1] ?? null
}
