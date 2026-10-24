<template>
  <div class="app-shell">
    <aside class="sidebar panel">
      <div class="brand">
        <div class="brand-knob"><span>A</span></div>
        <div class="brand-copy">
          <h1>Apex Weapons Lab</h1>
          <p>TTK · HIT CURVE</p>
        </div>
      </div>

      <nav class="nav">
        <button
          v-for="tab in tabs"
          :key="tab.name"
          class="nav-item"
          :class="{ active: currentTab === tab.component, external: Boolean(tab.url) }"
          @click="handleTabClick(tab)"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="tab.icon" />
          </svg>
          <span class="nav-label">{{ lang.labels[tab.name] }}</span>
          <svg v-if="tab.url" class="nav-ext" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
          <i v-else class="nav-led"></i>
        </button>
      </nav>

      <div class="sidebar-foot">
        <span class="toolbar-label">{{ isEnglish ? 'Language' : '语言' }}</span>
        <div class="seg lang-seg">
          <button
            v-for="(item, name) in langList"
            :key="name"
            class="seg-btn"
            :class="{ active: selectedLanguage === name }"
            @click="changeLanguage(name)"
          >
            {{ item.text }}
          </button>
        </div>
      </div>
    </aside>

    <main class="content">
      <component :is="currentTab" :key="currentTab" :lang="lang" />
    </main>

    <statusbar :is-english="isEnglish" />
  </div>
</template>

<script>
import chart from './chart.vue'
import list from './list.vue'
import ttk_ttm from './ttk_ttm.vue'
import flex from './flex.vue'
import statusbar from './statusbar.vue'
import cn from '../data/cn.js'
import en from '../data/en.js'

export default {
  components: {
    chart,
    list,
    ttk_ttm,
    flex,
    statusbar
  },
  data() {
    const langList = {
      cn: { text: '中文', data: cn },
      en: { text: 'English', data: en }
    }
    const tabs = [
      { name: 'ttk_curve', component: 'chart', icon: 'M3 19h18M4 15l5-6 4 4 7-8' },
      { name: 'ttk_ttm', component: 'ttk_ttm', icon: 'M4 4v16h16M9 15h.01M13 9h.01M16 14h.01M8 10h.01' },
      { name: 'flex', component: 'flex', icon: 'M5 20V10M12 20V4M19 20v-7' },
      { name: 'self_test', component: 'list', icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z' },
      { name: 'ori_doc', url: 'https://docs.qq.com/sheet/DVHRMRG9Jdm5Udm10?tab=000001', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6' }
    ]

    return {
      selectedLanguage: 'cn',
      langList,
      lang: cn,
      tabs,
      currentTab: 'chart'
    }
  },
  computed: {
    isEnglish() {
      return this.selectedLanguage === 'en'
    }
  },
  methods: {
    handleTabClick(tab) {
      if (tab.url) {
        window.open(tab.url, '_blank', 'noopener')
      } else {
        this.currentTab = tab.component
      }
    },
    changeLanguage(name) {
      this.selectedLanguage = name
      this.lang = this.langList[name].data
    }
  }
}
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: clamp(204px, 13.5vw, 240px) minmax(0, 1fr);
  grid-template-rows: minmax(0, 1fr) auto;
  gap: var(--gap);
  height: 100vh;
  padding: 16px 18px 12px;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 14px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 2px;
}

.brand-knob {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(145deg, #f7f9fc, #d3dae6);
  box-shadow: var(--raised-sm);
}

.brand-knob span {
  display: grid;
  place-items: center;
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: linear-gradient(145deg, var(--accent-hi), var(--accent));
  box-shadow: inset 1px 1px 3px rgba(255, 255, 255, 0.5), inset -2px -2px 4px rgba(150, 50, 20, 0.35);
  color: var(--accent-ink);
  font-weight: 800;
  font-size: 1.05rem;
}

.brand-copy h1 {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.15;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.brand-copy p {
  margin: 3px 0 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  color: var(--text-muted);
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 11px;
  border: 0;
  border-radius: var(--r-md);
  background: var(--surface);
  box-shadow: var(--raised-sm);
  color: var(--text-soft);
  font-size: 0.86rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: box-shadow 160ms ease, color 160ms ease;
}

.nav-item:hover {
  color: var(--text);
}

.nav-item:active {
  box-shadow: var(--inset-sm);
}

.nav-item.active {
  box-shadow: var(--inset);
  color: var(--text);
  font-weight: 700;
}

.nav-icon,
.nav-ext {
  flex-shrink: 0;
  width: 19px;
  height: 19px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-item.active .nav-icon {
  stroke: var(--accent);
}

.nav-ext {
  width: 15px;
  height: 15px;
  opacity: 0.6;
}

.nav-label {
  flex: 1;
  min-width: 0;
  line-height: 1.25;
}

.nav-led {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b4bccb;
  box-shadow: inset 1px 1px 2px rgba(0, 0, 0, 0.18);
}

.nav-item.active .nav-led {
  background: var(--accent);
  box-shadow: 0 0 7px var(--accent), inset 1px 1px 1px rgba(255, 255, 255, 0.35);
}

.nav-item.external {
  margin-top: 6px;
  background: transparent;
  box-shadow: none;
  border: 1px dashed var(--line);
}

.nav-item.external:hover {
  box-shadow: var(--raised-sm);
}

.sidebar-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
  padding: 0 4px;
}

.lang-seg {
  display: flex;
}

.lang-seg .seg-btn {
  flex: 1;
}

.content {
  min-width: 0;
  min-height: 0;
}

.app-shell > :deep(.statusbar) {
  grid-column: 1 / -1;
}

@media (max-width: 1000px), (max-height: 600px) {
  .app-shell {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    height: auto;
    min-height: 100vh;
    padding: 12px;
  }

  .sidebar {
    gap: 12px;
    padding: 14px;
  }

  .nav {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .nav-item {
    flex: 1 1 160px;
  }

  .nav-item.external {
    margin-top: 0;
  }

  .sidebar-foot {
    flex-direction: row;
    align-items: center;
    margin-top: 0;
  }
}
</style>
