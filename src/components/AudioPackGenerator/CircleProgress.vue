<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  percent: number;
  size?: number;
  strokeWidth?: number;
}>(), {
  size: 28,
  strokeWidth: 3
});

const radius = computed(() => (props.size - props.strokeWidth) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const offset = computed(() => {
  const clamped = Math.min(100, Math.max(0, props.percent));
  return circumference.value * (1 - clamped / 100);
});
</script>

<template>
  <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      :stroke-width="strokeWidth"
      class="fill-none stroke-slate-200"
    />
    <circle
      :cx="size / 2"
      :cy="size / 2"
      :r="radius"
      :stroke-width="strokeWidth"
      :stroke-dasharray="circumference"
      :stroke-dashoffset="offset"
      stroke-linecap="round"
      class="fill-none stroke-sky-400 transition-[stroke-dashoffset] duration-300"
      :transform="`rotate(-90 ${size / 2} ${size / 2})`"
    />
  </svg>
</template>
