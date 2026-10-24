<script>
import * as echarts from 'echarts'
import { markRaw } from 'vue'
import weapon_stats from '@/data/flex.js'
import { observeResize } from '@/utils'
import chipGroup from './chip-group.vue'
import { THEME, tooltipBase, axisCommon, sliderStyle } from '@/utils/theme'

const METRIC_COLORS = {
  切枪: '#e8913a',
  空仓换弹时间: '#e0504a',
  腰射移速: '#3b7ddd',
  举镜移速: '#1f9d8f'
}

const METRIC_OPTIONS = [
  { key: '切枪', cn: '切枪', en: 'Swap Time' },
  { key: '空仓换弹时间', cn: '空仓换弹时间', en: 'Empty Reload' },
  { key: '腰射移速', cn: '腰射移速', en: 'Hipfire Move Speed' },
  { key: '举镜移速', cn: '举镜移速', en: 'ADS Move Speed' }
]

const DEFAULT_OPTIONS = {
  animationDuration: 320,
  backgroundColor: 'transparent',
  grid: {
    top: 20,
    right: 40,
    bottom: 58,
    left: 12,
    containLabel: true
  },
  tooltip: {
    ...tooltipBase,
    trigger: 'axis',
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(90, 104, 128, 0.1)' } }
  },
  xAxis: { ...axisCommon, nameLocation: 'middle', nameGap: 34, nameTextStyle: { fontSize: 12, color: THEME.muted } },
  yAxis: { ...axisCommon, nameLocation: 'middle', nameGap: 40, nameTextStyle: { fontSize: 12, color: THEME.muted } }
}

// 天梯模式下每行最少像素高度；放不下时用纵向滑块分页滚动
const LADDER_ROW_HEIGHT = 17

const SPEED_METRICS = new Set(['腰射移速', '举镜移速'])

