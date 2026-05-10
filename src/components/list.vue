<script>
import * as echarts from 'echarts'
import ttks from '@/data/id_stats.js'

const CHART_THEME = {
  valid: '#8de7c1',
  invalid: '#ff8f8f',
  surface: 'rgba(16, 22, 30, 0.94)',
  text: '#e2e6ee',
  muted: '#a6b0c2',
  grid: 'rgba(166, 176, 194, 0.14)'
}

export default {
  props: {
    lang: { type: Object, required: true }
  },
  data() {
    return {
      name: this.lang.names,
      formData: {},
      jsonText: '',
      chartInstance: null,
      ttk: ttks,
      toastMessage: '',
      toastKind: ''
    }
  },
  computed: {
    isEnglish() {
      return this.lang?.labels?.hit_rate === 'Hit Rate'
    },
    entryCount() {
      return Object.keys(this.name).length
    },
    uiText() {
      return this.isEnglish
        ? {
            successCopy: 'JSON copied to clipboard.',
            failedCopy: 'Copy failed. Check clipboard permission.',
            invalidJson: 'Invalid JSON object.',
            parseSuccess: 'JSON parsed and form updated.',
            parseFailed: 'JSON parse failed',
            chartEmpty: 'No valid TTK value found for this entry',
            summary: 'Weapons filled'
          }
        : {
            successCopy: 'JSON 已复制到剪贴板。',
            failedCopy: '复制失败，请检查浏览器剪贴板权限。',
            invalidJson: '无效的 JSON 对象。',
            parseSuccess: 'JSON 已读取，表单已更新。',
            parseFailed: 'JSON 解析失败',
            chartEmpty: '未找到有效的 TTK 数值',
            summary: '已填写武器数'
          }
    },
    isFormDataEmpty() {
      return Object.values(this.formData).every(value => value === '')
    },
    isTextEmpty() {
      return this.jsonText === ''
    },
    filledCount() {
      return Object.values(this.formData).filter(value => value !== '').length
    }
  },
  watch: {
    'lang.names': {
      immediate: true,
      handler(newNames) {
        this.name = newNames
        this.rebuildFormData()
      }
    }
  },
  mounted() {
    this.rebuildFormData()
    this.chartInstance = echarts.init(this.$refs.chartContainer2)
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
    rebuildFormData() {
      const fd = {}
      for (const id of Object.keys(this.name)) {
        fd[id] = this.formData[id] || ''
      }
      this.formData = fd
    },
    showToast(message, kind) {
      this.toastMessage = message
      this.toastKind = kind
      setTimeout(() => {
        this.toastMessage = ''
        this.toastKind = ''
      }, 3200)
    },
    handleWindowResize() {
      if (!this.chartInstance) return
      if (this.isFormDataEmpty) {
        this.chartInstance.resize()
      } else {
        this.generate()
      }
    },
    copyToClipboard() {
      navigator.clipboard.writeText(this.jsonText)
        .then(() => this.showToast(this.uiText.successCopy, ''))
        .catch(() => this.showToast(this.uiText.failedCopy, 'error'))
    },
    parseAndUpdate() {
      try {
        const parsedData = JSON.parse(this.jsonText)
        if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
          throw new Error(this.uiText.invalidJson)
        }
        for (const key in parsedData) {
          if (Object.prototype.hasOwnProperty.call(this.name, key)) {
            this.formData[key] = parsedData[key]
          }
        }
        if (!this.isFormDataEmpty) {
          this.generate()
        }
        this.showToast(this.uiText.parseSuccess, '')
      } catch (error) {
        this.showToast(`${this.uiText.parseFailed}: ${error.message}`, 'error')
      }
    },
    findTTK(name, percentage) {
      for (const point of this.ttk[name] || []) {
        if (point[0] <= percentage / 100) {
          return point[1]
        }
      }
      return 0
    },
    buildChartOption(processedData) {
      return {
        animationDuration: 280,
        backgroundColor: 'transparent',
        grid: {
          top: 22,
          right: 24,
          bottom: 10,
          left: 12,
          containLabel: true
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: CHART_THEME.surface,
          borderColor: 'rgba(151, 203, 255, 0.28)',
          borderWidth: 1,
          textStyle: { color: CHART_THEME.text },
          formatter: params => {
            return params.data.category === 1
              ? `${params.name}<br/>TTK: ${params.value}s`
              : `${params.name}<br/>${this.uiText.chartEmpty}`
          }
        },
        xAxis: {
          type: 'value',
          position: 'top',
          axisLabel: { color: CHART_THEME.muted },
          axisLine: { lineStyle: { color: 'rgba(166, 176, 194, 0.3)' } },
          splitLine: { lineStyle: { color: CHART_THEME.grid } }
        },
        yAxis: {
          type: 'category',
          data: processedData.map(item => item.name),
          inverse: true,
          axisLabel: {
            color: CHART_THEME.text,
            width: 220,
            overflow: 'truncate'
          },
          axisLine: { show: false },
          axisTick: { show: false }
        },
        series: [
          {
            type: 'bar',
            barMaxWidth: 18,
            label: {
              show: true,
              position: 'right',
              color: CHART_THEME.text,
              formatter: ({ data }) => data.category === 1 ? data.value : ''
            },
            data: processedData
          }
        ]
      }
    },
    generate() {
      const notEmptyKeys = Object.keys(this.formData).filter(key => this.formData[key] !== '')
      const notEmptyJSON = {}
      const series = []

      for (const key of notEmptyKeys) {
        notEmptyJSON[key] = this.formData[key]
        const ttkValue = this.findTTK(key, this.formData[key])
        if (ttkValue !== 0) {
          series.push({ name: this.name[key] || key, value: ttkValue, category: 1 })
        } else {
          series.push({ name: this.name[key] || key, value: 5, category: 2 })
        }
      }

      this.jsonText = JSON.stringify(notEmptyJSON, null, 2)

      const processedData = [
        ...series.filter(item => item.category === 1).sort((a, b) => a.value - b.value),
        ...series.filter(item => item.category === 2)
      ].map(item => ({
        ...item,
        itemStyle: {
          color: item.category === 1 ? CHART_THEME.valid : CHART_THEME.invalid
        }
      }))

      const chartWidth = Math.max(420, this.$refs.chartViewport?.clientWidth ?? 480)
      const chartHeight = Math.max(220, 100 + processedData.length * 44)

      this.chartInstance.clear()
      this.chartInstance.resize({ width: chartWidth, height: chartHeight })
      this.chartInstance.setOption(this.buildChartOption(processedData), true)
    },
    changeLang() {
      this.name = this.lang.names
      this.rebuildFormData()
      if (!this.isFormDataEmpty || !this.isTextEmpty) {
        this.generate()
      }
    }
  }
}
</script>

