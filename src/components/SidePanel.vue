<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Search, X, Camera, Crosshair, Check, ChevronDown } from 'lucide-vue-next'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import FlagIcon from './FlagIcon.vue'
import CountryMemories from './CountryMemories.vue'

// This panel does exactly one job: find a place and mark it. Traveller counts,
// continent breakdowns and milestones live in StatsPanel, opened from the header —
// as permanent fixtures they were ~40 pieces of information sitting above a list you
// were trying to scan, five of them reading zero.

const props = defineProps({
  mapRef: { type: Object, default: null },
})

const emit = defineEmits(['close'])

const {
  entities, profiles, activeProfileId,
  toggleCountry, isVisitedBy, visitStateFor, totalEntities,
} = useVisitedCountries()

const search = ref('')
// Defaults to your own places. "All" meant 239 rows of which ~96% were grey noise.
const filter = ref('visited')
const collapsed = ref(new Set())

const p1Id = computed(() => profiles.value[0]?.id)
const p2Id = computed(() => profiles.value[1]?.id)

const CONTINENT_ORDER = [
  ['Europe', 'Europe'],
  ['Asia', 'Asia'],
  ['Africa', 'Africa'],
  ['North America', 'N. America'],
  ['South America', 'S. America'],
  ['Oceania', 'Oceania'],
  ['Antarctica', 'Antarctica'],
]

const FILTERS = [
  { key: 'visited', label: 'Visited' },
  { key: 'all', label: 'All' },
  { key: 'unvisited', label: 'Not visited' },
]

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const pid = activeProfileId.value
  return entities.filter(e => {
    if (q && !e.name.toLowerCase().includes(q) && !e.nameLong.toLowerCase().includes(q)) return false
    if (filter.value === 'visited' && !isVisitedBy(pid, e.code)) return false
    if (filter.value === 'unvisited' && isVisitedBy(pid, e.code)) return false
    return true
  })
})

const grouped = computed(() => {
  const buckets = new Map()
  for (const e of filtered.value) {
    if (!buckets.has(e.continent)) buckets.set(e.continent, [])
    buckets.get(e.continent).push(e)
  }
  return CONTINENT_ORDER.filter(([k]) => buckets.has(k)).map(([k, label]) => ({
    continent: k,
    label,
    items: buckets.get(k),
  }))
})

// Clicking a group header collapses it. This replaces the old grid of seven continent
// cards: same navigation, in a header that had to exist anyway.
function toggleGroup(key) {
  const next = new Set(collapsed.value)
  next.has(key) ? next.delete(key) : next.add(key)
  collapsed.value = next
}

const activeName = computed(
  () => profiles.value.find(p => p.id === activeProfileId.value)?.name || '',
)

// Same rule as the map: if the active traveller has been here, open the memories;
// otherwise mark it. Previously a row click called toggleCountry unconditionally, so
// clicking a place you'd already visited silently DELETED the visit — the exact
// opposite of what the same click does on the map, and with no undo.
function handleRowClick(entity) {
  if (isVisitedBy(activeProfileId.value, entity.code)) memoriesCountry.value = entity
  else toggleCountry(entity.code)
}

// `/` focuses the search, the way it works in most tools with a list like this.
const searchEl = ref(null)

