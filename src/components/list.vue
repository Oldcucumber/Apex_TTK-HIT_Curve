<script>
import * as echarts from 'echarts'
import { markRaw } from 'vue'
import ttks from '@/data/id_stats.js'
import { observeResize } from '@/utils'
import { THEME, tooltipBase, axisCommon, sliderStyle } from '@/utils/theme'

const BAR_ROW_HEIGHT = 17

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
      stopResize: null,
      ttk: ttks,
      toastMessage: '',
      toastKind: '',
      toastTimer: null
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
            summary: 'Filled'
          }
        : {
            successCopy: 'JSON 已复制到剪贴板。',
            failedCopy: '复制失败，请检查浏览器剪贴板权限。',
            invalidJson: '无效的 JSON 对象。',
            parseSuccess: 'JSON 已读取，表单已更新。',
            parseFailed: 'JSON 解析失败',
            chartEmpty: '未找到有效的 TTK 数值',
            summary: '已填写'
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
    lang() {
      this.changeLang()
    }
  },
  created() {
    this.rebuildFormData()
  },
  mounted() {
    this.chartInstance = markRaw(echarts.init(this.$refs.chartContainer))
    this.stopResize = observeResize(this.$refs.chartContainer, this.handleWindowResize)
  },
  beforeUnmount() {
    if (this.stopResize) this.stopResize()
    clearTimeout(this.toastTimer)
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
      clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => {
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
      const host = this.$refs.chartContainer
      const fit = Math.max(8, Math.floor(((host?.clientHeight || 500) - 48) / BAR_ROW_HEIGHT))
      const rows = Math.min(processedData.length, fit)
      const needsScroll = rows < processedData.length

      return {
        animationDuration: 280,
        backgroundColor: 'transparent',
        grid: {
          top: 28,
          right: needsScroll ? 48 : 36,
          bottom: 10,
          left: 8,
          containLabel: true
        },
        tooltip: {
          ...tooltipBase,
          trigger: 'item',
          formatter: params => {
            return params.data.category === 1
              ? `${params.name}<br/>TTK: <b>${params.value}s</b>`
              : `${params.name}<br/>${this.uiText.chartEmpty}`
          }
        },
        xAxis: {
          ...axisCommon,
          type: 'value',
          position: 'top',
          axisLabel: { ...axisCommon.axisLabel, formatter: '{value}s' }
        },
        yAxis: {
          type: 'category',
          data: processedData.map(item => item.name),
          inverse: true,
          axisLabel: {
            color: THEME.soft,
            fontSize: 11,
            interval: 0,
            width: 190,
            overflow: 'truncate'
          },
          axisLine: { show: false },
          axisTick: { show: false }
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
            type: 'bar',
            barMaxWidth: 12,
            itemStyle: { borderRadius: [0, 6, 6, 0] },
            label: {
              show: true,
              position: 'right',
              color: THEME.soft,
              fontSize: 11,
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
          color: item.category === 1 ? THEME.teal : THEME.danger,
          opacity: item.category === 1 ? 1 : 0.55
        }
      }))

      this.chartInstance.resize()
      this.chartInstance.setOption(this.buildChartOption(processedData), {
        notMerge: true
      })
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
  <div class="view">
    <header class="view-head">
      <div>
        <h2 class="view-title">{{ lang.labels['self_test'] }}</h2>
        <p class="view-sub">
          {{ isEnglish
            ? 'Enter your hit rate per weapon to get a ranked TTK snapshot and reusable JSON.'
            : '填入每把武器的命中率，生成 TTK 排名快照与可复用的 JSON。' }}
        </p>
      </div>
      <div class="toolbar-group">
        <span class="badge">{{ uiText.summary }} <strong>{{ filledCount }} / {{ entryCount }}</strong></span>
        <button class="btn btn-primary" :disabled="isFormDataEmpty" @click="generate">
          {{ lang.labels['generate'] }}
        </button>
      </div>
    </header>

    <div class="view-body body-grid">
      <section class="panel form-panel">
        <h3 class="panel-title">{{ isEnglish ? 'Hit rates (%)' : '命中率 (%)' }}</h3>
        <div class="well form-well">
          <div class="form-grid">
            <label v-for="(itemName, id) in name" :key="id" class="input-tile">
              <span class="weapon-name" :title="itemName">{{ itemName }}</span>
              <input
                v-model="formData[id]"
                class="field percent-input"
                type="number"
                min="0"
                max="100"
                step="0.1"
                inputmode="decimal"
                placeholder="%"
              >
            </label>
          </div>
        </div>
      </section>

      <section class="panel output-panel">
        <h3 class="panel-title">{{ isEnglish ? 'TTK ranking' : 'TTK 排名' }}</h3>
        <div class="well chart-well">
          <div ref="chartContainer" class="chart-host"></div>
          <div v-if="isFormDataEmpty" class="empty-hint">
            {{ isEnglish ? 'Fill in at least one hit rate and press Generate.' : '请至少填写一项命中率并点击生成。' }}
          </div>
          <Transition name="toast">
            <div v-if="toastMessage" class="toast" :class="{ error: toastKind === 'error' }" role="status">
              {{ toastMessage }}
            </div>
          </Transition>
        </div>

        <div class="json-row">
          <textarea
            v-model="jsonText"
            :placeholder="lang.labels['paste_here']"
            class="textarea"
            spellcheck="false"
          ></textarea>
          <div class="json-actions">
            <button class="btn" :disabled="isTextEmpty" @click="copyToClipboard">{{ lang.labels['copy'] }}</button>
            <button class="btn" :disabled="isTextEmpty" @click="parseAndUpdate">{{ lang.labels['parse_json'] }}</button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.body-grid {
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
}

.form-panel,
.output-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form-well,
.chart-well {
  flex: 1;
}

.form-well {
  overflow: auto;
  padding: 10px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
  gap: 8px;
}

.input-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 4px 8px 4px 12px;
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--raised-sm);
}

