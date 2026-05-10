<script>
import * as echarts from 'echarts'
import { markRaw } from 'vue'
import ttk_ttm_data from '@/data/ttk_ttm.js'

const CHART_THEME = {
  accent: '#97cbff',
  accentSoft: '#8de7c1',
  surface: 'rgba(16, 22, 30, 0.94)',
  text: '#e2e6ee',
  muted: '#a6b0c2',
  grid: 'rgba(166, 176, 194, 0.14)'
}

const DEFAULT_OPTIONS = {
  animationDuration: 320,
  backgroundColor: 'transparent',
  grid: {
    top: 18,
    right: 220,
    bottom: 70,
    left: 74,
    containLabel: true
  },
  tooltip: {
    trigger: 'item',
    backgroundColor: CHART_THEME.surface,
    borderColor: 'rgba(151, 203, 255, 0.28)',
    borderWidth: 1,
    textStyle: { color: CHART_THEME.text }
  },
  legend: {
    type: 'scroll',
    orient: 'vertical',
    right: 0,
    top: 24,
    bottom: 24,
    textStyle: {
      fontSize: 13,
      color: CHART_THEME.muted
    },
    pageTextStyle: {
      color: CHART_THEME.muted
    }
  },
  xAxis: {
    type: 'value',
    nameLocation: 'middle',
    nameGap: 42,
    nameTextStyle: { fontSize: 14, color: CHART_THEME.muted },
    axisLabel: { formatter: '{value}s', color: CHART_THEME.muted },
    axisLine: { lineStyle: { color: 'rgba(166, 176, 194, 0.3)' } },
    splitLine: { lineStyle: { color: CHART_THEME.grid } }
  },
  yAxis: {
    type: 'value',
    nameLocation: 'middle',
    nameGap: 56,
    nameTextStyle: { fontSize: 14, color: CHART_THEME.muted },
    axisLabel: { formatter: '{value}s', color: CHART_THEME.muted },
    axisLine: { lineStyle: { color: 'rgba(166, 176, 194, 0.3)' } },
    splitLine: { lineStyle: { color: CHART_THEME.grid } }
  },
  dataZoom: [
    { type: 'inside', xAxisIndex: 0 },
    { type: 'inside', yAxisIndex: 0 },
    {
      type: 'slider',
      xAxisIndex: 0,
      bottom: 14,
      height: 24,
      borderColor: 'rgba(151, 203, 255, 0.14)',
      fillerColor: 'rgba(151, 203, 255, 0.18)',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      handleStyle: { color: CHART_THEME.accent },
      textStyle: { color: CHART_THEME.muted }
    }
  ]
}

