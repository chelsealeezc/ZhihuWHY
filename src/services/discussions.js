const analysisRequests = new Map()
const searchRequests = new Map()
const ANALYSIS_CACHE_PREFIX = 'zhihuwhy:analysis:v1:'
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000

function getCachedAnalysis(key) {
  try {
    const cached = JSON.parse(localStorage.getItem(`${ANALYSIS_CACHE_PREFIX}${key}`))
    if (cached?.createdAt > Date.now() - ANALYSIS_CACHE_TTL && Array.isArray(cached.moments)) {
      return cached.moments
    }
    localStorage.removeItem(`${ANALYSIS_CACHE_PREFIX}${key}`)
  } catch {
    // Storage may be blocked; live analysis still works without persistence.
  }
  return null
}

function cacheAnalysis(key, moments) {
  try {
    localStorage.setItem(
      `${ANALYSIS_CACHE_PREFIX}${key}`,
      JSON.stringify({ createdAt: Date.now(), moments }),
    )
  } catch {
    // Ignore storage quota/privacy-mode failures.
  }
}

async function readApiResponse(response) {
  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.ok) {
    const error = new Error(data?.error?.message || `请求失败（HTTP ${response.status}）`)
    error.code = data?.error?.code || 'API_REQUEST_FAILED'
    throw error
  }
  return data
}

export function analyzeArticle(article) {
  const key = article.id || article.question || article.title
  const cached = getCachedAnalysis(key)
  if (cached) return Promise.resolve(cached)
  if (!analysisRequests.has(key)) {
    const request = fetch('/api/discussions/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        article: {
          title: article.title || article.question,
          author: article.author?.name || article.author,
          paragraphs: article.paragraphs,
        },
      }),
    })
      .then(readApiResponse)
      .then((data) => {
        cacheAnalysis(key, data.moments)
        return data.moments
      })
      .catch((error) => {
        analysisRequests.delete(key)
        throw error
      })
    analysisRequests.set(key, request)
  }
  return analysisRequests.get(key)
}

export function searchRelatedContent(query, count = 4) {
  const key = `${query}:${count}`
  if (!searchRequests.has(key)) {
    const request = fetch(`/api/zhihu/search?${new URLSearchParams({ query, count })}`)
      .then(readApiResponse)
      .then((data) => data.items)
      .catch((error) => {
        searchRequests.delete(key)
        throw error
      })
    searchRequests.set(key, request)
  }
  return searchRequests.get(key)
}

export async function recommendRelatedContent(moment, selectedOpinions) {
  const response = await fetch('/api/discussions/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      moment: {
        coreQuestion: moment.coreQuestion,
        searchQuery: moment.searchQuery,
      },
      selectedOpinions,
    }),
  })
  const data = await readApiResponse(response)
  return data.groups
}
