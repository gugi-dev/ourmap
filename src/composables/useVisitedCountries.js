import { ref, computed } from 'vue'
import { allCountries, totalCountries, countryNameMap } from '../data/countries.js'
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

function isVisitedBy(profileId, countryCode) {
  return (visits.value[profileId] || []).includes(countryCode)
}

function setActiveProfile(id) {
  activeProfileId.value = id
}

async function toggleCountry(countryCode) {
  const profileId = activeProfileId.value
  if (!profileId) return

  const current = visits.value[profileId] || []
  const isCurrentlyVisited = current.includes(countryCode)

  if (isCurrentlyVisited) {
    visits.value = {
      ...visits.value,
      [profileId]: current.filter(c => c !== countryCode),
    }
    try {
      await api.removeVisit(profileId, countryCode)
    } catch (e) {
      visits.value = { ...visits.value, [profileId]: current }
      console.error('Failed to remove visit:', e)
    }
  } else {
    const countryName = countryNameMap[countryCode] || countryCode
    visits.value = {
      ...visits.value,
      [profileId]: [...current, countryCode],
    }
    try {
      await api.addVisit(profileId, countryCode, countryName)
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
    totalCountries,
    allCountries,
    countryNameMap,
    loading,
    error,
    setActiveProfile,
    toggleCountry,
    clearAll,
    isVisitedBy,
    updateProfileInfo,
  }
}
