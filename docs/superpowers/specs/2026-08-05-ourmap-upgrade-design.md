# OurMap Upgrade — Map Foundation & Premium Redesign

**Date:** 2026-08-05
**Status:** Approved, implementation starting

## Goal

Two upgrades, deliberately sequenced:

1. **Map foundation** — replace the coarse country source with one that treats England, Scotland, Wales, Northern Ireland, Gibraltar and every dependency as first-class, clickable, individually-counted entities.
2. **Premium redesign** — a cleaner, more minimal, more modern interface, built to the standard set by Linear/Vercel-tier products.

Phase 1 lands first so Phase 2 is designed against real geometry rather than guesses.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Counting | Every entity counts as +1 | England, Scotland, Wales and N. Ireland are constituent countries, not regions — the UK government calls them countries, and all four qualify separately for the World Cup. Counting them individually follows ordinary usage. |
| Granularity | Natural Earth 10m `admin_0_countries` as the base, **plus only the four UK constituent countries** from `admin_0_map_units` | See "Correction" below. Using `map_units` as the base was wrong: it also breaks Belgium into three regions and Bosnia into three, among others. |
| Basemap | None — flat canvas | Raster tiles draw their own borders and labels underneath and on top of our fills, giving two competing sources of truth for where a country is. Removing them is the only option where sharper borders fully lands. |
| Existing data | No migration | Production has no data worth preserving. |
| Flags | Bundled SVG (`flag-icons`) | Emoji tag-sequences for England/Scotland/Wales render as blank boxes on Windows; N. Ireland has no Unicode flag at all. SVG renders identically everywhere and is sharper in a list. |
| CSS approach | Scoped CSS + OKLCH token layer | Quality comes from tokens, icons, type and motion — not from the utility-class mechanism. A Tailwind migration would spend effort on scaffolding. Reversible. |

## Correction — the base layer changed during implementation

The spec originally chose `admin_0_map_units` as the base on the strength of the UK,
France and Netherlands splits, and claimed "the data is the spec; no hand-maintained
split list". **That was wrong**, and it shipped visibly broken: the country list
contained *Brussels* and *Brcko District*.

`admin_0_map_units` splits 11 internal administrative regions out of their countries:

- Belgium → Flemish, Walloon, Brussels
- Bosnia and Herzegovina → Federation of B&H, Republika Srpska, Brcko District
- Serbia → Serbia, Vojvodina
- Georgia → Georgia, Adjara
- Iraq → Iraq, Iraqi Kurdistan
- Somalia → Somalia, Puntland
- Papua New Guinea → Papua New Guinea, Bougainville

None of these are countries, and none is somewhere a person would say they had "been
to". The fix is to base on `admin_0_countries` — one polygon per country, with
Gibraltar, Jersey, Guernsey and the Isle of Man already separate — and graft in only
England, Scotland, Wales and Northern Ireland from `map_units`.

**Regression guard:** the build now fails if any two entities share an ISO code (the UK
four excepted). That is precisely the signature of a sub-national split, and it would
have caught this before a single line of UI was written. It immediately caught a second
case on first run: `Indian Ocean Ter.`, which lumps Christmas Island and Cocos together
under Australia's own ISO code.

## Verified before writing this spec

All load-bearing assumptions were tested against the real data, not assumed:

- Source downloads from `nvkelso/natural-earth-vector` — 13MB, 298 features.
- UK splits into England / Scotland / Wales / N. Ireland. Confirmed.
- `ISO_A2_EH` is `GB` for **all four** UK countries → ISO codes are unusable as a primary key. `GU_A3` is unique across all 298 → it is the primary key.
- After exclusions: **239 entities**.
- `flag-icons@7.5.0` covers all but **2** (Somaliland, N. Cyprus).
- Simplified to **384KB raw** with every shape intact, micro-states included.
- No two entities share an ISO code except the intended UK four — asserted at build time.

---

# Phase 1 — Map foundation

## 1. Build-time data pipeline

A committed script, `scripts/build-map-data.js`, run via `npm run build:map`. It is *not* part of `npm run build` — the outputs are committed, so a CDN outage can never break a deploy.

Steps:
1. Download both `ne_10m_admin_0_countries.geojson` and `ne_10m_admin_0_map_units.geojson`.
2. Take every country except the UK from the countries layer; take only England, Scotland, Wales and N. Ireland from the map-units layer. Drop excluded entities (see §3).
3. `mapshaper`: keep only the fields we use, `-simplify percentage=6% keep-shapes planar`, `-clean`, output TopoJSON at `precision=0.001`.
   - `keep-shapes` is **required** — without it micro-states are simplified out of existence.
