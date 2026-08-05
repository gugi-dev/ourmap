<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from 'd3-geo'
import * as topojson from 'topojson-client'
import worldUrl from '../data/world.topo.json?url'

// An orthographic globe drawn on canvas, reusing the same TopoJSON the map uses.
//
// Deliberately not three.js: this is ~15KB of dependency instead of ~600KB, stays
// crisp at any pixel density, and — the point — can paint specific countries in the
// traveller colours. A textured 3D sphere is a stock asset; this is the actual data.

const props = defineProps({
  // Degrees of rotation around the polar axis.
  rotation: { type: Number, default: 0 },
  // { [code]: 'p1' | 'p2' | 'both' } — which traveller colour each country takes.
  states: { type: Object, default: () => ({}) },
  // Codes that get a memory pin on the surface.
  pins: { type: Array, default: () => [] },
  // Label points for pin placement: { [code]: [lon, lat] }
  points: { type: Object, default: () => ({}) },
  tilt: { type: Number, default: -12 },
})

// The camera body, as SVG path data on a 24x24 grid. Path2D accepts the same syntax an
// <svg> would, so the pin can carry a real icon instead of a plain dot — and it matches
// the camera marker the map itself uses for a country with memories.
const CAMERA_BODY =
  'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z'
const cameraPath = typeof Path2D !== 'undefined' ? new Path2D(CAMERA_BODY) : null

const canvasEl = ref(null)
let ctx = null
let features = []
let graticule = geoGraticule().step([20, 20])
let ro = null
let raf = null
let size = { w: 0, h: 0 }

function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function resize() {
  const el = canvasEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  size = { w: rect.width, h: rect.height }
  el.width = Math.round(rect.width * dpr)
  el.height = Math.round(rect.height * dpr)
  ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  schedule()
}

function schedule() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = null
    draw()
  })
}

function draw() {
  if (!ctx || !size.w) return

  const { w, h } = size
  const radius = Math.min(w, h) / 2 - 2

  const projection = geoOrthographic()
    .translate([w / 2, h / 2])
    .scale(radius)
    .rotate([props.rotation, props.tilt])

  const path = geoPath(projection, ctx)

  const cOcean = token('--map-canvas')
  const cLand = token('--map-land')
  const cBorder = token('--map-border')
  const cGrat = token('--border-subtle')
  const cSurface = token('--surface')
  const fill = {
    p1: token('--profile-1'),
    p2: token('--profile-2'),
    both: token('--profile-both'),
  }

  ctx.clearRect(0, 0, w, h)

  // Ocean
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.fillStyle = cOcean
  ctx.fill()

  // Graticule
  ctx.beginPath()
  path(graticule())
  ctx.strokeStyle = cGrat
  ctx.lineWidth = 0.5
  ctx.stroke()

  for (const f of features) {
    ctx.beginPath()
    path(f)
    const state = props.states[f.properties.code]
    ctx.fillStyle = state ? fill[state] : cLand
    ctx.fill()
    ctx.strokeStyle = state ? 'oklch(1 0 0 / 0.5)' : cBorder
    ctx.lineWidth = state ? 0.55 : 0.4
    ctx.stroke()
  }

  // Limb darkening — without this the disc reads as a flat circle rather than a
  // sphere. Clipped to the sphere so it never bleeds past the edge.
  ctx.save()
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.clip()
  const cx = w / 2 - radius * 0.22
  const cy = h / 2 - radius * 0.22
  const shade = ctx.createRadialGradient(cx, cy, radius * 0.15, w / 2, h / 2, radius * 1.06)
  shade.addColorStop(0, 'oklch(1 0 0 / 0.18)')
  shade.addColorStop(0.55, 'oklch(0.5 0.02 250 / 0)')
  shade.addColorStop(1, 'oklch(0.32 0.03 250 / 0.28)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  // Memory pins, drawn after the shading so they stay bright.
  //
  // Orthographic projection returns coordinates for far-side points too, so they must
  // be culled by angular distance from the centre or pins would show through the globe.
  const centre = [-props.rotation, -props.tilt]
  for (const code of props.pins) {
    const lonLat = props.points[code]
    if (!lonLat) continue
    if (geoDistance(centre, lonLat) > Math.PI / 2 - 0.06) continue

    const xy = projection(lonLat)
    if (!xy) continue

    // Violet disc with a light rim, so it reads as a pin sitting on the surface.
    ctx.beginPath()
    ctx.arc(xy[0], xy[1], 9, 0, Math.PI * 2)
    ctx.fillStyle = fill.both
    ctx.fill()
    ctx.lineWidth = 1.6
    ctx.strokeStyle = cSurface
    ctx.stroke()

    // Camera glyph inside it.
    if (cameraPath) {
      const scale = 0.4 // the glyph is drawn on a 24x24 grid
      ctx.save()
      ctx.translate(xy[0], xy[1])
      ctx.scale(scale, scale)
      ctx.translate(-12, -12.5)
      ctx.strokeStyle = cSurface
      ctx.lineWidth = 2.4 / scale
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke(cameraPath)
      ctx.beginPath()
      ctx.arc(12, 13, 3.1, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
  }

  // Sphere edge, drawn last so it sits above the land
  ctx.beginPath()
  path({ type: 'Sphere' })
  ctx.strokeStyle = cBorder
  ctx.lineWidth = 1
  ctx.stroke()
}

onMounted(async () => {
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(canvasEl.value)

  try {
    const topo = await (await fetch(worldUrl)).json()
    const name = Object.keys(topo.objects)[0]
    features = topojson.feature(topo, topo.objects[name]).features
    schedule()
  } catch (e) {
    console.error('Globe failed to load geometry:', e)
  }
})

onUnmounted(() => {
  ro?.disconnect()
  if (raf) cancelAnimationFrame(raf)
})

watch(() => [props.rotation, props.states, props.pins, props.tilt], schedule, { deep: true })

defineExpose({ redraw: schedule })
</script>

<template>
  <canvas ref="canvasEl" class="globe" aria-hidden="true" />
</template>

<style scoped>
.globe {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