<template>
  <div class="page-shell">
    <section class="page-header">
      <div class="page-header-copy">
        <p class="page-eyebrow">{{ isEnglish ? 'Practice tool' : '练习工具' }}</p>
        <h2 class="page-title">{{ lang.labels['self_test'] }}</h2>
        <p class="page-subtitle">
          {{ isEnglish
            ? 'Fill in your estimated hit rates, then generate a ranked TTK snapshot plus a reusable JSON payload.'
            : '填入你对自己命中率的估计，生成一张 TTK 排名快照，并导出可复用的 JSON。' }}
        </p>
      </div>
      <span class="section-badge">{{ uiText.summary }} · {{ filledCount }}</span>
    </section>

    <Transition name="toast-fade">
      <div v-if="toastMessage" class="toast-bar" :class="{ 'toast-error': toastKind === 'error' }" role="status">
        {{ toastMessage }}
      </div>
    </Transition>

    <div class="list-layout">
      <section class="surface-card form-card">
        <div class="surface-header">
          <div>
            <h3 class="surface-title">{{ isEnglish ? 'Input hit rates' : '输入命中率' }}</h3>
            <p class="surface-description">
              {{ isEnglish
                ? 'The form keeps every weapon visible, but the card layout and scroll container make long sessions less painful.'
                : '所有武器都保留在同一张表单中，通过卡片化布局和内部滚动降低长表单的疲劳感。' }}
            </p>
          </div>
          <div class="stat-card compact-stat">
            <p class="stat-label">{{ uiText.summary }}</p>
            <p class="stat-value">{{ filledCount }}</p>
            <p class="stat-meta">{{ isEnglish ? `out of ${entryCount} entries` : `共 ${entryCount} 项` }}</p>
          </div>
        </div>

        <div class="form-grid" :class="{ 'form-grid-scroll-end': filledCount > 20 }">
          <label v-for="(itemName, id) in name" :key="id" class="input-card">
            <span class="weapon-name">{{ itemName }}</span>
            <div class="percent-field">
              <input
                v-model="formData[id]"
                class="text-field percent-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
                placeholder="0 - 100"
              >
              <span class="percent-suffix">%</span>
            </div>
          </label>
        </div>

        <div class="form-actions">
          <button class="filled-button generate-button" @click="generate" :disabled="isFormDataEmpty">
            {{ lang.labels['generate'] }}
          </button>
        </div>
      </section>

      <section class="surface-card output-card">
        <div class="surface-header">
          <div>
            <h3 class="surface-title">{{ isEnglish ? 'Output preview' : '输出预览' }}</h3>
            <p class="surface-description">
              {{ isEnglish
                ? 'The chart ranks your current weapon pool while the JSON box stays ready for copy and later re-import.'
                : '图表会对当前武器池做排名，JSON 区域则方便复制和之后再次导入。' }}
            </p>
          </div>
        </div>

        <div ref="chartViewport" class="chart-scroll">
          <div v-if="isFormDataEmpty" class="empty-state" style="padding:24px;text-align:center;">
            {{ isEnglish ? 'Fill in at least one hit rate and press Generate.' : '请至少填写一项命中率数据并点击生成。' }}
          </div>
          <div ref="chartContainer2" class="self-chart"></div>
        </div>

        <div class="field-shell">
          <span class="field-label">JSON</span>
          <textarea
            v-model="jsonText"
            :placeholder="lang.labels['paste_here']"
            class="text-area code-area"
          ></textarea>
        </div>

        <div class="output-actions">
          <button class="tonal-button" @click="copyToClipboard" :disabled="isTextEmpty">{{ lang.labels['copy'] }}</button>
          <button class="outlined-button" @click="parseAndUpdate" :disabled="isTextEmpty">{{ lang.labels['parse_json'] }}</button>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.list-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.9fr);
  gap: 20px;
  align-items: start;
}