4. Write `src/data/world.topo.json` (384KB raw).
5. Generate `src/data/entities.js` — the metadata table (code, name, iso2, continent, subregion, label point, area).
6. Copy the needed SVGs from `flag-icons` into `public/flags/`.

`mapshaper` and `flag-icons` become devDependencies. The geometry is loaded via `import worldUrl from '../data/world.topo.json?url'` so Vite content-hashes it and the browser caches it — replacing the current runtime jsdelivr fetch.

## 2. Entity identity

**Primary key: `ADM0_A3` lowercased, and `GU_A3` for the four UK countries.** Three characters, asserted unique at build time.

This is the one non-obvious decision in Phase 1 and it must not be revisited casually: `ISO_A2_EH` is `GB` for all four UK constituent countries, so any ISO-based key collides and silently merges England, Scotland, Wales and N. Ireland back into one entity — destroying the entire point of the upgrade.

Note that split countries get unfamiliar codes in the map-units layer (`nlx` for the Netherlands, `fxx` for France, `prx` for Portugal, `now` for Norway). Basing on the countries layer avoids this entirely: they are plain `nld`, `fra`, `prt`, `nor`.

`country_code VARCHAR(10)` already accommodates 3-char codes, so **the database schema does not change and there is nothing to upload.**

Flag key resolution, in order:
1. UK override table — `eng→gb-eng`, `sct→gb-sct`, `wls→gb-wls`, `nir→gb-nir`.
2. Otherwise `ISO_A2_EH` lowercased.
3. Otherwise a neutral placeholder (Somaliland, N. Cyprus only).

Entities may legitimately share a flag — the Azores show the Portuguese flag, Clipperton the French. That is correct.

## 3. Exclusions — by explicit code list, never by TYPE

23 entities aren't places you can visit: the Cyprus UN Buffer Zone; the Akrotiri and Dhekelia military bases; the Guantánamo Bay and Baikonur leases; Siachen Glacier, the Southern Patagonian Ice Field, Bir Tawil and Brazilian I.; four disputed uninhabited reefs and banks; the uninhabited island groups (Clipperton, Coral Sea, Ashmore & Cartier, US Minor Outlying, Heard & McDonald, Fr. S. Antarctic Lands, Bouvet, S. Georgia, Br. Indian Ocean Territory); and `Indian Ocean Ter.`

**Filtering these by `TYPE` would be a serious bug.** `TYPE=Sovereignty` is Kazakhstan and Cuba; `TYPE=Geo core` is the Netherlands. Natural Earth marks a country's main body that way whenever it has been split off from a lease or dependency — so a type rule would silently delete three real countries from the map. The exclusion list is therefore an explicit set of codes with a comment explaining exactly this.

Antarctica is **kept** — it has no permanent population but is a real destination people count. Somaliland and N. Cyprus are kept too: inhabited de facto states, unrecognised but real.

## 4. Continents

`CONTINENT` has no gaps, which fixes the current orphaned-Greenland bug for free (Greenland is in `countries.js` today with no continent, so it counts toward no card and is invisible to every filter — the sidebar reads 213 while the cards total 212).

However the field contains a fake continent, `"Seven seas (open ocean)"`. In the countries layer only four real places land there, so the reassignment table is four lines:

- Africa — Seychelles, Mauritius, Saint Helena
- Asia — Maldives

## 5. Rendering

Leaflet stays; the tile layers go.

- Canvas background is a CSS token on the map container.
- Fills get a real stroke — `weight: 0.6`, a neutral border token, so adjacent visited countries read as separate countries instead of merging into one blob. (Today `weight: 0`, which is why France renders as a soft smudge.)
- Hover cross-fades rather than snapping.
- **Small-entity markers are generated**, not hardcoded: any entity whose rendered area falls below a threshold gets a circle marker at its `LABEL_X`/`LABEL_Y` point, which the source provides for all 298. This deletes the `tinyCountries` hack and covers Gibraltar, Monaco, Vatican, Singapore and the island nations in one rule instead of one coordinate pair at a time.
- Markers inherit visit-state colour, so they stop looking like unrelated grey dots.
- The antimeridian fix is retained — it is correct and non-obvious.

## 6. Code changes folded in

Deletions:
- `src/components/BottomDrawer.vue`, `src/components/CountrySidebar.vue` — 624 lines, zero references.
- `src/data/countryCodeMap.js` — 253 lines, obsolete (no numeric→alpha2 hop needed).
- `src/data/countries.js`, `src/data/continents.js` — superseded by generated `entities.js`.

