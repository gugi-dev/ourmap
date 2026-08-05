# OurMap — Project Context

## What is this?
A couples travel tracker app for **Markic** and **Teic**. Core goal: **30 countries before 30**.

## Tech Stack
- **Frontend**: Vue 3 + Vite, Leaflet map, OKLCH design tokens, light + dark mode
- **Backend**: Express.js (serves API + static files)
- **Database**: Neon PostgreSQL (falls back to in-memory without DATABASE_URL)
- **Deploy**: Docker on Render (ourmap.onrender.com)
- **Repo**: github.com/gugi-dev/ourmap

## Architecture
```
src/
  components/
    Landing.vue        — Marketing landing page: pinned globe, scroll-driven copy,
                         secret-word gate at the end (replaced LoginScreen.vue)
    Globe.vue          — Canvas orthographic globe (d3-geo), reuses world.topo.json
    WorldMap.vue       — Leaflet map: NO tile layer, country fills + real strokes
    SidePanel.vue      — Search + grouped country list. Finding and marking ONLY
    StatsPanel.vue     — Progress popover (travellers, milestones, continents)
    CountryMemories.vue— Modal: photo gallery per country (URL-only, no uploads)
    ProfileSelector.vue— Traveller pills with monogram avatars
    GoalProgress.vue   — "30 before 30" stat card with SVG ring
    Avatar.vue         — Monogram avatar (initial in the traveller's colour)
    FlagIcon.vue       — SVG flag from /public/flags
    Logo.vue           — Two rings with a violet intersection lens
  composables/
    useVisitedCountries.js — Singleton state. visitStateFor() is the ONLY source of
                             truth for visit state; do not reimplement it
    useConfetti.js         — Milestone celebrations. seed() adopts the count on load
                             so startup never fires a celebration
    useTheme.js            — light | dark | system, writes data-theme on <html>
  data/
    entities.js       — GENERATED. 239 entities. Do not edit by hand
    world.topo.json   — GENERATED. Simplified TopoJSON geometry (384KB)
  styles/
    tokens.css        — OKLCH tokens, light + dark, spacing/radii/shadow/motion
  utils/
    flags.js          — entity code -> /flags/*.svg
    imageUrl.js       — Google Drive / Dropbox URL -> direct image URL
  api.js              — Frontend API client (/api/*)
scripts/
  build-map-data.js   — Map data pipeline. `npm run build:map`
server/
  index.js            — Express server (API routes + static serving)
  db.js               — DB layer (Neon PostgreSQL or in-memory fallback)
public/
  flags/*.svg         — GENERATED. Copied from flag-icons by the build script
```

## Map data — read this before touching it

239 entities: every country, **plus England, Scotland, Wales and Northern Ireland
individually**, plus Gibraltar, Jersey, Guernsey, the Isle of Man and every inhabited
dependency. Each counts as +1 toward the goal.

Two Natural Earth 10m layers, combined by `npm run build:map`:

- `admin_0_countries` is the **base** — one polygon per country.
- `admin_0_map_units` contributes **only** England, Scotland, Wales, N. Ireland.

**Never use `map_units` as the base.** It also splits Belgium into three regions
(Flemish, Walloon, Brussels), Bosnia into three (Federation, Republika Srpska, Brcko
District), and carves out Vojvodina, Adjara, Iraqi Kurdistan, Puntland and Bougainville
— 11 administrative regions that are not countries. This shipped once and had to be
undone.

**Primary key is `ADM0_A3` lowercased** (and `GU_A3` for the four UK countries). Never
key on ISO: `ISO_A2_EH` is `"GB"` for England, Scotland, Wales *and* N. Ireland, so an
ISO key silently merges all four. The build asserts that no two entities share an ISO
code, which is the exact signature of that bug.

Split countries have unfamiliar codes in `map_units` (`nlx`, `fxx`, `prx`, `now`); the
countries layer gives the expected `nld`, `fra`, `prt`, `nor`.

Generated artefacts are **committed on purpose**, and `build:map` is not part of
`npm run build`, so a CDN outage can never break a deploy.

## Key Design Decisions
- **No basemap tiles** — flat canvas. Tiles drew their own borders and labels under and
  over our fills, giving two competing sources of truth for where a country is
- **Real strokes on country fills**, so adjacent visited countries don't merge into one blob
- **Small entities get generated circle markers** from Natural Earth's LABEL_X/LABEL_Y
  when their area is below a threshold — no hardcoded coordinate table
- **Use LABEL_X/LABEL_Y, never bounding-box centres.** Spain's bbox spans the Canary
  Islands, so its centre lands in the Atlantic. Same for France, the USA, Portugal, Norway
- **Click model, map and sidebar identically**: if the *active* traveller has visited →
  open memories; otherwise mark it. Checking "has anyone visited" breaks the second
  traveller, and calling toggle unconditionally silently deletes visits
- **Icons are Lucide** — no emoji anywhere in the UI. Traveller identity is a monogram
- **OKLCH tokens** with light/dark; `[data-theme]` must win over `prefers-color-scheme`
- Leaflet and canvas need concrete colours, so they read tokens via `getComputedStyle`
  and re-read on theme change
- **Photos stored as URLs only** — Google Drive links auto-converted
- **In-memory fallback** — app works without DATABASE_URL, data resets on restart
- **Antimeridian fix** — shifts coordinates for countries crossing 180°/-180°

## DB Schema
- `profiles` (id, name, emoji, created_at) — 2 rows, seeded on init. `emoji` is legacy;
  the UI uses monogram avatars
- `visits` (id, profile_id, country_code, country_name, visited_at)
- `memories` (id, country_code, image_url, caption, created_at)

`country_code` holds the 3-char entity code (`eng`, `sct`, `gib`). No migration was
needed for the 239-entity switch because production had no data.

## Known limitations
- **`/api/*` has no authentication.** The login gate is client-side only and the secret
  word ships in the bundle, so anyone with the URL can read and delete data
- No trip dates — a visit is a boolean, so there is no travel history or timeline
- No image uploads; memories require hosting the photo elsewhere first
- No tests, no linting

## Git Conventions
- Push to `main`
- No Co-Authored-By or Claude signatures in commits
- Author: markogolub <markogolub0@gmail.com>
- The global gitconfig defaults to a **work** email, so this repo carries a local
  override, and the remote uses the `github-personal` SSH alias. Check
  `git config user.email` before the first commit in any session

## Running Locally
```bash
npm install
npm run dev          # Vite (5173) + Express (3001), in-memory mode
npm run build:map    # Regenerate entities.js, world.topo.json and public/flags
```
No .env or DATABASE_URL needed for local dev. Secret word: `mucmaz`.

## Deploying
Docker on Render. Set `DATABASE_URL` env var for Neon PostgreSQL persistence.
