export const PRECOMPUTED_ARTICLE_IDS = new Set(['success-energy', 'human-relations'])

export function articleAnalysisRequest(article, fallbackMoments, analyzeArticle) {
  if (PRECOMPUTED_ARTICLE_IDS.has(article?.id)) {
    return {
      mode: 'precomputed',
      request: Promise.resolve(fallbackMoments),
    }
  }
  return {
    mode: 'live',
    request: analyzeArticle(article),
  }
}
