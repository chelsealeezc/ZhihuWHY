import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import SelectionGuide from '../components/SelectionGuide'
import { getArticle, getMoments } from '../data/mock'
import {
  analyzeArticle,
  expandSelectedText,
  recommendRelatedContent,
  searchRelatedContent,
} from '../services/discussions'
import { getImportedArticle } from '../services/importedArticles'
import { saveDiscussionSpace } from '../services/discussionSpaces'
import { articleAnalysisRequest } from '../services/articleAnalysis'
import './Reading.css'

const SELECTION_HIGHLIGHT_NAME = 'selected-discussion-source'

function showPersistentSelectionHighlight(range) {
  if (!range || !window.CSS?.highlights || typeof window.Highlight !== 'function') return false
  window.CSS.highlights.set(SELECTION_HIGHLIGHT_NAME, new window.Highlight(range))
  return true
}

function clearPersistentSelectionHighlight() {
  window.CSS?.highlights?.delete(SELECTION_HIGHLIGHT_NAME)
}

function createLiveMoment(moment, fallbackMoment) {
  return {
    ...moment,
    index: moment.index || fallbackMoment?.index || 1,
    relatedCount: 0,
    participants: 0,
    related: [],
    voteResults: fallbackMoment?.voteResults || { v1: 36, v2: 24, v3: 22, v4: 18 },
    closestQuote: fallbackMoment?.closestQuote || {
      text: '投票后，这里会展示与你观点最接近的知乎回答。',
      author: '观点引力场',
      source: '相关讨论',
      voteup: 0,
    },
    source: 'ai',
  }
}

function countRelatedAuthors(items) {
  return new Set(items.map((item) => String(item.author || '').trim()).filter(Boolean)).size
}

function mapRelatedItem(item, moment) {
  return {
    id: item.id || item.url,
    title: item.title || '知乎内容',
    author: item.author,
    voteup: item.voteup,
    quote: item.quote,
    url: item.url,
    comments: item.comments,
    stance: item.stance === 'different' ? 'diff' : item.stance,
    claim: item.claim,
    relevanceScore: item.relevanceScore,
    why: item.why || '',
  }
}

function createSelectionMoment(text, anchorParagraphId, context = {}) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  return {
    id: `selection-${Date.now()}`,
    index: 0,
    title: '你选中的一句话',
    coreQuestion: '围绕这句话，知乎上还有哪些相近或不同的理解？',
    summary: '这是你从原文中主动挑出的表达。下面先检索知乎上的真实内容，再根据你的选择整理观点关系。',
    searchQuery: normalized.slice(0, 120),
    selectedText: normalized,
    contextBefore: context.contextBefore || '',
    contextAfter: context.contextAfter || '',
    searchPending: true,
    anchorParagraphId,
    voteOptions: [
      { id: 'v1', label: '我基本认同这句话' },
      { id: 'v2', label: '我对这句话有保留' },
      { id: 'v3', label: '要看具体情境' },
    ],
    voteResults: { v1: 0, v2: 0, v3: 0 },
    relatedCount: 0,
    participants: 0,
    related: [],
    closestQuote: {
      text: '检索后，这里会展示与你选中的句子最相关的知乎表达。',
      author: '观点引力场',
      source: '相关讨论',
      voteup: 0,
    },
    source: 'selection',
  }
}

