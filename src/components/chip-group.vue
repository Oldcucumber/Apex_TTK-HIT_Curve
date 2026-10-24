<script setup>
defineProps({
  items: { type: Array, required: true },
  allLabel: { type: String, required: true },
  allActive: { type: Boolean, default: false }
})

defineEmits(['toggle', 'all'])
</script>

<template>
  <div class="toolbar-group">
    <button class="chip" :class="{ active: allActive }" @click="$emit('all')">{{ allLabel }}</button>
    <button
      v-for="item in items"
      :key="item.key"
      class="chip"
      :class="{ active: item.active }"
      @click="$emit('toggle', item.key)"
    >
      {{ item.label }}
    </button>
  </div>
</template>
