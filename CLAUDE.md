# OurMap — Project Context

## What is this?
A couples travel tracker app for **Markic** and **Teic**. Core goal: **30 countries before 30**.

## Tech Stack
- **Frontend**: Vue 3 + Vite, Leaflet map, light mode
- **Backend**: Express.js (serves API + static files)
- **Database**: Neon PostgreSQL (falls back to in-memory without DATABASE_URL)
- **Deploy**: Docker on Render (ourmap.onrender.com)
- **Repo**: github.com/gugi-dev/ourmap (push to main, SSH as gugi-dev)

## Architecture
```
src/
  components/
    LoginScreen.vue    — Secret word gate ("mucmaz")
    WorldMap.vue       — Leaflet map, country coloring, memory bubbles, Malta marker
    SidePanel.vue      — Always-visible sidebar: continent cards, search, country list
    CountryMemories.vue— Modal: photo gallery per country (URL-only, no uploads)
    ProfileSelector.vue— Profile pills (emoji-only on mobile)
    GoalProgress.vue   — SVG ring showing X/30 progress
    BottomDrawer.vue   — (unused, replaced by SidePanel)
    CountrySidebar.vue — (unused, replaced by SidePanel)
  composables/
    useVisitedCountries.js — Singleton state: profiles, visits, API calls
    useConfetti.js         — Milestone celebrations (1,5,10,15,20,25,30)
  data/
    countries.js       — Static country list (alpha-2 codes + names)
    countryCodeMap.js   — ISO numeric → alpha-2 mapping (for world-atlas GeoJSON)
    continents.js      — Country → continent mapping + continent metadata
  utils/
    flags.js           — Country code → flag emoji converter
    imageUrl.js        — Google Drive/Dropbox URL → direct image URL converter
  api.js               — Frontend API client (/api/*)
server/
  index.js             — Express server (API routes + static serving)
  db.js                — DB layer (Neon PostgreSQL or in-memory fallback)
```

## Key Design Decisions
- **Light mode** — clean, white UI with light CartoDB map tiles
- **No country borders** on map — fill-only coloring (blue/pink/purple)
- **Sidebar always visible on desktop**, hamburger menu on mobile (Teleport overlay)
- **Click visited country on map → opens memories** (not un-visit)
- **Click unvisited country → marks as visited**
- **Photos stored as URLs only** — Google Drive links auto-converted
- **In-memory fallback** — app works without DATABASE_URL, data resets on restart
- **Antimeridian fix** — shifts coordinates for countries crossing 180°/-180°

## DB Schema
- `profiles` (id, name, emoji, created_at) — 2 rows, seeded on init
- `visits` (id, profile_id, country_code, country_name, visited_at)
- `memories` (id, country_code, image_url, caption, created_at)

## Git Conventions
- Push to `main` branch
- No Co-Authored-By or Claude signatures in commits
- Author: markogolub <markogolub0@gmail.com>

## Running Locally
```bash
npm install
npm run dev          # Starts Vite + Express (in-memory mode)
```
No .env or DATABASE_URL needed for local dev.

## Deploying
Docker on Render. Set `DATABASE_URL` env var for Neon PostgreSQL persistence.
