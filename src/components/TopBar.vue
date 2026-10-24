<script setup>
import { computed } from 'vue'
import { store } from '../store.js'
import { ARMORS } from '../data/meta.js'
import { t } from '../i18n/index.js'
import Seg from './Seg.vue'

const tabs = ['overview', 'explore', 'compare', 'hitrate']
const DOC_URL = 'https://docs.qq.com/sheet/DVHRMRG9Jdm5Udm10?tab=000001'

const armorOptions = computed(() =>
  ARMORS.map(a => ({
    value: a.key,
    label: store.lang === 'en' ? a.en : a.cn,
    color: `var(${a.color})`
  }))
)
const showArmor = computed(() => store.tab !== 'hitrate')
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="mark" aria-hidden="true"><i></i></span>
      <strong>Apex Weapons Lab</strong>
    </div>

    <nav class="tabs" role="tablist">
      <button
        v-for="tab in tabs"
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
      <span class="label">{{ t('armor') }}</span>
      <Seg v-model="store.armor" :options="armorOptions" />
    </div>

    <button class="btn lang" :title="t('lang.toggle')" @click="store.lang = store.lang === 'cn' ? 'en' : 'cn'">
      {{ store.lang === 'cn' ? 'EN' : '中' }}
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
  gap: 9px;
  margin-right: 10px;
  white-space: nowrap;
}

.brand strong {
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--ink);
}

.mark i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
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
  background: var(--ink);
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

@media (max-width: 900px) {
  .topbar {
    flex-wrap: wrap;
    gap: 6px 10px;
    padding: 8px 12px;
  }

  .tabs {
    order: 5;
    width: 100%;
    overflow-x: auto;
  }

  .tabs button {
    height: 38px;
  }

  .brand strong,
  .armor .label {
    display: none;
  }
}
</style>
