<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import WorldMap from './components/WorldMap.vue'
import SidePanel from './components/SidePanel.vue'
import ProfileSelector from './components/ProfileSelector.vue'
import GoalProgress from './components/GoalProgress.vue'
import { useVisitedCountries } from './composables/useVisitedCountries.js'
import { useConfetti } from './composables/useConfetti.js'

const {
  profiles, activeProfileId, visitedCount,
  clearAll, loading, error,
} = useVisitedCountries()

const { checkMilestone } = useConfetti()
const mapRef = ref(null)
const menuOpen = ref(false)
const isMobile = ref(false)
const GOAL = 30

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) menuOpen.value = false
}

onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => window.removeEventListener('resize', checkMobile))

const activeColor = computed(() => {
  const idx = profiles.value.findIndex(p => p.id === activeProfileId.value)
  return idx === 1 ? '#ec4899' : '#3b82f6'
})

watch(visitedCount, (newVal, oldVal) => {
  if (newVal > oldVal) checkMilestone(newVal)
})
</script>

<template>
  <div class="app">
    <header>
      <button v-if="isMobile" class="menu-btn" @click="menuOpen = true">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
          <rect y="4" width="22" height="2.5" rx="1" />
          <rect y="10" width="22" height="2.5" rx="1" />
          <rect y="16" width="22" height="2.5" rx="1" />
        </svg>
      </button>
      <h1><span class="logo-icon">&#127758;</span><span class="logo-text"> OurMap</span></h1>
      <ProfileSelector />
      <div class="spacer"></div>
      <GoalProgress :current="visitedCount" :goal="GOAL" :color="activeColor" label="30 before 30" />
      <button class="btn-reset desktop-only" @click="clearAll" :disabled="visitedCount === 0" title="Clear all visits">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 4h10M5 4V3a1 1 0 011-1h2a1 1 0 011 1v1M9 7v4M5 7v4M3 4l.5 7.5a1 1 0 001 .5h5a1 1 0 001-.5L11 4" />
        </svg>
      </button>
    </header>

    <div class="main" v-if="!loading">
      <!-- Desktop: sidebar in flex layout -->
      <SidePanel v-if="!isMobile" :map-ref="mapRef" />
      <div class="map-area">
        <WorldMap ref="mapRef" />
      </div>
    </div>

    <!-- Mobile: full-screen overlay panel -->
    <Teleport to="body">
      <div v-if="isMobile && menuOpen" class="mobile-overlay" @click="menuOpen = false">
        <div class="mobile-panel" @click.stop>
          <SidePanel :map-ref="mapRef" @close="menuOpen = false" />
        </div>
      </div>
    </Teleport>

    <div class="loading-screen" v-if="loading">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>

    <div class="error-banner" v-if="error">&#9888; {{ error }}</div>
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
  padding: 0.5rem 1rem;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  gap: 0.65rem;
  flex-shrink: 0;
  z-index: 10;
}

.menu-btn {
  background: none; border: none;
  color: #475569; cursor: pointer;
  padding: 0.15rem; flex-shrink: 0;
}

h1 {
  margin: 0;
  font-size: 1.15rem;
  color: #1e293b;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.logo-icon { font-size: 1.3rem; }
.spacer { flex: 1; }

.btn-reset {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px; padding: 0;
  background: #f8fafc; color: #94a3b8;
  border: 1px solid #e2e8f0; border-radius: 8px;
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
}
.btn-reset:hover:not(:disabled) { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }
.btn-reset:disabled { opacity: 0.25; cursor: default; }

.main { flex: 1; display: flex; overflow: hidden; }
.map-area { flex: 1; position: relative; }

.loading-screen {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 1rem; color: #94a3b8;
}

.spinner {
  width: 36px; height: 36px;
  border: 3px solid #e2e8f0; border-top-color: #3b82f6;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.error-banner {
  position: fixed; bottom: 1rem; left: 50%;
  transform: translateX(-50%);
  background: #dc2626; color: white;
  padding: 0.5rem 1.25rem; border-radius: 8px;
  font-size: 0.85rem; z-index: 300;
}

@media (max-width: 768px) {
  header { padding: 0.4rem 0.65rem; gap: 0.5rem; }
  h1 { font-size: 1rem; }
  .logo-text { display: none; }
  .desktop-only { display: none; }
}
</style>

<!-- Mobile overlay (unscoped so Teleport works) -->
<style>
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
}

.mobile-panel {
  width: 85%;
  max-width: 380px;
  height: 100%;
  background: #ffffff;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.25s ease;
}

.mobile-panel .panel {
  width: 100% !important;
  min-width: 100% !important;
  height: 100%;
  border-right: none !important;
}

@keyframes slideIn {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
</style>
