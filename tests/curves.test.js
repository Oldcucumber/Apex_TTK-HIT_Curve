import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { curvePoints, ttkAt } from '../src/data/curveMath.js'

const { weapons } = JSON.parse(readFileSync(new URL('../src/data/weapons.json', import.meta.url), 'utf8'))
const curve = key => {
  const weapon = weapons.find(w => w.key === key)
  assert.ok(weapon, key)
  return { weapon, points: curvePoints(weapon) }
}
const wingman = curve('dual-wingman-2-round-burst')
const hemlok = curve('hemlok-burst-ar-3-round-burst')
const flatline = curve('vk-47-flatline')

test('burst weapons follow the measured burst timing through the full magazine', () => {
  // Dual Wingman: pairs 0.179s apart inside, 0.354s between pairs; 5 hits, 16 rounds.
  assert.deepEqual(wingman.points.map(p => p[1]).slice(0, 4), [1.06, 1.239, 1.593, 1.772])
  assert.equal(wingman.points.length, 12)
  // Hemlok: 3-round bursts, 0.065s inside, 0.251s between; 10 hits = 3 bursts + 1.
  assert.deepEqual(hemlok.points.map(p => p[1]).slice(0, 4), [1.14, 1.205, 1.27, 1.521])
  assert.equal(ttkAt(wingman, 50), 2.305)
})

test('queries use exact shot boundaries, including the last round', () => {
  assert.equal(ttkAt(wingman, (5 / 7) * 100), 1.593)
  assert.equal(ttkAt(flatline, (10 / 29) * 100), 2.8)
  assert.equal(ttkAt(wingman, (5 / 6) * 100 + 1e-8), 1.239)
  assert.equal(ttkAt(wingman, (5 / 6) * 100 - 1e-8), 1.593)
  assert.equal(ttkAt(flatline, (10 / 29) * 100 - 1e-8), null)
})

test('regular weapons keep their existing timing and magazine limits', () => {
  assert.equal(ttkAt(flatline, 100), 0.9)
  assert.equal(ttkAt(flatline, 50), 1.9)
  const r99 = curve('r-99-smg')
  assert.equal(ttkAt(r99, 100), 0.8889)
  assert.equal(ttkAt(r99, (17 / 18) * 100), 0.9445)
  assert.equal(ttkAt(r99, (17 / 27) * 100), 1.4445)
  assert.equal(ttkAt(r99, (17 / 28) * 100), null)
})

test('invalid percentages never return a plausible TTK', () => {
  for (const pct of [0, -1, 100.01, 101, NaN, Infinity, -Infinity, null, undefined, '80']) {
    assert.equal(ttkAt(wingman, pct), null, String(pct))
  }
})

test('every eligible shot boundary resolves to its own sample', () => {
  const eligible = weapons.filter(w => w.ammo !== '技能' && w.ttk.purple != null &&
    w.bullets.purple != null && !w.raw?.['bullets.purple'] && !w.raw?.['ttk.purple'] &&
    typeof w.mag.purple === 'number')
  assert.equal(eligible.length, 52)
  for (const weapon of eligible) {
    const c = { weapon, points: curvePoints(weapon) }
    for (const [i, [, time]] of c.points.entries()) {
      assert.equal(ttkAt(c, (weapon.bullets.purple / (weapon.bullets.purple + i)) * 100), time, `${weapon.key}, miss ${i}`)
      assert.ok(Number.isFinite(time))
      if (i) assert.ok(time >= c.points[i - 1][1], weapon.key)
    }
  }
})
