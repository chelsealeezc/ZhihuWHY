const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60

function redisConfig() {
  return {
    url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
  }
}

export function createRedisCache({ fetchImpl = fetch, logger = console } = {}) {
  const config = redisConfig()
  const configured = Boolean(config.url && config.token)

  async function command(parts) {
    if (!configured) return null
    const response = await fetchImpl(config.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(parts),
      // Upstash's first request can include a cold connection; keep this well
      // below the recommendation AI timeout while allowing normal Vercel RTT.
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error(`Redis request failed (HTTP ${response.status})`)
    const payload = await response.json()
    if (payload?.error) throw new Error('Redis command failed')
    return payload?.result ?? null
  }

  return {
    configured,
    async get(key) {
      if (!configured) return null
      try {
        const value = await command(['GET', key])
        return value ? JSON.parse(value) : null
      } catch (error) {
        logger.warn?.('[cache] Redis GET unavailable', { keyPrefix: key.split(':')[0] })
        return null
      }
    },
    async set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
      if (!configured) return false
      try {
        await command(['SET', key, JSON.stringify(value), 'EX', ttlSeconds])
        return true
      } catch (error) {
        logger.warn?.('[cache] Redis SET unavailable', { keyPrefix: key.split(':')[0] })
        return false
      }
    },
  }
}

export const CACHE_TTL_SECONDS = DEFAULT_TTL_SECONDS
export const redisCache = createRedisCache()
