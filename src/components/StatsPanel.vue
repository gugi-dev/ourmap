<script setup>
import { computed } from 'vue'
import { X } from 'lucide-vue-next'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { codesByContinent } from '../data/entities.js'
import Avatar from './Avatar.vue'

// Everything that used to sit permanently at the top of the sidebar lives here now.
// Zeros and full breakdowns are fine in a panel you opened deliberately; they were
// noise in a panel you have open the whole time just to add a country.

const props = defineProps({
  goal: { type: Number, default: 30 },
})

const emit = defineEmits(['close'])

const {
  entities, profiles, activeProfileId, setActiveProfile,
  isVisitedBy, combinedCount, totalEntities,
} = useVisitedCountries()

const MILESTONES = [1, 5, 10, 15, 20, 25, 30]

const travellers = computed(() =>
  profiles.value.map((p, i) => ({
    ...p,
    key: i === 0 ? 'p1' : 'p2',
    count: entities.filter(e => isVisitedBy(p.id, e.code)).length,
    active: p.id === activeProfileId.value,
  })),
)

const CONTINENT_LABELS = {
  Europe: 'Europe',
  Asia: 'Asia',
  Africa: 'Africa',
  'North America': 'N. America',
  'South America': 'S. America',
  Oceania: 'Oceania',
  Antarctica: 'Antarctica',
}

// Sorted by how much you've actually done — the places you've been come first,
// rather than a fixed order that leads with zeros.
const continents = computed(() => {
  const pid = activeProfileId.value
  const rows = Object.entries(codesByContinent).map(([key, codes]) => {
    const visited = codes.filter(c => isVisitedBy(pid, c)).length
    return {
      key,
      label: CONTINENT_LABELS[key] || key,
      visited,
      total: codes.length,
      pct: (visited / codes.length) * 100,
    }
  })
  const max = Math.max(1, ...rows.map(r => r.visited))
  // Bars are scaled against your best continent, not the total country count —
  // against /57 every bar is a sliver and the chart says nothing.
  return rows
    .sort((a, b) => b.visited - a.visited || a.label.localeCompare(b.label))
    .map(r => ({ ...r, barPct: (r.visited / max) * 100 }))
})

const activeCount = computed(
  () => travellers.value.find(t => t.active)?.count ?? 0,
)
</script>

<template>
  <Teleport to="body">
    <div class="stats-scrim" @click="emit('close')">
      <section class="stats" @click.stop>
        <header>
          <h2>Progress</h2>
          <button class="close" @click="emit('close')" aria-label="Close"><X :size="16" /></button>
        </header>

        <!-- Travellers -->
        <div class="travs">
          <button
            v-for="t in travellers"
            :key="t.id"
            class="trav"
            :class="[t.key, { active: t.active }]"
            @click="setActiveProfile(t.id)"
          >
            <Avatar :name="t.name" :variant="t.key" :size="28" :solid="t.active" />
            <span class="trav-name">{{ t.name }}</span>
            <strong class="trav-count">{{ t.count }}</strong>
          </button>
        </div>

        <p class="together">
          <strong>{{ combinedCount }}</strong> between you
          <span class="dim">· {{ totalEntities }} on the map</span>
        </p>

        <!-- Milestones -->
        <div class="block">
          <h3>Milestones</h3>
          <ol class="miles">
            <li
              v-for="m in MILESTONES"
              :key="m"
              :class="{ hit: activeCount >= m, goal: m === goal }"
            ><span class="dot" /><span class="m-label">{{ m }}</span></li>
          </ol>
        </div>

        <!-- Continents -->
        <div class="block">
          <h3>By continent</h3>
          <ul class="conts">
            <li v-for="c in continents" :key="c.key" :class="{ empty: !c.visited }">
              <span class="c-label">{{ c.label }}</span>
              <span class="c-track"><span class="c-fill" :style="{ width: c.barPct + '%' }" /></span>
              <span class="c-count">{{ c.visited }}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.stats-scrim {
  position: fixed;
  inset: 0;
  z-index: 400;
  background: oklch(0.2 0.01 250 / 0.22);
  animation: fade 140ms var(--ease-out);
}
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }

