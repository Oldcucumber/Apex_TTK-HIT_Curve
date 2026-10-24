// Shared ECharts styling that matches the soft-skeuomorphic light theme.

export const THEME = {
  text: '#263042',
  soft: '#4e5a6e',
  muted: '#6a7589',
  grid: 'rgba(90, 104, 128, 0.16)',
  axis: 'rgba(90, 104, 128, 0.42)',
  accent: '#f0623a',
  teal: '#1f9d8f',
  blue: '#3b7ddd',
  danger: '#d6453d',
  palette: [
    '#f0623a', '#1f9d8f', '#3b7ddd', '#d9a21b', '#8e5bd6', '#e0508a',
    '#4aa84a', '#b8641c', '#2c8fb8', '#7a8a99', '#b5483a', '#5b6bd6'
  ]
}

export const tooltipBase = {
  backgroundColor: 'rgba(243, 246, 251, 0.96)',
  borderColor: 'rgba(90, 104, 128, 0.2)',
  borderWidth: 1,
  padding: [10, 12],
  textStyle: { color: THEME.text, fontSize: 13 },
  extraCssText: 'border-radius:12px;box-shadow:4px 4px 12px rgba(150,162,182,.55),-3px -3px 10px rgba(255,255,255,.9);'
}

export const axisCommon = {
  axisLabel: { color: THEME.muted, fontSize: 12 },
  axisLine: { lineStyle: { color: THEME.axis } },
  axisTick: { lineStyle: { color: THEME.axis } },
  splitLine: { lineStyle: { color: THEME.grid } }
}

export const sliderStyle = {
  borderColor: 'transparent',
  backgroundColor: 'rgba(90, 104, 128, 0.1)',
  fillerColor: 'rgba(240, 98, 58, 0.18)',
  dataBackground: {
    lineStyle: { color: 'rgba(90, 104, 128, 0.3)' },
    areaStyle: { color: 'rgba(90, 104, 128, 0.12)' }
  },
  handleStyle: { color: THEME.accent, borderColor: THEME.accent },
  moveHandleStyle: { color: 'rgba(90, 104, 128, 0.35)' },
  textStyle: { color: THEME.muted }
}

export const legendBase = {
  textStyle: { color: THEME.soft, fontSize: 12 },
  pageTextStyle: { color: THEME.muted },
  pageIconColor: THEME.accent,
  pageIconInactiveColor: 'rgba(90, 104, 128, 0.35)',
  itemWidth: 14,
  itemHeight: 8,
  itemGap: 7
}
