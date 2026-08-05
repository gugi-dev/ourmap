<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Menu, Sun, Moon, Trash2, X } from 'lucide-vue-next'
import Landing from './components/Landing.vue'
import WorldMap from './components/WorldMap.vue'
import SidePanel from './components/SidePanel.vue'
import ProfileSelector from './components/ProfileSelector.vue'
import GoalProgress from './components/GoalProgress.vue'
import StatsPanel from './components/StatsPanel.vue'
import Logo from './components/Logo.vue'
import { useVisitedCountries } from './composables/useVisitedCountries.js'
import { useConfetti } from './composables/useConfetti.js'
import { useTheme } from './composables/useTheme.js'

const authenticated = ref(localStorage.getItem('ourmap-auth') === 'true')

const { profiles, activeProfileId, visitedCount, clearAll, loading, error } =
  useVisitedCountries()

const { checkMilestone, seed: seedMilestones } = useConfetti()
const { toggle: toggleTheme, resolved: resolvedTheme } = useTheme()

const mapRef = ref(null)
const menuOpen = ref(false)
const isMobile = ref(false)
const confirmingReset = ref(false)
const statsOpen = ref(false)

const GOAL = 30

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) menuOpen.value = false
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})
onUnmounted(() => window.removeEventListener('resize', checkMobile))

const activeColor = computed(() => {
  const idx = profiles.value.findIndex(p => p.id === activeProfileId.value)
  return idx === 1 ? 'var(--profile-2)' : 'var(--profile-1)'
})

// Adopt whatever count the app loaded with, so startup doesn't look like an
// achievement. Only changes made after that point celebrate.
let milestonesArmed = false
watch(
  loading,
  isLoading => {
    if (!isLoading && !milestonesArmed) {
      seedMilestones(visitedCount.value)
      milestonesArmed = true
    }
  },
  { immediate: true },
)

watch(visitedCount, (next, prev) => {
  if (milestonesArmed && next > prev) checkMilestone(next)
})

function doReset() {
  clearAll()
  confirmingReset.value = false
}
</script>

<template>
  <Landing v-if="!authenticated" @authenticated="authenticated = true" />

  <div v-else class="app">
    <header>
      <button v-if="isMobile" class="ghost" @click="menuOpen = true" aria-label="Open menu">
        <Menu :size="19" />
      </button>

      <h1>
        <Logo :size="40" />
        <span class="wordmark">OurMap</span>
      </h1>

      <ProfileSelector />
      <div class="spacer" />

      <button class="goal-btn" @click="statsOpen = true" title="Show progress">
        <GoalProgress
          :current="visitedCount"
          :goal="GOAL"
          :color="activeColor"
          label="30 before 30"
        />
      </button>

      <button class="ghost" @click="toggleTheme"
        :aria-label="`Switch to ${resolvedTheme() === 'dark' ? 'light' : 'dark'} theme`">
        <Sun v-if="resolvedTheme() === 'dark'" :size="17" />
        <Moon v-else :size="17" />
      </button>

      <button
        class="ghost danger desktop-only"
        @click="confirmingReset = true"
        :disabled="visitedCount === 0"
        aria-label="Clear all visits"
      >
        <Trash2 :size="16" />
      </button>
    </header>

    <div class="main" v-if="!loading">
      <SidePanel v-if="!isMobile" :map-ref="mapRef" />
      <div class="map-area">
        <WorldMap ref="mapRef" />
      </div>
    </div>

    <div class="loading" v-if="loading">
      <div class="spinner" />
    </div>

    <StatsPanel v-if="statsOpen" :goal="GOAL" @close="statsOpen = false" />

    <!-- Destructive action now needs confirming; it used to fire on one click. -->
    <Teleport to="body">
      <div v-if="confirmingReset" class="scrim" @click="confirmingReset = false">
        <div class="dialog" @click.stop>
          <h2>Clear all visits?</h2>
          <p>
            This removes all {{ visitedCount }} places for this traveller. It can't be
            undone.
          </p>
          <div class="dialog-actions">
            <button class="btn" @click="confirmingReset = false">Cancel</button>
            <button class="btn btn-danger" @click="doReset">Clear all</button>
          </div>
        </div>
      </div>

      <div v-if="isMobile && menuOpen" class="scrim scrim-left" @click="menuOpen = false">
        <div class="drawer" @click.stop>
          <SidePanel :map-ref="mapRef" @close="menuOpen = false" />
        </div>
      </div>
    </Teleport>

    <Transition name="toast">
      <div class="error" v-if="error">
        <X :size="14" /> {{ error }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

header {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--surface);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
  z-index: 10;
}

