<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, default: 0 },
  goal: { type: Number, default: 30 },
  label: { type: String, default: '' },
  color: { type: String, default: '#3b82f6' },
})

const percentage = computed(() => Math.min(100, Math.round((props.current / props.goal) * 100)))
const circumference = 2 * Math.PI * 38
const dashOffset = computed(() => circumference - (percentage.value / 100) * circumference)
const isComplete = computed(() => props.current >= props.goal)
</script>

<template>
  <div class="goal-progress" :class="{ complete: isComplete }">
    <svg class="ring" viewBox="0 0 84 84">
      <circle class="ring-bg" cx="42" cy="42" r="38" />
      <circle class="ring-fill" cx="42" cy="42" r="38"
        :stroke="isComplete ? '#22c55e' : color"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
      />
    </svg>
    <div class="ring-content">
      <span class="ring-number">{{ current }}</span>
      <span class="ring-slash">/{{ goal }}</span>
    </div>
    <span class="ring-label" v-if="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.goal-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  position: relative;
}

.ring { width: 50px; height: 50px; transform: rotate(-90deg); }
.ring-bg { fill: none; stroke: #e2e8f0; stroke-width: 4; }
.ring-fill { fill: none; stroke-width: 4; stroke-linecap: round; transition: stroke-dashoffset 0.6s ease, stroke 0.3s ease; }

.ring-content {
  position: absolute;
  top: 0; left: 0;
  width: 50px; height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-number { font-size: 0.9rem; font-weight: 700; color: #1e293b; }
.ring-slash { font-size: 0.55rem; color: #94a3b8; font-weight: 500; }
.ring-label { font-size: 0.6rem; color: #94a3b8; white-space: nowrap; }
.complete .ring-number { color: #16a34a; }
.complete .ring-label { color: #16a34a; }
</style>
