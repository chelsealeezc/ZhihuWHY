const analysisRequests = new Map()
const searchRequests = new Map()

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
      .then((data) => data.moments)
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