.input-tile:focus-within {
  box-shadow: var(--raised-sm), 0 0 0 1.5px var(--accent);
}

.weapon-name {
  display: -webkit-box;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  font-size: 0.8rem;
  line-height: 1.25;
  color: var(--text-soft);
}

.percent-input {
  flex-shrink: 0;
  width: 74px;
  text-align: right;
}

.json-row {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  height: 104px;
}

.json-row .textarea {
  flex: 1;
  height: 100%;
}

.json-actions {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
  width: clamp(130px, 10vw, 180px);
}

.json-actions .btn {
  flex: 1;
  white-space: normal;
  line-height: 1.2;
  text-align: center;
}

.toast {
  position: absolute;
  right: 12px;
  bottom: 12px;
  left: 12px;
  padding: 8px 14px;
  border-radius: var(--r-sm);
  background: var(--surface);
  box-shadow: var(--raised-sm);
  color: var(--teal);
  font-size: 0.84rem;
  font-weight: 500;
}

.toast.error {
  color: var(--danger);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* 16:9 laptops (~768p): tighten tiles so every weapon stays on screen */
@media (min-width: 1001px) and (max-height: 860px) {
  .body-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  }

  .form-grid {
    grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
    gap: 6px;
  }

  .input-tile {
    min-height: 30px;
    padding: 2px 6px 2px 10px;
  }

  .weapon-name {
    font-size: 0.7rem;
    line-height: 1.15;
  }

  .percent-input {
    width: 58px;
    min-height: 26px;
    padding: 0 8px;
  }

  .json-row {
    height: 84px;
  }
}

@media (max-width: 1000px), (max-height: 600px) {
  .form-well {
    max-height: 520px;
  }

  .chart-well {
    min-height: 420px;
  }
}
</style>
