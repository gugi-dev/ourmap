<script setup>
import { ref, computed } from 'vue'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { countryFlag } from '../utils/flags.js'

const props = defineProps({
  mapRef: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const {
  allCountries, profiles, activeProfileId, visits,
  toggleCountry, isVisitedBy,
} = useVisitedCountries()

const search = ref('')
const filter = ref('all')

const p1Id = computed(() => profiles.value[0]?.id)
const p2Id = computed(() => profiles.value[1]?.id)

const filteredCountries = computed(() => {
  const q = search.value.toLowerCase()
  const pid = activeProfileId.value
  return allCountries.filter(c => {
    if (q && !c.name.toLowerCase().includes(q)) return false
    if (filter.value === 'visited' && !isVisitedBy(pid, c.id)) return false
    if (filter.value === 'unvisited' && isVisitedBy(pid, c.id)) return false
    return true
  })
})

const visitedCountInFilter = computed(() => {
  const pid = activeProfileId.value
  return allCountries.filter(c => isVisitedBy(pid, c.id)).length
})

function handleClick(country) {
  toggleCountry(country.id)
}

function handleLocate(e, country) {
  e.stopPropagation()
  if (props.mapRef?.flyToCountry) {
    props.mapRef.flyToCountry(country.id)
  }
}

function getStatus(countryId) {
  const byP1 = isVisitedBy(p1Id.value, countryId)
  const byP2 = isVisitedBy(p2Id.value, countryId)
  if (byP1 && byP2) return 'both'
  if (byP1) return 'p1'
  if (byP2) return 'p2'
  return 'none'
}
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="sidebar-title">
        <span class="sidebar-count">{{ visitedCountInFilter }}</span>
        <span class="sidebar-label">countries visited</span>
      </div>
      <button class="close-btn" @click="emit('close')">&#x2715;</button>
    </div>

    <div class="search-wrap">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="6" cy="6" r="4.5" />
        <path d="M9.5 9.5L13 13" />
      </svg>
      <input
        v-model="search"
        type="text"
        placeholder="Search..."
        class="search-input"
      />
    </div>

    <div class="filter-row">
      <button
        v-for="f in [
          { key: 'all', label: 'All' },
          { key: 'visited', label: 'Visited' },
          { key: 'unvisited', label: 'Bucket list' },
        ]"
        :key="f.key"
        class="filter-btn"
        :class="{ active: filter === f.key }"
        @click="filter = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <ul class="country-list">
      <li
        v-for="country in filteredCountries"
        :key="country.id"
        class="country-item"
        :class="getStatus(country.id)"
        @click="handleClick(country)"
      >
        <span class="country-flag">{{ countryFlag(country.id) }}</span>
        <span class="country-name">{{ country.name }}</span>
        <div class="status-badges">
          <span
            v-if="isVisitedBy(p1Id, country.id)"
            class="badge badge-p1"
            :title="profiles[0]?.name"
          >&#10003;</span>
          <span
            v-if="isVisitedBy(p2Id, country.id)"
            class="badge badge-p2"
            :title="profiles[1]?.name"
          >&#10003;</span>
        </div>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 280px;
  min-width: 280px;
  background: #0f172a;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #1e293b;
}

.sidebar-title {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
}

.sidebar-count {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f1f5f9;
}

.sidebar-label {
  font-size: 0.8rem;
  color: #64748b;
}

.close-btn {
  display: none;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.25rem;
}

.search-wrap {
  position: relative;
  margin: 0.65rem 0.75rem;
}

.search-icon {
  position: absolute;
  left: 0.7rem;
  top: 50%;
  transform: translateY(-50%);
  color: #475569;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #f1f5f9;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
}

.search-input::placeholder {
  color: #475569;
}

.filter-row {
  display: flex;
  gap: 0.25rem;
  padding: 0 0.75rem;
  margin-bottom: 0.5rem;
}

.filter-btn {
  flex: 1;
  padding: 0.3rem 0.4rem;
  background: transparent;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #64748b;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s;
  font-weight: 500;
}

.filter-btn:hover {
  color: #94a3b8;
  border-color: #475569;
}

.filter-btn.active {
  background: #1e293b;
  color: #f1f5f9;
  border-color: #475569;
}

.country-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.country-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  cursor: pointer;
  color: #94a3b8;
  font-size: 0.82rem;
  transition: all 0.12s;
  gap: 0.5rem;
  border-left: 3px solid transparent;
}

.country-item:hover {
  background: #1e293b;
}

.country-item.p1 {
  color: #93c5fd;
  border-left-color: #3b82f6;
}

.country-item.p2 {
  color: #f9a8d4;
  border-left-color: #f472b6;
}

.country-item.both {
  color: #c4b5fd;
  border-left-color: #a855f7;
}

.country-flag {
  font-size: 1rem;
  line-height: 1;
  flex-shrink: 0;
  width: 1.2rem;
  text-align: center;
}

.country-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badges {
  display: flex;
  gap: 0.15rem;
  flex-shrink: 0;
}

.badge {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  font-size: 0.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.badge-p1 {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.badge-p2 {
  background: rgba(244, 114, 182, 0.2);
  color: #f472b6;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.4);
  }

  .sidebar-open .sidebar {
    transform: translateX(0);
  }

  .close-btn {
    display: block;
  }
}
</style>
