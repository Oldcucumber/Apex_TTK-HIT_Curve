// Chart styling driven by the CSS custom properties of the active theme.
import { CLASSES } from '../data/meta.js'

export const tokens = () => {
  const cs = getComputedStyle(document.documentElement)
  const g = name => cs.getPropertyValue(name).trim()
  const cls = {}
  for (const c of CLASSES) cls[c.key] = g(c.color)
  return {
    text: g('--text'),
    soft: g('--text-2'),
    muted: g('--text-3'),
    line: g('--line'),
    grid: g('--grid'),
    panel: g('--panel'),
    bg: g('--bg'),
    accent: g('--accent'),
    cls,
    armor: { white: g('--a-white'), blue: g('--a-blue'), purple: g('--a-purple'), red: g('--a-red') }
  }
}

export const FONT = 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'

export const tooltip = tk => ({
  backgroundColor: tk.panel,
  borderColor: tk.line,
  borderWidth: 1,
  padding: [8, 10],
  textStyle: { color: tk.text, fontSize: 12, fontFamily: FONT },
  extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);'
})

export const axis = (tk, extra = {}) => ({
  axisLine: { lineStyle: { color: tk.line } },
  axisTick: { show: false },
  axisLabel: { color: tk.muted, fontSize: 12, fontFamily: FONT },
  splitLine: { lineStyle: { color: tk.grid } },
  nameTextStyle: { color: tk.soft, fontSize: 12, fontFamily: FONT },
  ...extra
})

export const slider = tk => ({
  borderColor: 'transparent',
  backgroundColor: tk.grid,
  fillerColor: 'rgba(128,128,128,.14)',
  brushSelect: false,
  moveHandleSize: 3,
  dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
  selectedDataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
  handleStyle: { color: tk.soft, borderColor: tk.soft },
  moveHandleStyle: { color: 'rgba(128,128,128,.35)' },
  textStyle: { color: tk.muted }
})

/** Lighten (t > 0) or darken (t < 0) a #rrggbb / rgb() colour. */
export const shade = (color, t) => {
  const m = color.startsWith('#')
    ? [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16))
    : (color.match(/\d+/g) || [128, 128, 128]).slice(0, 3).map(Number)
  const mix = t >= 0 ? 255 : 0
  const k = Math.abs(t)
  return `rgb(${m.map(c => Math.round(c + (mix - c) * k)).join(',')})`
}
