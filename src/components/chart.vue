<script>
import * as echarts from 'echarts'
import ttks from '@/data/id_stats.js'
import { markRaw } from 'vue'
import classes from '@/data/Class.js'
import { chartDataFormatter, observeResize } from '@/utils'
import chipGroup from './chip-group.vue'
import { THEME, tooltipBase, axisCommon, sliderStyle, legendBase } from '@/utils/theme'

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
  color: THEME.palette,
  grid: {
    top: 16,
    right: 236,
    bottom: 56,
    left: 8,
    containLabel: true
  },
  backgroundColor: 'transparent',
  tooltip: {
    ...tooltipBase,
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      lineStyle: { color: THEME.accent, width: 1, type: 'dashed' },
      crossStyle: { color: THEME.accent },
      label: { backgroundColor: THEME.soft }
    },
    formatter: function () {},
    enterable: true,
    triggerOn: 'mousemove',
    alwaysShowContent: false
  },
  legend: {
    ...legendBase,
    type: 'scroll',
    orient: 'vertical',
    right: 0,
    top: 4,
    bottom: 8,
    textStyle: { ...legendBase.textStyle, width: 170, overflow: 'truncate' },
    tooltip: { show: true }
  },
  xAxis: {
    ...axisCommon,
    type: 'value',
    min: 0,
    max: 100,
    interval: 10,
    axisLabel: { ...axisCommon.axisLabel, formatter: '{value}%' }
  },
  yAxis: {
    ...axisCommon,
    type: 'value',
    min: 0,
    max: 10,
    maxInterval: 1,
    minInterval: 0.3,
    splitNumber: 10,
    axisLabel: { ...axisCommon.axisLabel, formatter: value => `${value.toFixed(2)}s` }
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
      ...sliderStyle,
      type: 'slider',
      xAxisIndex: [0],
      show: true,
      start: 0,
      end: 100,
      height: 22,
      bottom: 8,
      filterMode: 'none'
    }
  ]
}

const cloneAxis = axis => (Array.isArray(axis) ? { ...axis[0] } : { ...axis })
const cloneDataZoom = dataZoom => (Array.isArray(dataZoom) ? dataZoom.map(item => ({ ...item })) : [])

export default {
  components: { chipGroup },
  props: {
    lang: { type: Object, required: true }
  },
  data() {
    return {
      chartInstance: null,
      stopResize: null,
      ttk: chartDataFormatter(ttks, this.lang.names),
      classes,
      filter: {},
      ALL: true
    }
  },
  watch: {
    lang() {
      this.changeLang()
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
    visibleCount() {
      return this.ALL ? this.ttk.length : this.ttk.filter(item => Object.keys(this.filter).some(key => this.filter[key] && this.classes[key].includes(item.id))).length
    },
    helpText() {
      return this.isEnglish
        ? 'Kill time across the full hit-rate range. Hover to compare, drag to zoom.'
        : '完整命中率区间内的击杀时间曲线。悬停对比，拖动缩放。'
    },
    filterItems() {
      return Object.keys(this.classes).map(key => ({
        key,
        label: this.lang.classes[key],
        active: Boolean(this.filter[key])
      }))
    }
  },
  mounted() {
    this.initFilter()
    this.initChart()
    this.stopResize = observeResize(this.$refs.chartContainer, this.handleWindowResize)
  },
  beforeUnmount() {
    if (this.stopResize) this.stopResize()
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
        let tooltipContent = `<div style="font-weight:700;margin-bottom:6px;">${this.lang.labels.hit_rate}: ${hitRate.toFixed(1)}%</div>`

        const sortedParams = params
          .filter(param => param.value && param.value[1] !== null)
          .sort((a, b) => a.value[1] - b.value[1])

        sortedParams.forEach((param, index) => {
          const ttk = param.value[1]
          tooltipContent += `
            <div style="display:flex;align-items:center;gap:8px;margin:6px 0;">
              <span style="width:10px;height:10px;border-radius:999px;background:${param.color};display:inline-block;"></span>
              <span style="flex:1;">${param.seriesName}</span>
              <span style="font-weight:700;color:${index === 0 ? THEME.teal : THEME.text};">${ttk.toFixed(3)}s</span>
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
  <div class="view">
    <header class="view-head">
      <div>
        <h2 class="view-title">{{ lang.labels['ttk_curve'] }}</h2>
        <p class="view-sub">{{ helpText }}</p>
      </div>
      <div class="toolbar-group">
        <span class="badge">{{ isEnglish ? 'Weapons' : '武器' }} <strong>{{ visibleCount }}</strong></span>
        <span class="badge">{{ isEnglish ? 'Hit rate' : '命中率' }} <strong>0 – 100%</strong></span>
      </div>
    </header>

    <section class="panel stage">
      <div class="toolbar">
        <span class="toolbar-label">{{ isEnglish ? 'Group' : '类别' }}</span>
        <chip-group
          :items="filterItems"
          :all-label="isEnglish ? 'All' : '全部'"
          :all-active="ALL"
          @toggle="changeFilter"
          @all="handleAll"
        />
      </div>
      <div class="well stage-canvas">
        <div ref="chartContainer" class="chart-host"></div>
      </div>
    </section>
  </div>
</template>