Refactors:
- Visit-state logic is currently duplicated four times (`WorldMap.vue:70`, `:98`, `:240`, `SidePanel.vue:49`), including an inline IIFE. Consolidate into one `visitStateFor(code)` in `useVisitedCountries.js`.
- `refreshMemoryMarkers` fetches `/api/memories` directly; route it through `api.js`.
- Remove the unused `open-memories` emit in `WorldMap.vue`.

Fixes:
- `clearAll` is one-click destructive with no confirmation → add a confirm step.
- The "Bucket list" filter actually means "not visited", mislabelling 165 countries as aspirations → rename until Phase 5 builds a real bucket list.
- Server logs a loud warning when `NODE_ENV=production` and `DATABASE_URL` is absent, instead of silently falling back to in-memory and losing data invisibly.

## 7. Goal target

`GOAL` is a single named constant. Raised to 50 during implementation on the reasoning that 239 entities with Britain worth 4 would make 30 too easy — then returned to **30** at the user's request, since "30 before 30" is the phrase the whole project is named around.

---

# Phase 2 — Premium redesign

Six levers, ordered by impact.

**Icons.** Replace all emoji carrying UI meaning (🌍 📷 🇪🇺 🌏 🏝️) with **Lucide** (`lucide-vue-next`). Emoji render differently per OS, can't inherit `currentColor`, can't be sized precisely, and read as decoration rather than interface. This is the single clearest non-premium signal in the current UI.

**Colour.** Replace the raw Tailwind defaults (`#3b82f6`, `#ec4899`, the slate ramp — instantly recognisable as out-of-the-box) with an **OKLCH** token layer in `src/styles/tokens.css`, so ramp steps are perceptually even rather than merely numerically even. Neutrals carry a slight cool tint rather than being pure grey. Full light/dark pairing.

Profile identity keeps its semantics — one colour each, blended for both:

```
--profile-1:  oklch(0.62 0.17 250)   /* azure  */
--profile-2:  oklch(0.66 0.18 15)    /* coral  */
--profile-both: oklch(0.60 0.19 300) /* violet */
```

Map surfaces:

```
--map-canvas: light oklch(0.975 0.004 235) / dark oklch(0.19 0.010 240)
--map-land:   light oklch(0.940 0.004 250) / dark oklch(0.26 0.008 250)
--map-border: light oklch(0.860 0.006 250) / dark oklch(0.32 0.010 250)
```

**Dark mode.** `prefers-color-scheme` by default, with a `[data-theme]` override that wins in both directions, plus a toggle.

**Typography.** Inter is the right family but is used flat today. Move to variable Inter via `@fontsource-variable/inter` (self-hosted, no CDN). Headings get `letter-spacing: -0.02em`/`-0.03em`; all counts get `font-variant-numeric: tabular-nums` so numbers stop jittering as they change — the goal ring benefits immediately.

**Motion.** `transition: all 0.15s` appears in several places, which is both imprecise and a performance smell. Replace with explicit properties and spring physics via `motion-v`. Press states scale to ~0.98, list entries stagger ~20ms apart, hover fades instead of snapping.

**Depth.** Retire single large drop shadows (`0 4px 16px rgba(0,0,0,0.12)`) for hairline 1px low-opacity borders and layered shadows — several stacked with small offsets.

**Layout.** 4px spacing grid. A consistent radius scale with correct nesting (inner radius = outer − padding); current values are 8/10/10/8 semi-arbitrarily. Component pass across header, `SidePanel`, `GoalProgress`, `CountryMemories`, `LoginScreen`, `ProfileSelector`.

Reka UI is adopted **selectively** — only if a component needs real focus management or portalling (the memories modal is the likely candidate). No full shadcn-vue migration: component count is small and interactions are simple, so the effort would go to scaffolding rather than looks.

## Non-goals

Roadmap Phases 4–6 (birthday countdown, real bucket list, trip planner). No image uploads — memories stay URL-only. No API authentication: the login gate is client-side and the secret ships in the bundle, which is noted as a known limitation for a private two-person app, not fixed here.

## Verification

- `npm run build:map` reproduces both artefacts deterministically.
- Entity count is 239; Kazakhstan, Cuba, the Netherlands, all four UK countries and Gibraltar are present — asserted in the build script so a future source change fails loudly instead of silently dropping countries.
- Every entity resolves to a flag or the explicit placeholder.
- Continent card totals sum to the list total (the current 212-vs-213 mismatch).
- Playwright drive: login → map renders 239 polygons → click England → only England fills → count increments → Scotland stays unvisited. Screenshot reviewed in both themes.
- No console errors.
