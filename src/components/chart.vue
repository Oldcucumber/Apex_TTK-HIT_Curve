<script>
import * as echarts from 'echarts'
import ttks from '@/data/id_stats.js'
import { markRaw } from 'vue'
import classes from '@/data/Class.js'
import { chartDataFormatter } from '@/utils'

const CHART_THEME = {
  accent: '#97cbff',
  accentStrong: '#71e0cf',
  surface: 'rgba(16, 22, 30, 0.94)',
  text: '#e2e6ee',
  muted: '#a6b0c2',
  grid: 'rgba(166, 176, 194, 0.14)'
}

const DATA_CONSTANTS = {
  Y_AXIS_MIN: 0,
  Y_AXIS_MAX: 10,
  X_AXIS_MIN: 0,
  X_AXIS_MAX: 100,
  Y_AXIS_PADDING_PERCENT: 0.1,
  Y_AXIS_PADDING_FALLBACK: 0.5,
  X_AXIS_PADDING_PERCENT: 0.05,
  X_AXIS_PADDING_FALLBACK: 5
}

const DEFAULT_OPTIONS = {
  animationDuration: 320,
  grid: {
    top: 28,
    right: 240,
    bottom: 72,
    left: 18,
    containLabel: true
  },
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      lineStyle: {
        color: CHART_THEME.accent,
        width: 1,
        type: 'dashed'
      },
      crossStyle: {
        color: CHART_THEME.accent
      }
    },
    backgroundColor: CHART_THEME.surface,
    borderColor: 'rgba(151, 203, 255, 0.28)',
    borderWidth: 1,
    textStyle: {
      color: CHART_THEME.text
    },
    formatter: function () {},
    enterable: true,
    triggerOn: 'mousemove',
    alwaysShowContent: false
  },
  legend: {
    type: 'scroll',
    orient: 'vertical',
    right: 0,
    top: 6,
    bottom: 18,
    textStyle: {
      color: CHART_THEME.muted,
      fontSize: 13
    },
    pageTextStyle: {
      color: CHART_THEME.muted
    }
  },
  xAxis: {
    type: 'value',
    min: 0,
    max: 100,
    interval: 10,
    axisLabel: {
      formatter: '{value}%',
      color: CHART_THEME.muted,
      fontSize: 13
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(166, 176, 194, 0.3)'
      }
    },
    splitLine: {
      lineStyle: {
        color: CHART_THEME.grid
      }
    }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 10,
    maxInterval: 1,
    minInterval: 0.3,
    splitNumber: 10,
    axisLabel: {
      formatter: value => `${value.toFixed(2)}s`,
      color: CHART_THEME.muted,
      fontSize: 13
    },
    axisLine: {
      lineStyle: {
        color: 'rgba(166, 176, 194, 0.3)'
      }
    },
    splitLine: {
      lineStyle: {
        color: CHART_THEME.grid
      }
    }
  },
  series: [],
  dataZoom: [
    {
      type: 'inside',
      yAxisIndex: [0],
      start: 0,
      end: 100,
      zoomOnMouseWheel: true,
      moveOnMouseMove: true,
      moveOnMouseWheel: false,
      filterMode: 'none'
    },
    {
      type: 'slider',
      xAxisIndex: [0],
      show: true,
      start: 0,
      end: 100,
      height: 28,
      bottom: 18,
      borderColor: 'rgba(151, 203, 255, 0.14)',
      fillerColor: 'rgba(151, 203, 255, 0.18)',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      handleStyle: {
        color: CHART_THEME.accent
      },
      textStyle: {
        color: CHART_THEME.muted
      },
      filterMode: 'none'
    }
  ]
}

const cloneAxis = axis => (Array.isArray(axis) ? { ...axis[0] } : { ...axis })
const cloneDataZoom = dataZoom => (Array.isArray(dataZoom) ? dataZoom.map(item => ({ ...item })) : [])

