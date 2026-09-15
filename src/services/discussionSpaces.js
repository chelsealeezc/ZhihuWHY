const STORAGE_KEY = 'zhihuwhy:discussion-spaces:v2'

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function distributionFor(options, existing = {}) {
  const fallback = [38, 27, 21, 14]
  return Object.fromEntries(
    options.map((option, index) => [option.id, Number(existing[option.id]) || fallback[index] || 10]),
  )
}

export function saveDiscussionSpace(moment, article, selectedChoices) {
  const related = Array.isArray(moment.related) ? moment.related : []
  const options = moment.voteOptions || []
  const distribution = distributionFor(options, moment.voteResults)
  const posts = related.map((item, index) => ({
    id: `real-${item.id || index}`,
    user: item.author || '知乎用户',
    from: '来自知乎相关内容',
    time: '已聚合',
    stance: item.stance === 'diff' || item.stance === 'different'
      ? 'diff'
      : item.stance === 'same'
        ? 'same'
        : item.stance === 'neutral'
          ? 'neutral'
          : index % 3 === 1
            ? 'diff'
            : 'same',
    stanceOptionId: options[index % Math.max(options.length, 1)]?.id,
    text: item.quote || item.title,
    agree: Number(item.voteup) || 0,
    url: item.url || '',
    real: true,
  }))

  const context = {
    momentId: moment.id,
    topic: moment.coreQuestion,
    sourceCount: related.length + 1,
    participants: moment.participants || '等待加入',
    options,
    distribution,
    filters: [
      { id: 'real', label: '真实表达', count: posts.length },
      { id: 'same', label: '相近观点', count: posts.filter((post) => post.stance === 'same').length },
      { id: 'diff', label: '不同观点', count: posts.filter((post) => post.stance === 'diff').length },
      { id: 'neutral', label: '立场不明', count: posts.filter((post) => post.stance === 'neutral').length },
    ],
    posts,
    worthChat: related.slice(0, 3).map((item, index) => ({
      id: `chat-${item.id || index}`,
      name: item.author || '知乎用户',
      claim: item.claim || item.why || item.title,
      snippet: item.stance === 'diff' || item.stance === 'different'
        ? '相关表达 · 与你存在分歧'
        : item.stance === 'same'
          ? '相关表达 · 与你的选择相近'
          : item.stance === 'neutral'
            ? '相关表达 · 立场尚不明确'
            : index % 3 === 1
              ? '相关表达 · 与你可能存在分歧'
              : '相关表达 · 与你的选择可能相近',
      evidence: [item.quote || item.title].filter(Boolean),
    })),
    sources: [
      {
        id: article.id,
        title: article.question || article.title,
        author: article.author?.name || article.author,
        voteup: article.voteup || 0,
        comments: article.comments || 0,
        url: article.sourceUrl || '',
      },
      ...related.map((item) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        voteup: item.voteup,
        comments: item.comments || 0,
        url: item.url || '',
      })),
    ],
    selectedChoices,
    articleId: article.id,
    real: posts.length > 0,
    savedAt: Date.now(),
  }

  try {
    const store = readStore()
    store[moment.id] = context
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // DiscussionSpace will fall back to the bundled demo if storage is unavailable.
  }
  return context
}

export function getSavedDiscussionSpace(momentId) {
  return readStore()[momentId] || null
}
