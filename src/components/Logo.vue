<script setup>
import { computed, useId } from 'vue'

// Two overlapping circles — one per traveller — with the intersection filled in the
// "both of you" violet. It is the app's colour system as a mark.
//
// Two things keep it clear of Mastercard, which is two SOLID discs side by side:
//   1. These are rings, not discs, which changes the silhouette completely.
//   2. The overlap is a defined violet lens rather than a stripe of blended colour.
//
// Point 2 also fixes a real bug in the first version: it used
// `mix-blend-mode: multiply` for the overlap, and multiply darkens — so on a dark
// background the intersection collapsed to near-black and the mark vanished. An
// explicit token fill works on any surface.

const props = defineProps({
  size: { type: Number, default: 27 },
})

const W = 34
const H = 24

// clipPath ids are document-global, so two mounted instances would otherwise share
// one clip. useId() is unique per component instance.
const clipId = useId()

const width = computed(() => Math.round((props.size * W) / H))
</script>

<template>
  <svg
    class="logo"
    :width="width"
    :height="size"
    :viewBox="`0 0 ${W} ${H}`"
    fill="none"
    aria-hidden="true"
  >
    <defs>
      <clipPath :id="clipId">
        <circle cx="22" cy="12" r="9.4" />
      </clipPath>
    </defs>

    <!-- Lens first, so the two rings draw crisply over it. -->
    <circle cx="12" cy="12" r="9.4" fill="var(--profile-both)" :clip-path="`url(#${clipId})`" />

    <circle cx="12" cy="12" r="9.4" stroke="var(--profile-1)" stroke-width="2.7" />
    <circle cx="22" cy="12" r="9.4" stroke="var(--profile-2)" stroke-width="2.7" />
  </svg>
</template>

<style scoped>
.logo {
  display: block;
  flex-shrink: 0;
}
</style>
