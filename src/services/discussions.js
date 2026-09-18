const analysisRequests = new Map()
const voteOptionRequests = new Map()
const searchRequests = new Map()
const ANALYSIS_CACHE_PREFIX = 'zhihuwhy:analysis:v2:'
const VOTE_OPTIONS_CACHE_PREFIX = 'zhihuwhy:vote-options:v1:'
const ANALYSIS_CACHE_TTL = 24 * 60 * 60 * 1000
// 客户端兜底超时：保证 loading 状态一定会结束，不会永久卡住界面。
const SEARCH_TIMEOUT_MS = 20_000
const VOTE_OPTIONS_TIMEOUT_MS = 60_000
const RECOMMEND_TIMEOUT_MS = 100_000

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

function voteOptionCacheKey(moment) {
  return `${moment.id || 'moment'}:${moment.coreQuestion}`
}

function getCachedVoteOptions(moment) {
  const key = voteOptionCacheKey(moment)
  try {
    const cached = JSON.parse(localStorage.getItem(`${VOTE_OPTIONS_CACHE_PREFIX}${key}`))
    if (cached?.createdAt > Date.now() - ANALYSIS_CACHE_TTL && cached.voteOptions?.length >= 3) {
      return cached.voteOptions
    }
    localStorage.removeItem(`${VOTE_OPTIONS_CACHE_PREFIX}${key}`)
  } catch {
    // Storage may be blocked; live generation still works without persistence.
  }
  return null
}

function cacheVoteOptions(moment, voteOptions) {
  try {
    localStorage.setItem(
      `${VOTE_OPTIONS_CACHE_PREFIX}${voteOptionCacheKey(moment)}`,
      JSON.stringify({ createdAt: Date.now(), voteOptions }),
    )
  } catch {
    // Ignore storage quota/privacy-mode failures.
  }
}

export function generateVoteOptionSets(moments) {
  const requestedMoments = Array.isArray(moments) ? moments.filter(Boolean) : []
  const cachedById = new Map()
  const missingMoments = []
  requestedMoments.forEach((moment) => {
    const cached = getCachedVoteOptions(moment)
    if (cached) cachedById.set(moment.id, cached)
    else missingMoments.push(moment)
  })
  if (missingMoments.length === 0) {
    return Promise.resolve(requestedMoments.map((moment) => ({
      momentId: moment.id,
      voteOptions: cachedById.get(moment.id),
    })))
  }

  const requestKey = missingMoments.map(voteOptionCacheKey).join('|')
  if (!voteOptionRequests.has(requestKey)) {
    const request = fetch('/api/discussions/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moments: missingMoments.map((moment) => ({
          id: moment.id,
          title: moment.title,
          coreQuestion: moment.coreQuestion,
          summary: moment.summary,
        })),
      }),
      signal: AbortSignal.timeout(VOTE_OPTIONS_TIMEOUT_MS),
    })
      .then(readApiResponse)
      .then((data) => {
        if (!Array.isArray(data.optionSets)) {
          const error = new Error('服务端未返回投票选项集合')
          error.code = 'VOTE_OPTIONS_INVALID'
          throw error
        }
        const generatedById = new Map(data.optionSets.map((set) => [set.momentId, set.voteOptions]))
        missingMoments.forEach((moment) => {
          const voteOptions = generatedById.get(moment.id)
          if (!Array.isArray(voteOptions) || voteOptions.length < 3) {
            const error = new Error(`观点 ${moment.id} 的投票选项不完整`)
            error.code = 'VOTE_OPTIONS_INVALID'
            throw error
          }
          cacheVoteOptions(moment, voteOptions)
          cachedById.set(moment.id, voteOptions)
        })
        return requestedMoments.map((moment) => ({
          momentId: moment.id,
          voteOptions: cachedById.get(moment.id),
        }))
      })
      .catch((error) => {
        voteOptionRequests.delete(requestKey)
        throw toTimeoutError(error, 'VOTE_OPTIONS_TIMEOUT', '投票选项批量生成超时，请稍后重试。')
      })
    voteOptionRequests.set(requestKey, request)
  }
  return voteOptionRequests.get(requestKey)
}

export function generateVoteOptions(moment) {
  return generateVoteOptionSets([moment]).then(([set]) => set.voteOptions)
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

export async function recommendRelatedContent(moment, selectedOpinions) {
  let response
  try {
    response = await fetch('/api/discussions/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        moment: {
          coreQuestion: moment.coreQuestion,
          searchQuery: moment.searchQuery || moment.coreQuestion,
        },
        selectedOpinions,
        candidates: Array.isArray(moment.related) ? moment.related.slice(0, 10) : [],
      }),
      signal: AbortSignal.timeout(RECOMMEND_TIMEOUT_MS),
    })
  } catch (error) {
    throw toTimeoutError(error, 'RECOMMEND_TIMEOUT', '观点精排超时，已保留相关内容。')
  }
  const data = await readApiResponse(response)
  return data.groups
}
