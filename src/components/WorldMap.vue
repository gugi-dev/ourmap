<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import * as topojson from 'topojson-client'
import worldUrl from '../data/world.topo.json?url'
import { entityByCode } from '../data/entities.js'
import { useVisitedCountries } from '../composables/useVisitedCountries.js'
import { flagUrl } from '../utils/flags.js'
import * as api from '../api.js'
import CountryMemories from './CountryMemories.vue'

const { visits, profiles, activeProfileId, toggleCountry, visitStateFor, isVisitedBy } =
  useVisitedCountries()

const mapEl = ref(null)
let map = null
let geoJsonLayer = null
const countryLayers = {}
const smallMarkers = {} // code -> circleMarker, generated for tiny entities
const memoriesCountry = ref(null)
let memoryMarkers = []

// Entities below this approximate area (square degrees, longitude corrected for
// latitude) get a circle marker so they stay clickable at low zoom.
//
// This replaces the old hardcoded `tinyCountries` table, which contained exactly one
// entry (Malta) and needed a new coordinate pair by hand for every island nation.
// Natural Earth supplies LABEL_X/LABEL_Y for every entity, so one rule covers
// Gibraltar, Monaco, Vatican, Singapore, and everything in the Caribbean and Pacific.
const SMALL_AREA_DEG2 = 2.0

// --- Theme-aware palette -----------------------------------------------------
// Leaflet paints SVG attributes, so it needs concrete colour values rather than
// var() references. Read them from the token layer and re-read when the theme flips.
let palette = {}

function readPalette() {
  const s = getComputedStyle(document.documentElement)
  const v = name => s.getPropertyValue(name).trim()
  palette = {
    p1: v('--profile-1'),
    p2: v('--profile-2'),
    both: v('--profile-both'),
    land: v('--map-land'),
    landHover: v('--map-land-hover'),
    border: v('--map-border'),
    borderStrong: v('--border-strong'),
    borderVisited: v('--map-border-visited'),
  }
}

function colorFor(state) {
  return { p1: palette.p1, p2: palette.p2, both: palette.both }[state] || palette.land
}

// --- Antimeridian fix --------------------------------------------------------
// Countries spanning 180°/-180° (Russia, Fiji, Kiribati, NZ) otherwise render as
// horizontal smears across the whole map.
function fixAntimeridian(geojson) {
  for (const feature of geojson.features) {
    const geom = feature.geometry
    if (!geom) continue
    if (geom.type === 'Polygon') {
      if (crossesAM(geom.coordinates)) geom.coordinates = shiftPoly(geom.coordinates)
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates = geom.coordinates.map(p => (crossesAM(p) ? shiftPoly(p) : p))
    }
  }
}
function crossesAM(rings) {
  return rings.some(r => {
    let e = false, w = false
    for (const [l] of r) { if (l > 160) e = true; if (l < -160) w = true; if (e && w) return true }
    return false
  })
}
function shiftPoly(rings) {
  return rings.map(r => r.map(([l, a]) => [l < 0 ? l + 360 : l, a]))
}

// --- Interaction -------------------------------------------------------------
function handleClick(code) {
  if (!code) return
  // Deliberately the ACTIVE traveller, not "anyone". Asking "has anyone been here?"
  // means that once one traveller marks a country, the other can never mark it from
  // the map — their click gets swallowed into opening the memories modal instead.
  if (isVisitedBy(activeProfileId.value, code)) {
    const entity = entityByCode[code]
    if (entity) memoriesCountry.value = entity
  } else {
    toggleCountry(code)
  }
}

function styleFor(feature) {
  const state = visitStateFor(feature.properties.code)
  const visited = state !== 'none'
  return {
    // A real stroke, so adjacent visited countries read as separate countries
    // instead of merging into one blob (this used to be weight: 0).
    weight: visited ? 0.9 : 0.6,
    color: visited ? palette.borderVisited : palette.border,
    fillColor: colorFor(state),
    fillOpacity: visited ? 0.92 : 1,
  }
}

function tooltipHtml(code) {
  const e = entityByCode[code]
  if (!e) return ''
  const state = visitStateFor(code)
  const p1 = profiles.value[0]?.name || 'P1'
  const p2 = profiles.value[1]?.name || 'P2'

  let badges = ''
  if (state === 'p1' || state === 'both') badges += `<span class="tt-badge tt-p1">${p1}</span>`
  if (state === 'p2' || state === 'both') badges += `<span class="tt-badge tt-p2">${p2}</span>`

  // Must match handleClick: the hint reflects the ACTIVE traveller, so a country the
  // other one has visited still reads "click to mark as visited" for you.
  const hint = isVisitedBy(activeProfileId.value, code)
    ? '<div class="tt-hint tt-hint-go">Click to view memories</div>'
    : '<div class="tt-hint">Click to mark as visited</div>'

  return (
    `<div class="tt-inner">` +
    `<img class="tt-flag" src="${flagUrl(code)}" alt="" width="22" height="17">` +
    `<strong>${e.name}</strong>${badges}</div>${hint}`
  )
}

