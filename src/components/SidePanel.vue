<script setup>
import { ref, computed } from 'vue'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { countryFlag } from '../utils/flags.js'
import { continents, continentMap, countryToContinent } from '../data/continents.js'

const props = defineProps({
  mapRef: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const {
  allCountries, profiles, activeProfileId, visits,
  toggleCountry, isVisitedBy, visitedCount,
} = useVisitedCountries()

const search = ref('')
const activeContinent = ref(null)
const filter = ref('all')

const p1Id = computed(() => profiles.value[0]?.id)
const p2Id = computed(() => profiles.value[1]?.id)

function toggleContinent(key) {
  activeContinent.value = activeContinent.value === key ? null : key
}

function continentStats(key) {
  const codes = continentMap[key] || []
  const pid = activeProfileId.value
  const visited = codes.filter(c => isVisitedBy(pid, c)).length
  return { visited, total: codes.length }
}

const filteredCountries = computed(() => {
  const q = search.value.toLowerCase()
  const pid = activeProfileId.value
  return allCountries.filter(c => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (filter.value === 'visited' && !isVisitedBy(pid, c.id)) return false
    if (filter.value === 'unvisited' && isVisitedBy(pid, c.id)) return false
    if (activeContinent.value && countryToContinent[c.id] !== activeContinent.value) return false
    return true
  })
})

function getStatus(countryId) {
  const byP1 = isVisitedBy(p1Id.value, countryId)
  const byP2 = isVisitedBy(p2Id.value, countryId)
  if (byP1 && byP2) return 'both'
  if (byP1) return 'p1'
  if (byP2) return 'p2'
  return 'none'
}

function handleCountryClick(country) {
  toggleCountry(country.id)
}

function flyTo(e, country) {
  e.stopPropagation()
  if (props.mapRef?.flyToCountry) {
    props.mapRef.flyToCountry(country.id)
  }
  emit('close')
}
</script>

<template>
  <aside class="panel">
    <!-- Close button (mobile only) -->
    <button class="mobile-close" @click="emit('close')">&#x2715;</button>

    <!-- Stats header -->
    <div class="panel-header">
      <span class="count">{{ visitedCount }}</span>
      <span class="label">countries explored</span>
    </div>

    <!-- Continent cards -->
    <div class="continent-grid">
      <button
        v-for="cont in continents"
        :key="cont.key"
        class="continent-card"
        :class="{ active: activeContinent === cont.key }"
        @click="toggleContinent(cont.key)"
      >
        <div class="cont-top">
          <span class="cont-emoji">{{ cont.emoji }}</span>
          <span class="cont-stat"><strong>{{ continentStats(cont.key).visited }}</strong>/{{ continentStats(cont.key).total }}</span>
        </div>
        <span class="cont-name">{{ cont.name }}</span>
        <div class="cont-bar" :style="{ '--pct': (continentStats(cont.key).visited / continentStats(cont.key).total * 100) + '%', '--color': cont.color }"></div>
      </button>
    </div>

    <!-- Search -->
    <div class="search-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" />
      </svg>
      <input v-model="search" type="text" placeholder="Search countries..." class="search-input" />
    </div>

    <!-- Filters -->
    <div class="filter-row">
      <button v-for="f in [{key:'all',label:'All'},{key:'visited',label:'Visited'},{key:'unvisited',label:'Bucket list'}]"
        :key="f.key" class="filter-btn" :class="{active: filter === f.key}" @click="filter = f.key">
        {{ f.label }}
      </button>
      <span class="filter-count">{{ filteredCountries.length }}</span>
    </div>

    <!-- Country list -->
    <ul class="country-list">
      <li
        v-for="country in filteredCountries"
        :key="country.id"
        class="country-item"
        :class="getStatus(country.id)"
        @click="handleCountryClick(country)"
      >
        <span class="country-flag">{{ countryFlag(country.id) }}</span>
        <span class="country-name">{{ country.name }}</span>
        <div class="badges">
          <span v-if="isVisitedBy(p1Id, country.id)" class="badge b-p1">&#10003;</span>
          <span v-if="isVisitedBy(p2Id, country.id)" class="badge b-p2">&#10003;</span>
        </div>
        <button class="fly-btn" @click="flyTo($event, country)" title="Fly to">
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="6" cy="6" r="4" /><circle cx="6" cy="6" r="1" fill="currentColor" />
          </svg>
        </button>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.panel {
  width: 370px;
  min-width: 370px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.mobile-close {
  display: none;
  position: absolute;
  top: 0.6rem; right: 0.6rem;
  background: #f1f5f9; border: none;
  color: #64748b; cursor: pointer;
  font-size: 1.1rem;
  width: 32px; height: 32px;
  border-radius: 8px;
  z-index: 2;
}

/* Header */
.panel-header {
  padding: 1rem 1rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.count { font-size: 1.8rem; font-weight: 800; color: #1e293b; }
.label { font-size: 0.95rem; color: #94a3b8; }

/* Continent grid */
.continent-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  padding: 0.75rem 1rem;
}

.continent-card {
  padding: 0.55rem 0.5rem 0.65rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  transition: all 0.15s;
  position: relative;
  overflow: hidden;
}
.continent-card:hover { border-color: #cbd5e1; background: #f1f5f9; }
.continent-card.active { border-color: #3b82f6; background: #eff6ff; }

.cont-top { display: flex; align-items: center; gap: 0.35rem; }
.cont-emoji { font-size: 1.1rem; }
.cont-stat { font-size: 0.85rem; color: #94a3b8; }
.cont-stat strong { color: #1e293b; font-size: 1rem; }
.cont-name { font-size: 0.65rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.cont-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #f1f5f9; }
.cont-bar::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: var(--pct, 0%); background: var(--color, #3b82f6);
  border-radius: 0 2px 2px 0; transition: width 0.4s ease;
}

/* Search */
.search-wrap { position: relative; padding: 0 1rem; margin-bottom: 0.5rem; }
.search-icon { position: absolute; left: 1.55rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
.search-input {
  width: 100%; padding: 0.55rem 0.75rem 0.55rem 2.2rem;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
  color: #1e293b; font-size: 0.95rem; outline: none; transition: border-color 0.2s;
}
.search-input:focus { border-color: #3b82f6; }
.search-input::placeholder { color: #cbd5e1; }

/* Filters */
.filter-row {
  display: flex; gap: 0.3rem; padding: 0 1rem 0.6rem; align-items: center;
}
.filter-btn {
  padding: 0.35rem 0.7rem; background: transparent; border: 1px solid #e2e8f0;
  border-radius: 8px; color: #94a3b8; font-size: 0.82rem; cursor: pointer;
  transition: all 0.15s; font-weight: 500;
}
.filter-btn:hover { color: #64748b; border-color: #cbd5e1; }
.filter-btn.active { background: #f1f5f9; color: #1e293b; border-color: #cbd5e1; }
.filter-count { margin-left: auto; font-size: 0.8rem; color: #cbd5e1; }

/* Country list */
.country-list {
  list-style: none; margin: 0; padding: 0;
  overflow-y: auto; flex: 1;
}

.country-item {
  display: flex; align-items: center; gap: 0.55rem;
  padding: 0.5rem 1rem;
  cursor: pointer; color: #475569; font-size: 0.95rem;
  transition: all 0.1s;
  border-left: 3px solid transparent;
}
.country-item:hover { background: #f8fafc; }
.country-item.p1 { color: #2563eb; border-left-color: #3b82f6; }
.country-item.p2 { color: #db2777; border-left-color: #ec4899; }
.country-item.both { color: #7c3aed; border-left-color: #8b5cf6; }

.country-flag { font-size: 1.15rem; width: 1.4rem; text-align: center; flex-shrink: 0; }
.country-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.badges { display: flex; gap: 0.2rem; flex-shrink: 0; }
.badge {
  width: 18px; height: 18px; border-radius: 50%;
  font-size: 0.6rem; display: flex; align-items: center;
  justify-content: center; font-weight: 700;
}
.b-p1 { background: #dbeafe; color: #2563eb; }
.b-p2 { background: #fce7f3; color: #db2777; }

.fly-btn {
  background: none; border: none; color: #e2e8f0;
  cursor: pointer; padding: 0; line-height: 1;
  transition: color 0.15s; display: flex; flex-shrink: 0;
}
.fly-btn:hover { color: #94a3b8; }

/* Mobile: close button shown when inside mobile overlay */
.mobile-panel .mobile-close {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
