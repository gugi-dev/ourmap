<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { MapPin, Users, Camera, ArrowDown } from 'lucide-vue-next'
import Globe from './Globe.vue'
import Logo from './Logo.vue'
import { entityByCode } from '../data/entities.js'

const emit = defineEmits(['authenticated'])

// Scroll-driven state ---------------------------------------------------------
const scrollEl = ref(null)
const progress = ref(0) // 0..1 across the whole page
let raf = null

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = null
    const el = scrollEl.value
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    progress.value = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0
  })
}

// Idle motion, so the globe is alive before you touch anything. This OSCILLATES rather
// than accumulating: an ever-increasing spin eventually carries the highlighted
// countries off the visible hemisphere and leaves you staring at empty ocean.
const phase = ref(0)
let spinRaf = null

function tick() {
  phase.value += 0.007
  spinRaf = requestAnimationFrame(tick)
}

// geoOrthographic().rotate([lambda, phi]) centres longitude -lambda, hence the sign.
// Europe/Africa at rest, sweeping west to the Americas as you scroll. Safe to hardcode
// because the showcase sets are deliberately spread across every continent, so no
// rotation lands on an empty hemisphere. The sine keeps it breathing at rest.
const rotation = computed(
  () => -20 + Math.sin(phase.value) * 10 + progress.value * 80,
)

// Showcase set ---------------------------------------------------------------
// Deliberately fixed, never the real visits. This is a marketing page: it should always
// show the app at its best rather than however far along one couple happens to be.
// Split across all three states so the globe actually demonstrates the thing the copy
// claims — one colour each, blended where both have been.
const ONLY_1 = ['sct', 'nor', 'swe', 'isl', 'deu', 'cze', 'nld', 'jpn', 'vnm', 'lka', 'ken', 'can', 'per', 'chl']
const ONLY_2 = ['wls', 'prt', 'grc', 'tur', 'are', 'idn', 'npl', 'tza', 'cri', 'cub', 'nzl', 'mex']
const BOTH = ['eng', 'fra', 'esp', 'ita', 'hrv', 'aut', 'che', 'mar', 'egy', 'zaf', 'tha', 'usa', 'bra', 'arg', 'aus']

// Order for the blue phase: the globe faces Europe at rest, so lead with recognisable
// European countries and spread outward. Must contain exactly ONLY_1 + BOTH.
const BLUE_ORDER = [
  'fra', 'esp', 'ita', 'deu', 'eng', 'hrv', 'aut', 'che', 'nld', 'sct', 'nor', 'swe',
  'isl', 'cze', 'usa', 'bra', 'tha', 'mar', 'egy', 'zaf', 'aus', 'jpn', 'can', 'arg',
  'vnm', 'lka', 'ken', 'per', 'chl',
]

// A handful have photo memories — the third section promises pins, so it should show them.
const PIN_CODES = ['ita', 'jpn', 'esp', 'tha', 'mar', 'usa', 'hrv', 'zaf']

// Label points, so the globe can place pins without importing the data itself.
const POINTS = Object.fromEntries(
  PIN_CODES.map(c => [c, [entityByCode[c].labelX, entityByCode[c].labelY]]).filter(Boolean),
)

function take(list, t) {
  return list.slice(0, Math.round(list.length * Math.max(0, Math.min(1, t))))
}

// A 0..1 ramp that only starts moving once scroll passes `from`.
function ramp(from, to) {
  return (progress.value - from) / (to - from)
}

// Staged so the three colours arrive in order rather than all at once.
//
// The countries destined for BOTH deliberately start as one traveller's and only turn
// violet later — so you actually watch a place become shared, which is the thing the
// second section is describing.
const states = computed(() => {
  const out = {}

  // 1. Blue fills in first, and starts well along so the hero is never a bare globe.
  for (const c of take(BLUE_ORDER, 0.45 + progress.value * 2)) out[c] = 'p1'

  // 2. The second traveller's own places arrive in coral.
  for (const c of take(ONLY_2, ramp(0.12, 0.5))) out[c] = 'p2'

  // 3. Overlaps turn violet, overwriting the blue they were assigned in step 1.
  for (const c of take(BOTH, ramp(0.4, 0.78))) out[c] = 'both'

  return out
})