export default {
  components: { chipGroup },
  props: {
    lang: { type: Object, required: false, default: () => ({}) }
  },
  data() {
    return {
      chartInstance: null,
      stopResize: null,
      visibleRows: 0,
      stats: weapon_stats,
      categories: [],
      filter: {},
      ALL: true,
      activeKey: '空仓换弹时间',
      chartDirection: 'vertical'
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
    metricOptions() {
      return METRIC_OPTIONS.map(option => ({
        key: option.key,
        label: this.isEnglish ? option.en : option.cn
      }))
    },
    activeMetricLabel() {
      const active = METRIC_OPTIONS.find(option => option.key === this.activeKey)
      return active ? (this.isEnglish ? active.en : active.cn) : this.activeKey
    },
    categoryI18n() {
      return {
        '冲锋枪': 'Submachine Guns',
        '步枪': 'Assault Rifles',
        '机枪': 'Light Machine Guns',
        '霰弹枪': 'Shotguns',
        '神射手': 'Marksman Weapons',
        '狙击枪': 'Sniper Rifles'
      }
    },
    filterItems() {
      return this.categories.map(category => ({
        key: category,
        label: this.isEnglish ? (this.categoryI18n[category] || category) : category,
        active: Boolean(this.filter[category])
      }))
    },
    selectionSummary() {
      const count = this.categories.filter(cat => this.filter[cat]).length
      if (count === 0) {
        return this.isEnglish ? 'All archetypes' : '全部枪械大类'
      }
      return this.isEnglish ? `${count} archetypes selected` : `已选 ${count} 个大类`
    }
  },
  mounted() {
    this.initCategoriesAndFilter()
    this.initChart()
    this.updateChartSeries([])
    this.stopResize = observeResize(this.$refs.chartContainer, this.resizeChart)
  },
  beforeUnmount() {
    if (this.stopResize) this.stopResize()
    if (this.chartInstance) {
      this.chartInstance.dispose()
      this.chartInstance = null
    }
  },
  methods: {
    initChart() {
      const chartDom = this.$refs.chartContainer
      this.chartInstance = markRaw(echarts.init(chartDom))
    },
    initCategoriesAndFilter() {
      this.categories = Object.keys(this.stats)
      this.filter = this.categories.reduce((acc, cat) => {
        acc[cat] = false
        return acc
      }, {})
    },
    displayValue(value) {
      if (value === null || value === undefined || Number.isNaN(value)) {
        return '-'
      }
      return Math.round(value * 100) / 100
    },
    formatChartData(selectedCategories = []) {
      const categoriesToProcess = selectedCategories.length > 0 ? selectedCategories : this.categories
      let weapons = []

      for (const category of categoriesToProcess) {
        if (this.stats[category]) {
          for (const weapon in this.stats[category]) {
            const statObj = this.stats[category][weapon]
            let aim = statObj['移速']?.['举镜移速']
            if (typeof aim === 'object') {
              aim = aim['开镜'] ?? Object.values(aim)[0]
            }

            weapons.push({
              weapon,
              切枪: statObj['战术'] ? statObj['战术']['切枪'] ?? null : null,
              空仓换弹时间: statObj['战术']
                ? statObj['战术']['空仓换弹时间'] ?? statObj['战术']['战术弹换时间'] ?? null
                : null,
              腰射移速: statObj['移速'] ? statObj['移速']['腰射移速'] ?? null : null,
              举镜移速: aim ?? null
            })
          }
        }
      }

      const sortKey = this.activeKey
      weapons = weapons.sort((a, b) => {
        const aValue = a[sortKey]
        const bValue = b[sortKey]

        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        return SPEED_METRICS.has(sortKey) ? bValue - aValue : aValue - bValue
      })

      const labels = weapons.map(item => item.weapon)
      const seriesData = weapons.map(item => ({
        value: item[sortKey],
        itemStyle: { color: METRIC_COLORS[sortKey] }
      }))

      return { labels, seriesData }
    },
    ladderRows(total) {
      const height = this.$refs.chartContainer?.clientHeight || 600
      const fit = Math.max(8, Math.floor((height - 40) / LADDER_ROW_HEIGHT))
      return Math.min(total, fit)
    },
    buildOption(labels, seriesData) {
      const isHorizontal = this.chartDirection === 'horizontal'
      const rows = this.ladderRows(labels.length)
      const needsScroll = isHorizontal && rows < labels.length
      this.visibleRows = rows

      return {
        ...DEFAULT_OPTIONS,
        grid: isHorizontal
          ? { ...DEFAULT_OPTIONS.grid, bottom: 16, right: needsScroll ? 64 : 48 }
          : { ...DEFAULT_OPTIONS.grid, bottom: 12, top: 28 },
        tooltip: {
          ...DEFAULT_OPTIONS.tooltip,
          formatter: params => {
            if (!params || !params.length) return ''
            const item = params[0]
            return `
              <div style="font-weight:700;margin-bottom:6px;">${item.name}</div>
              <div>${this.activeMetricLabel}: <span style="font-weight:700;">${this.displayValue(item.value)}</span></div>
            `
          }
        },
        xAxis: isHorizontal
          ? { ...DEFAULT_OPTIONS.xAxis, type: 'value', name: '' }
          : {
              ...DEFAULT_OPTIONS.xAxis,
              type: 'category',
              name: '',
              data: labels,
              axisLabel: { ...axisCommon.axisLabel, interval: 0, rotate: 42, fontSize: 11 }
            },
        yAxis: isHorizontal
          ? {
              ...DEFAULT_OPTIONS.yAxis,
              type: 'category',
              inverse: true,
              name: '',
              data: labels,
              axisLabel: { ...axisCommon.axisLabel, interval: 0, color: THEME.soft, fontSize: 11 },
              splitLine: { show: false }
            }
          : {
              ...DEFAULT_OPTIONS.yAxis,
              type: 'value',
              name: '',
            },
        dataZoom: needsScroll
          ? [
              { type: 'inside', yAxisIndex: 0, startValue: 0, endValue: rows - 1, zoomLock: true, moveOnMouseWheel: true },
              {
                ...sliderStyle,
                type: 'slider',
                yAxisIndex: 0,
                right: 6,
                width: 16,
                startValue: 0,
                endValue: rows - 1,
                zoomLock: true,
                brushSelect: false,
                showDetail: false
              }
            ]
          : [],
        series: [
          {
            name: this.activeMetricLabel,
            type: 'bar',
            data: seriesData,
            barMaxWidth: isHorizontal ? 12 : 22,
            itemStyle: { borderRadius: isHorizontal ? [0, 6, 6, 0] : [6, 6, 0, 0] },
            label: {
              show: true,
              position: isHorizontal ? 'right' : 'top',
              color: THEME.soft,
              fontSize: 11,
              formatter: ({ value }) => this.displayValue(value)
            }
          }
        ]
      }
    },
    handleAll() {
      this.ALL = true
      this.categories.forEach(cat => {
        this.filter[cat] = false
      })
      this.updateChartSeries([])
    },
    changeFilter(category) {
      this.filter[category] = !this.filter[category]
      this.handleFilter()
    },
    handleFilter() {
      const selectedCategories = this.categories.filter(cat => this.filter[cat])
      if (selectedCategories.length === 0) {
        this.handleAll()
        return
      }
      this.ALL = false
      this.updateChartSeries(selectedCategories)
    },
    updateChartSeries(selectedCategories) {
      const { labels, seriesData } = this.formatChartData(selectedCategories)
      this.chartInstance.setOption(this.buildOption(labels, seriesData), {
        replaceMerge: ['series', 'xAxis', 'yAxis', 'tooltip', 'grid', 'dataZoom']
      })
    },
    resizeChart() {
      if (!this.chartInstance) return
      this.chartInstance.resize()
      if (this.chartDirection === 'horizontal') {
        this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]))
      }
    },
    switchKey(key) {
      this.activeKey = key
      this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]))
    },
    switchDirection() {
      this.chartDirection = this.chartDirection === 'vertical' ? 'horizontal' : 'vertical'
      this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]))
    },
    changeLang() {
      this.updateChartSeries(this.ALL ? [] : this.categories.filter(cat => this.filter[cat]))
    }
  }
}
</script>

