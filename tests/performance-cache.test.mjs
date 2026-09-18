import test from 'node:test'
import assert from 'node:assert/strict'

const {
  articleAnalysisCacheKey,
  recommendationCacheKey,
} = await import('../server/cache-keys.mjs')
const {
  getCachedArticleAnalysis,
  getCachedRecommendation,
} = await import('../server/discussion-cache.mjs')

const article = {
  title: '为什么难开始？',
  paragraphs: [{ text: '成功次数太少。' }, { text: '先建立正反馈。' }],
}
const moment = { coreQuestion: '为什么难开始？', searchQuery: '执行力 反馈' }
const candidates = [
  { id: 'A', title: '反馈', quote: '反馈有助于行动。' },
  { id: 'B', title: '任务', quote: '任务要具体。' },
  { id: 'C', title: '环境', quote: '环境会影响行为。' },
]
const groups = { same: [candidates[0]], different: [candidates[1]], neutral: [candidates[2]] }

function fakeCache(initial = null, { failGet = false, failSet = false } = {}) {
  return {
    getCalls: 0,
    setCalls: 0,
    written: null,
    async get() {
      this.getCalls++
      if (failGet) return null
      return initial
    },
    async set(key, value) {
      this.setCalls++
      if (!failSet) this.written = { key, value }
      return !failSet
    },
  }
}

test('article preset hit skips Redis and AI', async () => {
  const key = articleAnalysisCacheKey(article)
  const cache = fakeCache()
  let aiCalls = 0
  const result = await getCachedArticleAnalysis(article, {
    presets: new Map([[key, [{ id: 'preset' }]]]),
    cache,
    analyze: async () => { aiCalls++; return [] },
  })
  assert.equal(result.cacheSource, 'demo-preset')
  assert.equal(cache.getCalls, 0)
  assert.equal(aiCalls, 0)
})

test('article Redis hit skips AI', async () => {
  const cache = fakeCache({ moments: [{ id: 'redis' }] })
  let aiCalls = 0
  const result = await getCachedArticleAnalysis(article, {
    presets: new Map(), cache, analyze: async () => { aiCalls++; return [] },
  })
  assert.equal(result.cacheSource, 'redis')
  assert.equal(aiCalls, 0)
})

test('article Redis miss calls AI and writes the result', async () => {
  const cache = fakeCache()
  let aiCalls = 0
  const result = await getCachedArticleAnalysis(article, {
    presets: new Map(), cache, analyze: async () => { aiCalls++; return [{ id: 'live' }] },
  })
  assert.equal(result.cacheSource, 'live-ai')
  assert.equal(aiCalls, 1)
  assert.deepEqual(cache.written.value, { moments: [{ id: 'live' }] })
})

test('article cache failure fails open to AI', async () => {
  const cache = fakeCache(null, { failGet: true, failSet: true })
  const result = await getCachedArticleAnalysis(article, {
    presets: new Map(), cache, analyze: async () => [{ id: 'live' }],
  })
  assert.equal(result.cacheSource, 'live-ai')
  assert.equal(cache.setCalls, 1)
})

test('recommendation preset hit skips Redis and classification', async () => {
  const key = recommendationCacheKey(moment, ['A'], candidates)
  const cache = fakeCache()
  let classifyCalls = 0
  const result = await getCachedRecommendation(moment, ['A'], candidates, {
    presets: new Map([[key, groups]]), cache, classify: async () => { classifyCalls++; return {} },
  })
  assert.equal(result.cacheSource, 'demo-preset')
  assert.equal(cache.getCalls, 0)
  assert.equal(classifyCalls, 0)
})

test('recommendation Redis hit skips classification', async () => {
  const cache = fakeCache({ groups })
  let classifyCalls = 0
  const result = await getCachedRecommendation(moment, ['A'], candidates, {
    presets: new Map(), cache, classify: async () => { classifyCalls++; return {} },
  })
  assert.equal(result.cacheSource, 'redis')
  assert.equal(classifyCalls, 0)
})

test('recommendation all miss classifies and writes the result', async () => {
  const cache = fakeCache()
  let classifyCalls = 0
  const result = await getCachedRecommendation(moment, ['A'], candidates, {
    presets: new Map(), cache, classify: async () => { classifyCalls++; return groups },
  })
  assert.equal(result.cacheSource, 'live-ai')
  assert.equal(classifyCalls, 1)
  assert.deepEqual(cache.written.value, { groups })
})

test('selected opinion ordering produces the same recommendation key', () => {
  assert.equal(
    recommendationCacheKey(moment, ['A', 'B'], candidates),
    recommendationCacheKey(moment, ['B', 'A'], candidates),
  )
})

test('candidate changes produce a different recommendation key', () => {
  const changed = [...candidates.slice(0, 2), { id: 'D' }]
  assert.notEqual(
    recommendationCacheKey(moment, ['A'], candidates),
    recommendationCacheKey(moment, ['A'], changed),
  )
})

test('recommendation cache failure fails open to classification', async () => {
  const cache = fakeCache(null, { failGet: true, failSet: true })
  let classifyCalls = 0
  const result = await getCachedRecommendation(moment, ['A'], candidates, {
    presets: new Map(), cache, classify: async () => { classifyCalls++; return groups },
  })
  assert.equal(result.cacheSource, 'live-ai')
  assert.equal(classifyCalls, 1)
})

test('article cache keys change with article content but ignore whitespace noise', () => {
  assert.equal(
    articleAnalysisCacheKey(article),
    articleAnalysisCacheKey({ ...article, title: '  为什么难开始？ ', paragraphs: [{ text: '  成功次数太少。  ' }, article.paragraphs[1]] }),
  )
  assert.notEqual(
    articleAnalysisCacheKey(article),
    articleAnalysisCacheKey({ ...article, paragraphs: [{ text: '内容已修改' }] }),
  )
})