const pins = computed(() => take(PIN_CODES, ramp(0.6, 0.92)))

onMounted(() => {
  scrollEl.value?.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
  if (!reduceMotion) tick()
})

onUnmounted(() => {
  scrollEl.value?.removeEventListener('scroll', onScroll)
  if (raf) cancelAnimationFrame(raf)
  if (spinRaf) cancelAnimationFrame(spinRaf)
})

function scrollToEnd() {
  scrollEl.value?.scrollTo({ top: scrollEl.value.scrollHeight, behavior: 'smooth' })
}

// Gate ------------------------------------------------------------------------
const word = ref('')
const error = ref(false)
const shaking = ref(false)

function submit() {
  if (word.value.trim().toLowerCase() === 'mucmaz') {
    localStorage.setItem('ourmap-auth', 'true')
    emit('authenticated')
  } else {
    error.value = true
    shaking.value = true
    setTimeout(() => (shaking.value = false), 480)
  }
}

const SECTIONS = [
  {
    icon: MapPin,
    kicker: 'The map',
    title: 'Track your travel adventures',
    body:
      'Every place you have actually stood in, filled in on one living map — ' +
      '239 countries, constituent countries and territories.',
  },
  {
    icon: Users,
    kicker: 'Together',
    title: 'Two travellers, one map',
    body:
      'Each of you gets a colour. Where your travels overlap, the map blends them — ' +
      'so you can see at a glance where you have been together and where you have ' +
      'still got ground to cover.',
  },
  {
    icon: Camera,
    kicker: 'The memories',
    title: 'Save your memories',
    body:
      'Pin photos to the places they happened. Every country becomes a small album ' +
      'you can open years later and still remember the day.',
  },
]
</script>

<template>
  <div class="landing" ref="scrollEl">
    <nav>
      <Logo :size="46" />
      <span class="wordmark">OurMap</span>
      <span class="nav-spacer" />
      <button class="nav-cta" @click="scrollToEnd">Enter</button>
    </nav>

    <div class="stage">
      <!-- Pinned visual -->
      <div class="globe-col">
        <div class="globe-wrap" :style="{ transform: `scale(${1 - progress * 0.1})` }">
          <Globe :rotation="rotation" :states="states" :pins="pins" :points="POINTS" />
        </div>
      </div>

      <!-- Scrolling copy -->
      <div class="copy-col">
        <section class="hero">
          <h1>
            Every country<br />
            you have ever<br />
            <em>stood in.</em>
          </h1>
          <p class="lede">
            A shared map for two travellers, one goal, and the memories in between.
          </p>
          <button class="scroll-hint" @click="scrollToEnd">
            <ArrowDown :size="15" /> See how it works
          </button>
        </section>

        <section v-for="s in SECTIONS" :key="s.title" class="feature">
          <span class="kicker"><component :is="s.icon" :size="13" /> {{ s.kicker }}</span>
          <h2>{{ s.title }}</h2>
          <p>{{ s.body }}</p>
        </section>

        <section class="gate">
          <h2>Welcome back</h2>
          <p>This one is private. You know the word.</p>
          <form :class="{ shake: shaking }" @submit.prevent="submit">
            <input
              v-model="word"
              type="password"
              placeholder="Our secret word"
              :class="{ error }"
              @input="error = false"
            />
            <button type="submit">Enter</button>
          </form>
          <p class="err" v-if="error">That's not it.</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.landing {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg);
  scroll-behavior: smooth;
}

nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: var(--s-3) var(--s-6);
  background: color-mix(in oklab, var(--bg) 78%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-subtle);
}
.wordmark {
  font-weight: 650;
  letter-spacing: -0.036em;
  font-size: 1.72rem;
}
.nav-spacer { flex: 1; }
.nav-cta {
  padding: 0.32rem 0.8rem;
  font-size: 0.8rem;
  font-weight: 550;
  border-radius: var(--r-full);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
}
.nav-cta:hover { background: var(--surface-hover); }
.nav-cta:active { transform: scale(0.96); }

