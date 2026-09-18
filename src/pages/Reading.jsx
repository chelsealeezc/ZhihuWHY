import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getArticle, getMoments } from '../data/mock'
import {
  analyzeArticle,
  generateVoteOptionSets,
  recommendRelatedContent,
  searchRelatedContent,
} from '../services/discussions'
import { getImportedArticle } from '../services/importedArticles'
import { saveDiscussionSpace } from '../services/discussionSpaces'
import './Reading.css'

function createLiveMoment(moment, fallbackMoment) {
  return {
    ...moment,
    index: moment.index || fallbackMoment?.index || 1,
    relatedCount: 0,
    participants: 0,
    related: [],
    voteOptions: Array.isArray(moment.voteOptions) ? moment.voteOptions : [],
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
    viewpoint: item.viewpoint,
    relevanceScore: item.relevanceScore,
    why: item.reason || `围绕「${moment.searchQuery}」提供了相关观点或真实经历。`,
  }
}

function RecommendationGroup({ title, tone, items }) {
  return (
    <section className={`recommendation-group ${tone}`}>
      <div className="recommendation-heading">
        <h4>{title}</h4>
        <span>{items.length} 篇</span>
      </div>
      {items.length === 0 ? (
        <div className="recommendation-empty">暂时没有足够明确的内容</div>
      ) : (
        items.slice(0, 4).map((item) => {
          const viewpoint = item.viewpoint || item.claim || item.quote || item.why || item.title
          const classificationReason = item.why && item.why !== viewpoint ? item.why : ''
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
              {classificationReason && (
                <div className="why">分类依据：{classificationReason}</div>
              )}
            </div>
          )
        })
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
  const [voteOptionState, setVoteOptionState] = useState({})
  const [activeMomentId, setActiveMomentId] = useState(fallbackMoments[0]?.id)
  const [selectedVotes, setSelectedVotes] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [recommendationState, setRecommendationState] = useState({})
  const [anchorId, setAnchorId] = useState(null)
  const [endorsed, setEndorsed] = useState(false)
  const [saved, setSaved] = useState(false)
  const paragraphRefs = useRef({})
  const recommendationRequests = useRef({})
  const voteOptionBatchRequest = useRef(null)

  const activeMoment = useMemo(
    () => moments.find((m) => m.id === activeMomentId) || moments[0],
    [moments, activeMomentId],
  )

  useEffect(() => {
    setLoading(true)
    setSubmitted(false)
    setSelectedVotes([])
    setMoments(fallbackMoments)
    setActiveMomentId(fallbackMoments[0]?.id)
    setAnalysisMode('loading')
    setAnalysisError('')
    setRelatedState({})
    setVoteOptionState({})
    setRecommendationState({})
    recommendationRequests.current = {}
    voteOptionBatchRequest.current = null
    let cancelled = false

    analyzeArticle(article)
      .then((generated) => {
        if (cancelled) return
        const liveMoments = generated.map((moment, index) =>
          createLiveMoment(moment, fallbackMoments[index]),
        )
        setMoments(liveMoments)
        setActiveMomentId(liveMoments[0]?.id)
        setAnalysisMode('live')
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
    if (!activeMoment?.coreQuestion || relatedState[activeMoment.id]) return
    const momentId = activeMoment.id
    setRelatedState((current) => ({ ...current, [momentId]: { status: 'loading' } }))
    searchRelatedContent(activeMoment.searchQuery || activeMoment.coreQuestion, 4, activeMoment.coreQuestion)
      .then((items) => {
        setMoments((current) =>
          current.map((moment) =>
            moment.id === momentId
              ? {
                  ...moment,
                  related: items.slice(0, 4).map((item) => mapRelatedItem(item, moment)),
                  relatedCount: items.length,
                  participants: countRelatedAuthors(items.slice(0, 4)),
                  closestQuote: items[0]
                    ? {
                        text: items[0].quote || items[0].title,
                        author: items[0].author,
                        source: `《${items[0].title}》`,
                        voteup: items[0].voteup,
                      }
                    : moment.closestQuote,
                }
              : moment,
          ),
        )
        setRelatedState((current) => ({ ...current, [momentId]: { status: items.length ? 'ready' : 'empty' } }))
      })
      .catch((error) => {
        setRelatedState((current) => ({
          ...current,
          [momentId]: { status: 'error', message: `${error.code || 'SEARCH_FAILED'}：${error.message}` },
        }))
      })
  }, [activeMoment, relatedState])

  useEffect(() => {
    const readyWithoutState = moments.filter(
      (moment) => moment.voteOptions?.length >= 3 && !voteOptionState[moment.id],
    )
    const missingMoments = moments.filter(
      (moment) => moment.coreQuestion
        && moment.voteOptions?.length < 3
        && !voteOptionState[moment.id],
    )

    if (readyWithoutState.length > 0) {
      setVoteOptionState((current) => {
        const next = { ...current }
        readyWithoutState.forEach((moment) => { next[moment.id] = { status: 'ready' } })
        return next
      })
    }
    if (missingMoments.length === 0) return

    const requestToken = {}
    voteOptionBatchRequest.current = requestToken
    setVoteOptionState((current) => {
      const next = { ...current }
      missingMoments.forEach((moment) => { next[moment.id] = { status: 'loading' } })
      return next
    })

    generateVoteOptionSets(missingMoments)
      .then((optionSets) => {
        if (voteOptionBatchRequest.current !== requestToken) return
        const optionsByMoment = new Map(
          optionSets.map((set) => [set.momentId, set.voteOptions]),
        )
        setMoments((current) => current.map((moment) => (
          optionsByMoment.has(moment.id)
            ? { ...moment, voteOptions: optionsByMoment.get(moment.id) }
            : moment
        )))
        setVoteOptionState((current) => {
          const next = { ...current }
          missingMoments.forEach((moment) => { next[moment.id] = { status: 'ready' } })
          return next
        })
      })
      .catch((error) => {
        if (voteOptionBatchRequest.current !== requestToken) return
        const fallbackByMoment = new Map(missingMoments.map((moment) => [
          moment.id,
          fallbackMoments[moment.index - 1]?.voteOptions || [],
        ]))
        setMoments((current) => current.map((moment) => {
          const fallbackOptions = fallbackByMoment.get(moment.id)
          return fallbackOptions?.length >= 3 ? { ...moment, voteOptions: fallbackOptions } : moment
        }))
        setVoteOptionState((current) => {
          const next = { ...current }
          missingMoments.forEach((moment) => {
            const hasFallback = fallbackByMoment.get(moment.id)?.length >= 3
            next[moment.id] = {
              status: hasFallback ? 'fallback' : 'error',
              message: `${error.code || 'VOTE_OPTIONS_FAILED'}：${error.message}`,
            }
          })
          return next
        })
      })
  }, [fallbackMoments, moments, voteOptionState])

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

  function retryVoteOptions() {
    setVoteOptionState((current) => {
      const next = { ...current }
      delete next[activeMoment.id]
      return next
    })
  }

  async function submitVote() {
    if (selectedVotes.length === 0) return
    const moment = activeMoment
    const momentId = moment.id
    const selectedOpinions = selectedVotes
      .map((id) => moment.voteOptions.find((option) => option.id === id)?.label)
      .filter(Boolean)
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
    const requestToken = {}
    recommendationRequests.current[momentId] = requestToken
    setMoments((current) => current.map((item) => item.id === momentId
      ? { ...item, related: instantGroups.neutral }
      : item))
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
        selectedVotes,
        { classificationStatus: 'ready' },
      )
      setMoments((current) =>
        current.map((item) =>
          item.id === momentId
            ? {
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
              }
            : item,
        ),
      )
      setRecommendationState((current) => ({
        ...current,
        [momentId]: { status: 'ready', groups: mappedGroups, refining: false },
      }))
    } catch (error) {
      if (recommendationRequests.current[momentId] !== requestToken) return
      saveDiscussionSpace(
        { ...moment, related: instantGroups.neutral },
        article,
        selectedVotes,
        { classificationStatus: 'failed' },
      )
      setRecommendationState((current) => ({
        ...current,
        [momentId]: {
          status: 'ready',
          groups: current[momentId]?.groups || instantGroups,
          refining: false,
          refinementError: `${error.code || 'RECOMMENDATION_FAILED'}：${error.message}`,
        },
      }))
    }
  }

  const primaryChoice = selectedVotes[0]
  const primaryLabel = activeMoment.voteOptions.find((o) => o.id === primaryChoice)?.label
  const primaryPct = activeMoment.voteResults[primaryChoice] || 0
  const activeRecommendation = recommendationState[activeMoment.id]
  const activeVoteOptionState = voteOptionState[activeMoment.id]
  const voteOptionsReady = activeMoment.voteOptions?.length >= 3

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

          <div className="article-body">
            {article.paragraphs.map((p) => {
              const sharedProps = {
                ref: (element) => {
                  paragraphRefs.current[p.id] = element
                },
                className: `${anchorId === p.id ? 'anchor-active ' : ''}${p.momentId ? 'article-moment' : ''}`,
                'data-moment': p.momentId || undefined,
                onClick: () => p.momentId && setActiveMomentId(p.momentId),
              }
              return p.kind === 'heading' ? (
                <h2 key={p.id} {...sharedProps}>{p.text}</h2>
              ) : (
                <p key={p.id} {...sharedProps}>{p.text}</p>
              )
            })}
          </div>

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
              <div className="moment-tabs">
                {moments.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`moment-tab${m.id === activeMoment.id ? ' active' : ''}`}
                    onClick={() => setActiveMomentId(m.id)}
                  >
                    <span className="idx">{String(m.index).padStart(2, '0')}</span>
                    <span className="label">{m.title}</span>
                  </button>
                ))}
              </div>

              <div className="core-card">
                <div className="tag">核心观点</div>
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
                {relatedState[activeMoment.id]?.status === 'error' && (
                  <div className="related-status error">
                    真实内容暂未加载：{relatedState[activeMoment.id].message}
                  </div>
                )}
                {activeMoment.related.map((item) => (
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
                    <div className="why">为什么相关：{item.why}</div>
                  </div>
                ))}
              </div>}

              {!submitted ? (
                <div className="vote-block">
                  <h4>你更接近哪一种看法？（可多选，最多 2 项）</h4>
                  {!voteOptionsReady ? (
                    <div className={`vote-options-status${activeVoteOptionState?.status === 'error' ? ' error' : ''}`}>
                      {activeVoteOptionState?.status === 'error' ? (
                        <>
                          <span>投票选项暂未生成：{activeVoteOptionState.message}</span>
                          <button type="button" onClick={retryVoteOptions}>重试</button>
                        </>
                      ) : (
                        <>
                          <span>正在后台准备所有观点的投票选项…</span>
                          <div className="vote-options-progress"><i /></div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      {activeVoteOptionState?.status === 'fallback' && (
                        <div className="vote-options-fallback">实时选项暂未生成，先展示示例选项。</div>
                      )}
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
                    </>
                  )}
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
                          本次观点精排暂未完成：{activeRecommendation.refinementError}
                        </div>
                      )}
                      <RecommendationGroup
                        title="和你相近的观点"
                        tone="same"
                        items={activeRecommendation.groups.same || []}
                      />
                      <RecommendationGroup
                        title="与你不同的观点"
                        tone="different"
                        items={activeRecommendation.groups.different || []}
                      />
                      {(activeRecommendation.groups.neutral || []).length > 0 && (
                        <RecommendationGroup
                          title={activeRecommendation.refining ? '相关表达 · 正在判断立场…' : '相关但立场尚不明确'}
                          tone="neutral"
                          items={activeRecommendation.groups.neutral}
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
