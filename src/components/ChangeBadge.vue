<script setup>
import { t } from '../i18n/index.js'

defineProps({ type: { type: String, default: null } })
</script>

<template>
  <span v-if="type" class="chg-badge" :class="type" :title="t(`chg.${type}`)">
    <svg v-if="type === 'buff' || type === 'nerf'" viewBox="0 0 12 12" aria-hidden="true">
      <path :d="type === 'buff' ? 'M6 2.5 10 8H2z' : 'M6 9.5 2 4h8z'" />
    </svg>
    {{ t(`chg.${type}`) }}
  </span>
</template>

<style scoped>
.chg-badge {
  --c: var(--chg-fix);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 18px;
  padding: 0 6px;
  border-radius: 5px;
  background: color-mix(in srgb, var(--c) 13%, transparent);
  color: var(--c);
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  vertical-align: 1px;
}

.chg-badge.buff { --c: var(--chg-buff); }
.chg-badge.nerf { --c: var(--chg-nerf); }
.chg-badge.new { --c: var(--chg-new); }

svg {
  width: 9px;
  height: 9px;
  fill: currentColor;
}
</style>
