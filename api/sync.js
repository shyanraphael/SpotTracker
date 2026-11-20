// Cross-device sync for collections (folders). Runs as a Vercel serverless function.
//
// Auth: the browser sends its Spotify access token. We ask Spotify who it belongs to and only ever read or write
// that person's record, so nobody can touch someone else's folders. Storage: Redis over REST (Upstash, added from
// the Vercel Storage tab), reached with plain fetch so there are no extra dependencies.

const MAX_BYTES = 200_000

const redisUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

async function redis(command) {
  const r = await fetch(redisUrl(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${redisToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
  const j = await r.json()
  if (!r.ok || j.error) throw new Error(j.error || `redis ${r.status}`)
  return j.result
}

async function spotifyUserId(authorization) {
  const r = await fetch('https://api.spotify.com/v1/me', { headers: { Authorization: authorization } })
  if (!r.ok) return null
  const j = await r.json()
  return typeof j.id === 'string' ? j.id : null
}

function cleanCollections(input) {
  if (!Array.isArray(input) || input.length > 200) return null
  const out = []
  for (const c of input) {
    if (!c || typeof c.id !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.playlistIds)) return null
    if (c.playlistIds.length > 3000 || c.playlistIds.some((x) => typeof x !== 'string')) return null
    out.push({ id: c.id.slice(0, 40), name: c.name.slice(0, 80), emoji: String(c.emoji ?? 'c0').slice(0, 8), playlistIds: c.playlistIds })
  }
  return out
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!redisUrl() || !redisToken()) return res.status(503).json({ error: 'storage-not-configured' })

  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'missing-token' })
  let id
  try { id = await spotifyUserId(auth) } catch { return res.status(502).json({ error: 'spotify-unreachable' }) }
  if (!id) return res.status(401).json({ error: 'invalid-token' })

  const key = `spottracker:v1:${id}`
  try {
    const stored = await redis(['GET', key])
    const doc = stored ? JSON.parse(stored) : { collections: [], updatedAt: 0 }

    if (req.method === 'GET') return res.status(200).json(doc)

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
      const collections = cleanCollections(body.collections)
      if (!collections) return res.status(400).json({ error: 'bad-collections' })
      // Someone else (another device) saved after this device last looked: tell the caller so it can merge.
      if (doc.updatedAt > Number(body.baseUpdatedAt || 0)) return res.status(409).json(doc)
      const next = { collections, updatedAt: Date.now() }
      const json = JSON.stringify(next)
      if (json.length > MAX_BYTES) return res.status(413).json({ error: 'too-large' })
      await redis(['SET', key, json])
      return res.status(200).json(next)
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'method-not-allowed' })
  } catch {
    return res.status(500).json({ error: 'storage-error' })
  }
}
