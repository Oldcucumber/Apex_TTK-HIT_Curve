// Weapon classes (as written in the data sheet), their colour tokens and English labels.
export const CLASSES = [
  { key: '冲锋枪', en: 'SMG', color: '--c-smg' },
  { key: '步枪', en: 'Assault Rifle', color: '--c-ar' },
  { key: '轻机枪', en: 'LMG', color: '--c-lmg' },
  { key: '手枪', en: 'Pistol', color: '--c-pistol' },
  { key: '霰弹枪', en: 'Shotgun', color: '--c-shotgun' },
  { key: '神射手', en: 'Marksman', color: '--c-marksman' },
  { key: '狙击枪', en: 'Sniper', color: '--c-sniper' }
]

// Ids used by the hit-rate curve data (Class.js) -> class names in the sheet
export const CURVE_CLASS = {
  SMG: '冲锋枪',
  AR: '步枪',
  LMG: '轻机枪',
  Pistols: '手枪',
  Shotgun: '霰弹枪',
  Marksman: '神射手',
  Sniper: '狙击枪'
}

export const AMMO_EN = {
  技能: 'Ability',
  能量: 'Energy',
  重型: 'Heavy',
  霰弹: 'Shotgun',
  轻型: 'Light',
  狙击: 'Sniper',
  弓箭: 'Bow',
  空投: 'Care package'
}

export const ARMORS = [
  { key: 'white', hp: 150, cn: '白甲', en: 'White', color: '--a-white' },
  { key: 'blue', hp: 175, cn: '蓝甲', en: 'Blue', color: '--a-blue' },
  { key: 'purple', hp: 200, cn: '紫甲', en: 'Purple', color: '--a-purple' },
  { key: 'red', hp: 225, cn: '红甲', en: 'Red', color: '--a-red' }
]

const classIndex = Object.fromEntries(CLASSES.map(c => [c.key, c]))
export const classOf = key => classIndex[key]
