import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getArticle, getMoments } from '../data/mock'
import './Reading.css'

function openDiscussionSpace(momentId, selectedIds) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const params = new URLSearchParams({
    choices: selectedIds.join(','),
  })
  const url = `${window.location.origin}${base}/space/${momentId}?${params}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

export default function Reading() {
  const { articleId } = useParams()
  const article = getArticle(articleId)
  const moments = getMoments(article.id)

  const [loading, setLoading] = useState(true)
  const [activeMomentId, setActiveMomentId] = useState(moments[0]?.id)
  const [selectedVotes, setSelectedVotes] = useState([])
  const [submitted, setSubmitted] = useState(false)
  const [anchorId, setAnchorId] = useState(null)
  const paragraphRefs = useRef({})

  const activeMoment = useMemo(
    () => moments.find((m) => m.id === activeMomentId) || moments[0],
    [moments, activeMomentId],
  )

  useEffect(() => {
    setLoading(true)
    setSubmitted(false)
    setSelectedVotes([])
    const t = setTimeout(() => setLoading(false), 900)
    return () => clearTimeout(t)
  }, [article.id])

  useEffect(() => {
    setSubmitted(false)
    setSelectedVotes([])
  }, [activeMomentId])

  function locateOriginal() {
    const id = activeMoment.anchorParagraphId
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

  function submitVote() {
    if (selectedVotes.length === 0) return
    setSubmitted(true)
  }

  const primaryChoice = selectedVotes[0]
  const primaryLabel = activeMoment.voteOptions.find((o) => o.id === primaryChoice)?.label
  const primaryPct = activeMoment.voteResults[primaryChoice]

  return (
    <div className="app-shell">
      <Topbar />
      <div className="read-layout">
        <article className="card article-pane">
          <h1 className="question">{article.question}</h1>
          <div className="author-row">
            <div className="avatar">{article.author.name.slice(0, 1)}</div>
            <div>
              <div className="name">{article.author.name}</div>
              <div className="bio">
                {article.author.bio} · {article.author.followers} 关注
              </div>
            </div>
            <button type="button" className="btn btn-secondary" style={{ marginLeft: 'auto' }}>
              + 关注
            </button>
          </div>

          <div className="article-body">
            {article.paragraphs.map((p) => (
              <p
                key={p.id}
                ref={(el) => {
                  paragraphRefs.current[p.id] = el
                }}
                className={anchorId === p.id ? 'anchor-active' : ''}
                data-moment={p.momentId || undefined}
              >
                {p.text}
              </p>
            ))}
          </div>

          <div className="article-actions">
            <span>▲ 赞同 {article.voteup}</span>
            <span>💬 {article.comments} 条评论</span>
            <span>收藏</span>
            <span>分享</span>
            <Link to="/picker" style={{ marginLeft: 'auto', fontSize: 13 }}>
              换一篇内容
            </Link>
          </div>
        </article>

        <aside className="card moments-pane">
          <div className="pane-title">
            <h2>讨论瞬间</h2>
            <span className="beta">Beta</span>
          </div>
          <p className="pane-sub">
            演示数据：基于全文预置 {moments.length} 个最值得深入讨论的主题（本期不接 AI）
          </p>

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
                  <span>{activeMoment.participants} 人参与讨论</span>
                </div>
                <button type="button" className="btn btn-secondary" onClick={locateOriginal}>
                  定位到原文
                </button>
              </div>

              <div className="related-list">
                {activeMoment.related.map((item) => (
                  <div key={item.id} className="related-item">
                    <div className="title">{item.title}</div>
                    <div className="meta">
                      {item.author} · {item.voteup} 赞同
                    </div>
                    <div className="why">为什么相关：{item.why}</div>
                  </div>
                ))}
              </div>

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
                  <div className="ok">你已加入讨论</div>
                  <div className="choice">你选择了：{primaryLabel}</div>
                  <div className="stat">
                    {primaryPct}% 的参与者和你选择相近
                  </div>

                  <div className="quote-card">
                    <div>和你最接近的真实表达</div>
                    <p style={{ margin: '8px 0' }}>“{activeMoment.closestQuote.text}”</p>
                    <div className="who">
                      @{activeMoment.closestQuote.author} · 来自{activeMoment.closestQuote.source} ·{' '}
                      {activeMoment.closestQuote.voteup} 赞同
                    </div>
                  </div>

                  <div className="result-links">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => openDiscussionSpace(activeMoment.id, selectedVotes)}
                    >
                      进入讨论空间（新标签页）
                    </button>
                    <button type="button" className="btn btn-secondary">
                      看看和我最像的人怎么说
                    </button>
                    <button type="button" className="btn btn-secondary">
                      看看和我最不一样的人怎么说
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => {
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