<template>
  <div class="view">
    <header class="view-head">
      <div>
        <h2 class="view-title">{{ isEnglish ? 'Flexibility Metrics' : '灵活性指标' }}</h2>
        <p class="view-sub">
          {{ isEnglish
            ? 'Weapon swap, empty reload, hipfire and ADS movement, ranked.'
            : '切枪、空仓换弹、腰射移速、举镜移速，逐项排名。' }}
        </p>
      </div>
      <div class="toolbar-group">
        <span class="badge">{{ isEnglish ? 'Metric' : '指标' }} <strong>{{ activeMetricLabel }}</strong></span>
        <span class="badge">{{ selectionSummary }}</span>
      </div>
    </header>

    <section class="panel stage">
      <div class="toolbar">
        <div class="seg">
          <button
            v-for="option in metricOptions"
            :key="option.key"
            class="seg-btn"
            :class="{ active: activeKey === option.key }"
            @click="switchKey(option.key)"
          >
            {{ option.label }}
          </button>
        </div>
        <div class="seg">
          <button class="seg-btn" :class="{ active: chartDirection === 'vertical' }" @click="chartDirection !== 'vertical' && switchDirection()">
            {{ isEnglish ? 'Bars' : '柱状图' }}
          </button>
          <button class="seg-btn" :class="{ active: chartDirection === 'horizontal' }" @click="chartDirection !== 'horizontal' && switchDirection()">
            {{ isEnglish ? 'Ladder' : '天梯' }}
          </button>
        </div>
        <span class="toolbar-spacer"></span>
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
