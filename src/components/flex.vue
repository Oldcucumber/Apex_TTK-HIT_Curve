<script>
import * as echarts from 'echarts'
import { markRaw } from 'vue'
import weapon_stats from '@/data/flex.js'

const CHART_THEME = {
  colors: {
    切枪: '#f4a261',
    空仓换弹时间: '#ff7f7f',
    腰射移速: '#75c7ff',
    举镜移速: '#8de7c1'
  },
  surface: 'rgba(16, 22, 30, 0.94)',
  text: '#e2e6ee',
  muted: '#a6b0c2',
  grid: 'rgba(166, 176, 194, 0.14)'
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
    top: 36,
    right: 36,
    bottom: 82,
    left: 112,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    backgroundColor: CHART_THEME.surface,
    borderColor: 'rgba(151, 203, 255, 0.28)',
    borderWidth: 1,
    textStyle: { color: CHART_THEME.text }
  },
  xAxis: {
    type: 'category',
    nameLocation: 'middle',
    nameGap: 40,
    nameTextStyle: { fontSize: 14, color: CHART_THEME.muted },
    axisLabel: { color: CHART_THEME.muted, rotate: 30 },
    axisLine: { lineStyle: { color: 'rgba(166, 176, 194, 0.3)' } },
    splitLine: { lineStyle: { color: CHART_THEME.grid } }
  },
  yAxis: {
    type: 'value',
    nameLocation: 'middle',
    nameGap: 60,
    nameTextStyle: { fontSize: 14, color: CHART_THEME.muted },
    axisLabel: { color: CHART_THEME.muted },
    axisLine: { lineStyle: { color: 'rgba(166, 176, 194, 0.3)' } },
    splitLine: { lineStyle: { color: CHART_THEME.grid } }
  },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0 },
    {
      type: 'slider',
      xAxisIndex: 0,
      bottom: 14,
      height: 24,
      borderColor: 'rgba(151, 203, 255, 0.14)',
      fillerColor: 'rgba(151, 203, 255, 0.18)',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      handleStyle: { color: '#97cbff' },
      textStyle: { color: CHART_THEME.muted }
    }
  ]
}

const SPEED_METRICS = new Set(['腰射移速', '举镜移速'])