.stage {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: var(--s-8);
  max-width: 1560px;
  margin: 0 auto;
  padding: 0 var(--s-6);
}

/* Pinned globe column */
.globe-col {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  order: 2;
}
.globe-wrap {
  width: min(100%, 700px);
  aspect-ratio: 1;
  transition: transform 500ms var(--ease-out);
}

.copy-col { order: 1; }

/* The nav is fixed, so every section needs headroom or its first element lands
 * underneath it. */
section {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--s-4);
  padding: calc(74px + var(--s-8)) 0 var(--s-8);
}

.hero h1 {
  margin: 0;
  font-size: clamp(3.3rem, 6.4vw, 5.6rem);
  line-height: 1.03;
  letter-spacing: -0.042em;
  font-weight: 660;
}
.hero h1 em {
  font-style: normal;
  color: var(--profile-1);
}
.lede {
  margin: 0;
  max-width: 32ch;
  font-size: 1.32rem;
  line-height: 1.58;
  color: var(--text-muted);
}
.scroll-hint {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: var(--s-2);
  padding: 0.62rem 1.15rem;
  font-size: 1.02rem;
  font-weight: 550;
  border-radius: var(--r-full);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out),
    transform var(--t-fast) var(--ease-out);
}
.scroll-hint:hover { color: var(--text); background: var(--surface-hover); }
.scroll-hint:active { transform: scale(0.97); }

.kicker {
  display: inline-flex;
  align-items: center;
  gap: 0.36rem;
  align-self: flex-start;
  padding: 0.2rem 0.55rem 0.2rem 0.45rem;
  border-radius: var(--r-full);
  background: var(--profile-1-soft);
  color: var(--profile-1-text);
  font-size: 0.82rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.feature h2,
.gate h2 {
  margin: 0;
  font-size: clamp(2.1rem, 3.9vw, 3.3rem);
  line-height: 1.12;
  letter-spacing: -0.032em;
  font-weight: 640;
}
.feature p,
.gate p {
  margin: 0;
  max-width: 40ch;
  font-size: 1.22rem;
  line-height: 1.62;
  color: var(--text-muted);
}

/* Gate */
.gate form {
  display: flex;
  gap: var(--s-2);
  max-width: 400px;
  margin-top: var(--s-3);
}
.gate input {
  flex: 1;
  padding: 0.7rem 0.95rem;
  font-family: inherit;
  font-size: 1.02rem;
  color: var(--text);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--r-md);
  outline: none;
  transition: border-color var(--t-fast) var(--ease-out);
}
.gate input:focus { border-color: var(--profile-1); }
.gate input.error { border-color: var(--danger); }
.gate input::placeholder { color: var(--text-faint); }
.gate form button {
  padding: 0.7rem 1.25rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 570;
  color: white;
  background: var(--profile-1);
  border: none;
  border-radius: var(--r-md);
  cursor: pointer;
  transition: filter var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
}
.gate form button:hover { filter: brightness(1.07); }
.gate form button:active { transform: scale(0.97); }
.err {
  color: var(--danger);
  font-size: 0.85rem;
}

.shake { animation: shake 420ms var(--ease-out); }
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  22%, 66% { transform: translateX(-7px); }
  44%, 88% { transform: translateX(7px); }
}

/* Mobile: globe pins to the top at reduced height, copy flows beneath. */
@media (max-width: 900px) {
  .stage {
    grid-template-columns: 1fr;
    gap: 0;
    padding: 0 var(--s-4);
  }
  .globe-col {
    order: 1;
    height: 46vh;
    top: 46px;
    z-index: 1;
    background: linear-gradient(to bottom, var(--bg) 78%, transparent);
  }
  .copy-col { order: 2; }
  .globe-wrap { width: min(100%, 340px); }
  section {
    min-height: auto;
    padding: var(--s-8) 0;
    gap: var(--s-3);
  }
  .hero { padding-top: var(--s-4); }
}
</style>
