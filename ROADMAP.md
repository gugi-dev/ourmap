# OurMap Roadmap

## Phase 1 — MVP (Done)
- [x] Interactive world map (Leaflet)
- [x] Dual profiles with color coding (blue / pink / purple)
- [x] Continent stats with progress bars
- [x] "30 before 30" goal ring
- [x] Country search, filters (All / Visited / Not visited)
- [x] Country flags in sidebar
- [x] Confetti celebrations at milestones
- [x] Login gate (shared secret word)
- [x] Mobile responsive (hamburger menu)
- [x] Docker + Render deployment
- [x] In-memory store (works without DB)

## Phase 2 — Persistence (Done)
- [x] Neon PostgreSQL integration
- [x] Save traveler names + emoji
- [x] Save visited countries per profile
- [x] Data survives restarts
- [ ] Trip dates (when did you visit — date picker)

## Phase 3.5 — Map foundation & premium redesign (Done)
- [x] Natural Earth 10m source: 239 entities, England/Scotland/Wales/N. Ireland separate
- [x] Gibraltar, Jersey, Guernsey, Isle of Man and dependencies individually clickable
- [x] Committed build pipeline (`npm run build:map`) with regression assertions
- [x] Flat canvas map — tile layers removed, real strokes on country fills
- [x] Generated markers for small entities (replaced the hardcoded Malta table)
- [x] OKLCH design tokens, full dark mode with toggle
- [x] Lucide icons — all UI emoji removed; monogram traveller avatars
- [x] Variable Inter, tabular figures, tightened tracking
- [x] SVG flags (flag-icons) — England/Scotland/Wales/N. Ireland each their own
- [x] Marketing landing page with scroll-driven canvas globe (d3-geo)
- [x] Sidebar reduced to search + list; stats moved to a Progress popover
- [x] Confirm dialog on the destructive reset
- [x] Deleted 1,127 lines of dead code and superseded data files

## Phase 3 — Memories (In Progress)
- [x] Photos per country (URL-only, gallery + lightbox)
- [x] Camera bubble markers on map for countries with memories
- [x] Google Drive / Dropbox URL auto-conversion
- [x] Click visited country on map → opens memories
- [x] Memory markers use label points, not bbox centres (Spain's marker was in the Atlantic)
- [ ] Notes / journal entries per country
- [ ] "Our story" — shared timeline of travels

## Phase 4 — Goals & Countdown
- [ ] Birthday input per profile
- [ ] Live countdown: "X days until you turn 30"
- [ ] Progress dashboard: pace tracker ("you need Y countries in Z months")
- [ ] Milestone badges (5, 10, 15, 20, 25, 30)

## Phase 5 — Bucket List
- [ ] Mark countries as "want to visit"
- [ ] Different map color for bucket list countries
- [ ] Priority ranking (dream destinations first)
- [ ] Notes on why / what to see

## Phase 6 — Travel Planner
- [ ] Create upcoming trips (destination, dates, who's going)
- [ ] Trip itinerary builder (day-by-day plans)
- [ ] Accommodation + flight links / notes
- [ ] Budget tracker per trip
- [ ] Packing checklist
- [ ] Auto-mark country as visited after trip date passes

## Top 3 next — biggest gaps, in order of value
1. **Trip dates.** A visit is currently a boolean, so there is no travel history. One
   nullable column unlocks chronological sorting, a year-by-year story and real pace
   tracking toward the goal.
2. **Photo uploads.** Memories are the heart of the app but adding one means hosting the
   image elsewhere first. That friction is high enough that it won't happen. Needs object
   storage (R2/S3).
3. **API authentication.** `/api/*` is completely open and the secret word ships in the
   JS bundle, so anyone with the URL can read and delete everything. Cheapest of the
   three to fix and the most serious.

## Small Improvements Backlog
- [x] More tiny country markers — now generated for every small entity
- [x] Circle markers for all island nations
- [x] Remove unused components (BottomDrawer.vue, CountrySidebar.vue)
- [ ] Undo toast after marking or removing a visit (last data-loss path)
- [ ] Sort the country list by recently added, not alphabetically
- [ ] Add notes field to memories
- [ ] Favicon (currently a 404)
- [ ] Show the product on the landing page — sections 2 and 3 make visual claims with
      no visual proof
- [ ] Landing page footer
- [ ] Tests and linting

## Future Ideas
- [ ] Share a trip plan via link
- [ ] Travel stats dashboard (most visited continent, travel frequency)
- [ ] Map heatmap mode (how long you spent in each country)
- [ ] City-level tracking (not just countries)
- [ ] Currency converter widget
- [ ] Weather forecast for planned destinations