export default {
  props: {
    lang: { type: Object, required: true }
  },
  data() {
    return {
      chartInstance: null,
      ttk: chartDataFormatter(ttks, this.lang.names),
      classes,
      filter: {},
      ALL: true
    }
  },
  computed: {
    isEnglish() {
      return this.lang?.labels?.hit_rate === 'Hit Rate'
    },
    selectedClassCount() {
      return Object.values(this.filter).filter(Boolean).length
    },
    selectionSummary() {
      if (this.selectedClassCount === 0) {
        return this.isEnglish ? 'All weapon groups' : '全部武器类别'
      }
      return this.isEnglish
        ? `${this.selectedClassCount} groups selected`
        : `已选 ${this.selectedClassCount} 个类别`
    },
    cardSummary() {
      const count = this.ttk.length
      return this.isEnglish ? `${count} weapons · 0–100% hit rate` : `${count} 把武器 · 0–100% 命中率`
    },
    helpText() {
      return this.isEnglish
        ? 'Compare kill-time curves across the full hit-rate range and isolate a class when you want a narrower read.'
        : '在完整命中率区间内比较击杀时间曲线，并按武器类别快速收窄范围。'
    }
  },
  mounted() {
    this.initFilter()
    this.initChart()
    window.addEventListener('resize', this.handleWindowResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleWindowResize)
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
  },
  methods: {
    handleWindowResize() {
      if (this.chartInstance) {
        this.chartInstance.resize()
      }
    },
    initFilter() {
      this.filter = Object.keys(this.classes).reduce((acc, key) => {
        acc[key] = false
        return acc
      }, {})
    },
    getSeriesFromOption(option) {
      return !option.series || option.series.length === 0 ? this.ttk : option.series
    },
    updateAxisRange(inputOption = null, skipDataZoomCalculation = false) {
      const sourceOption = inputOption || (this.chartInstance ? this.chartInstance.getOption() : null)

      if (!sourceOption) return inputOption

      const option = {
        ...sourceOption,
        xAxis: cloneAxis(sourceOption.xAxis),
        yAxis: cloneAxis(sourceOption.yAxis),
        dataZoom: cloneDataZoom(sourceOption.dataZoom)
      }

      const series = this.getSeriesFromOption(option)

      option.tooltip.formatter = params => {
        if (!params || params.length === 0) return ''

        const hitRate = params[0].value[0]
        let tooltipContent = `<div style="font-weight:700;margin-bottom:8px;">${this.lang.labels.hit_rate}: ${hitRate.toFixed(1)}%</div>`

        const sortedParams = params
          .filter(param => param.value && param.value[1] !== null)
          .sort((a, b) => a.value[1] - b.value[1])

        sortedParams.forEach((param, index) => {
          const ttk = param.value[1]
          tooltipContent += `
            <div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
              <span style="width:10px;height:10px;border-radius:999px;background:${param.color};display:inline-block;"></span>
              <span style="flex:1;">${param.seriesName}</span>
              <span style="font-weight:700;color:${index === 0 ? CHART_THEME.accentStrong : CHART_THEME.text};">${ttk.toFixed(3)}s</span>
            </div>
          `
        })

        return tooltipContent
      }

      const allXValues = []
      const allYValues = []

      series.forEach(seriesItem => {
        if (!seriesItem?.data?.length) return

        seriesItem.data.forEach(point => {
          if (point && point.length >= 2) {
            const [xValue, yValue] = point
            if (
              xValue !== null &&
              xValue !== undefined &&
              yValue !== null &&
              yValue !== undefined &&
              yValue >= DATA_CONSTANTS.Y_AXIS_MIN &&
              yValue <= DATA_CONSTANTS.Y_AXIS_MAX
            ) {
              allXValues.push(xValue)
              allYValues.push(yValue)
            }
          }
        })
      })

      let newOption = {
        ...option,
        series
      }

      if (!skipDataZoomCalculation && allXValues.length > 0) {
        const minX = Math.min(...allXValues)
        const maxX = Math.max(...allXValues)
        const xRange = maxX - minX
        const xPadding = xRange > 0 ? xRange * DATA_CONSTANTS.X_AXIS_PADDING_PERCENT : DATA_CONSTANTS.X_AXIS_PADDING_FALLBACK

        const adjustedMinX = Math.max(DATA_CONSTANTS.X_AXIS_MIN, minX - xPadding)
        const adjustedMaxX = Math.min(DATA_CONSTANTS.X_AXIS_MAX, maxX + xPadding)

        const startPercent = (adjustedMinX / DATA_CONSTANTS.X_AXIS_MAX) * 100
        const endPercent = (adjustedMaxX / DATA_CONSTANTS.X_AXIS_MAX) * 100

        newOption = this.updateDataZoom(newOption, startPercent, endPercent)
      }

      let xMin = DATA_CONSTANTS.X_AXIS_MIN
      let xMax = DATA_CONSTANTS.X_AXIS_MAX
      const xDataZoom = newOption.dataZoom.find(dz => Array.isArray(dz.xAxisIndex) && dz.xAxisIndex.length > 0)

      if (xDataZoom) {
        const xStartPercent = xDataZoom.start || 0
        const xEndPercent = xDataZoom.end || 100
        xMin = (xStartPercent / 100) * DATA_CONSTANTS.X_AXIS_MAX
        xMax = (xEndPercent / 100) * DATA_CONSTANTS.X_AXIS_MAX
      }

      const visibleYValues = []

      series.forEach(seriesItem => {
        if (!seriesItem?.data?.length) return

        seriesItem.data.forEach(point => {
          if (!point || point.length < 2) return

          const [xValue, yValue] = point
          if (
            xValue >= xMin &&
            xValue <= xMax &&
            yValue !== null &&
            yValue !== undefined &&
            yValue >= DATA_CONSTANTS.Y_AXIS_MIN &&
            yValue <= DATA_CONSTANTS.Y_AXIS_MAX
          ) {
            visibleYValues.push(yValue)
          }
        })
      })

      if (visibleYValues.length > 0) {
        const minY = Math.min(...visibleYValues)
        const maxY = Math.max(...visibleYValues)
        const range = maxY - minY
        const padding = range > 0 ? range * DATA_CONSTANTS.Y_AXIS_PADDING_PERCENT : DATA_CONSTANTS.Y_AXIS_PADDING_FALLBACK

        newOption.yAxis = {
          ...newOption.yAxis,
          min: Math.max(DATA_CONSTANTS.Y_AXIS_MIN, minY - padding),
          max: Math.min(DATA_CONSTANTS.Y_AXIS_MAX, maxY + padding)
        }
      } else {
        newOption.yAxis = {
          ...newOption.yAxis,
          min: DATA_CONSTANTS.Y_AXIS_MIN,
          max: DATA_CONSTANTS.Y_AXIS_MAX
        }
      }

      if (!inputOption && this.chartInstance) {
        const updateConfig = {
          yAxis: newOption.yAxis
        }

        if (!skipDataZoomCalculation) {
          updateConfig.dataZoom = newOption.dataZoom
        }

        this.chartInstance.setOption(updateConfig)
      }

      return newOption
    },
    updateDataZoom(option, startPercent, endPercent) {
      return {
        ...option,
        dataZoom: option.dataZoom.map(dz => {
          if (Array.isArray(dz.xAxisIndex) && dz.xAxisIndex.length > 0) {
            return { ...dz, start: startPercent, end: endPercent }
          }
          return dz
        })
      }
    },
    initChart() {
      if (!this.$refs.chartContainer) return
      this.chartInstance = markRaw(echarts.init(this.$refs.chartContainer))
      const initialOptions = this.updateAxisRange({ ...DEFAULT_OPTIONS, series: this.ttk })
      this.chartInstance.setOption(initialOptions)
      this.chartInstance.on('dataZoom', () => {
        this.updateAxisRange(null, true)
      })
    },
    handleAll() {
      this.ALL = true
      this.initFilter()
      const updatedOption = this.updateAxisRange({ ...DEFAULT_OPTIONS, series: this.ttk })
      this.chartInstance.setOption(updatedOption, true)
    },
    changeFilter(key) {
      if (!Object.prototype.hasOwnProperty.call(this.filter, key)) return
      this.filter[key] = !this.filter[key]
      this.handleFilter()
    },
    handleFilter() {
      const selectedKeys = Object.entries(this.filter)
        .filter(([, value]) => value)
        .map(([key]) => key)

      if (selectedKeys.length === 0) {
        this.handleAll()
        return
      }

      this.ALL = false
      const newSeries = []
      selectedKeys.forEach(key => {
        newSeries.push(...this.ttk.filter(item => this.classes[key].includes(item.id)))
      })

      const updatedOption = this.updateAxisRange({
        ...DEFAULT_OPTIONS,
        series: newSeries
      })

      this.chartInstance.setOption(updatedOption, { replaceMerge: ['series'] })
    },
    changeLang() {
      this.ttk = chartDataFormatter(ttks, this.lang.names)
      if (this.ALL) {
        this.handleAll()
      } else {
        this.handleFilter()
      }
    }
  }
}
</script>

