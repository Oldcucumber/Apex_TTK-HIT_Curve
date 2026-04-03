<template>
  <div class="app-shell">
    <header class="app-topbar surface-card">
      <div class="brand-block">
        <div class="brand-emblem">A</div>
        <div class="brand-copy">
          <p class="page-eyebrow">{{ isEnglish ? 'Material Design 3' : 'Material Design 3 改版' }}</p>
          <h1 class="brand-title">Apex Weapons Lab</h1>
          <p class="brand-subtitle">
            {{ isEnglish
              ? 'A cleaner dashboard for hit-rate curves, survivability timing, flexibility metrics and self-testing.'
              : '用更清晰的界面重组命中率曲线、容错时序、灵活性指标和自测流程。' }}
          </p>
          <div class="headline-metrics">
            <div v-for="item in heroPills" :key="item.label" class="headline-pill">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </div>
          </div>
        </div>
      </div>

      <div class="topbar-tools">
        <div class="surface-card surface-card--tonal context-pill">
          <span class="context-label">{{ isEnglish ? 'Current view' : '当前视图' }}</span>
          <strong>{{ currentTabLabel }}</strong>
        </div>

        <label class="field-shell language-shell">
          <span class="field-label">{{ isEnglish ? 'Language' : '语言' }}</span>
          <select v-model="selectedLanguage" @change="changeLanguage" class="select-field">
            <option v-for="(item, name) in langList" :key="name" :value="name">{{ item.text }}</option>
          </select>
        </label>
      </div>
    </header>

    <section class="surface-card nav-shell">
      <div class="surface-header">
        <div>
          <h2 class="surface-title">{{ isEnglish ? 'Analysis Views' : '分析视图' }}</h2>
          <p class="surface-description">
            {{ isEnglish
              ? 'Move between the four in-app dashboards, or open the original source document in a new tab.'
              : '在四个站内分析面板之间切换，或直接打开原始数据文档。' }}
          </p>
        </div>
        <span class="section-badge">{{ currentTabLabel }}</span>
      </div>

      <div class="nav-items">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="nav-chip"
          :class="{ active: currentTab === tab.component, external: Boolean(tab.url) }"
          @click="handleTabClick(tab)"
        >
          <span class="nav-chip-label">{{ lang.labels[tab.name] }}</span>
          <span class="nav-chip-trailing">
            {{ tab.url ? (isEnglish ? 'Open' : '打开') : (currentTab === tab.component ? (isEnglish ? 'Live' : '当前') : '') }}
          </span>
        </button>
      </div>
    </section>

    <main class="content-area">
      <component :is="currentTab" :key="currentTab" ref="currentTabRef" :lang="lang" />
    </main>
  </div>
</template>

<script>
import chart from './chart.vue'
import list from './list.vue'
import ttk_ttm from './ttk_ttm.vue'
import flex from './flex.vue'
import cn from '../data/cn.js'
import en from '../data/en.js'

export default {
  components: {
    chart,
    list,
    ttk_ttm,
    flex
  },
  data() {
    const langList = {
      cn: { text: '中文', data: cn },
      en: { text: 'English', data: en }
    }
    const tabs = [
      { name: 'ttk_curve', component: 'chart' },
      { name: 'ttk_ttm', component: 'ttk_ttm' },
      { name: 'flex', component: 'flex' },
      { name: 'self_test', component: 'list' },
      { name: 'ori_doc', url: 'https://docs.qq.com/sheet/DVHRMRG9Jdm5Udm10?tab=000001' }
    ]

    return {
      selectedLanguage: 'cn',
      langList,
      lang: cn,
      tabs,
      currentTab: 'chart',
      currentTabComponent: null
    }
  },
  computed: {
    isEnglish() {
      return this.selectedLanguage === 'en'
    },
    currentTabLabel() {
      const activeTab = this.tabs.find(tab => tab.component === this.currentTab)
      return activeTab ? this.lang.labels[activeTab.name] : 'Apex Weapons Lab'
    },
    heroPills() {
      return this.isEnglish
        ? [
            { label: 'Views', value: '4 dashboards' },
            { label: 'Data', value: 'Static local sets' },
            { label: 'Deploy', value: 'GitHub Actions' }
          ]
        : [
            { label: '视图', value: '4 个面板' },
            { label: '数据', value: '本地静态数据集' },
            { label: '部署', value: 'GitHub Actions' }
          ]
    }
  },
  methods: {
    handleTabClick(tab) {
      if (tab.url) {
        window.open(tab.url, '_blank')
      } else {
        this.currentTab = tab.component
      }

      this.$nextTick(() => {
        this.currentTabComponent = this.$refs.currentTabRef
      })
    },
    changeLanguage() {
      this.lang = this.langList[this.selectedLanguage].data
      this.$nextTick(() => {
        if (this.currentTabComponent && typeof this.currentTabComponent.changeLang === 'function') {
          this.currentTabComponent.changeLang()
        }
      })
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.currentTabComponent = this.$refs.currentTabRef
    })
  }
}
</script>