export default {
  props: {
    lang: { type: Object, required: false, default: () => ({}) }
  },
  data() {
    return {
      chartInstance: null,
      stats: weapon_stats,
      categories: [],
      filter: {},
      ALL: true,
      activeKey: '空仓换弹时间',
      chartDirection: 'horizontal'
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
    directionLabel() {
      if (this.chartDirection === 'horizontal') {
        return this.isEnglish ? 'Ladder mode' : '天梯模式'
      }
      return this.isEnglish ? 'Bar mode' : '柱状图模式'
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
    window.addEventListener('resize', this.resizeChart)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeChart)
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
        itemStyle: { color: CHART_THEME.colors[sortKey] }
      }))

      return { labels, seriesData }
    },
    buildOption(labels, seriesData) {
      const validValues = seriesData
        .map(item => item.value)
        .filter(value => typeof value === 'number' && Number.isFinite(value))
      const max = validValues.length ? Math.max(...validValues) : null
      const isHorizontal = this.chartDirection === 'horizontal'

      return {
        ...DEFAULT_OPTIONS,
        grid: isHorizontal
          ? { ...DEFAULT_OPTIONS.grid, left: 140, bottom: 32, top: 20 }
          : { ...DEFAULT_OPTIONS.grid, left: 54, bottom: 108, top: 28 },
        tooltip: {
          ...DEFAULT_OPTIONS.tooltip,
          formatter: params => {
            if (!params || !params.length) return ''
            const item = params[0]
            return `
              <div style="font-weight:700;margin-bottom:8px;">${item.name}</div>
              <div style="padding-left:18px;">${this.activeMetricLabel}: <span style="font-weight:700;">${this.displayValue(item.value)}</span></div>
            `
          }
        },
        xAxis: isHorizontal
          ? {
              ...DEFAULT_OPTIONS.xAxis,
              type: 'value',
              name: this.activeMetricLabel,
              axisLabel: {
                color: CHART_THEME.muted
              }
            }
          : {
              ...DEFAULT_OPTIONS.xAxis,
              type: 'category',
              name: this.isEnglish ? 'Weapon' : '武器',
              data: labels,
              axisLabel: {
                color: CHART_THEME.muted,
                rotate: 36
              }
            },
        yAxis: isHorizontal
          ? {
              ...DEFAULT_OPTIONS.yAxis,
              type: 'category',
              data: labels,
              name: this.isEnglish ? 'Weapon' : '武器'
            }
          : {
              ...DEFAULT_OPTIONS.yAxis,
              type: 'value',
              name: this.activeMetricLabel,
              max: max ? max * 1.15 : undefined
            },
        series: [
          {
            name: this.activeMetricLabel,
            type: 'bar',
            data: seriesData,
            barMaxWidth: 18,
            label: {
              show: true,
              position: isHorizontal ? 'right' : 'top',
              color: CHART_THEME.text,
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
        replaceMerge: ['series', 'xAxis', 'yAxis', 'tooltip', 'grid']
      })
    },
    resizeChart() {
      if (this.chartInstance) {
        this.chartInstance.resize()
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
  <div class="page-shell">
    <section class="page-header">
      <div class="page-header-copy">
        <p class="page-eyebrow">{{ isEnglish ? 'Handling profile' : '操控剖面' }}</p>
        <h2 class="page-title">{{ isEnglish ? 'Flexibility Metrics' : '灵活性指标' }}</h2>
        <p class="page-subtitle">
          {{ isEnglish
            ? 'Rank weapon handling with four practical lenses: weapon swap, empty reload, hipfire movement and ADS movement.'
            : '从切枪、空仓换弹、腰射移速和举镜移速四个角度，比较武器在实战中的灵活性。' }}
        </p>
      </div>
      <span class="section-badge">{{ selectionSummary }}</span>
    </section>

    <section class="surface-card chart-card">
      <div class="surface-header">
        <div>
          <h3 class="surface-title">{{ isEnglish ? 'Metric lens' : '指标切换' }}</h3>
          <p class="surface-description">
            {{ isEnglish
              ? 'Swap between metrics and flip the layout depending on whether you want a compact ladder or a classic bar chart.'
              : '可切换不同指标，并在天梯模式和柱状图模式之间来回切换。' }}
          </p>
        </div>
        <button class="tonal-button direction-button" @click="switchDirection">{{ directionLabel }}</button>
      </div>

      <div class="segmented-row metric-row">
        <button
          v-for="option in metricOptions"
          :key="option.key"
          class="segmented-button"
          :class="{ active: activeKey === option.key }"
          @click="switchKey(option.key)"
        >
          {{ option.label }}
        </button>
      </div>

      <div ref="chartContainer" class="chart-host flex-stage"></div>
    </section>

    <section class="surface-card filter-card">
      <div class="surface-header">
        <div>
          <h3 class="surface-title">{{ isEnglish ? 'Archetype filter' : '枪械大类筛选' }}</h3>
          <p class="surface-description">
            {{ isEnglish
              ? 'Filter the ladder when you want to compare only similar handling families.'
              : '当你只想比较相近的大类时，可以先过滤掉无关武器。' }}
          </p>
        </div>
        <span class="section-badge">{{ selectionSummary }}</span>
      </div>

      <div class="filter-chip-row">
        <button
          v-for="category in categories"
          :key="category"
          class="filter-chip"
          :class="{ active: filter[category] }"
          @click="changeFilter(category)"
        >
          {{ isEnglish ? (categoryI18n[category] || category) : category }}
        </button>
        <button class="filter-chip" :class="{ active: ALL }" @click="handleAll">
          {{ isEnglish ? 'All archetypes' : '全部大类' }}
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

.metric-row {
  margin-bottom: 20px;
}

.direction-button {
  min-width: 150px;
}

.flex-stage {
  min-height: 620px;
}

@media (max-width: 960px) {
  .chart-card,
  .filter-card {
    padding: 22px;
  }

  .flex-stage {
    min-height: 520px;
  }
}

@media (max-width: 640px) {
  .flex-stage {
    min-height: 420px;
  }
}
</style>
