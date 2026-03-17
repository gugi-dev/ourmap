<script setup>
import { ref, computed } from 'vue'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { countryFlag } from '../utils/flags.js'
import { continents, continentMap, countryToContinent } from '../data/continents.js'

const props = defineProps({
  mapRef: { type: Object, default: null },
})

const {
  allCountries, profiles, activeProfileId, visits,
  toggleCountry, isVisitedBy, visitedCount,
} = useVisitedCountries()

const state = ref('peek')

function handleClick() {
  if (state.value === 'expanded') state.value = 'peek'
  else if (state.value === 'peek') state.value = 'expanded'
  else state.value = 'peek'
}

const search = ref('')
const activeContinent = ref(null)
const filter = ref('all')

const p1Id = computed(() => profiles.value[0]?.id)
const p2Id = computed(() => profiles.value[1]?.id)

function toggleContinent(key) {
  activeContinent.value = activeContinent.value === key ? null : key
  if (activeContinent.value) state.value = 'expanded'
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
    state.value = 'peek'
  }
}
</script>

<template>
  <!-- FAB when collapsed -->
  <button v-if="state === 'collapsed'" class="fab" @click="state = 'peek'">
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
      <rect x="2" y="3" width="14" height="12" rx="2" />
      <path d="M6 7h6M6 10h4" />
    </svg>
    Countries
    <span class="fab-badge">{{ visitedCount }}</span>
  </button>

  <div class="drawer" :class="state">
    <!-- Handle -->
    <div class="handle" @click="handleClick">
      <div class="handle-bar"></div>
      <div class="handle-row">
        <div class="handle-info">
          <span class="handle-count">{{ visitedCount }}</span>
          <span class="handle-label">countries explored</span>
        </div>
        <button class="handle-minimize" @click.stop="state = 'collapsed'">&#x2715;</button>
      </div>
    </div>

    <!-- Continent Cards -->
    <div class="continent-row" v-show="state !== 'collapsed'">
      <button
        v-for="cont in continents"
        :key="cont.key"
        class="continent-card"
        :class="{ active: activeContinent === cont.key }"
        @click="toggleContinent(cont.key)"
      >
        <span class="cont-emoji">{{ cont.emoji }}</span>
        <span class="cont-name">{{ cont.name }}</span>
        <span class="cont-stat"><strong>{{ continentStats(cont.key).visited }}</strong>/{{ continentStats(cont.key).total }}</span>
        <div class="cont-bar" :style="{ '--pct': (continentStats(cont.key).visited / continentStats(cont.key).total * 100) + '%', '--color': cont.color }"></div>
      </button>
    </div>

    <!-- Search + Filters -->
    <div class="controls" v-show="state !== 'collapsed'">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="6" cy="6" r="4.5" /><path d="M9.5 9.5L13 13" />
        </svg>
        <input v-model="search" type="text" placeholder="Search countries..." class="search-input" />
      </div>
      <div class="filter-row">
        <button v-for="f in [{key:'all',label:'All'},{key:'visited',label:'Visited'},{key:'unvisited',label:'Bucket list'}]"
          :key="f.key" class="filter-btn" :class="{active: filter === f.key}" @click="filter = f.key">{{ f.label }}</button>
      </div>
    </div>

    <!-- Browse button in peek -->
    <button v-if="state === 'peek'" class="browse-btn" @click="state = 'expanded'">
      Browse all {{ filteredCountries.length }} countries &#8595;
    </button>

    <!-- Country List -->
    <ul class="country-list" v-show="state === 'expanded'">
      <li v-for="country in filteredCountries" :key="country.id"
        class="country-item" :class="getStatus(country.id)" @click="handleCountryClick(country)">
        <span class="country-flag">{{ countryFlag(country.id) }}</span>
        <span class="country-name">{{ country.name }}</span>
        <div class="status-badges">
          <span v-if="isVisitedBy(p1Id, country.id)" class="badge badge-p1">&#10003;</span>
          <span v-if="isVisitedBy(p2Id, country.id)" class="badge badge-p2">&#10003;</span>
          <button class="fly-btn" @click="flyTo($event, country)" title="Show on map">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="6" cy="6" r="4" /><circle cx="6" cy="6" r="1" fill="currentColor" />
            </svg>
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* FAB */
.fab {
  position: absolute;
  bottom: 1.25rem; left: 50%; transform: translateX(-50%);
  z-index: 60;
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  background: #ffffff;
  color: #1e293b;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06);
  transition: all 0.2s;
}
.fab:hover { box-shadow: 0 6px 28px rgba(0,0,0,0.15); transform: translateX(-50%) translateY(-2px); }
.fab-badge {
  background: #3b82f6; color: white;
  padding: 0.1rem 0.45rem; border-radius: 8px;
  font-size: 0.75rem; min-width: 1.2rem; text-align: center;
}

/* Drawer */
.drawer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 50;
  background: #ffffff;
  border-top: 1px solid #e2e8f0;
  border-radius: 20px 20px 0 0;
  display: flex; flex-direction: column;
  transition: height 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: 0 -4px 30px rgba(0,0,0,0.08);
}
.drawer.collapsed { height: 0; border: none; box-shadow: none; }
.drawer.peek { height: 270px; }
.drawer.expanded { height: 72vh; }

