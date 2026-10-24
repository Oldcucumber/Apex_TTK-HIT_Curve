<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
import { ARMORS } from '../data/meta.js'
import { armorName, t } from '../i18n/index.js'
import ApexLogo from './ApexLogo.vue'
import Seg from './Seg.vue'

const TABS = ['overview', 'explore', 'compare', 'hitrate']
const DOC_URL = 'https://docs.qq.com/sheet/DVHRMRG9Jdm5Udm10?tab=000001'

const armorOptions = computed(() =>
  ARMORS.map(a => ({
    value: a.key,
    label: store.mobile ? t(`armor.short.${a.key}`) : armorName(a.key),
    title: `${armorName(a.key)} (${a.hp})`,
    color: `var(${a.color})`
  }))
)
const showArmor = computed(() => store.tab !== 'hitrate')
</script>

<template>
  <header class="topbar">
    <a class="brand" href="#overview" @click.prevent="store.tab = 'overview'">
      <ApexLogo />
      <strong>Apex Weapons Lab</strong>
    </a>

    <nav v-if="!store.mobile" class="tabs" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab"
        role="tab"
        :aria-selected="store.tab === tab"
        @click="store.tab = tab"
      >
        {{ t(`nav.${tab}`) }}
      </button>
    </nav>

    <div class="grow"></div>

    <div v-if="showArmor" class="armor">
      <span class="label">{{ t('armor.label') }}</span>
      <Seg v-model="store.armor" :options="armorOptions" />
    </div>

    <button class="btn lang" :title="t('lang.toggle')" @click="store.lang = store.lang === 'zh' ? 'en' : 'zh'">
      {{ store.lang === 'zh' ? 'EN' : '中' }}
    </button>

    <button
      class="icon-btn"
      :title="t('theme.toggle')"
      :aria-label="t('theme.toggle')"
      @click="store.theme = store.theme === 'dark' ? 'light' : 'dark'"
    >
      <svg v-if="store.theme === 'dark'" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" /></svg>
      <svg v-else viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></svg>
    </button>

    <a class="icon-btn" :href="DOC_URL" target="_blank" rel="noopener noreferrer" :title="t('nav.doc')" :aria-label="t('nav.doc')">
      <svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6" /></svg>
    </a>
  </header>

  <!-- Mobile: tabs move to a bottom bar within thumb reach -->
  <nav v-if="store.mobile" class="tabbar" role="tablist">
    <button
      v-for="tab in TABS"
      :key="tab"
      role="tab"
      :aria-selected="store.tab === tab"
      @click="store.tab = tab"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path v-if="tab === 'overview'" d="M4 6h16M4 12h16M4 18h10" />
        <path v-else-if="tab === 'explore'" d="M5 19V5M5 19h14M9 14h.01M13 9h.01M16 13h.01M11 16h.01" />
        <path v-else-if="tab === 'compare'" d="M12 3 20 8v8l-8 5-8-5V8zM12 8l4 2.5v3L12 16l-4-2.5v-3z" />
        <path v-else d="M4 19h16M5 16c3-8 6-10 14-11" />
      </svg>
      <span>{{ t(`nav.${tab}`) }}</span>
    </button>
  </nav>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 56px;
  padding: 0 24px;
}

.grow {
  flex: 1;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-right: 10px;
  white-space: nowrap;
}

.brand strong {
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.tabs {
  display: flex;
  gap: 2px;
}

.tabs button {
  position: relative;
  height: 56px;
  padding: 0 12px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 13.5px;
  font-weight: 500;
  transition: color 120ms ease;
}

.tabs button:hover {
  color: var(--text);
}

.tabs button[aria-selected='true'] {
  color: var(--text);
  font-weight: 650;
}

.tabs button[aria-selected='true']::after {
  content: '';
  position: absolute;
  right: 12px;
  bottom: 0;
  left: 12px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--brand);
}

.armor {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang {
  width: 38px;
  padding: 0;
  font-weight: 600;
}

.tabbar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 4px 8px calc(4px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--line);
  background: color-mix(in srgb, var(--panel) 92%, transparent);
  backdrop-filter: blur(12px);
}

.tabbar button {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 0 4px;
  border: 0;
  background: transparent;
  color: var(--text-3);
  font-size: 11px;
}

.tabbar svg {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tabbar button[aria-selected='true'] {
  color: var(--brand);
  font-weight: 650;
}

@media (max-width: 760px) {
  .topbar {
    flex-wrap: wrap;
    gap: 8px;
    min-height: 0;
    padding: 10px 12px 6px;
  }

  .brand strong {
    font-size: 14px;
  }

  .armor {
    order: 5;
    width: 100%;
  }

  .armor .label {
    display: none;
  }

  .armor :deep(.seg) {
    display: grid;
    flex: 1;
    grid-template-columns: repeat(4, 1fr);
  }

  .armor :deep(.seg button) {
    justify-content: center;
    height: 30px;
  }
}
</style>
