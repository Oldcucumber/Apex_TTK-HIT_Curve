<script setup>
// Segmented single-select control. options: [{ value, label, color? }]
defineProps({
  modelValue: { type: [String, Number], required: true },
  options: { type: Array, required: true }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="seg" role="group">
    <button
      v-for="o in options"
      :key="o.value"
      :aria-pressed="modelValue === o.value"
      :title="o.title"
      @click="$emit('update:modelValue', o.value)"
    >
      <i v-if="o.color" class="dot" :style="{ '--dot': o.color }"></i>
      {{ o.label }}
    </button>
  </div>
</template>