<template>
  <div class="page-shell">
    <section class="page-header">
      <div class="page-header-copy">
        <p class="page-eyebrow">{{ isEnglish ? 'Primary analysis' : '核心分析' }}</p>
        <h2 class="page-title">{{ lang.labels['ttk_curve'] }}</h2>
        <p class="page-subtitle">{{ helpText }}</p>
      </div>
      <span class="section-badge">{{ selectionSummary }}</span>
    </section>

    <section class="surface-card chart-card">
      <div class="surface-header">
        <div>
          <h3 class="surface-title">{{ isEnglish ? 'Curve canvas' : '曲线画布' }}</h3>
          <p class="surface-description">
            {{ isEnglish
              ? 'Hover to compare the best performer at each hit rate, and zoom horizontally to inspect narrow windows.'
              : '悬停可查看同一命中率下的最佳表现者，横向缩放可专注分析某段命中率窗口。' }}
          </p>
        </div>
        <div class="chart-meta">
          <div class="meta-pill">
            <span>{{ isEnglish ? 'Range' : '范围' }}</span>
            <strong>0 - 100%</strong>
          </div>
          <div class="meta-pill">
            <span>{{ isEnglish ? 'Dataset' : '数据' }}</span>
            <strong>{{ cardSummary }}</strong>
          </div>
        </div>
      </div>

      <div ref="chartContainer" class="chart-host chart-stage"></div>
    </section>

    <section class="surface-card filter-card">
      <div class="surface-header">
        <div>
          <h3 class="surface-title">{{ isEnglish ? 'Weapon groups' : '武器类别' }}</h3>
          <p class="surface-description">
            {{ isEnglish
              ? 'Select one or more groups to reduce the visual noise and inspect similar weapon families together.'
              : '选择一个或多个武器类别，降低视觉噪声，更专注地比较相近枪系。' }}
          </p>
        </div>
        <span class="section-badge">{{ selectionSummary }}</span>
      </div>

      <div class="filter-chip-row">
        <button
          v-for="(name, index) in lang.classes"
          :key="index"
          class="filter-chip"
          :class="{ active: filter[index] }"
          @click="changeFilter(index)"
        >
          {{ name }}
        </button>
        <button class="filter-chip" :class="{ active: ALL }" @click="handleAll">
          {{ isEnglish ? 'All groups' : '全部类别' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chart-card,
.filter-card {
  padding: 28px;
}

.chart-stage {
  min-height: 620px;
}

.chart-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-pill {
  min-width: 150px;
  padding: 14px 16px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.meta-pill span {
  display: block;
  margin-bottom: 8px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}

.meta-pill strong {
  font-size: 0.96rem;
  color: var(--md-sys-color-on-surface);
}

@media (max-width: 960px) {
  .chart-card,
  .filter-card {
    padding: 22px;
  }

  .chart-stage {
    min-height: 520px;
  }
}

@media (max-width: 640px) {
  .chart-stage {
    min-height: 420px;
  }
}
</style>