function onKeydown(e) {
  if (e.key !== '/' || e.metaKey || e.ctrlKey) return
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return
  e.preventDefault()
  searchEl.value?.focus()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function flyTo(e, entity) {
  e.stopPropagation()
  props.mapRef?.flyToCountry?.(entity.code)
  emit('close')
}

const memoriesCountry = ref(null)

function openMemories(e, entity) {
  e.stopPropagation()
  memoriesCountry.value = entity
}
</script>

<template>
  <aside class="panel">
    <button class="mobile-close" @click="emit('close')" aria-label="Close menu">
      <X :size="18" />
    </button>

    <div class="controls">
      <div class="search">
        <Search class="search-icon" :size="15" />
        <input ref="searchEl" v-model="search" type="text"
               :placeholder="`Search ${totalEntities} places\u2026  /`" />
        <button v-if="search" class="search-clear" @click="search = ''" aria-label="Clear search">
          <X :size="13" />
        </button>
      </div>

      <div class="filters">
        <button
          v-for="f in FILTERS"
          :key="f.key"
          class="chip"
          :class="{ active: filter === f.key }"
          @click="filter = f.key"
        >{{ f.label }}</button>
        <span class="count">{{ filtered.length }}</span>
      </div>
    </div>

    <div class="list">
      <template v-for="group in grouped" :key="group.continent">
        <button class="group-head" @click="toggleGroup(group.continent)">
          <ChevronDown
            class="chev"
            :class="{ turned: collapsed.has(group.continent) }"
            :size="12"
            :stroke-width="2.5"
          />
          <span>{{ group.label }}</span>
          <span class="group-n">{{ group.items.length }}</span>
        </button>

        <template v-if="!collapsed.has(group.continent)">
          <div
            v-for="entity in group.items"
            :key="entity.code"
            class="row"
            :class="visitStateFor(entity.code)"
            @click="handleRowClick(entity)"
          >
            <FlagIcon :code="entity.code" :size="25" />
            <span class="row-name">{{ entity.name }}</span>

            <span class="marks">
              <span v-if="isVisitedBy(p1Id, entity.code)" class="mark m1"><Check :size="11" :stroke-width="3.5" /></span>
              <span v-if="isVisitedBy(p2Id, entity.code)" class="mark m2"><Check :size="11" :stroke-width="3.5" /></span>
            </span>

            <button
              v-if="visitStateFor(entity.code) !== 'none'"
              class="icon-btn"
              @click="openMemories($event, entity)"
              title="Memories"
            ><Camera :size="16" /></button>

            <button class="icon-btn faint" @click="flyTo($event, entity)" title="Show on map">
              <Crosshair :size="16" />
            </button>
          </div>
        </template>
      </template>

      <p v-if="!filtered.length && search" class="empty">
        Nothing matches &ldquo;{{ search }}&rdquo;.
      </p>
      <p v-else-if="!filtered.length && filter === 'visited'" class="empty">
        No places for {{ activeName }} yet.<br />
        <span class="dim">Click a country on the map, or switch to All.</span>
      </p>
      <p v-else-if="!filtered.length" class="empty">Nothing to show.</p>
    </div>

    <CountryMemories
      v-if="memoriesCountry"
      :country="memoriesCountry"
      @close="memoriesCountry = null"
    />
  </aside>
</template>

<style scoped>
.panel {
  width: 404px;
  min-width: 404px;
  background: var(--surface);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.mobile-close {
  display: none;
  position: absolute;
  top: var(--s-3);
  right: var(--s-3);
  background: var(--surface-2);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  cursor: pointer;
  width: 30px;
  height: 30px;
  border-radius: var(--r-md);
  align-items: center;
  justify-content: center;
  z-index: 3;
}

/* Controls */
.controls {
  padding: var(--s-4) var(--s-4) var(--s-3);
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.search { position: relative; display: flex; align-items: center; }
.search-icon {
  position: absolute;
  left: 0.65rem;
  color: var(--text-faint);
  pointer-events: none;
}
.search input {
  width: 100%;
  padding: 0.62rem 2.1rem 0.62rem 2.2rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  color: var(--text);
  font-size: 0.98rem;
  font-family: inherit;
  outline: none;
  transition: border-color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out);
}
.search input:focus { border-color: var(--profile-1); background: var(--surface); }
.search input::placeholder { color: var(--text-faint); }
.search-clear {
  position: absolute;
  right: 0.5rem;
  display: flex;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--r-sm);
}
.search-clear:hover { color: var(--text); }

.filters { display: flex; align-items: center; gap: var(--s-1); }
.chip {
  padding: 0.32rem 0.7rem;
  background: transparent;
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-sm);
  color: var(--text-muted);
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--t-fast) var(--ease-out);
}
.chip:hover { border-color: var(--border); color: var(--text); }
.chip.active {
  background: var(--text);
  border-color: var(--text);
  color: var(--surface);
}
.count {
  margin-left: auto;
  font-size: 0.84rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}

/* List */
.list {
  overflow-y: auto;
  flex: 1;
  padding: 0 var(--s-2) var(--s-4);
}

.group-head {
  position: sticky;
  top: 0;
  z-index: 1;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.5rem var(--s-2) 0.32rem;
  background: var(--surface);
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.72rem;
  font-weight: 640;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-faint);
  transition: color var(--t-fast) var(--ease-out);
}
.group-head:hover { color: var(--text-muted); }
.chev {
  transition: transform var(--t-base) var(--ease-out);
  flex-shrink: 0;
}
.chev.turned { transform: rotate(-90deg); }
.group-n {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  opacity: 0.75;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 0.52rem var(--s-2);
  border-radius: var(--r-md);
  cursor: pointer;
  color: var(--text-muted);
  font-size: 1rem;
  transition: background var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
}
.row:hover { background: var(--surface-2); color: var(--text); }
.row.p1 { color: var(--profile-1-text); }
.row.p2 { color: var(--profile-2-text); }
.row.both { color: var(--profile-both-text); }

.row-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.marks { display: flex; gap: 3px; flex-shrink: 0; }
.mark {
  width: 17px;
  height: 17px;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
}
.m1 { background: var(--profile-1-soft); color: var(--profile-1-text); }
.m2 { background: var(--profile-2-soft); color: var(--profile-2-text); }

.icon-btn {
  display: flex;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--r-sm);
  flex-shrink: 0;
  transition: color var(--t-fast) var(--ease-out), background var(--t-fast) var(--ease-out),
    opacity var(--t-fast) var(--ease-out);
}
.icon-btn:hover { color: var(--text); background: var(--surface-hover); }
.icon-btn.faint { opacity: 0; }
.row:hover .icon-btn.faint { opacity: 1; }

.empty {
  padding: var(--s-8) var(--s-4);
  text-align: center;
  color: var(--text-muted);
  font-size: 0.94rem;
  line-height: 1.6;
}
.empty .dim { color: var(--text-faint); font-size: 0.82rem; }

.mobile-panel .mobile-close,
.drawer .mobile-close {
  display: flex;
}
</style>