export default {
  props: {
    lang: { type: Object, required: false, default: () => ({}) }
  },
  data() {
    return {
      chartInstance: null,
      ttk_ttm: ttk_ttm_data,
      categories: [],
      filter: {},
      ALL: true
    }
  },
  computed: {
    isEnglish() {
      return this.lang?.labels?.hit_rate === 'Hit Rate'
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
            { title: 'Left side', body: 'Shorter TTK means the weapon reaches lethal damage faster.' },
            { title: 'Upper side', body: 'Higher TTM means more room for missed shots before the duel collapses.' },
            { title: 'Top-left', body: 'Weapons here usually balance speed and forgiveness well.' },
            { title: 'Bottom-right', body: 'These picks ask for cleaner tracking or tighter openings.' }
          ]
        : [
            { title: '左侧', body: 'TTK 更短，代表更快打出致死伤害。' },
            { title: '上方', body: 'TTM 更高，代表失误空间更大，容错更好。' },
            { title: '左上角', body: '通常是节奏和容错都更占优的区域。' },
            { title: '右下角', body: '这类武器往往更吃跟枪或时机。' }
          ]
    }
  },
  mounted() {
    this.initCategoriesAndFilter()
    this.initChart()
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
                color: weaponData.rank <= 2 ? CHART_THEME.accentSoft : CHART_THEME.accent
              },
              emphasis: {
                focus: 'series',
                label: {
                  show: true,
                  formatter: '{b}',
                  position: 'top',
                  color: CHART_THEME.text,
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
  <div class="page-shell">
    <section class="page-header">
      <div class="page-header-copy">
        <p class="page-eyebrow">{{ isEnglish ? 'Tolerance map' : '容错地图' }}</p>
        <h2 class="page-title">{{ isEnglish ? 'TTK / TTM Matrix' : 'TTK / TTM 矩阵' }}</h2>
        <p class="page-subtitle">
          {{ isEnglish
            ? 'This view positions each weapon by lethality speed and miss tolerance, so you can spot forgiving but still dangerous picks.'
            : '这个视图把每把武器放到“击杀速度”和“失误容错”两个维度上，便于识别又快又稳的选择。' }}
        </p>
      </div>
      <span class="section-badge">{{ selectionSummary }}</span>
    </section>

    <div class="analysis-layout">
      <section class="surface-card chart-card">
        <div class="surface-header">
          <div>
            <h3 class="surface-title">{{ isEnglish ? 'Scatter view' : '散点视图' }}</h3>
            <p class="surface-description">
              {{ isEnglish
                ? 'Pan, zoom and hover to compare how each archetype trades raw speed against forgiveness.'
                : '可平移、缩放和悬停查看不同大类如何在击杀速度与容错之间做取舍。' }}
            </p>
          </div>
          <div class="chart-note">
            <span>{{ isEnglish ? 'Focus' : '重点' }}</span>
            <strong>{{ isEnglish ? 'Top-left is usually strongest' : '左上角通常更强势' }}</strong>
          </div>
        </div>

        <div ref="chartContainer" class="chart-host scatter-stage"></div>
      </section>

      <aside class="surface-card guide-card">
        <div class="surface-header">
          <div>
            <h3 class="surface-title">{{ isEnglish ? 'Reading guide' : '读图指南' }}</h3>
            <p class="surface-description">
              {{ isEnglish
                ? 'Use these cues to interpret where a weapon sits before drilling into the tooltip details.'
                : '先用这些提示建立直觉，再结合 tooltip 看具体数值和排名。' }}
            </p>
          </div>
        </div>

        <div class="guide-grid">
          <article v-for="item in guideCards" :key="item.title" class="guide-item">
            <h4>{{ item.title }}</h4>
            <p>{{ item.body }}</p>
          </article>
        </div>
      </aside>
    </div>

    <section class="surface-card filter-card">
      <div class="surface-header">
        <div>
          <h3 class="surface-title">{{ isEnglish ? 'Archetype filter' : '枪械大类筛选' }}</h3>
          <p class="surface-description">
            {{ isEnglish
              ? 'Isolate a family when you want a cleaner comparison among similar handling patterns.'
              : '当你只想比较相近手感的武器时，可以先按大类做隔离。' }}
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
.analysis-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) minmax(320px, 0.9fr);
  gap: 20px;
}

.chart-card,
.guide-card,
.filter-card {
  padding: 28px;
}

.scatter-stage {
  min-height: 620px;
}

.chart-note {
  min-width: 220px;
  padding: 16px 18px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.chart-note span {
  display: block;
  margin-bottom: 8px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}

.guide-grid {
  display: grid;
  gap: 14px;
}

.guide-item {
  padding: 18px 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--md-sys-color-outline-variant);
}

.guide-item h4 {
  margin: 0;
  font-size: 0.98rem;
}

.guide-item p {
  margin: 10px 0 0;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.6;
}

@media (max-width: 960px) {
  .analysis-layout {
    grid-template-columns: 1fr;
  }

  .chart-card,
  .guide-card,
  .filter-card {
    padding: 22px;
  }

  .scatter-stage {
    min-height: 520px;
  }
}

@media (max-width: 640px) {
  .scatter-stage {
    min-height: 420px;
  }
}
</style>
