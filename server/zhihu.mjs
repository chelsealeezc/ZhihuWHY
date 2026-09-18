import { oauthConfig } from './config.mjs'

function requireAccessSecret() {
  if (!oauthConfig.accessSecret) {
    throw Object.assign(new Error('服务端缺少环境变量：ZHIHU_ACCESS_SECRET'), {
      code: 'SERVER_CONFIG_MISSING',
      status: 503,
    })
  }
}

function stripHighlightTags(value) {
  return String(value || '').replace(/<\/?em>/gi, '')
}

function authorField(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key] ?? item?.Author?.[key]
    if (value != null && String(value).trim()) return value
  }
  return ''
}

export async function searchZhihu(query, count = 10, fallbackQuery = '') {
  const normalizedQuery = String(query || '').trim()
  if (!normalizedQuery) {
    throw Object.assign(new Error('搜索关键词不能为空'), { code: 'QUERY_REQUIRED', status: 400 })
  }
  requireAccessSecret()

  const params = new URLSearchParams({
    Query: normalizedQuery,
    Count: String(Math.max(1, Math.min(Number(count) || 10, 10))),
  })
  const response = await fetch(
    `${oauthConfig.userApiBase}/api/v1/content/zhihu_search?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${oauthConfig.accessSecret}`,
        'X-Request-Timestamp': String(Math.floor(Date.now() / 1000)),
        'Content-Type': 'application/json',
      },
    },
  )
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.Code !== 0) {
    const code = payload?.Code === 30001 ? 'RATE_LIMITED' : 'ZHIHU_SEARCH_FAILED'
    throw Object.assign(new Error(payload?.Message || `知乎搜索失败（HTTP ${response.status}）`), {
      code,
      status: payload?.Code === 30001 ? 429 : 502,
    })
  }

  const items = Array.isArray(payload?.Data?.Items) ? payload.Data.Items : []
  if (items.length === 0 && String(fallbackQuery || '').trim() && String(fallbackQuery).trim() !== normalizedQuery) {
    return searchZhihu(fallbackQuery, count)
  }
  return {
    searchHashId: payload?.Data?.SearchHashId || null,
    emptyReason: payload?.Data?.EmptyReason || null,
    items: items.map((item) => ({
      id: String(item.ContentID || item.Url || ''),
      type: item.ContentType || '',
      title: item.Title || '',
      quote: stripHighlightTags(item.ContentText),
      url: item.Url || '',
      author: authorField(item, 'AuthorName', 'Name', 'Fullname') || '知乎用户',
      authorAvatar: authorField(item, 'AuthorAvatar', 'AvatarUrl', 'Avatar'),
      authorBadgeText: item.AuthorBadgeText || '',
      voteup: Number(item.VoteUpCount) || 0,
      comments: Number(item.CommentCount) || 0,
      authorityLevel: item.AuthorityLevel || '',
      rankingScore: Number(item.RankingScore) || 0,
      selectedComments: Array.isArray(item.CommentInfoList)
        ? item.CommentInfoList.map((comment) => comment.Content).filter(Boolean)
        : [],
    })),
  }
}
