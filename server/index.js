import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { initDb, query, useMemory, memoryDb } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(express.json())

// --- API Routes ---

app.get('/api/profiles', async (req, res) => {
  try {
    if (useMemory) return res.json(memoryDb.getProfiles())
    const { rows } = await query(`
      SELECT p.*, COALESCE(v.count, 0)::int AS visit_count
      FROM profiles p
      LEFT JOIN (
        SELECT profile_id, COUNT(*) AS count FROM visits GROUP BY profile_id
      ) v ON p.id = v.profile_id
      ORDER BY p.id
    `)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.patch('/api/profiles/:id', async (req, res) => {
  try {
    const { name, emoji } = req.body
    if (useMemory) {
      const p = memoryDb.updateProfile(Number(req.params.id), name, emoji)
      return p ? res.json(p) : res.status(404).json({ error: 'Not found' })
    }
    const { rows } = await query(
      'UPDATE profiles SET name = COALESCE($1, name), emoji = COALESCE($2, emoji) WHERE id = $3 RETURNING *',
      [name || null, emoji || null, req.params.id]
    )
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' })
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/profiles/:id/visits', async (req, res) => {
  try {
    if (useMemory) return res.json(memoryDb.getVisits(Number(req.params.id)))
    const { rows } = await query(
      'SELECT country_code, country_name, visited_at FROM visits WHERE profile_id = $1 ORDER BY visited_at DESC',
      [req.params.id]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/profiles/:id/visits', async (req, res) => {
  try {
    const { country_code, country_name } = req.body
    if (!country_code || !country_name) {
      return res.status(400).json({ error: 'country_code and country_name required' })
    }
    if (useMemory) {
      const v = memoryDb.addVisit(Number(req.params.id), country_code, country_name)
      return res.json(v || { already_exists: true })
    }
    const { rows } = await query(
      `INSERT INTO visits (profile_id, country_code, country_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (profile_id, country_code) DO NOTHING
       RETURNING *`,
      [req.params.id, country_code, country_name]
    )
    res.json(rows[0] || { already_exists: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/profiles/:id/visits/:code', async (req, res) => {
  try {
    if (useMemory) {
      memoryDb.removeVisit(Number(req.params.id), req.params.code)
      return res.json({ ok: true })
    }
    await query(
      'DELETE FROM visits WHERE profile_id = $1 AND country_code = $2',
      [req.params.id, req.params.code]
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/profiles/:id/visits', async (req, res) => {
  try {
    if (useMemory) {
      memoryDb.clearVisits(Number(req.params.id))
      return res.json({ ok: true })
    }
    await query('DELETE FROM visits WHERE profile_id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Memories ---

app.get('/api/memories', async (req, res) => {
  try {
    if (useMemory) return res.json(memoryDb.getMemoryCountries())
    const { rows } = await query(
      'SELECT country_code, COUNT(*)::int AS count FROM memories GROUP BY country_code'
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/memories/:countryCode', async (req, res) => {
  try {
    if (useMemory) return res.json(memoryDb.getMemories(req.params.countryCode))
    const { rows } = await query(
      'SELECT * FROM memories WHERE country_code = $1 ORDER BY created_at DESC',
      [req.params.countryCode]
    )
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.post('/api/memories/:countryCode', async (req, res) => {
  try {
    const { image_url, caption } = req.body
    if (!image_url) return res.status(400).json({ error: 'image_url required' })
    if (useMemory) {
      return res.json(memoryDb.addMemory(req.params.countryCode, image_url, caption))
    }
    const { rows } = await query(
      'INSERT INTO memories (country_code, image_url, caption) VALUES ($1, $2, $3) RETURNING *',
      [req.params.countryCode, image_url, caption || '']
    )
    res.json(rows[0])
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.delete('/api/memories/:id', async (req, res) => {
  try {
    if (useMemory) {
      memoryDb.deleteMemory(Number(req.params.id))
      return res.json({ ok: true })
    }
    await query('DELETE FROM memories WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// --- Static files (production) ---

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'dist')))
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'dist', 'index.html'))
  })
}

// --- Start ---

async function start() {
  try {
    await initDb()
    console.log(useMemory ? 'In-memory store ready' : 'Database initialized')
  } catch (e) {
    console.error('Database init failed:', e.message)
    process.exit(1)
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
