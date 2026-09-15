const STORAGE_KEY = 'zhihuwhy:discussion-spaces:v3'

function isGeneric(value) {
  return /提供了相关观点或真实经历|该内容与当前议题相关，但|先展示已加载的知乎真实内容/.test(String(value || ''))
}

function authorView(item) {
  return [item.viewpoint, item.claim].find((value) => value?.trim() && !isGeneric(value)) || ''
}

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
          : 'neutral',
    stanceOptionId: undefined,
    text: authorView(item) || item.quote || item.title || '暂无可展示的原文摘录。',
    sourceExcerpt: item.quote || '',
    sourceTitle: item.title || '知乎内容',
    refined: Boolean(authorView(item)),
    agree: Number(item.voteup) || 0,
    url: item.url || '',
    real: true,
  }))
  const participantCount = new Set(posts.map((post) => post.user).filter(Boolean)).size

  const context = {
    momentId: moment.id,
    topic: moment.coreQuestion,
    sourceCount: related.length + 1,
    participantCount,
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
      claim: authorView(item) || item.quote || item.title,
      snippet: item.stance === 'diff' || item.stance === 'different'
        ? '相关表达 · 与你存在分歧'
        : item.stance === 'same'
          ? '相关表达 · 与你的选择相近'
          : item.stance === 'neutral'
            ? '相关表达 · 立场尚不明确'
            : '相关表达 · 立场尚不明确',
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
  const saved = readStore()[momentId]
  if (!saved) return null
  // Repair previously saved generic copy without discarding source evidence.
  const posts = (saved.posts || []).map((post) => isGeneric(post.text)
    ? { ...post, text: post.sourceExcerpt || post.sourceTitle || '暂无可展示的原文摘录。', refined: false, stance: 'neutral' }
    : post)
  return {
    ...saved,
    posts,
    filters: (saved.filters || []).map((filter) => ({
      ...filter,
      count: filter.id === 'real' ? posts.length : posts.filter((post) => post.stance === filter.id).length,
    })),
    worthChat: (saved.worthChat || []).map((person) => isGeneric(person.claim)
      ? { ...person, claim: person.evidence?.[0] || '', snippet: '相关表达 · 立场尚不明确' }
      : person),
  }
}
