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
const eva = curve('eva-8-auto-double-tap-purple-bolt')
const flatline = curve('vk-47-flatline-standard')

test('EVA-8 follows the documented pair timing through the full magazine', () => {
  // Shot times: 0, .14, .70, .84, 1.40, 1.54, 2.10, 2.24 seconds.
  assert.deepEqual(eva.points.map(p => p[1]), [0.84, 1.4, 1.54, 2.1, 2.24])
  assert.equal(ttkAt(eva, 80), 1.4)
  assert.equal(ttkAt(eva, 50), 2.24)
})

test('queries use exact shot boundaries, including the last round', () => {
  assert.equal(ttkAt(eva, (4 / 6) * 100), 1.54)
  assert.equal(ttkAt(flatline, (10 / 29) * 100), 2.8)
  assert.equal(ttkAt(eva, 80 + 1e-8), 1.4)
  assert.equal(ttkAt(eva, 80 - 1e-8), 1.54)
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
    assert.equal(ttkAt(eva, pct), null, String(pct))
  }
})

test('every eligible shot boundary resolves to its own sample', () => {
  const eligible = weapons.filter(w => w.ammo !== '技能' && w.ttk.purple != null &&
    w.bullets.purple != null && !w.raw?.['bullets.purple'] && !w.raw?.['ttk.purple'] &&
    typeof w.mag.purple === 'number')
  assert.equal(eligible.length, 51)
  for (const weapon of eligible) {
    const c = { weapon, points: curvePoints(weapon) }
    for (const [i, [, time]] of c.points.entries()) {
      assert.equal(ttkAt(c, (weapon.bullets.purple / (weapon.bullets.purple + i)) * 100), time, `${weapon.key}, miss ${i}`)
      assert.ok(Number.isFinite(time))
      if (i) assert.ok(time >= c.points[i - 1][1], weapon.key)
    }
  }
})
