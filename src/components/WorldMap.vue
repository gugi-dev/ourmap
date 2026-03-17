<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as topojson from 'topojson-client'
import { numericToAlpha2 } from '../data/countryCodeMap.js'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { countryFlag } from '../utils/flags.js'
import CountryMemories from './CountryMemories.vue'

const { visits, profiles, activeProfileId, toggleCountry, countryNameMap, allCountries } = useVisitedCountries()

const emit = defineEmits(['open-memories'])

const mapEl = ref(null)
let map = null
let geoJsonLayer = null
const countryLayers = {}
const memoriesCountry = ref(null)
let memoryMarkers = [] // camera markers for countries with memories

// Tiny countries that need a circle marker to be clickable
const tinyCountries = {
  mt: [35.9, 14.4],   // Malta
}

const COLORS = {
  profile1: '#3b82f6',
  profile2: '#ec4899',
  both: '#8b5cf6',
}

// --- Antimeridian fix ---
function fixAntimeridian(geojson) {
  geojson.features = geojson.features.filter(f => f.id !== '010')
  for (const feature of geojson.features) {
    const geom = feature.geometry
    if (geom.type === 'Polygon') {
      if (crossesAM(geom.coordinates)) geom.coordinates = shiftPoly(geom.coordinates)
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(p => crossesAM(p) ? shiftPoly(p) : p)
    }
  }
}
function crossesAM(rings) {
  return rings.some(r => { let e=false,w=false; for(const[l]of r){if(l>160)e=true;if(l<-160)w=true;if(e&&w)return true} return false })
}
function shiftPoly(rings) { return rings.map(r => r.map(([l,a]) => [l<0?l+360:l,a])) }

// --- Is country visited by anyone? ---
function isVisited(alpha2) {
  for (const pid of Object.keys(visits.value)) {
    if ((visits.value[pid] || []).includes(alpha2)) return true
  }
  return false
}

// --- Map click: toggle if unvisited, open memories if visited ---
function handleCountryClick(alpha2) {
  if (!alpha2) return
  if (isVisited(alpha2)) {
    const country = allCountries.find(c => c.id === alpha2)
    if (country) memoriesCountry.value = country
  } else {
    toggleCountry(alpha2)
  }
}

// --- Styles ---
function getVisitState(feature) {
  const alpha2 = feature.properties.alpha2
  if (!alpha2) return 'none'
  const p1Id = profiles.value[0]?.id
  const p2Id = profiles.value[1]?.id
  const p1 = p1Id ? (visits.value[p1Id] || []).includes(alpha2) : false
  const p2 = p2Id ? (visits.value[p2Id] || []).includes(alpha2) : false
  if (p1 && p2) return 'both'
  if (p1) return 'p1'
  if (p2) return 'p2'
  return 'none'
}

function getColorForState(state) {
  return { both: COLORS.both, p1: COLORS.profile1, p2: COLORS.profile2 }[state] || 'transparent'
}

function getStyle(feature) {
  const state = getVisitState(feature)
  return {
    weight: 0,
    color: 'transparent',
    fillColor: getColorForState(state),
    fillOpacity: state === 'none' ? 0 : 0.55,
  }
}

function buildTooltip(flag, name, alpha2) {
  const p1Id = profiles.value[0]?.id
  const p2Id = profiles.value[1]?.id
  const p1 = p1Id ? (visits.value[p1Id] || []).includes(alpha2) : false
  const p2 = p2Id ? (visits.value[p2Id] || []).includes(alpha2) : false
  let badges = ''
  if (p1) badges += `<span class="tt-badge tt-p1">${profiles.value[0]?.name || 'P1'}</span>`
  if (p2) badges += `<span class="tt-badge tt-p2">${profiles.value[1]?.name || 'P2'}</span>`
  const hint = (p1 || p2) ? '<div class="tt-hint">Click to view memories</div>' : ''
  if (!p1 && !p2) badges = '<span class="tt-unvisited">Click to mark as visited</span>'
  return `<div class="tt-inner"><span class="tt-flag">${flag}</span><strong>${name}</strong>${badges}</div>${hint}`
}

