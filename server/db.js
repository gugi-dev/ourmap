import dotenv from 'dotenv'

dotenv.config()

// Only use PostgreSQL if DATABASE_URL is explicitly set and looks valid
const dbUrl = process.env.DATABASE_URL
let useMemory = !dbUrl || !dbUrl.startsWith('postgres')

// ── In-memory store (no DB needed for MVP) ──

const mem = {
  profiles: [
    { id: 1, name: 'Traveler 1', emoji: '🧑', created_at: new Date().toISOString() },
    { id: 2, name: 'Traveler 2', emoji: '👩', created_at: new Date().toISOString() },
  ],
  visits: [],
  nextVisitId: 1,
}

const memoryDb = {
  getProfiles() {
    return mem.profiles.map(p => ({
      ...p,
      visit_count: mem.visits.filter(v => v.profile_id === p.id).length,
    }))
  },
  updateProfile(id, name, emoji) {
    const p = mem.profiles.find(p => p.id === id)
    if (!p) return null
    if (name) p.name = name
    if (emoji) p.emoji = emoji
    return { ...p }
  },
  getVisits(profileId) {
    return mem.visits
      .filter(v => v.profile_id === profileId)
      .sort((a, b) => new Date(b.visited_at) - new Date(a.visited_at))
  },
  addVisit(profileId, countryCode, countryName) {
    const exists = mem.visits.find(
      v => v.profile_id === profileId && v.country_code === countryCode
    )
    if (exists) return null
    const visit = {
      id: mem.nextVisitId++,
      profile_id: profileId,
      country_code: countryCode,
      country_name: countryName,
      visited_at: new Date().toISOString(),
    }
    mem.visits.push(visit)
    return visit
  },
  removeVisit(profileId, countryCode) {
    mem.visits = mem.visits.filter(
      v => !(v.profile_id === profileId && v.country_code === countryCode)
    )
  },
  clearVisits(profileId) {
    mem.visits = mem.visits.filter(v => v.profile_id !== profileId)
  },
}

// ── PostgreSQL (when DATABASE_URL is set) ──

let pool = null

if (!useMemory) {
  try {
    const pg = await import('pg')
    const { Pool } = pg.default
    pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false },
    })
    // Test the connection
    await pool.query('SELECT 1')
  } catch (e) {
    console.warn('PostgreSQL connection failed, falling back to in-memory:', e.message)
    useMemory = true
    pool = null
  }
}

export async function initDb() {
  if (useMemory) {
    console.log('Using in-memory store (data resets on restart)')
    return
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      emoji VARCHAR(10) NOT NULL DEFAULT '🌍',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      country_code VARCHAR(10) NOT NULL,
      country_name VARCHAR(100) NOT NULL,
      visited_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(profile_id, country_code)
    );
    INSERT INTO profiles (id, name, emoji)
    VALUES (1, 'Traveler 1', '🧑'), (2, 'Traveler 2', '👩')
    ON CONFLICT (id) DO NOTHING;
  `)
  console.log('PostgreSQL connected and initialized')
}

export function query(text, params) {
  return pool.query(text, params)
}

export { useMemory, memoryDb }
export default pool
