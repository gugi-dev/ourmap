<script setup>
import { computed } from 'vue'
import { flagUrl } from '../utils/flags.js'
import { entityByCode } from '../data/entities.js'

const props = defineProps({
  code: { type: String, required: true },
  size: { type: Number, default: 20 },
})

const src = computed(() => flagUrl(props.code))
const label = computed(() => entityByCode[props.code]?.name || props.code)
</script>

<template>
  <img
    class="flag"
    :src="src"
    :alt="`${label} flag`"
    :width="size"
    :height="Math.round(size * 0.75)"
    loading="lazy"
    decoding="async"
  />
</template>

<style scoped>
/* A hairline inset stops white flags (Japan, Poland) dissolving into a light surface
 * without adding a visible border to the coloured ones. */
.flag {
  display: block;
  flex-shrink: 0;
  border-radius: 2px;
  object-fit: cover;
  box-shadow: inset 0 0 0 1px oklch(0.28 0.012 250 / 0.10);
}
</style>
