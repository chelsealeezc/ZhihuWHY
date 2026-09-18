import { createHash } from 'node:crypto'

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function digest(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

export function articleAnalysisCacheKey(article) {
  const paragraphs = Array.isArray(article?.paragraphs)
    ? article.paragraphs.map((paragraph) => clean(paragraph?.text || paragraph))
    : []
  return `article-analysis:v2:${digest({ title: clean(article?.title), paragraphs })}`
}

export function normalizeSelectedOpinions(selectedOpinions) {
  return [...new Set((Array.isArray(selectedOpinions) ? selectedOpinions : [])
    .map(clean)
    .filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function recommendationCacheKey(moment, selectedOpinions, candidates) {
  const candidateFingerprint = (Array.isArray(candidates) ? candidates : []).map((candidate) =>
    clean(candidate?.id || candidate?.url),
  )
  return `recommendation:v2:${digest({
    coreQuestion: clean(moment?.coreQuestion),
    searchQuery: clean(moment?.searchQuery),
    selectedOpinions: normalizeSelectedOpinions(selectedOpinions),
    candidates: candidateFingerprint,
  })}`
}
