<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as topojson from 'topojson-client'
import { numericToAlpha2 } from '../data/countryCodeMap.js'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { countryFlag } from '../utils/flags.js'

const { visits, profiles, activeProfileId, toggleCountry, countryNameMap } = useVisitedCountries()

const mapEl = ref(null)
let map = null
let geoJsonLayer = null
const countryLayers = {}

const COLORS = {
  profile1: '#3b82f6',
  profile2: '#ec4899',
  both: '#8b5cf6',
}

function fixAntimeridian(geojson) {
  geojson.features = geojson.features.filter(f => f.id !== '010')
  for (const feature of geojson.features) {
    const geom = feature.geometry
    if (geom.type === 'Polygon') {
      if (polygonCrossesAntimeridian(geom.coordinates)) {
        geom.coordinates = shiftPolygon(geom.coordinates)
      }
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(polygon =>
        polygonCrossesAntimeridian(polygon) ? shiftPolygon(polygon) : polygon
      )
    }
  }
}

function polygonCrossesAntimeridian(rings) {
  return rings.some(ring => {
    let hasEast = false, hasWest = false
    for (const [lng] of ring) {
      if (lng > 160) hasEast = true
      if (lng < -160) hasWest = true
      if (hasEast && hasWest) return true
    }
    return false
  })
}

function shiftPolygon(rings) {
  return rings.map(ring => ring.map(([lng, lat]) => [lng < 0 ? lng + 360 : lng, lat]))
}

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

  // Light clean tiles — no labels
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
          click: () => { if (alpha2) toggleCountry(alpha2) },
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
            const flag = countryFlag(alpha2 || '')
            l.bindTooltip(buildTooltip(flag, name, alpha2), {
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

    // Labels on top
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      pane: 'overlayPane',
    }).addTo(map)
  } catch (e) {
    console.error('Failed to load country data:', e)
  }
})

function buildTooltip(flag, name, alpha2) {
  const p1Id = profiles.value[0]?.id
  const p2Id = profiles.value[1]?.id
  const p1Name = profiles.value[0]?.name || 'P1'
  const p2Name = profiles.value[1]?.name || 'P2'
  const p1 = p1Id ? (visits.value[p1Id] || []).includes(alpha2) : false
  const p2 = p2Id ? (visits.value[p2Id] || []).includes(alpha2) : false
  let badges = ''
  if (p1) badges += `<span class="tt-badge tt-p1">${p1Name}</span>`
  if (p2) badges += `<span class="tt-badge tt-p2">${p2Name}</span>`
  if (!p1 && !p2) badges = '<span class="tt-unvisited">Not yet visited</span>'
  return `<div class="tt-inner"><span class="tt-flag">${flag}</span><strong>${name}</strong>${badges}</div>`
}

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
  if (state === 'both') return COLORS.both
  if (state === 'p1') return COLORS.profile1
  if (state === 'p2') return COLORS.profile2
  return 'transparent'
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

watch([visits, activeProfileId], () => {
  if (geoJsonLayer) geoJsonLayer.setStyle(getStyle)
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
</style>
