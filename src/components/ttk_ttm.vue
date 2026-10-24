<script>
import * as echarts from 'echarts'
import { markRaw } from 'vue'
import ttk_ttm_data from '@/data/ttk_ttm.js'
import { observeResize } from '@/utils'
import chipGroup from './chip-group.vue'
import { THEME, tooltipBase, axisCommon, sliderStyle, legendBase } from '@/utils/theme'

const DEFAULT_OPTIONS = {
  animationDuration: 320,
  backgroundColor: 'transparent',
  grid: {
    top: 20,
    right: 28,
    bottom: 58,
    left: 12,
    containLabel: true
  },
  tooltip: {
    ...tooltipBase,
    trigger: 'item'
  },
  legend: { ...legendBase, show: false },
  xAxis: {
    ...axisCommon,
    type: 'value',
    nameLocation: 'middle',
    nameGap: 30,
    nameTextStyle: { fontSize: 12, color: THEME.muted },
    axisLabel: { ...axisCommon.axisLabel, formatter: '{value}s' }
  },
  yAxis: {
    ...axisCommon,
    type: 'value',
    nameLocation: 'middle',
    nameGap: 46,
    nameTextStyle: { fontSize: 12, color: THEME.muted },
    axisLabel: { ...axisCommon.axisLabel, formatter: '{value}s' }
  },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0 },
    { type: 'inside', yAxisIndex: 0 },
    { ...sliderStyle, type: 'slider', xAxisIndex: 0, bottom: 8, height: 20 }
  ]
}

