import { ref, computed } from 'vue'
import { entities, totalEntities, nameByCode } from '../data/entities.js'
import * as api from '../api.js'

// Shared state (singleton across all components)
const profiles = ref([])
const activeProfileId = ref(null)
const visits = ref({}) // { [profileId]: string[] }
const loading = ref(true)
const error = ref(null)

let initialized = false

async function init() {
  if (initialized) return
  initialized = true

  try {
    loading.value = true
    const profileData = await api.getProfiles()
    profiles.value = profileData

    if (profileData.length > 0) {
      activeProfileId.value = profileData[0].id
    }

    const newVisits = {}
    for (const profile of profileData) {
      const visitData = await api.getVisits(profile.id)
      newVisits[profile.id] = visitData.map(v => v.country_code)
    }
    visits.value = newVisits
  } catch (e) {
    error.value = e.message
    console.error('Failed to initialize:', e)
  } finally {
    loading.value = false
  }
}

// Computed
const activeProfile = computed(() =>
  profiles.value.find(p => p.id === activeProfileId.value)
)

const activeVisitList = computed(() =>
  visits.value[activeProfileId.value] || []
)

const visitedCount = computed(() => activeVisitList.value.length)

// Number of entities either traveller has been to — the couple's shared total.
const combinedCount = computed(() => {
  const all = new Set()
  for (const list of Object.values(visits.value)) {
    for (const code of list || []) all.add(code)
  }
  return all.size
})

function isVisitedBy(profileId, code) {
  return (visits.value[profileId] || []).includes(code)
}

// Single source of truth for visit state.
//
// This used to be reimplemented in four places (twice in WorldMap, once as an inline
// IIFE, once in SidePanel), which meant the map and the sidebar could disagree about
// the same country. Everything derives from here now.
function visitStateFor(code) {
  const p1 = profiles.value[0]?.id
  const p2 = profiles.value[1]?.id
  const byP1 = p1 ? isVisitedBy(p1, code) : false
  const byP2 = p2 ? isVisitedBy(p2, code) : false
  if (byP1 && byP2) return 'both'
  if (byP1) return 'p1'
  if (byP2) return 'p2'
  return 'none'
}

function isVisitedByAnyone(code) {
  return visitStateFor(code) !== 'none'
}

function setActiveProfile(id) {
  activeProfileId.value = id
}

async function toggleCountry(code) {
  const profileId = activeProfileId.value
  if (!profileId) return

  const current = visits.value[profileId] || []
  const isCurrentlyVisited = current.includes(code)

  if (isCurrentlyVisited) {
    visits.value = {
      ...visits.value,
      [profileId]: current.filter(c => c !== code),
    }
    try {
      await api.removeVisit(profileId, code)
    } catch (e) {
      visits.value = { ...visits.value, [profileId]: current }
      console.error('Failed to remove visit:', e)
    }
  } else {
    const name = nameByCode[code] || code
    visits.value = {
      ...visits.value,
      [profileId]: [...current, code],
    }
    try {
      await api.addVisit(profileId, code, name)
    } catch (e) {
      visits.value = { ...visits.value, [profileId]: current }
      console.error('Failed to add visit:', e)
    }
  }

  refreshProfiles()
}

async function clearAll() {
  const profileId = activeProfileId.value
  if (!profileId) return

  const backup = visits.value[profileId]
  visits.value = { ...visits.value, [profileId]: [] }

  try {
    await api.clearVisits(profileId)
  } catch (e) {
    visits.value = { ...visits.value, [profileId]: backup }
    console.error('Failed to clear visits:', e)
  }

  refreshProfiles()
}

async function refreshProfiles() {
  try {
    profiles.value = await api.getProfiles()
  } catch (_) {}
}

async function updateProfileInfo(id, data) {
  try {
    await api.updateProfile(id, data)
    await refreshProfiles()
  } catch (e) {
    console.error('Failed to update profile:', e)
  }
}

export function useVisitedCountries() {
  init()
  return {
    profiles,
    activeProfileId,
    activeProfile,
    visits,
    activeVisitList,
    visitedCount,
    combinedCount,
    totalEntities,
    entities,
    nameByCode,
    loading,
    error,
    setActiveProfile,
    toggleCountry,
    clearAll,
    isVisitedBy,
    visitStateFor,
    isVisitedByAnyone,
    updateProfileInfo,
  }
}