.form-card,
.output-card {
  padding: 28px;
}

.compact-stat {
  min-width: 160px;
}

.toast-bar {
  padding: 14px 20px;
  border-radius: 18px;
  background: var(--md-sys-color-secondary-container);
  color: var(--md-sys-color-on-secondary-container);
  font-size: 0.92rem;
  margin-bottom: 0;
}

.toast-bar.toast-error {
  background: rgba(255, 180, 171, 0.18);
  color: var(--md-sys-color-error);
  border: 1px solid rgba(255, 180, 171, 0.28);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-height: 760px;
  overflow: auto;
  padding-right: 4px;
  scroll-behavior: smooth;
  -webkit-mask-image: linear-gradient(to bottom, black 92%, transparent 100%);
  mask-image: linear-gradient(to bottom, black 92%, transparent 100%);
}

.input-card {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  min-height: 76px;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: rgba(255, 255, 255, 0.03);
  transition: border-color 180ms ease, background 180ms ease;
}

.input-card:focus-within {
  border-color: rgba(151, 203, 255, 0.38);
  background: rgba(255, 255, 255, 0.05);
}

.weapon-name {
  flex: 1;
  line-height: 1.5;
  color: var(--md-sys-color-on-surface);
}

.percent-field {
  position: relative;
  width: 112px;
  flex-shrink: 0;
}

.percent-input {
  padding-right: 34px;
  text-align: right;
}

.percent-suffix {
  position: absolute;
  top: 50%;
  right: 16px;
  transform: translateY(-50%);
  color: var(--md-sys-color-on-surface-variant);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.generate-button {
  min-width: 160px;
}

.output-card {
  position: sticky;
  top: 24px;
}

.chart-scroll {
  overflow: auto;
  max-height: 520px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: rgba(255, 255, 255, 0.02);
}

.self-chart {
  width: 100%;
  min-height: 220px;
}

.code-area {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  min-height: 120px;
}

.output-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .list-layout {
    grid-template-columns: 1fr;
  }

  .output-card {
    position: static;
  }
}

@media (max-width: 960px) {
  .form-card,
  .output-card {
    padding: 22px;
  }

  .form-grid {
    grid-template-columns: 1fr;
    max-height: 640px;
  }
}
</style>