export default {
  components: { chipGroup },
  props: {
    lang: { type: Object, required: false, default: () => ({}) }
  },
  data() {
    return {
      chartInstance: null,
      stopResize: null,
      ttk_ttm: ttk_ttm_data,
      categories: [],
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
    filterItems() {
      return this.categories.map(category => ({
        key: category,
        label: this.isEnglish ? (this.categoryI18n[category] || category) : category,
        active: Boolean(this.filter[category])
      }))
    },
    weaponCount() {
      return this.categories
        .filter(cat => this.ALL || this.filter[cat])
        .reduce((sum, cat) => sum + Object.keys(this.ttk_ttm[cat] || {}).length, 0)
    },
    selectionSummary() {
      const count = this.categories.filter(cat => this.filter[cat]).length
      if (count === 0) {
        return this.isEnglish ? 'All archetypes' : '全部枪械大类'
      }
      return this.isEnglish ? `${count} archetypes selected` : `已选 ${count} 个大类`
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
    guideCards() {
      return this.isEnglish
        ? [
            { title: 'Left', body: 'Shorter TTK: lethal damage lands faster.' },
            { title: 'Up', body: 'Higher TTM: more room for missed shots.' },
            { title: 'Top-left', body: 'Fast and forgiving, usually the strongest.', tone: 'good' },
            { title: 'Bottom-right', body: 'Needs clean tracking or tight openings.', tone: 'warn' }
          ]
        : [
            { title: '越靠左', body: 'TTK 更短，更快打出致死伤害。' },
            { title: '越靠上', body: 'TTM 更高，失误空间更大，容错更好。' },
            { title: '左上角', body: '又快又稳，通常最强势。', tone: 'good' },
            { title: '右下角', body: '更吃跟枪或开火时机。', tone: 'warn' }
          ]
    }
  },
  mounted() {
    this.initCategoriesAndFilter()
    this.initChart()
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
    buildOption(series) {
      return {
        ...DEFAULT_OPTIONS,
        tooltip: {
          ...DEFAULT_OPTIONS.tooltip,
          formatter: params => {
            const { seriesName, data, color } = params
            if (!data) return ''
            const [ttk, ttm, rank, category] = data
            return `
              <div style="font-weight:700;margin-bottom:8px;">
                <span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:999px;margin-right:8px;"></span>
                ${seriesName}
              </div>
              <div style="padding-left:18px;">${this.isEnglish ? 'Rank in ' : '在 '}${category}${this.isEnglish ? '' : ' 中排名'} <span style="font-weight:700;">#${rank}</span></div>
              <div style="padding-left:18px;">TTK: <span style="font-weight:700;">${ttk.toFixed(3)}s</span></div>
              <div style="padding-left:18px;">TTM: <span style="font-weight:700;">${ttm.toFixed(3)}s</span></div>
            `
          }
        },
        xAxis: {
          ...DEFAULT_OPTIONS.xAxis,
          name: this.isEnglish ? 'Faster kill ← TTK (s)' : '越靠左击杀越快 · TTK (s)'
        },
        yAxis: {
          ...DEFAULT_OPTIONS.yAxis,
          name: this.isEnglish ? 'TTM (s) ↑ more tolerance' : '越靠上容错越高 · TTM (s)'
        },
        series
      }
    },
    initChart() {
      const chartDom = this.$refs.chartContainer
      this.chartInstance = markRaw(echarts.init(chartDom))
      this.updateChartSeries([])
    },
    formatChartData(selectedCategories = []) {
      const seriesData = []
      const categoriesToProcess = selectedCategories.length > 0 ? selectedCategories : this.categories

      for (const category of categoriesToProcess) {
        if (this.ttk_ttm[category]) {
          for (const weaponName in this.ttk_ttm[category]) {
            const weaponData = this.ttk_ttm[category][weaponName]
            seriesData.push({
              name: weaponName,
              type: 'scatter',
              data: [[weaponData.TTK, weaponData.TTM, weaponData.rank, category]],
              symbolSize: 14,
              itemStyle: {
                color: weaponData.rank <= 2 ? THEME.teal : THEME.accent
              },
              emphasis: {
                focus: 'series',
                label: {
                  show: true,
                  formatter: '{b}',
                  position: 'top',
                  color: THEME.text,
                  fontSize: 13
                }
              }
            })
          }
        }
      }
      return seriesData
    },
    initCategoriesAndFilter() {
      this.categories = Object.keys(this.ttk_ttm)
      this.filter = this.categories.reduce((acc, cat) => {
        acc[cat] = false
        return acc
      }, {})
    },
    changeFilter(category) {
      this.filter[category] = !this.filter[category]
      this.handleFilter()
    },
    handleAll() {
      this.ALL = true
      this.categories.forEach(cat => {
        this.filter[cat] = false
      })
      this.updateChartSeries([])
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
      const newSeries = this.formatChartData(selectedCategories)
      this.chartInstance.setOption(this.buildOption(newSeries), { replaceMerge: ['series', 'xAxis', 'yAxis', 'tooltip'] })
    },
    resizeChart() {
      if (this.chartInstance) {
        this.chartInstance.resize()
      }
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
        <h2 class="view-title">{{ isEnglish ? 'TTK / TTM Matrix' : 'TTK / TTM 矩阵' }}</h2>
        <p class="view-sub">
          {{ isEnglish
            ? 'Each weapon placed by kill speed and miss tolerance.'
            : '按击杀速度与失误容错，定位每把武器。' }}
        </p>
      </div>
      <div class="toolbar-group">
        <span class="badge">{{ isEnglish ? 'Weapons' : '武器' }} <strong>{{ weaponCount }}</strong></span>
        <span class="badge">{{ selectionSummary }}</span>
      </div>
    </header>

    <div class="view-body body-grid">
      <section class="panel stage">
        <div class="toolbar">
          <span class="toolbar-label">{{ isEnglish ? 'Archetype' : '大类' }}</span>
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

      <aside class="panel guide">
        <h3 class="panel-title">{{ isEnglish ? 'Reading guide' : '读图指南' }}</h3>
        <div class="quadrant well">
          <span class="q q-good">{{ isEnglish ? 'Fast + forgiving' : '快 + 稳' }}</span>
          <span class="q">{{ isEnglish ? 'Slow + forgiving' : '慢 + 稳' }}</span>
          <span class="q">{{ isEnglish ? 'Fast + strict' : '快 + 严' }}</span>
          <span class="q q-warn">{{ isEnglish ? 'Slow + strict' : '慢 + 严' }}</span>
        </div>
        <article v-for="item in guideCards" :key="item.title" class="guide-item" :class="item.tone">
          <h4>{{ item.title }}</h4>
          <p>{{ item.body }}</p>
        </article>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.body-grid {
  grid-template-columns: minmax(0, 1fr) clamp(220px, 16vw, 290px);
}

.guide {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.quadrant {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 6px;
  flex-shrink: 0;
  min-height: 112px;
  padding: 8px;
}

.q {
  display: grid;
  place-items: center;
  padding: 4px;
  border-radius: var(--r-sm);
  background: var(--surface);
  box-shadow: var(--raised-sm);
  font-size: 0.74rem;
  color: var(--text-muted);
  text-align: center;
}

.q-good {
  color: var(--teal);
  font-weight: 700;
}

.q-warn {
  color: var(--accent);
  font-weight: 700;
}

.guide-item {
  padding: 10px 12px;
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--raised-sm);
}

.guide-item h4 {
  margin: 0;
  font-size: 0.86rem;
}

.guide-item.good h4 {
  color: var(--teal);
}

.guide-item.warn h4 {
  color: var(--accent);
}

.guide-item p {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