function compactViewpoint(value, maxLength = 40) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(1, maxLength - 2)).replace(/[，,;；。！？!?]+$/, '')}……`
}

function prioritizeDistinctTitles(items, visibleCount = 4) {
  const seenTitles = new Set()
  const distinct = []
  const remaining = []

  items.forEach((item) => {
    const title = String(item.title || '').replace(/\s+/g, ' ').trim()
    if (title && !seenTitles.has(title) && distinct.length < visibleCount) {
      seenTitles.add(title)
      distinct.push(item)
    } else {
      remaining.push(item)
    }
  })

  return [...distinct, ...remaining]
}

function RecommendationGroup({ title, tone, items, refining = false }) {
  const [expanded, setExpanded] = useState(false)
  const orderedItems = useMemo(() => prioritizeDistinctTitles(items), [items])
  const visibleItems = expanded ? orderedItems : orderedItems.slice(0, 4)
  const hiddenCount = Math.max(0, orderedItems.length - 4)

  useEffect(() => setExpanded(false), [items])

  return (
    <section className={`recommendation-group ${tone}`}>
      <div className="recommendation-heading">
        <h4>{title}</h4>
        <span>{items.length} 篇</span>
      </div>
      {items.length === 0 ? (
        <div className="recommendation-empty">暂时没有足够明确的内容</div>
      ) : (
        visibleItems.map((item) => {
          const refinedViewpoint = item.claim || item.quote
          const viewpoint = refinedViewpoint
            ? compactViewpoint(refinedViewpoint)
            : compactViewpoint(item.title || item.why || '相关内容')
          const sourceExcerpt = item.quote || ''
          return (
            <div key={`${tone}-${item.id}`} className="related-item recommendation-item">
              <div className="recommendation-viewpoint">{viewpoint}</div>
              <div className="recommendation-source">
                <span>来源</span>
                {item.url ? (
                  <a className="title" href={item.url} target="_blank" rel="noreferrer">
                    {item.title}
                  </a>
                ) : (
                  <div className="title">{item.title}</div>
                )}
              </div>
              <div className="meta">
                {item.author} · {item.voteup} 赞同
                {item.relevanceScore ? ` · ${item.relevanceScore}% 相关` : ''}
              </div>
              {sourceExcerpt && (
                <details className="recommendation-excerpt">
                  <summary>{refining || !refinedViewpoint ? '展开原文摘要' : '查看原文摘要'}</summary>
                  <p>{sourceExcerpt}</p>
                </details>
              )}
            </div>
          )
        })
      )}
      {hiddenCount > 0 && (
        <button type="button" className="content-list-toggle" onClick={() => setExpanded((value) => !value)}>
          {expanded ? '收起内容' : `展开剩余 ${hiddenCount} 篇`}
        </button>
      )}
    </section>
  )
}

function openDiscussionSpace(moment, article, selectedIds, classificationStatus = 'ready') {
  saveDiscussionSpace(moment, article, selectedIds, { classificationStatus })
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const params = new URLSearchParams({
    choices: selectedIds.join(','),
  })
  const url = `${window.location.origin}${base}/space/${moment.id}?${params}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function Reading() {
  const { articleId } = useParams()
  const article = useMemo(() => getImportedArticle(articleId) || getArticle(articleId), [articleId])
  const fallbackMoments = useMemo(() => getMoments(article.id), [article.id])

  const [loading, setLoading] = useState(true)
  const [moments, setMoments] = useState(fallbackMoments)
  const [analysisMode, setAnalysisMode] = useState('loading')
  const [analysisError, setAnalysisError] = useState('')
  const [relatedState, setRelatedState] = useState({})
  const [expandedRelatedMoments, setExpandedRelatedMoments] = useState({})
  const [activeMomentId, setActiveMomentId] = useState(fallbackMoments[0]?.id)
  const [selectedVotes, setSelectedVotes] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [recommendationState, setRecommendationState] = useState({})
  const [anchorId, setAnchorId] = useState(null)
  const [endorsed, setEndorsed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectionAction, setSelectionAction] = useState(null)
  const [selectionMoment, setSelectionMoment] = useState(null)
  const articleBodyRef = useRef(null)
  const paragraphRefs = useRef({})
  const recommendationRequests = useRef({})

  const activeMoment = useMemo(
    () => [selectionMoment, ...moments].find((m) => m?.id === activeMomentId) || moments[0],
    [moments, selectionMoment, activeMomentId],
  )

  const visibleMoments = useMemo(
    () => (selectionMoment ? [selectionMoment, ...moments] : moments),
    [moments, selectionMoment],
  )

  function updateMoment(momentId, updater) {
    setMoments((current) => current.map((moment) => (
      moment.id === momentId ? updater(moment) : moment
    )))
    setSelectionMoment((current) => (
      current?.id === momentId ? updater(current) : current
    ))
  }

  useEffect(() => {
    const updateSelectionAction = () => {
      const selection = window.getSelection()
      const body = articleBodyRef.current
      if (!selection || selection.isCollapsed || !body || selection.rangeCount === 0) {
        setSelectionAction(null)
        return
      }
      const range = selection.getRangeAt(0)
      if (!body.contains(range.commonAncestorContainer)) {
        setSelectionAction(null)
        return
      }
      const text = selection.toString().replace(/\s+/g, ' ').trim()
      if (text.length < 8) {
        setSelectionAction(null)
        return
      }
      const startNode = range.startContainer.nodeType === Node.ELEMENT_NODE
        ? range.startContainer
        : range.startContainer.parentElement
      const paragraph = startNode?.closest?.('[data-paragraph-id]')
      const rect = range.getBoundingClientRect()
      setSelectionAction({
        text,
        range: range.cloneRange(),
        paragraphId: paragraph?.dataset.paragraphId || null,
        contextBefore: paragraph?.previousElementSibling?.textContent?.replace(/\s+/g, ' ').trim().slice(-240) || '',
        contextAfter: paragraph?.nextElementSibling?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 240) || '',
        top: Math.max(12, rect.top - 48),
        left: Math.min(Math.max(12, rect.left), Math.max(12, window.innerWidth - 236)),
      })
    }
    document.addEventListener('selectionchange', updateSelectionAction)
    window.addEventListener('mouseup', updateSelectionAction)
    window.addEventListener('keyup', updateSelectionAction)
    return () => {
      clearPersistentSelectionHighlight()
      document.removeEventListener('selectionchange', updateSelectionAction)
      window.removeEventListener('mouseup', updateSelectionAction)
      window.removeEventListener('keyup', updateSelectionAction)
    }
  }, [])

  useEffect(() => {
    clearPersistentSelectionHighlight()
    setLoading(true)
    setSubmitted(false)
    setSelectedVotes([])
    setMoments(fallbackMoments)
    setActiveMomentId(fallbackMoments[0]?.id)
    setAnalysisMode('loading')
    setAnalysisError('')
    setSelectionAction(null)
    setSelectionMoment(null)
    setRelatedState({})
    setRecommendationState({})
    recommendationRequests.current = {}
    let cancelled = false

    const analysis = articleAnalysisRequest(article, fallbackMoments, analyzeArticle)

    analysis.request
      .then((generated) => {
        if (cancelled) return
        const liveMoments = generated.map((moment, index) =>
          createLiveMoment(moment, fallbackMoments[index]),
        )
        setMoments(liveMoments)
        setActiveMomentId(liveMoments[0]?.id)
        setAnalysisMode(analysis.mode)
      })
      .catch((error) => {
        if (cancelled) return
        setAnalysisMode('fallback')
        setAnalysisError(`${error.code || 'ANALYSIS_FAILED'}：${error.message}`)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [article, fallbackMoments])

  useEffect(() => {
    setSubmitted(false)
    setSelectedVotes([])
  }, [activeMomentId])

  useEffect(() => {
    if (!activeMoment?.coreQuestion || activeMoment.searchPending || relatedState[activeMoment.id]) return
    const momentId = activeMoment.id
    setRelatedState((current) => ({ ...current, [momentId]: { status: 'loading' } }))
    searchRelatedContent(activeMoment.searchQuery || activeMoment.coreQuestion, 8, activeMoment.coreQuestion)
      .then((items) => {
        updateMoment(momentId, (moment) => ({
          ...moment,
          related: items.map((item) => mapRelatedItem(item, moment)),
          relatedCount: items.length,
          participants: countRelatedAuthors(items),
          closestQuote: items[0]
            ? {
                text: items[0].quote || items[0].title,
                author: items[0].author,
                source: `《${items[0].title}》`,
                voteup: items[0].voteup,
              }
            : moment.closestQuote,
        }))
        setRelatedState((current) => ({ ...current, [momentId]: { status: items.length ? 'ready' : 'empty' } }))
      })
      .catch((error) => {
        setRelatedState((current) => ({
          ...current,
          [momentId]: { status: 'error', message: `${error.code || 'SEARCH_FAILED'}：${error.message}` },
        }))
      })
  }, [activeMoment, relatedState])

  function locateOriginal() {
    const id = activeMoment.anchorParagraphId || fallbackMoments[activeMoment.index - 1]?.anchorParagraphId
    if (!id) return
    setAnchorId(id)
    paragraphRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function toggleVote(id) {
    if (submitted) return
    setSelectedVotes((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 2) return prev
      return [...prev, id]
    })
  }

  async function refineRecommendation(moment, voteIds, fallbackGroups) {
    const momentId = moment.id
    const selectedOpinions = voteIds
      .map((id) => moment.voteOptions.find((option) => option.id === id)?.label)
      .filter(Boolean)
    const requestToken = {}
    recommendationRequests.current[momentId] = requestToken
    setRecommendationState((current) => ({
      ...current,
      [momentId]: {
        status: 'ready',
        groups: current[momentId]?.groups || fallbackGroups,
        refining: true,
      },
    }))
    try {
      const groups = await recommendRelatedContent(moment, selectedOpinions)
      if (recommendationRequests.current[momentId] !== requestToken) return
      const mappedGroups = Object.fromEntries(
        Object.entries(groups).map(([stance, items]) => [
          stance,
          items.map((item) => mapRelatedItem(item, moment)),
        ]),
      )
      const personalized = [
        ...(mappedGroups.same || []),
        ...(mappedGroups.different || []),
        ...(mappedGroups.neutral || []),
      ]
      saveDiscussionSpace(
        { ...moment, related: personalized },
        article,
        voteIds,
        { classificationStatus: 'ready' },
      )
      updateMoment(momentId, (item) => ({
        ...item,
        related: personalized,
        relatedCount: personalized.length,
        participants: countRelatedAuthors(personalized),
        closestQuote: mappedGroups.same?.[0]
          ? {
              text: mappedGroups.same[0].quote || mappedGroups.same[0].title,
              author: mappedGroups.same[0].author,
              source: `《${mappedGroups.same[0].title}》`,
              voteup: mappedGroups.same[0].voteup,
            }
          : item.closestQuote,
      }))
      setRecommendationState((current) => ({
        ...current,
        [momentId]: { status: 'ready', groups: mappedGroups, refining: false },
      }))
    } catch (error) {
      if (recommendationRequests.current[momentId] !== requestToken) return
      saveDiscussionSpace(
        { ...moment, related: fallbackGroups.neutral || [] },
        article,
        voteIds,
        { classificationStatus: 'failed' },
      )
      setRecommendationState((current) => ({
        ...current,
        [momentId]: {
          status: 'ready',
          groups: current[momentId]?.groups || fallbackGroups,
          refining: false,
          refinementError: error.message || '精排服务暂时不可用，已保留相关内容。',
        },
      }))
    }
  }

  async function submitVote() {
    if (selectedVotes.length === 0) return
    const moment = activeMoment
    const momentId = moment.id
    const instantRelated = Array.isArray(moment.related) ? moment.related : []
    const instantGroups = {
      same: [],
      different: [],
      neutral: instantRelated.map((item) => ({
        ...item,
        stance: 'neutral',
        why: item.why || '先展示已加载的知乎真实内容，正在后台判断与所选观点的关系。',
      })),
    }
    updateMoment(momentId, (item) => ({ ...item, related: instantGroups.neutral }))
    setSubmitted(true)
    setRecommendationState((current) => ({
      ...current,
      [momentId]: { status: 'ready', groups: instantGroups, refining: true },
    }))
    if (instantRelated.length === 0 && relatedState[momentId]?.status === 'empty') {
      setRecommendationState((current) => ({
        ...current,
        [momentId]: { status: 'ready', groups: instantGroups, refining: false },
      }))
      return
    }
    await refineRecommendation(moment, selectedVotes, instantGroups)
  }

  function retryRecommendation() {
    if (!activeMoment || selectedVotes.length === 0 || activeRecommendation?.refining) return
    refineRecommendation(activeMoment, selectedVotes, activeRecommendation.groups)
  }

  async function openSelectionDiscussion() {
    if (!selectionAction?.text) return
    const action = selectionAction
    const moment = createSelectionMoment(action.text, action.paragraphId, action)
    setSelectionMoment(moment)
    setActiveMomentId(moment.id)
    setSelectedVotes([])
    setSubmitted(false)
    setSelectionAction(null)
    if (showPersistentSelectionHighlight(action.range)) {
      window.getSelection()?.removeAllRanges()
    }
    setRelatedState((current) => ({
      ...current,
      [moment.id]: { status: 'expanding' },
    }))
    try {
      const expansion = await expandSelectedText({
        selectedText: action.text,
        contextBefore: action.contextBefore,
        contextAfter: action.contextAfter,
        articleTitle: article.title || article.question,
      })
      setRelatedState((current) => {
        const next = { ...current }
        delete next[moment.id]
        return next
      })
      updateMoment(moment.id, (current) => ({
        ...current,
        coreQuestion: expansion.coreQuestion,
        searchQuery: expansion.searchQuery,
        summary: expansion.summary,
        searchPending: false,
      }))
    } catch (error) {
      // Even if query expansion is unavailable, search Zhihu with the exact selected text.
      setRelatedState((current) => {
        const next = { ...current }
        delete next[moment.id]
        return next
      })
      updateMoment(moment.id, (current) => ({
        ...current,
        searchPending: false,
        summary: `将按你选中的原文直接检索知乎内容。${error.message ? `（${error.message}）` : ''}`,
      }))
    }
  }

  const primaryChoice = selectedVotes[0]
  const primaryLabel = activeMoment.voteOptions.find((o) => o.id === primaryChoice)?.label
  const primaryPct = activeMoment.voteResults[primaryChoice] || 0
  const activeRecommendation = recommendationState[activeMoment.id]
  const relatedItems = prioritizeDistinctTitles(activeMoment.related)
  const relatedExpanded = Boolean(expandedRelatedMoments[activeMoment.id])
  const visibleRelatedItems = relatedExpanded ? relatedItems : relatedItems.slice(0, 4)
  const hiddenRelatedCount = Math.max(0, relatedItems.length - 4)

  return (
    <div className="app-shell reading-shell">
      <Topbar classic />
      <div className="read-layout">
        <article className="card article-pane">
          <h1 className="question">{article.question}</h1>
          <div className="author-row">
            <div className="avatar">{article.author.name.slice(0, 1)}</div>
            <div>
              <div className="name">{article.author.name}</div>
              <div className="bio">
                {article.author.bio}
                {article.author.followers ? ` · ${article.author.followers} 关注` : ''}
              </div>
            </div>
            <button type="button" className="btn btn-secondary follow-button">
              + 关注
            </button>
          </div>

          <p className="reading-selection-hint" id="reading-selection-hint">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
              <path d="m5 12 7.5-7.5 3 3L8 15H5v-3ZM11 6l3 3M4 18h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            划选一句话，看看知乎怎么讨论
          </p>
          <div className="article-body" ref={articleBodyRef} aria-describedby="reading-selection-hint">
            {article.paragraphs.map((p) => {
              const sharedProps = {
                ref: (element) => {
                  paragraphRefs.current[p.id] = element
                },
                className: `${anchorId === p.id ? 'anchor-active ' : ''}${p.momentId ? 'article-moment' : ''}`,
                'data-moment': p.momentId || undefined,
                'data-paragraph-id': p.id,
                onClick: () => {
                  if (window.getSelection()?.isCollapsed && p.momentId) setActiveMomentId(p.momentId)
                },
              }
              return p.kind === 'heading' ? (
                <h2 key={p.id} {...sharedProps}>{p.text}</h2>
              ) : (
                <p key={p.id} {...sharedProps}>{p.text}</p>
              )
            })}
            <SelectionGuide key={article.id} articleId={article.id} bodyRef={articleBodyRef} />
          </div>
          {article.sourceIncomplete && (
            <div className="source-incomplete-notice" role="note">
              <div>
                <strong>当前文段是知乎返回的摘要</strong>
                <span>省略部分未随数据返回，因此无法在本页直接展开。</span>
              </div>
              {article.sourceUrl && (
                <a className="btn btn-secondary" href={article.sourceUrl} target="_blank" rel="noreferrer">
                  展开并查看原文
                </a>
              )}
            </div>
          )}
          {selectionAction && (
            <button
              type="button"
              className="selection-discuss-action"
              style={{ top: selectionAction.top, left: selectionAction.left }}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openSelectionDiscussion}
            >
              看看知乎怎么讨论
            </button>
          )}

          <div className="article-actions">
            <button
              type="button"
              className={endorsed ? 'text-action active' : 'text-action'}
              onClick={() => setEndorsed((value) => !value)}
            >
              {endorsed ? '已赞同' : '赞同'} {article.voteup + (endorsed ? 1 : 0)}
            </button>
            <button type="button" className="text-action">{article.comments} 条评论</button>
            <button
              type="button"
              className={saved ? 'text-action active' : 'text-action'}
              onClick={() => setSaved((value) => !value)}
            >
              {saved ? '已收藏' : '收藏'}
            </button>
            <button type="button" className="text-action">分享</button>
            {article.sourceUrl && (
              <a href={article.sourceUrl} target="_blank" rel="noreferrer">
                查看知乎原文
              </a>
            )}
            <Link className="replace-link" to="/picker">
              换一篇内容
            </Link>
          </div>
        </article>

        <aside className="card moments-pane">
          <div className="pane-title">
            <h2>答主的看法</h2>
            <span className="beta">Beta</span>
          </div>
          <p className="pane-sub">这些片段，正在被讨论</p>
          {analysisMode === 'precomputed' && (
            <p className="pane-sub" role="status">已加载预先整理的观点</p>
          )}
          {analysisMode === 'fallback' && (
            <p className="pane-sub" role="status">当前为示例观点，实时分析暂不可用：{analysisError}</p>
          )}

          {loading ? (
            <div className="loading-box">
              正在整理讨论瞬间…
              <div className="loading-bar">
                <i />
              </div>
            </div>
          ) : (
            <>
              <div className="moment-tabs" role="group" aria-label="选择一个观点">
                {visibleMoments.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`moment-tab${m.id === activeMoment.id ? ' active' : ''}`}
                    aria-pressed={m.id === activeMoment.id}
                    onClick={() => setActiveMomentId(m.id)}
                  >
                    <span className="idx">{String(m.index).padStart(2, '0')}</span>
                    <span className="label">{m.title}</span>
                  </button>
                ))}
              </div>

              <div className="core-card">
                <div className="tag">{activeMoment.source === 'selection' ? '你选中的原文' : '答主的核心看法'}</div>
                <h3>{activeMoment.coreQuestion}</h3>
                <p>{activeMoment.summary}</p>
                <div className="core-meta">
                  <span>{activeMoment.relatedCount} 篇相关内容</span>
                  <span>
                    {typeof activeMoment.participants === 'number'
                      ? activeMoment.participants > 0
                        ? `已聚合 ${activeMoment.participants} 位答主`
                        : '暂无相关答主'
                      : `约 ${activeMoment.participants} 人参与讨论（示例）`}
                  </span>
                </div>
                <button type="button" className="btn btn-secondary" onClick={locateOriginal}>
                  定位到原文
                </button>
              </div>

              {!submitted && <div className="related-list">
                {relatedState[activeMoment.id]?.status === 'empty' && (
                  <div className="related-status">已尝试主题词和核心问题，暂未找到相关内容。</div>
                )}
                {relatedState[activeMoment.id]?.status === 'loading' && (
                  <div className="related-status">正在从知乎检索相关真实表达…</div>
                )}
                {relatedState[activeMoment.id]?.status === 'expanding' && (
                  <div className="related-status">正在根据你选中的原文生成知乎站内检索词…</div>
                )}
                {relatedState[activeMoment.id]?.status === 'error' && (
                  <div className="related-status error">
                    真实内容暂未加载：{relatedState[activeMoment.id].message}
                  </div>
                )}
                {visibleRelatedItems.map((item) => (
                  <div key={item.id} className="related-item">
                    {item.url ? (
                      <a className="title" href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      <div className="title">{item.title}</div>
                    )}
                    <div className="meta">
                      {item.author} · {item.voteup} 赞同
                    </div>
                    {item.quote && <div className="quote">“{item.quote}”</div>}
                  </div>
                ))}
                {hiddenRelatedCount > 0 && (
                  <button
                    type="button"
                    className="content-list-toggle"
                    onClick={() => setExpandedRelatedMoments((current) => ({
                      ...current,
                      [activeMoment.id]: !relatedExpanded,
                    }))}
                  >
                    {relatedExpanded ? '收起内容' : `展开剩余 ${hiddenRelatedCount} 篇`}
                  </button>
                )}
              </div>}

              {!submitted ? (
                <div className="vote-block">
                  <h4>你更接近哪一种看法？（可多选，最多 2 项）</h4>
                  <div className="vote-grid">
                    {activeMoment.voteOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={`vote-option${selectedVotes.includes(opt.id) ? ' selected' : ''}`}
                        onClick={() => toggleVote(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    disabled={selectedVotes.length === 0}
                    onClick={submitVote}
                  >
                    提交我的选择
                  </button>
                </div>
              ) : (
                <div className="vote-result">
                  <div className="joined-question">
                    <span>本次讨论</span>
                    <h4>{activeMoment.coreQuestion}</h4>
                  </div>
                  <div className="ok">你已加入讨论</div>
                  <div className="choice">你选择了：{primaryLabel}</div>
                  <div className="stat">
                    {primaryPct}% 的参与者和你选择相近
                  </div>

                  {activeRecommendation?.status === 'loading' && (
                    <div className="recommendation-status">
                      正在根据你的选择判断相近与不同观点…
                    </div>
                  )}
                  {activeRecommendation?.status === 'error' && (
                    <div className="recommendation-status error">
                      个性化推荐暂未加载，进入讨论空间时将使用原有主题推荐：
                      {activeRecommendation.message}
                    </div>
                  )}
                  {activeRecommendation?.status === 'ready' && (
                    <div className="recommendation-results">
                      {activeRecommendation.refining && (
                        <div className="recommendation-status">
                          已先展示相关内容，正在后台优化相近与不同观点…
                        </div>
                      )}
                      {activeRecommendation.refinementError && (
                        <div className="recommendation-status error">
                          <span>本次观点精排暂未完成：{activeRecommendation.refinementError}</span>
                          <button type="button" onClick={retryRecommendation}>
                            重新精排
                          </button>
                        </div>
                      )}
                      <RecommendationGroup
                        title="和你相近的观点"
                        tone="same"
                        items={activeRecommendation.groups.same || []}
                        refining={activeRecommendation.refining}
                      />
                      <RecommendationGroup
                        title="与你不同的观点"
                        tone="different"
                        items={activeRecommendation.groups.different || []}
                        refining={activeRecommendation.refining}
                      />
                      {(activeRecommendation.groups.neutral || []).length > 0 && (
                        <RecommendationGroup
                          title={activeRecommendation.refining ? '相关表达 · 正在判断立场…' : '相关但立场尚不明确'}
                          tone="neutral"
                          items={activeRecommendation.groups.neutral}
                          refining={activeRecommendation.refining}
                        />
                      )}
                    </div>
                  )}

                  <div className="result-links">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openDiscussionSpace(
                        activeMoment,
                        article,
                        selectedVotes,
                        activeRecommendation?.refining
                          ? 'pending'
                          : activeRecommendation?.refinementError
                            ? 'failed'
                            : 'ready',
                      )}
                    >
                      进入讨论空间
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
                        delete recommendationRequests.current[activeMoment.id]
                        setSubmitted(false)
                        setSelectedVotes([])
                      }}
                    >
                      修改选择
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  )
}
