import { analyzeArticle, classifyRelatedContent } from './ai.mjs'
import { articleAnalysisCacheKey, recommendationCacheKey } from './cache-keys.mjs'
import { articleAnalysisPresets, recommendationPresets } from './demo-cache-presets.mjs'
import { redisCache } from './redis-cache.mjs'

function elapsed(startedAt) {
  return { total: Math.max(0, Date.now() - startedAt) }
}

export async function getCachedArticleAnalysis(article, dependencies = {}) {
  const startedAt = Date.now()
  const key = articleAnalysisCacheKey(article)
  const presets = dependencies.presets || articleAnalysisPresets
  const cache = dependencies.cache || redisCache
  const analyze = dependencies.analyze || analyzeArticle
  if (presets.has(key)) {
    return { moments: structuredClone(presets.get(key)), cacheSource: 'demo-preset', timingMs: elapsed(startedAt) }
  }
  const cached = await cache.get(key)
  if (cached?.moments) {
    return { moments: cached.moments, cacheSource: 'redis', timingMs: elapsed(startedAt) }
  }
  const moments = await analyze(article)
  await cache.set(key, { moments })
  return { moments, cacheSource: 'live-ai', timingMs: elapsed(startedAt) }
}

export async function getCachedRecommendation(moment, selectedOpinions, candidates, dependencies = {}) {
  const startedAt = Date.now()
  const key = recommendationCacheKey(moment, selectedOpinions, candidates)
  const presets = dependencies.presets || recommendationPresets
  const cache = dependencies.cache || redisCache
  const classify = dependencies.classify || classifyRelatedContent
  if (presets.has(key)) {
    return { groups: structuredClone(presets.get(key)), cacheSource: 'demo-preset', timingMs: elapsed(startedAt) }
  }
  const cached = await cache.get(key)
  if (cached?.groups) {
    return { groups: cached.groups, cacheSource: 'redis', timingMs: elapsed(startedAt) }
  }
  const groups = await classify(moment, selectedOpinions, candidates)
  await cache.set(key, { groups })
  return { groups, cacheSource: 'live-ai', timingMs: elapsed(startedAt) }
}