h1 {
  margin: 0;
  font-size: 1.58rem;
  font-weight: 650;
  letter-spacing: -0.038em;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.spacer { flex: 1; }

.goal-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  border-radius: var(--r-lg);
  transition: transform var(--t-fast) var(--ease-out);
}
.goal-btn:hover { transform: translateY(-1px); }
.goal-btn:active { transform: scale(0.98); }

.ghost {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  background: transparent;
  color: var(--text-muted);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out),
    transform var(--t-fast) var(--ease-out);
}
.ghost:hover:not(:disabled) {
  background: var(--surface-hover);
  color: var(--text);
}
.ghost:active:not(:disabled) {
  transform: scale(0.94);
}
.ghost:disabled {
  opacity: 0.3;
  cursor: default;
}
.ghost.danger:hover:not(:disabled) {
  background: var(--danger-soft);
  color: var(--danger);
}

.main {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.map-area {
  flex: 1;
  position: relative;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spinner {
  width: 26px;
  height: 26px;
  border: 2.5px solid var(--border-subtle);
  border-top-color: var(--profile-1);
  border-radius: var(--r-full);
  animation: spin 700ms linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.error {
  position: fixed;
  bottom: var(--s-4);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--s-2);
  background: var(--danger);
  color: white;
  padding: 0.45rem 0.9rem;
  border-radius: var(--r-md);
  font-size: 0.82rem;
  box-shadow: var(--shadow-lg);
  z-index: 300;
}
.toast-enter-active, .toast-leave-active {
  transition: opacity var(--t-base) var(--ease-out), transform var(--t-base) var(--ease-spring);
}
.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

@media (max-width: 768px) {
  header { padding: var(--s-2) var(--s-3); gap: var(--s-2); }
  .wordmark { display: none; }
  .desktop-only { display: none; }
}
</style>

<!-- Unscoped: these render through Teleport, outside this component's tree. -->
<style>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: oklch(0.2 0.01 250 / 0.42);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade 160ms var(--ease-out);
}
.scrim-left {
  align-items: stretch;
  justify-content: flex-start;
  backdrop-filter: none;
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }

.drawer {
  width: 86%;
  max-width: 360px;
  height: 100%;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
  animation: slide-in 240ms var(--ease-out);
}
.drawer .panel {
  width: 100% !important;
  min-width: 100% !important;
  height: 100%;
  border-right: none !important;
}
@keyframes slide-in {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

.dialog {
  width: min(370px, calc(100vw - 2rem));
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--s-5);
  animation: pop 200ms var(--ease-spring);
}
@keyframes pop {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.dialog h2 {
  margin: 0 0 var(--s-2);
  font-size: 1.02rem;
  color: var(--text);
}
.dialog p {
  margin: 0 0 var(--s-5);
  font-size: 0.86rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--s-2);
}
.btn {
  padding: 0.42rem 0.85rem;
  font-size: 0.84rem;
  font-weight: 550;
  font-family: inherit;
  border-radius: var(--r-md);
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  transition: background var(--t-fast) var(--ease-out), transform var(--t-fast) var(--ease-out);
}
.btn:hover { background: var(--surface-hover); }
.btn:active { transform: scale(0.97); }
.btn-danger {
  background: var(--danger);
  border-color: var(--danger);
  color: white;
}
.btn-danger:hover { filter: brightness(1.06); background: var(--danger); }
</style>
