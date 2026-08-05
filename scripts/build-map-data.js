// Build-time map data pipeline.
//
//   npm run build:map
//
// Emits two committed artefacts plus a flag directory:
//
//   src/data/world.topo.json   simplified geometry (TopoJSON)
//   src/data/entities.js       generated metadata table
//   public/flags/*.svg         one SVG per entity that has a flag
//
// Outputs are committed on purpose: this script is NOT part of `npm run build`, so a
// CDN outage can never break a deploy.
//
// ── Why two sources ─────────────────────────────────────────────────────────────
//
// The goal is "normal countries, except Britain splits into its four constituent
// countries". That needs both Natural Earth admin-0 layers:
//
//   admin_0_countries   one polygon per country. Bosnia is one country, Belgium is
//                       one country — and Gibraltar, Jersey, Guernsey and the Isle of
//                       Man are already separate entities. This is the base.
//
//   admin_0_map_units   splits the UK into England / Scotland / Wales / N. Ireland.
//                       We take ONLY those four from it.
//
// Do not be tempted to use map_units as the base. It also splits Belgium into three
// regions (Flemish, Walloon, Brussels), Bosnia into three (Federation, Republika
// Srpska, Brcko District), and carves out Vojvodina, Adjara, Iraqi Kurdistan,
// Puntland and Bougainville — 11 internal administrative regions that are not
// countries and that no one would describe as somewhere they have "been to".