<style scoped>
.app-shell {
  width: min(1480px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0 40px;
}

.app-topbar,
.nav-shell {
  padding: 28px;
}

.app-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
  position: sticky;
  top: 16px;
  z-index: 40;
}

.brand-block {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex: 1 1 680px;
  min-width: 0;
}

.brand-emblem {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(151, 203, 255, 0.22), rgba(141, 231, 193, 0.24));
  color: var(--md-sys-color-on-surface);
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.brand-copy {
  min-width: 0;
}

.brand-title {
  margin: 0;
  font-size: clamp(2rem, 3vw, 3.2rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.brand-subtitle {
  margin: 14px 0 0;
  max-width: 62ch;
  color: var(--md-sys-color-on-surface-variant);
  line-height: 1.65;
}

.headline-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 20px;
}

.headline-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--md-sys-color-outline-variant);
  background: rgba(255, 255, 255, 0.03);
  color: var(--md-sys-color-on-surface-variant);
}

.headline-pill strong {
  color: var(--md-sys-color-on-surface);
  font-weight: 600;
}

.topbar-tools {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: min(100%, 280px);
}

.context-pill {
  padding: 16px 18px;
}

.context-label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-sys-color-on-surface-variant);
}

.language-shell {
  min-width: 200px;
}

.nav-shell {
  margin-top: 20px;
}

.nav-items {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.nav-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-width: 220px;
  min-height: 64px;
  padding: 0 20px;
  border: 1px solid var(--md-sys-color-outline-variant);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--md-sys-color-on-surface-variant);
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease,
    color 180ms ease;
}

.nav-chip:hover {
  transform: translateY(-1px);
  border-color: rgba(151, 203, 255, 0.34);
  background: rgba(255, 255, 255, 0.04);
}

.nav-chip.active {
  background: linear-gradient(135deg, rgba(151, 203, 255, 0.22), rgba(120, 218, 204, 0.14));
  border-color: rgba(151, 203, 255, 0.32);
  color: var(--md-sys-color-on-surface);
  box-shadow: 0 18px 34px rgba(10, 15, 22, 0.22);
}

.nav-chip.external {
  border-style: dashed;
}

.nav-chip-label {
  font-size: 0.96rem;
  font-weight: 500;
}

.nav-chip-trailing {
  font-size: 0.84rem;
  color: var(--md-sys-color-primary);
}

.content-area {
  margin-top: 24px;
}

@media (max-width: 960px) {
  .app-shell {
    width: min(100%, calc(100% - 20px));
    padding-top: 16px;
  }

  .app-topbar,
  .nav-shell {
    padding: 22px;
  }

  .app-topbar {
    position: static;
  }

  .brand-block {
    flex-direction: column;
  }

  .brand-emblem {
    width: 60px;
    height: 60px;
    border-radius: 20px;
  }

  .nav-chip {
    min-width: calc(50% - 7px);
  }
}

@media (max-width: 640px) {
  .nav-chip {
    min-width: 100%;
  }
}
</style>