.stats {
  position: absolute;
  top: 56px;
  right: var(--s-4);
  width: min(340px, calc(100vw - 2rem));
  max-height: calc(100vh - 76px);
  overflow-y: auto;
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--s-4);
  animation: pop 180ms var(--ease-spring);
}
@keyframes pop {
  from { opacity: 0; transform: translateY(-6px) scale(0.985) }
  to { opacity: 1; transform: none }
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--s-3);
}
h2 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 640;
  letter-spacing: -0.02em;
}
.close {
  display: flex;
  background: none;
  border: none;
  color: var(--text-faint);
  cursor: pointer;
  padding: 3px;
  border-radius: var(--r-sm);
}
.close:hover { color: var(--text); background: var(--surface-hover); }

/* Travellers */
.travs {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}
.trav {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.5rem 0.6rem;
  background: var(--surface-2);
  border: 1px solid transparent;
  border-radius: var(--r-md);
  cursor: pointer;
  text-align: left;
  transition: background var(--t-fast) var(--ease-out),
    border-color var(--t-fast) var(--ease-out);
}
.trav:hover { background: var(--surface-hover); }
.trav.active.p1 { border-color: var(--profile-1); background: var(--profile-1-soft); }
.trav.active.p2 { border-color: var(--profile-2); background: var(--profile-2-soft); }
.trav-name {
  flex: 1;
  font-size: 0.88rem;
  font-weight: 560;
  color: var(--text);
  letter-spacing: -0.012em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trav-count {
  font-size: 1.15rem;
  font-weight: 660;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
}
.trav.active.p1 .trav-count { color: var(--profile-1-text); }
.trav.active.p2 .trav-count { color: var(--profile-2-text); }

.together {
  margin: var(--s-2) 0 0;
  font-size: 0.82rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.together strong { color: var(--profile-both-text); font-weight: 650; }
.dim { color: var(--text-faint); }

/* Blocks */
.block { margin-top: var(--s-5); }
h3 {
  margin: 0 0 var(--s-2);
  font-size: 0.64rem;
  font-weight: 640;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--text-faint);
}

/* Milestones */
.miles {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 2px;
}
.miles li {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1;
  position: relative;
}
/* Connecting rail between the dots */
.miles li:not(:last-child)::after {
  content: '';
  position: absolute;
  top: 5px;
  left: 50%;
  width: 100%;
  height: 2px;
  background: var(--border-subtle);
  z-index: 0;
}
.miles li.hit:not(:last-child)::after { background: var(--profile-1); }
.dot {
  width: 12px;
  height: 12px;
  border-radius: var(--r-full);
  background: var(--surface);
  border: 2px solid var(--border);
  z-index: 1;
}
.miles li.hit .dot { background: var(--profile-1); border-color: var(--profile-1); }
.miles li.goal .dot { width: 14px; height: 14px; }
.miles li.goal.hit .dot { background: var(--success); border-color: var(--success); }
.m-label {
  font-size: 0.62rem;
  color: var(--text-faint);
  font-variant-numeric: tabular-nums;
}
.miles li.hit .m-label { color: var(--text-muted); font-weight: 600; }

/* Continents */
.conts {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.conts li {
  display: grid;
  grid-template-columns: 5.2rem 1fr 1.5rem;
  align-items: center;
  gap: var(--s-2);
}
.conts li.empty { opacity: 0.45; }
.c-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  letter-spacing: -0.008em;
}
.c-track {
  height: 5px;
  border-radius: var(--r-full);
  background: var(--surface-2);
  overflow: hidden;
}
.c-fill {
  display: block;
  height: 100%;
  border-radius: var(--r-full);
  background: var(--profile-1);
  transition: width 420ms var(--ease-out);
}
.c-count {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
