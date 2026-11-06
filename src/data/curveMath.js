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

// Burst timings measured in the sheet's notes (240 fps captures): shots per burst,
// interval within a burst, and the gap from a burst's last shot to the next burst.
export const BURSTS = {
  'dual-wingman-2-round-burst': { size: 2, within: 0.179, between: 0.354 },
  'hemlok-burst-ar-3-round-burst': { size: 3, within: 0.065, between: 0.251 },
  'prowler-burst-pdw-5-round-burst': { size: 5, within: 0.049, between: 0.228 }
}

/** Time from the first shot to the given shot (1-based) of a burst weapon. */
const burstTime = ({ size, within, between }, shots) =>
  Math.floor((shots - 1) / size) * ((size - 1) * within + between) + ((shots - 1) % size) * within

export const curvePoints = w => {
  const n = w.bullets.purple
  const ttk = w.ttk.purple
  const iv = steadyInterval(w)
  const burst = BURSTS[w.key]
  const points = [[100, round(ttk)]]
  if (iv || burst) {
    for (let k = 1; n + k <= w.mag.purple; k++) {
      const hit = (n / (n + k)) * 100
      if (hit < MIN_HIT) break
      const extra = burst ? burstTime(burst, n + k) - burstTime(burst, n) : k * iv
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