function bindTip(layer, code, offset) {
  layer
    .bindTooltip(tooltipHtml(code), {
      sticky: true,
      direction: 'top',
      offset,
      className: 'country-tooltip',
    })
    .openTooltip()
}

// --- Small-entity markers ----------------------------------------------------
function approxAreaDeg2(bounds) {
  const latSpan = bounds.getNorth() - bounds.getSouth()
  const midLat = bounds.getCenter().lat
  const lngSpan = (bounds.getEast() - bounds.getWest()) * Math.cos((midLat * Math.PI) / 180)
  return Math.abs(latSpan * lngSpan)
}

function addSmallMarker(code) {
  const e = entityByCode[code]
  if (!e || e.labelY == null || e.labelX == null) return
  const marker = L.circleMarker([e.labelY, e.labelX], {
    radius: 3.6,
    weight: 1,
    className: 'small-entity',
  }).addTo(map)
  marker.on('click', () => handleClick(code))
  marker.on('mouseover', () => bindTip(marker, code, [0, -8]))
  marker.on('mouseout', () => marker.unbindTooltip())
  smallMarkers[code] = marker
}

function styleSmallMarkers() {
  for (const [code, marker] of Object.entries(smallMarkers)) {
    const state = visitStateFor(code)
    const visited = state !== 'none'
    // Unvisited markers use the border tone rather than the land fill — a near-white
    // dot would vanish against near-white land while still showing over the ocean.
    marker.setStyle({
      fillColor: visited ? colorFor(state) : palette.border,
      fillOpacity: visited ? 1 : 0.85,
      color: visited ? palette.borderVisited : palette.borderStrong,
      weight: visited ? 1.1 : 0.8,
    })
  }
}

function restyleAll() {
  if (geoJsonLayer) geoJsonLayer.setStyle(styleFor)
  styleSmallMarkers()
}

// --- Mount -------------------------------------------------------------------
let themeObserver = null
let schemeQuery = null

