// Weapon classes (as written in the data sheet) with their colour tokens, and armor tiers.
export const CLASSES = [
  { key: '冲锋枪', color: '--c-smg' },
  { key: '步枪', color: '--c-ar' },
  { key: '轻机枪', color: '--c-lmg' },
  { key: '手枪', color: '--c-pistol' },
  { key: '霰弹枪', color: '--c-shotgun' },
  { key: '神射手', color: '--c-marksman' },
  { key: '狙击枪', color: '--c-sniper' }
]

export const ARMORS = [
  { key: 'white', hp: 150, color: '--a-white' },
  { key: 'blue', hp: 175, color: '--a-blue' },
  { key: 'purple', hp: 200, color: '--a-purple' },
  { key: 'red', hp: 225, color: '--a-red' }
]

const classIndex = Object.fromEntries(CLASSES.map((c, i) => [c.key, { ...c, order: i }]))
export const classOf = key => classIndex[key]
export const classVar = key => `var(${classIndex[key]?.color ?? '--text-3'})`
