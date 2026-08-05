<script setup>
import { computed } from 'vue'

const props = defineProps({
  current: { type: Number, default: 0 },
  goal: { type: Number, default: 30 },
  label: { type: String, default: '' },
  color: { type: String, default: 'var(--profile-1)' },
})

const pct = computed(() => Math.min(100, (props.current / props.goal) * 100))
const CIRC = 2 * Math.PI * 38
const dashOffset = computed(() => CIRC - (pct.value / 100) * CIRC)
const isComplete = computed(() => props.current >= props.goal)
const remaining = computed(() => Math.max(0, props.goal - props.current))
</script>

<template>
  <!-- A stat card rather than a bare ring: the goal is the point of the whole app, so
       it should read as a headline figure, not a decoration in the corner. -->
  <div class="goal" :class="{ complete: isComplete }">
    <div class="ring-wrap">
      <svg class="ring" viewBox="0 0 84 84" aria-hidden="true">
        <circle class="ring-bg" cx="42" cy="42" r="38" />
        <circle
          class="ring-fill"
          cx="42" cy="42" r="38"
          :stroke="isComplete ? 'var(--success)' : color"
          :stroke-dasharray="CIRC"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
    </div>

    <div class="meta">
      <span class="label">{{ label }}</span>
      <span class="figure">
        <strong>{{ current }}</strong><span class="of">/{{ goal }}</span>
        <span class="sub" v-if="!isComplete">· {{ remaining }} to go</span>
        <span class="sub done" v-else>· reached</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.goal {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 1rem 0.45rem 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  flex-shrink: 0;
}
.goal.complete {
  border-color: var(--success);
  background: color-mix(in oklab, var(--success) 10%, var(--surface));
}

.ring-wrap {
  position: relative;
  width: 50px;
  height: 50px;
  flex-shrink: 0;
}
.ring {
  width: 50px;
  height: 50px;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: var(--border);
  stroke-width: 9;
}
.ring-fill {
  fill: none;
  stroke-width: 9;
  stroke-linecap: round;
  transition: stroke-dashoffset 700ms var(--ease-out), stroke var(--t-base) var(--ease-out);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

/* Tabular figures so the number never shifts as it counts up. */
.figure {
  display: flex;
  align-items: baseline;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  white-space: nowrap;
}
.figure strong {
  font-size: 1.72rem;
  font-weight: 680;
  color: var(--text);
}
.of {
  font-size: 1rem;
  color: var(--text-faint);
  font-weight: 500;
}

.label {
  font-size: 0.75rem;
  font-weight: 640;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-muted);
  white-space: nowrap;
}
.sub {
  margin-left: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
}
.sub.done { color: var(--success); font-weight: 600; }

.complete .figure strong { color: var(--success); }
.complete .label { color: var(--success); }

@media (max-width: 900px) {
  .label, .sub { display: none; }
  .goal { padding: 0.3rem 0.4rem; gap: 0.4rem; }
}
</style>