// --- Mount ---
onMounted(async () => {
  map = L.map(mapEl.value, {
    center: [48, 15],
    zoom: 4,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    worldCopyJump: true,
    maxBounds: [[-85, -200], [85, 200]],
    maxBoundsViscosity: 0.8,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)

  try {
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    const worldData = await res.json()
    const countries = topojson.feature(worldData, worldData.objects.countries)
    fixAntimeridian(countries)

    countries.features.forEach(f => {
      f.properties.alpha2 = numericToAlpha2[f.id] || null
    })

    geoJsonLayer = L.geoJSON(countries, {
      style: getStyle,
      onEachFeature: (feature, layer) => {
        const alpha2 = feature.properties.alpha2
        if (alpha2) countryLayers[alpha2] = layer

        layer.on({
          click: () => handleCountryClick(alpha2),
          mouseover: (e) => {
            const l = e.target
            const state = getVisitState(feature)
            l.setStyle({
              weight: 1.5,
              color: '#94a3b8',
              fillOpacity: state === 'none' ? 0.15 : 0.7,
              fillColor: state === 'none' ? '#94a3b8' : getColorForState(state),
            })
            l.bringToFront()
            const name = countryNameMap[alpha2] || feature.properties.name || 'Unknown'
            l.bindTooltip(buildTooltip(countryFlag(alpha2 || ''), name, alpha2), {
              sticky: true, direction: 'top', offset: [0, -12], className: 'country-tooltip',
            }).openTooltip()
          },
          mouseout: (e) => {
            geoJsonLayer.resetStyle(e.target)
            e.target.unbindTooltip()
          },
        })
      },
    }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd', maxZoom: 19, pane: 'overlayPane',
    }).addTo(map)

    // Tiny country markers
    for (const [code, [lat, lng]] of Object.entries(tinyCountries)) {
      const marker = L.circleMarker([lat, lng], {
        radius: 6, fillColor: '#94a3b8', fillOpacity: 0.5,
        weight: 1.5, color: '#64748b',
      }).addTo(map)
      marker.on('click', () => handleCountryClick(code))
      marker.on('mouseover', () => {
        const name = countryNameMap[code] || code
        marker.bindTooltip(buildTooltip(countryFlag(code), name, code), {
          direction: 'top', offset: [0, -8], className: 'country-tooltip',
        }).openTooltip()
      })
      marker.on('mouseout', () => marker.unbindTooltip())
      // Store so we can update color
      countryLayers[code + '_marker'] = marker
    }

    // Initial memory markers
    await refreshMemoryMarkers()
  } catch (e) {
    console.error('Failed to load country data:', e)
  }
})

// Fetch memory markers from API and show camera bubbles on map
async function refreshMemoryMarkers() {
  if (!map) return
  // Remove old markers
  memoryMarkers.forEach(m => map.removeLayer(m))
  memoryMarkers = []

  try {
    const res = await fetch('/api/memories')
    const data = await res.json()

    for (const { country_code } of data) {
      const layer = countryLayers[country_code]
      if (!layer) continue
      const bounds = layer.getBounds()
      const center = bounds.getCenter()

      const icon = L.divIcon({
        className: 'memory-bubble',
        html: '📷',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })

      const marker = L.marker(center, { icon, interactive: true }).addTo(map)
      marker.on('click', () => {
        const country = allCountries.find(c => c.id === country_code)
        if (country) memoriesCountry.value = country
      })
      memoryMarkers.push(marker)
    }
  } catch (_) {}
}

// Update tiny country marker colors
function updateTinyMarkers() {
  for (const [code, [lat, lng]] of Object.entries(tinyCountries)) {
    const marker = countryLayers[code + '_marker']
    if (!marker) continue
    const state = isVisited(code) ? ((() => {
      const p1Id = profiles.value[0]?.id
      const p2Id = profiles.value[1]?.id
      const p1 = p1Id ? (visits.value[p1Id] || []).includes(code) : false
      const p2 = p2Id ? (visits.value[p2Id] || []).includes(code) : false
      if (p1 && p2) return 'both'
      if (p1) return 'p1'
      if (p2) return 'p2'
      return 'none'
    })()) : 'none'
    const color = getColorForState(state)
    marker.setStyle({
      fillColor: state === 'none' ? '#94a3b8' : color,
      fillOpacity: state === 'none' ? 0.5 : 0.7,
      color: state === 'none' ? '#64748b' : color,
    })
  }
}

// Re-style on visit changes
watch([visits, activeProfileId], () => {
  if (geoJsonLayer) geoJsonLayer.setStyle(getStyle)
  updateTinyMarkers()
}, { deep: true })

function flyToCountry(alpha2) {
  const layer = countryLayers[alpha2]
  if (layer && map) {
    map.fitBounds(layer.getBounds(), { maxZoom: 5, animate: true, padding: [20, 20] })
  }
}

onUnmounted(() => { if (map) map.remove() })

defineExpose({ flyToCountry })
</script>

<template>
  <div ref="mapEl" class="map"></div>
  <CountryMemories v-if="memoriesCountry" :country="memoriesCountry" @close="memoriesCountry = null; refreshMemoryMarkers()" />
</template>

<style scoped>
.map { width: 100%; height: 100%; }
</style>

<style>
.country-tooltip {
  background: #ffffff !important;
  color: #1e293b !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 10px !important;
  padding: 0 !important;
  font-size: 0.82rem !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12) !important;
}
.leaflet-tooltip-top:before { border-top-color: #e2e8f0 !important; }
.tt-inner { display: flex; align-items: center; gap: 0.4rem; padding: 0.45rem 0.75rem; flex-wrap: wrap; }
.tt-flag { font-size: 1.15rem; }
.tt-inner strong { margin-right: 0.2rem; }
.tt-badge { font-size: 0.65rem; padding: 0.1rem 0.45rem; border-radius: 4px; font-weight: 600; }
.tt-p1 { background: #dbeafe; color: #2563eb; }
.tt-p2 { background: #fce7f3; color: #db2777; }
.tt-unvisited { font-size: 0.7rem; color: #94a3b8; font-style: italic; }
.tt-hint { font-size: 0.65rem; color: #3b82f6; padding: 0 0.75rem 0.35rem; }
.memory-bubble {
  background: #ffffff;
  border: 2px solid #3b82f6;
  border-radius: 50%;
  display: flex !important;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform 0.15s;
}
.memory-bubble:hover { transform: scale(1.2); }
</style>
