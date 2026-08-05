<script setup>
import { computed } from 'vue'

// A monogram avatar rather than an emoji. Emoji render differently on every OS, can't
// take the traveller's identity colour, and read as decoration; an initial in the
// traveller's own colour is unambiguous and scales to any name.

const props = defineProps({
  name: { type: String, default: '' },
  variant: { type: String, default: 'p1' }, // p1 | p2
  size: { type: Number, default: 26 },
  solid: { type: Boolean, default: false },
})

const initial = computed(() => (props.name.trim()[0] || '?').toUpperCase())
</script>

<template>
  <span
    class="avatar"
    :class="[variant, { solid }]"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.44)}px` }"
    aria-hidden="true"
  >{{ initial }}</span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--r-full);
  font-weight: 620;
  letter-spacing: -0.02em;
  line-height: 1;
  user-select: none;
  /* A 1px inner top highlight reads as a lit edge — cheaper and more current than a
   * drop shadow. */
  box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.22), inset 0 0 0 1px oklch(0.28 0.012 250 / 0.06);
}

.avatar.p1 { background: var(--profile-1-soft); color: var(--profile-1-text); }
.avatar.p2 { background: var(--profile-2-soft); color: var(--profile-2-text); }

.avatar.solid.p1 { background: var(--profile-1); color: white; }
.avatar.solid.p2 { background: var(--profile-2); color: white; }
</style>