onMounted(async () => {
  readPalette()

  map = L.map(mapEl.value, {
    center: [42, 12],
    zoom: 4,
    zoomSnap: 0.5,
    zoomDelta: 0.5,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    worldCopyJump: true,
    maxBounds: [[-85, -200], [85, 200]],
    maxBoundsViscosity: 0.8,
    attributionControl: false,
  })

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  try {
    const res = await fetch(worldUrl)
    const topo = await res.json()
    const objectName = Object.keys(topo.objects)[0]
    const collection = topojson.feature(topo, topo.objects[objectName])
    fixAntimeridian(collection)

    geoJsonLayer = L.geoJSON(collection, {
      style: styleFor,
      onEachFeature: (feature, layer) => {
        const code = feature.properties.code
        if (!code) return
        countryLayers[code] = layer

        layer.on({
          click: () => handleClick(code),
          mouseover: e => {
            const l = e.target
            const state = visitStateFor(code)
            l.setStyle({
              weight: 1.4,
              color: state === 'none' ? palette.borderStrong || palette.border : palette.borderVisited,
              fillColor: state === 'none' ? palette.landHover : colorFor(state),
              fillOpacity: 1,
            })
            l.bringToFront()
            bindTip(l, code, [0, -10])
          },
          mouseout: e => {
            geoJsonLayer.resetStyle(e.target)
            e.target.unbindTooltip()
          },
        })
      },
    }).addTo(map)

    // Generate markers for entities too small to hit at low zoom.
    for (const [code, layer] of Object.entries(countryLayers)) {
      if (approxAreaDeg2(layer.getBounds()) < SMALL_AREA_DEG2) addSmallMarker(code)
    }
    styleSmallMarkers()

    await refreshMemoryMarkers()
  } catch (e) {
    console.error('Failed to load map data:', e)
  }

  // Re-read colours when the theme changes, in either direction.
  schemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
  schemeQuery.addEventListener('change', onThemeChange)
  themeObserver = new MutationObserver(onThemeChange)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

function onThemeChange() {
  readPalette()
  restyleAll()
}

async function refreshMemoryMarkers() {
  if (!map) return
  memoryMarkers.forEach(m => map.removeLayer(m))
  memoryMarkers = []

  try {
    const data = await api.getMemoryCountries()
    for (const { country_code } of data) {
      const entity = entityByCode[country_code]
      if (!entity || entity.labelY == null) continue

      const icon = L.divIcon({
        className: 'memory-bubble',
        html:
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
          'stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/>' +
          '<circle cx="12" cy="13" r="3"/></svg>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      })

      // Natural Earth's label point, NOT the polygon's bounding-box centre.
      //
      // A bbox centre is badly wrong for any country with distant territories: Spain's
      // bbox spans the mainland AND the Canary Islands, so its centre falls in the
      // Atlantic off Morocco. Same for France (overseas départements), the USA
      // (Alaska + Hawaii), Portugal (Azores), Norway (Svalbard), Ecuador (Galápagos).
      const marker = L.marker([entity.labelY, entity.labelX], { icon }).addTo(map)
      marker.on('click', () => {
        memoriesCountry.value = entity
      })
      memoryMarkers.push(marker)
    }
  } catch (_) {}
}

watch([visits, activeProfileId], restyleAll, { deep: true })

// Bounds of the ring that actually contains the country's label point, rather than of
// every ring it owns. Fitting Spain's full bounds zooms out far enough to include the
// Canary Islands, leaving the mainland a speck; same for France, the USA and Portugal.
function mainBounds(code, layer) {
  const e = entityByCode[code]
  if (!e || e.labelY == null) return layer.getBounds()

  const point = L.latLng(e.labelY, e.labelX)
  const rings = []
  const walk = node => {
    if (!Array.isArray(node) || !node.length) return
    if (node[0] instanceof L.LatLng) rings.push(node)
    else node.forEach(walk)
  }
  walk(layer.getLatLngs())

  for (const ring of rings) {
    const b = L.latLngBounds(ring)
    if (b.contains(point)) return b
  }
  // Falls through for antimeridian-shifted geometry, where the unshifted label point
  // sits outside every ring. Full bounds is the right answer for those anyway.
  return layer.getBounds()
}

function flyToCountry(code) {
  const layer = countryLayers[code]
  if (!layer || !map) return
  map.fitBounds(mainBounds(code, layer), { maxZoom: 6, animate: true, padding: [24, 24] })
}

onUnmounted(() => {
  schemeQuery?.removeEventListener('change', onThemeChange)
  themeObserver?.disconnect()
  if (map) map.remove()
})

defineExpose({ flyToCountry })
</script>

<template>
  <div ref="mapEl" class="map"></div>
  <CountryMemories
    v-if="memoriesCountry"
    :country="memoriesCountry"
    @close="memoriesCountry = null; refreshMemoryMarkers()"
  />
</template>

<style scoped>
.map {
  width: 100%;
  height: 100%;
  background: var(--map-canvas);
}
</style>

<style>
/* Leaflet's own chrome, restyled to the token layer. */
.leaflet-container {
  background: var(--map-canvas);
  font-family: var(--font-sans);
}

.small-entity {
  transition: fill var(--t-fast) var(--ease-out);
  cursor: pointer;
}
.small-entity:hover {
  filter: brightness(0.94);
}

.leaflet-bar {
  border: none !important;
  box-shadow: var(--shadow-md) !important;
  border-radius: var(--r-md) !important;
  overflow: hidden;
}
.leaflet-bar a {
  background: var(--surface) !important;
  color: var(--text-muted) !important;
  border-bottom-color: var(--border-subtle) !important;
  width: 30px !important;
  height: 30px !important;
  line-height: 30px !important;
  font-size: 1.05rem !important;
  transition: background var(--t-fast) var(--ease-out), color var(--t-fast) var(--ease-out);
}
.leaflet-bar a:hover {
  background: var(--surface-hover) !important;
  color: var(--text) !important;
}

/* Tooltip */
.country-tooltip {
  background: var(--surface) !important;
  color: var(--text) !important;
  border: 1px solid var(--border-subtle) !important;
  border-radius: var(--r-md) !important;
  padding: 0 !important;
  font-size: 0.8rem !important;
  box-shadow: var(--shadow-lg) !important;
  white-space: nowrap;
}
.country-tooltip::before {
  display: none !important;
}
.tt-inner {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: 0.4rem 0.6rem 0.3rem;
}
.tt-flag {
  border-radius: 2px;
  box-shadow: inset 0 0 0 1px oklch(0.28 0.012 250 / 0.12);
}
.tt-inner strong {
  font-weight: 600;
  letter-spacing: -0.01em;
}
.tt-badge {
  font-size: 0.62rem;
  padding: 0.08rem 0.36rem;
  border-radius: var(--r-sm);
  font-weight: 600;
  letter-spacing: -0.005em;
}
.tt-p1 {
  background: var(--profile-1-soft);
  color: var(--profile-1-text);
}
.tt-p2 {
  background: var(--profile-2-soft);
  color: var(--profile-2-text);
}
.tt-hint {
  font-size: 0.66rem;
  color: var(--text-faint);
  padding: 0 0.6rem 0.38rem;
}
.tt-hint-go {
  color: var(--profile-1);
}

/* Memory marker */
.memory-bubble {
  background: var(--surface);
  border: 1.5px solid var(--profile-both);
  color: var(--profile-both);
  border-radius: var(--r-full);
  display: flex !important;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  transition: transform var(--t-base) var(--ease-spring);
}
.memory-bubble svg {
  width: 13px;
  height: 13px;
}
.memory-bubble:hover {
  transform: scale(1.18);
}
</style>
