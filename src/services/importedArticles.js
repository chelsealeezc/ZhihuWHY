const STORAGE_KEY = 'zhihuwhy:imported-articles:v1'

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // The current page can still navigate; Reading will fall back to the sample.
  }
}

function stableId(value) {
  let hash = 5381
  for (const char of String(value || '')) hash = (hash * 33) ^ char.codePointAt(0)
  return `imported-${(hash >>> 0).toString(36)}`
}

function splitParagraphs(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return [{ id: 'p1', text: '这篇内容暂未提供摘要，请打开知乎原文阅读全文。' }]

  const sentences = normalized.match(/[^。！？!?]+[。！？!?]?/g) || [normalized]
  const paragraphs = []
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push({ id: `p${paragraphs.length + 1}`, text: sentences.slice(index, index + 2).join('') })
  }
  return paragraphs
}

function toArticle(item) {
  const id = stableId(item.url || item.id || item.title)
  return {
    id,
    type: item.type || 'answer',
    question: item.question || item.title,
    title: item.title,
    sourceUrl: item.url || (String(item.id).startsWith('http') ? item.id : ''),
    author: {
      name: item.author || '知乎用户',
      bio: '来自你的知乎收藏',
      followers: null,
    },
    voteup: Number(item.voteup) || 0,
    comments: Number(item.comments) || 0,
    paragraphs: splitParagraphs(item.excerpt),
    importedAt: Date.now(),
  }
}

export function saveImportedArticles(items) {
  const articles = items.map(toArticle)
  const store = readStore()
  for (const article of articles) store[article.id] = article
  writeStore(store)
  return articles
}

export function getImportedArticle(id) {
  return readStore()[id] || null
}
