const analysisRequests = new Map()
const searchRequests = new Map()
const ANALYSIS_CACHE_PREFIX = 'zhihuwhy:analysis:v1:'
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000
// 客户端兜底超时：保证 loading 状态一定会结束，不会永久卡住界面。
const SEARCH_TIMEOUT_MS = 20_000
// 单次精排最多等待 12.5 秒；加上一次退避重试，整条链路会在约 26 秒内结束。
const RECOMMEND_ATTEMPT_TIMEOUT_MS = 12_500
const RECOMMEND_RETRY_DELAY_MS = 400
const SELECTION_TIMEOUT_MS = 30_000

function toTimeoutError(error, code, message) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    const timeoutError = new Error(message)
    timeoutError.code = code
    return timeoutError
  }
  return error
}

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
    error.status = response.status
    throw error
  }
  return data
}

function isRetryableRecommendationError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error instanceof TypeError) {
    return true
  }
  if (error?.code === 'SERVER_CONFIG_MISSING') return false
  if (['AI_TIMEOUT', 'AI_REQUEST_FAILED', 'INTERNAL_ERROR'].includes(error?.code)) return true
  return Number(error?.status) >= 500
}

function recommendationError(error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError' || error?.code === 'AI_TIMEOUT') {
    const timeoutError = new Error('观点精排暂时超时，已保留相关内容，可重新精排。')
    timeoutError.code = 'RECOMMEND_TIMEOUT'
    return timeoutError
  }
  if (error instanceof TypeError || ['AI_REQUEST_FAILED', 'INTERNAL_ERROR'].includes(error?.code)) {
    const networkError = new Error('精排服务连接暂时不稳定，已保留相关内容，可重新精排。')
    networkError.code = 'RECOMMEND_UNAVAILABLE'
    return networkError
  }
  if (error?.code === 'AI_RATE_LIMITED') {
    const rateLimitError = new Error('精排服务暂时繁忙，请稍后重新精排。')
    rateLimitError.code = 'RECOMMEND_RATE_LIMITED'
    return rateLimitError
  }
  return error
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

export function searchRelatedContent(query, count = 4, fallback = '') {
  const key = `${query}:${count}:${fallback}`
  if (!searchRequests.has(key)) {
    const request = fetch(`/api/zhihu/search?${new URLSearchParams({ query, count, fallback })}`, {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    })
      .then(readApiResponse)
      .then((data) => data.items)
      .catch((error) => {
        searchRequests.delete(key)
        throw toTimeoutError(error, 'SEARCH_TIMEOUT', '检索超时，请稍后重试。')
      })
    searchRequests.set(key, request)
  }
  return searchRequests.get(key)
}

export async function expandSelectedText(input) {
  let response
  try {
    response = await fetch('/api/discussions/selection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(SELECTION_TIMEOUT_MS),
    })
  } catch (error) {
    throw toTimeoutError(error, 'SELECTION_TIMEOUT', '正在理解你选中的原文，请稍后重试。')
  }
  return readApiResponse(response)
}

export async function recommendRelatedContent(moment, selectedOpinions) {
  const body = JSON.stringify({
    moment: {
      coreQuestion: moment.coreQuestion,
      searchQuery: moment.searchQuery || moment.coreQuestion,
    },
    selectedOpinions,
    candidates: Array.isArray(moment.related) ? moment.related.slice(0, 10) : [],
  })

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch('/api/discussions/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(RECOMMEND_ATTEMPT_TIMEOUT_MS),
      })
      const data = await readApiResponse(response)
      return data.groups
    } catch (error) {
      if (attempt === 1 || !isRetryableRecommendationError(error)) {
        throw recommendationError(error)
      }
      await new Promise((resolve) => setTimeout(resolve, RECOMMEND_RETRY_DELAY_MS))
    }
  }
  throw new Error('观点精排未完成')
}