import { writeFile, mkdir, readFile, copyFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import mapshaper from 'mapshaper'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CACHE = join(__dirname, '.cache')

const BASE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'
const UNITS_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_map_units.geojson'

// The four constituent countries of the United Kingdom, taken from map_units.
const UK_UNITS = ['ENG', 'SCT', 'WLS', 'NIR']

// ── Entities to drop ─────────────────────────────────────────────────────────
//
// Places you cannot visit. Keyed by ADM0_A3, explicitly — NOT by the `TYPE` field.
// A TYPE rule looks tempting but silently deletes real countries: Natural Earth marks
// Kazakhstan and Cuba as `Sovereignty` (because Baikonur and Guantanamo are split off
// them), and the Netherlands as `Geo core`.
const DROP = new Set([
  'WSB', 'ESB',                       // Akrotiri, Dhekelia — UK military bases
  'USG', 'KAB',                       // Guantanamo Bay, Baikonur — leases
  'CNM',                              // Cyprus U.N. Buffer Zone
  'KAS', 'SPI',                       // Siachen Glacier, S. Patagonian Ice Field
  'BRT', 'BRI',                       // Bir Tawil, Brazilian I.
  'PGA', 'BJN', 'SER', 'SCR',         // disputed uninhabited reefs and banks
  'CLP', 'CSI', 'ATC',                // Clipperton, Coral Sea, Ashmore & Cartier
  'UMI', 'HMD', 'ATF', 'BVT', 'SGS',  // uninhabited island groups
  'IOT',                              // Br. Indian Ocean Ter. — Diego Garcia, military only
  // "Indian Ocean Territories" lumps Christmas I. and Cocos (Keeling) together under
  // Australia's own ISO code, and neither exists as a separate feature in this layer.
  // A single entry called "Indian Ocean Ter." means nothing to a user.
  'IOA',
])

// Antarctica (ATA) is deliberately kept: no permanent population, but it is a real
// destination and people count it. Somaliland and N. Cyprus are kept too — both are
// inhabited, de facto states, even if unrecognised.

// ── Continent fixes ──────────────────────────────────────────────────────────
//
// Natural Earth parks a few real places in a fake continent called
// "Seven seas (open ocean)". Reassign them — the only geographic data here that is
// not derived from the source.
const CONTINENT_FIX = {
  SYC: 'Africa', // Seychelles
  MUS: 'Africa', // Mauritius
  SHN: 'Africa', // Saint Helena
  MDV: 'Asia',   // Maldives
}

// ── Flags ────────────────────────────────────────────────────────────────────
//
// ISO_A2_EH is "GB" for all four UK constituent countries, so it cannot tell their
// flags apart. flag-icons ships dedicated subdivision SVGs; map them explicitly.
const FLAG_OVERRIDE = {
  eng: 'gb-eng',
  sct: 'gb-sct',
  wls: 'gb-wls',
  nir: 'gb-nir',
}

// No flag in flag-icons — both unrecognised states. They get a neutral placeholder.
const NO_FLAG = new Set(['sol', 'cyn'])

const SIMPLIFY_PCT = 6

// Sanity assertions. If a future source revision changes shape, the build fails
// loudly instead of quietly shipping a broken map.
const MUST_EXIST = [
  'eng', 'sct', 'wls', 'nir',        // the whole point of the upgrade
  'gib', 'jey', 'ggy', 'imn',        // UK dependencies stay separate
  'bih', 'bel', 'srb', 'geo', 'irq', // must be ONE country each, not split into regions
  'kaz', 'cub', 'nld', 'fra',        // the TYPE-filter near-misses
  'mlt', 'mco', 'vat', 'smr',        // micro-states must survive simplification
  'usa', 'chn', 'rus', 'bra', 'ata', // large countries + Antarctica
]

// ─────────────────────────────────────────────────────────────────────────────

async function fetchSource(url, filename) {
  await mkdir(CACHE, { recursive: true })
  const cached = join(CACHE, filename)
  if (existsSync(cached)) return cached
  console.log(`source: downloading ${filename}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`download failed (${filename}): HTTP ${res.status}`)
  await writeFile(cached, Buffer.from(await res.arrayBuffer()))
  return cached
}

function normalise(feature, code) {
  const p = feature.properties
  const iso = (p.ISO_A2_EH || '').toLowerCase()
  const props = {
    code,
    name: p.NAME,
    nameLong: p.NAME_LONG || p.NAME,
    iso2: iso && iso !== '-99' ? iso : null,
    type: p.TYPE,
    continent: CONTINENT_FIX[code.toUpperCase()] || p.CONTINENT,
    subregion: p.SUBREGION,
    labelX: p.LABEL_X,
    labelY: p.LABEL_Y,
  }
  props.flag = FLAG_OVERRIDE[code] || (NO_FLAG.has(code) ? null : props.iso2)
  return { ...feature, properties: props }
}

async function simplify(features) {
  const input = { 'in.json': JSON.stringify({ type: 'FeatureCollection', features }) }
  const cmd = [
    '-i in.json',
    // keep-shapes stops micro-states being simplified out of existence entirely
    `-simplify percentage=${SIMPLIFY_PCT}% keep-shapes planar`,
    '-clean',
    '-o out.topojson format=topojson precision=0.001',
  ].join(' ')
  const out = await mapshaper.applyCommands(cmd, input)
  return JSON.parse(out['out.topojson'])
}

async function copyFlags(entities) {
  const src = join(ROOT, 'node_modules', 'flag-icons', 'flags', '4x3')
  const dest = join(ROOT, 'public', 'flags')
  await mkdir(dest, { recursive: true })

  const available = new Set(
    (await readdir(src)).filter(f => f.endsWith('.svg')).map(f => f.slice(0, -4)),
  )

  const missing = []
  let copied = 0
  for (const key of new Set(entities.map(e => e.flag).filter(Boolean))) {
    if (!available.has(key)) {
      missing.push(key)
      continue
    }
    await copyFile(join(src, `${key}.svg`), join(dest, `${key}.svg`))
    copied++
  }

  await writeFile(
    join(dest, '_placeholder.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3">' +
      '<rect width="4" height="3" fill="currentColor" opacity=".14"/></svg>\n',
  )

  return { copied, missing }
}

function emitEntities(entities) {
  const rows = entities
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e =>
      `  [${[
        JSON.stringify(e.code),
        JSON.stringify(e.name),
        JSON.stringify(e.nameLong),
        JSON.stringify(e.iso2),
        JSON.stringify(e.flag),
        JSON.stringify(e.continent),
        JSON.stringify(e.subregion),
        e.labelX,
        e.labelY,
      ].join(', ')}],`,
    )

  return `// GENERATED by scripts/build-map-data.js — do not edit by hand.
// Run \`npm run build:map\` to regenerate.
//
// Base: Natural Earth 10m admin_0_countries (one polygon per country).
// Plus: England, Scotland, Wales and N. Ireland from admin_0_map_units.
//
// \`code\` is ADM0_A3 lowercased (and GU_A3 for the four UK countries). It is the
// primary key everywhere, including the \`visits.country_code\` column.
//
// Do not key this on an ISO code: ISO_A2_EH is "GB" for England, Scotland, Wales AND
// Northern Ireland, so an ISO key collides and merges all four into one entity.

// [code, name, nameLong, iso2, flag, continent, subregion, labelX, labelY]
const raw = [
${rows.join('\n')}
]

export const entities = raw.map(
  ([code, name, nameLong, iso2, flag, continent, subregion, labelX, labelY]) => ({
    code, name, nameLong, iso2, flag, continent, subregion, labelX, labelY,
  }),
)

export const totalEntities = entities.length

export const entityByCode = Object.fromEntries(entities.map(e => [e.code, e]))

export const nameByCode = Object.fromEntries(entities.map(e => [e.code, e.name]))

export const continents = [
${[...new Set(entities.map(e => e.continent))]
  .sort()
  .map(c => `  ${JSON.stringify(c)},`)
  .join('\n')}
]

export const codesByContinent = entities.reduce((acc, e) => {
  ;(acc[e.continent] ||= []).push(e.code)
  return acc
}, {})
`
}

async function main() {
  const [basePath, unitsPath] = await Promise.all([
    fetchSource(BASE_URL, 'ne_10m_admin_0_countries.geojson'),
    fetchSource(UNITS_URL, 'ne_10m_admin_0_map_units.geojson'),
  ])

  const base = JSON.parse(await readFile(basePath, 'utf8'))
  const units = JSON.parse(await readFile(unitsPath, 'utf8'))
  console.log(`source: ${base.features.length} countries, ${units.features.length} map units`)

  const features = [
    // Every country except the UK, which is replaced by its four constituents.
    ...base.features
      .filter(f => !DROP.has(f.properties.ADM0_A3) && f.properties.ADM0_A3 !== 'GBR')
      .map(f => normalise(f, f.properties.ADM0_A3.toLowerCase())),
    ...units.features
      .filter(f => UK_UNITS.includes(f.properties.GU_A3))
      .map(f => normalise(f, f.properties.GU_A3.toLowerCase())),
  ]

  const entities = features.map(f => f.properties)
  console.log(`filtered: ${entities.length} entities`)

  // --- Assertions ---
  const codes = new Set(entities.map(e => e.code))
  if (codes.size !== entities.length) throw new Error('duplicate entity codes')

  const lost = MUST_EXIST.filter(c => !codes.has(c))
  if (lost.length) throw new Error(`expected entities missing: ${lost.join(', ')}`)

  // The regression guard that matters. Two entities sharing an ISO code means the
  // source has split a country into sub-national pieces — the exact bug that put
  // Brussels and Brcko District in the country list. The four UK countries all
  // legitimately share "gb", so they are the only permitted exception.
  const byIso = {}
  for (const e of entities) {
    if (!e.iso2 || UK_UNITS.includes(e.code.toUpperCase())) continue
    ;(byIso[e.iso2] ||= []).push(e.name)
  }
  const splits = Object.entries(byIso).filter(([, v]) => v.length > 1)
  if (splits.length) {
    throw new Error(
      'sub-national splits detected — a country has been broken into regions:\n' +
        splits.map(([iso, names]) => `  ${iso}: ${names.join(', ')}`).join('\n'),
    )
  }

  const topo = await simplify(features)
  const geoms = Object.values(topo.objects)[0].geometries
  const empty = geoms.filter(g => !g.arcs || !g.arcs.length)
  if (empty.length) {
    throw new Error(
      `${empty.length} entities lost their geometry during simplification ` +
        `(${empty.slice(0, 5).map(g => g.properties.name).join(', ')}) — ` +
        `raise SIMPLIFY_PCT or check that keep-shapes is still set`,
    )
  }

  await mkdir(join(ROOT, 'src', 'data'), { recursive: true })
  const topoPath = join(ROOT, 'src', 'data', 'world.topo.json')
  await writeFile(topoPath, JSON.stringify(topo))
  await writeFile(join(ROOT, 'src', 'data', 'entities.js'), emitEntities(entities))

  const { copied, missing } = await copyFlags(entities)
  const bytes = (await readFile(topoPath)).length
  const noFlag = entities.filter(e => !e.flag).map(e => e.name)
  const byCont = entities.reduce((a, e) => ((a[e.continent] = (a[e.continent] || 0) + 1), a), {})

  console.log('')
  console.log(`geometry:   ${geoms.length} shapes, all non-empty`)
  console.log(`            ${(bytes / 1024).toFixed(0)}KB at ${SIMPLIFY_PCT}% simplification`)
  console.log(`flags:      ${copied} copied`)
  if (missing.length) console.log(`            NOT IN PACKAGE: ${missing.join(', ')}`)
  console.log(`            placeholder: ${noFlag.join(', ') || 'none'}`)
  console.log(`continents: ${Object.entries(byCont).map(([k, v]) => `${k} ${v}`).join(', ')}`)
  console.log('')
  console.log('no sub-national splits; UK split into 4 as intended')
  console.log('wrote src/data/world.topo.json, src/data/entities.js, public/flags/')
}

main().catch(e => {
  console.error(`\nbuild:map failed — ${e.message}`)
  process.exit(1)
})