/* Handle */
.handle { cursor: pointer; padding: 0.6rem 1rem 0.25rem; flex-shrink: 0; user-select: none; }
.handle-bar { width: 40px; height: 4px; background: #cbd5e1; border-radius: 2px; margin: 0 auto 0.45rem; }
.handle-row { display: flex; align-items: center; justify-content: space-between; }
.handle-info { display: flex; align-items: baseline; gap: 0.35rem; }
.handle-count { font-size: 1.3rem; font-weight: 700; color: #1e293b; }
.handle-label { font-size: 0.82rem; color: #94a3b8; }
.handle-minimize {
  background: none; border: none; color: #94a3b8; cursor: pointer;
  font-size: 0.85rem; padding: 0.2rem 0.4rem; border-radius: 4px; transition: all 0.15s;
}
.handle-minimize:hover { color: #475569; background: #f1f5f9; }

/* Continent Cards */
.continent-row {
  display: flex; gap: 0.35rem; padding: 0.2rem 0.75rem 0.5rem;
  overflow-x: auto; flex-shrink: 0; scrollbar-width: none;
}
.continent-row::-webkit-scrollbar { display: none; }
.continent-card {
  flex: 1; min-width: 76px;
  padding: 0.45rem 0.4rem 0.55rem;
  background: #f8fafc; border: 1px solid #e2e8f0;
  border-radius: 10px; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 0.1rem;
  transition: all 0.2s; position: relative; overflow: hidden;
}
.continent-card:hover { border-color: #cbd5e1; background: #f1f5f9; }
.continent-card.active { border-color: #3b82f6; background: #eff6ff; }
.cont-emoji { font-size: 1rem; }
.cont-name { font-size: 0.58rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.cont-stat { font-size: 0.7rem; color: #94a3b8; }
.cont-stat strong { color: #1e293b; font-size: 0.85rem; }
.cont-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #e2e8f0; }
.cont-bar::after {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0;
  width: var(--pct, 0%); background: var(--color, #3b82f6);
  border-radius: 0 2px 2px 0; transition: width 0.4s ease;
}

/* Controls */
.controls { padding: 0.35rem 0.75rem; display: flex; gap: 0.5rem; flex-shrink: 0; align-items: center; }
.search-wrap { position: relative; flex: 1; }
.search-icon { position: absolute; left: 0.65rem; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
.search-input {
  width: 100%; padding: 0.45rem 0.65rem 0.45rem 1.9rem;
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
  color: #1e293b; font-size: 0.82rem; outline: none; transition: border-color 0.2s;
}
.search-input:focus { border-color: #3b82f6; }
.search-input::placeholder { color: #94a3b8; }
.filter-row { display: flex; gap: 0.2rem; flex-shrink: 0; }
.filter-btn {
  padding: 0.32rem 0.6rem; background: transparent; border: 1px solid #e2e8f0;
  border-radius: 6px; color: #94a3b8; font-size: 0.72rem; cursor: pointer;
  transition: all 0.15s; font-weight: 500; white-space: nowrap;
}
.filter-btn:hover { color: #64748b; border-color: #cbd5e1; }
.filter-btn.active { background: #f1f5f9; color: #1e293b; border-color: #cbd5e1; }

/* Browse button */
.browse-btn {
  margin: 0.2rem 0.75rem 0.5rem; padding: 0.55rem;
  background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;
  color: #64748b; cursor: pointer; font-size: 0.8rem; transition: all 0.15s;
}
.browse-btn:hover { background: #f1f5f9; color: #1e293b; border-style: solid; }

/* Country List */
.country-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; min-height: 0; }
.country-item {
  display: flex; align-items: center; padding: 0.42rem 0.75rem;
  cursor: pointer; color: #64748b; font-size: 0.82rem;
  transition: all 0.12s; gap: 0.5rem; border-left: 3px solid transparent;
}
.country-item:hover { background: #f8fafc; }
.country-item.p1 { color: #2563eb; border-left-color: #3b82f6; background: #eff6ff; }
.country-item.p2 { color: #db2777; border-left-color: #ec4899; background: #fdf2f8; }
.country-item.both { color: #7c3aed; border-left-color: #8b5cf6; background: #f5f3ff; }
.country-flag { font-size: 1rem; line-height: 1; flex-shrink: 0; width: 1.2rem; text-align: center; }
.country-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status-badges { display: flex; gap: 0.2rem; align-items: center; flex-shrink: 0; }
.badge { width: 16px; height: 16px; border-radius: 50%; font-size: 0.6rem; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.badge-p1 { background: #dbeafe; color: #2563eb; }
.badge-p2 { background: #fce7f3; color: #db2777; }
.fly-btn { background: none; border: none; color: #cbd5e1; cursor: pointer; padding: 0.1rem; line-height: 1; transition: color 0.15s; display: flex; }
.fly-btn:hover { color: #64748b; }
</style>
