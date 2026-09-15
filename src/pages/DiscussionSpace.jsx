import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getSpace } from '../data/mock'
import { getSavedDiscussionSpace } from '../services/discussionSpaces'
import './DiscussionSpace.css'

const PERSONA_PRESETS = {
  阿北: {
    stance: '意志力派',
    claim: '没有反馈时的坚持更能决定执行力',
    description: '相信反馈很重要，但真正的分水岭是没有反馈时仍能守住承诺。',
    traits: ['重视长期承诺', '警惕单因归因', '表达直接'],
  },
  周然: {
    stance: '环境设计派',
    claim: '环境设计比每天消耗意志力更重要',
    description: '更关注如何把行动阻力放到系统外，而不是每天消耗意志力。',
    traits: ['喜欢拆解步骤', '关注环境杠杆', '偏行动建议'],
  },
  清禾: {
    stance: '评价焦虑视角',
    claim: '很多拖延的根源是对外界评价的恐惧',
    description: '关注外界目光如何改变人的开始、交付和自我判断。',
    traits: ['敏感于评价', '重视心理安全', '善于换位思考'],
  },
}

function compactSentence(value, maxLength = 72) {
  const text = String(value || '').replace(/\s+/g, ' ').trim().replace(/^[“”"']+|[“”"']+$/g, '')
  if (!text) return ''
  const first = text.match(/^.*?[。！？!?](?:\s|$)/)?.[0]?.trim() || text
  if (first.length <= maxLength) return /[。！？!?]$/.test(first) ? first : `${first}。`
  return `${first.slice(0, maxLength).replace(/[，,;；。！？!?]+$/, '')}……`
}

function normalizeClaim(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:我的观点是|我认为|我觉得)[：:、\s]*/, '')
    .replace(/[。！？!?]+$/, '')
}

function sourceUrlWithTextFragment(url, excerpt) {
  if (!url) return ''
  const text = String(excerpt || '').replace(/\s+/g, ' ').trim().slice(0, 100)
  if (!text) return url
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    return `${parsed.toString()}#:~:text=${encodeURIComponent(text)}`
  } catch {
    return url
  }
}

function createPersona(person, posts) {
  const preset = PERSONA_PRESETS[person.name] || {}
  const evidence = posts.filter((post) => post.user === person.name)
  const publicEvidence = Array.isArray(person.evidence) && person.evidence.length > 0
    ? person.evidence
    : evidence.map((post) => post.text)
  const claim = normalizeClaim(preset.claim || person.claim || person.snippet?.split('·')[0] || '')
  const evidenceLine = compactSentence(publicEvidence[0])
  return {
    ...person,
    stance: preset.stance || person.snippet?.split('·')[0] || '讨论参与者',
    claim,
    description: preset.description || (claim ? `其过往公开表达更倾向认为：${claim}。` : '当前公开摘录不足以提炼明确观点。'),
    traits: preset.traits || ['有明确立场', '愿意解释依据', '欢迎具体追问'],
    opening: `我觉得${claim || '现有信息还不足以得出明确观点'}。${evidenceLine || '我过往的公开表达还不足以支持更具体的判断。'}`,
    evidenceCount: Math.max(4, evidence.length * 3 + 2),
    evidence: publicEvidence.slice(0, 3),
  }
}

export default function DiscussionSpace() {
  const { momentId } = useParams()
  const [searchParams] = useSearchParams()
  const space = useMemo(() => getSavedDiscussionSpace(momentId) || getSpace(momentId), [momentId])
  const choices = (searchParams.get('choices') || space.selectedChoices?.join(',') || 'v1')
    .split(',')
    .filter(Boolean)
  const myChoice = choices[0]

  const [feedFilter, setFeedFilter] = useState(() => {
    const initialFilter = searchParams.get('filter')
    return ['same', 'diff', 'neutral'].includes(initialFilter) ? initialFilter : 'all'
  })
  const [draft, setDraft] = useState('')
  const [localPosts, setLocalPosts] = useState([])
  const [composerMessage, setComposerMessage] = useState('')
  const [agreedPosts, setAgreedPosts] = useState(() => new Set())
  const [expandedSources, setExpandedSources] = useState(() => new Set())
  const [activePersona, setActivePersona] = useState(() => {
    const first = space.worthChat?.[0]
    return first ? createPersona(first, space.posts || []) : null
  })
  const [chatDraft, setChatDraft] = useState('')
  const [chatMessages, setChatMessages] = useState(() => (
    activePersona ? [{ role: 'assistant', text: activePersona.opening }] : []
  ))
  const [chatSending, setChatSending] = useState(false)
  const composerRef = useRef(null)
  const chatInputRef = useRef(null)
  const chatEndRef = useRef(null)

  const allPosts = useMemo(() => [...localPosts, ...(space.posts || [])], [localPosts, space.posts])
  const participantCount = useMemo(
    () => new Set(allPosts.map((post) => post.user).filter(Boolean)).size,
    [allPosts],
  )

  const posts = useMemo(() => {
    if (feedFilter === 'same') return allPosts.filter((p) => p.stance === 'same')
    if (feedFilter === 'diff') return allPosts.filter((p) => p.stance === 'diff')
    if (feedFilter === 'neutral') return allPosts.filter((p) => p.stance === 'neutral')
    return allPosts
  }, [allPosts, feedFilter])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages, chatSending])

  function focusComposer(filter = 'all') {
    setFeedFilter(filter)
    composerRef.current?.focus()
  }

  function submitPost(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setComposerMessage('先写下你的看法，再发送。')
      composerRef.current?.focus()
      return
    }
    setLocalPosts((current) => [
      {
        id: `local-${Date.now()}`,
        user: '我',
        from: '来自你的观点',
        time: '刚刚',
        stance: 'same',
        stanceOptionId: myChoice,
        text,
        agree: 0,
      },
      ...current,
    ])
    setDraft('')
    setComposerMessage('已加入本场讨论（仅保存在当前页面）。')
  }

  function toggleAgree(postId) {
    setAgreedPosts((current) => {
      const next = new Set(current)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  function toggleSource(postId) {
    setExpandedSources((current) => {
      const next = new Set(current)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  function openPersona(person) {
    const persona = createPersona(person, allPosts)
    setActivePersona(persona)
    setChatMessages([{ role: 'assistant', text: persona.opening }])
    setChatDraft('')
    window.setTimeout(() => chatInputRef.current?.focus(), 80)
  }

  function localPersonaReply(persona, question) {
    const evidenceLine = compactSentence(persona.evidence?.[0])
    return `我觉得${persona.claim || persona.stance || '这个观点更成立'}。${evidenceLine || '我过往的公开表达还不足以支持更具体的判断。'}`
  }

  async function sendPersonaMessage(event) {
    event.preventDefault()
    const text = chatDraft.trim()
    if (!text || !activePersona || chatSending) return
    setChatDraft('')
    setChatMessages((messages) => [...messages, { role: 'user', text }])
    setChatSending(true)
    try {
      const response = await fetch('/api/discussions/persona-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona: activePersona,
          messages: [...chatMessages, { role: 'user', text }],
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.ok) throw new Error('fallback')
      setChatMessages((messages) => [...messages, { role: 'assistant', text: data.reply }])
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 450))
      setChatMessages((messages) => [
        ...messages,
        { role: 'assistant', text: localPersonaReply(activePersona, text) },
      ])
    } finally {
      setChatSending(false)
      window.setTimeout(() => chatInputRef.current?.focus(), 60)
    }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <div className="space-layout">
        <aside className="space-col">
          <div className="card space-card topic-card">
            <div className="topic-brand">
              <span className="topic-mark">回</span>
              <span>知乎 · 回响</span>
            </div>
            <div className="topic">{space.topic}</div>
            <div className="meta">
              来自 {space.sourceCount} 篇回答 / 文章 · 已聚合 {participantCount} 位参与者
            </div>
            {space.real && <div className="real-badge">来自知乎回答</div>}
          </div>

          <div className="card space-card">
            <h3>答主的观点分布</h3>
            <div className="dist-list">
              {space.options.map((opt) => (
                <div
                  key={opt.id}
                  className={`dist-row${opt.id === myChoice ? ' mine' : ''}`}
                >
                  <span className="label">
                    {opt.id === myChoice ? '✓ ' : ''}
                    {opt.label}
                  </span>
                  <span>{space.distribution[opt.id]}%</span>
                  <div className="bar">
                    <i style={{ width: `${space.distribution[opt.id]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card space-card">
            <h3>讨论筛选</h3>
            <div className="filter-tabs">
              {[
                ['all', '全部'],
                ['same', '和我相近'],
                ['diff', '和我不同'],
                ['neutral', '立场不明'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={feedFilter === id ? 'active' : ''}
                  onClick={() => setFeedFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <ul className="filter-list">
              {space.filters.map((f) => (
                <li key={f.id}>
                  <span>{f.label}</span>
                  <span>{f.count}</span>
                </li>
              ))}
            </ul>
            <p className="filter-note">来源：知乎回答与文章</p>
          </div>
        </aside>

        <main className="space-col">
          <div className="space-main-header">
            <div>
              <h1>讨论空间</h1>
              <p>和相同、不同的人，交换一个具体观点</p>
            </div>
            <Link className="btn btn-secondary" to={`/read/${space.articleId || 'a1'}`}>
              返回阅读页
            </Link>
          </div>

          <div className="feed">
            {posts.length === 0 && (
              <div className="card empty-feed">这个筛选下暂时没有观点，换个筛选看看。</div>
            )}
            {posts.map((post) => {
              const refined = Boolean(post.refined)
              const sourceExpanded = expandedSources.has(post.id)
              const sourceUrl = sourceUrlWithTextFragment(post.url, post.sourceExcerpt)
              return <article key={post.id} className="card post-card">
                <div className="post-head">
                  <div className="avatar sm">{post.user.slice(0, 1)}</div>
                  <div>
                    <div className="who">{post.user}</div>
                    <div className="from">
                      {post.from} · {post.time}
                    </div>
                  </div>
                  <span className={`stance-tag ${post.stance}`}>
                    {post.stance === 'same'
                      ? '同观点'
                      : post.stance === 'diff'
                        ? '不同观点'
                        : '立场不明'}
                  </span>
                </div>
                {refined && (
                  <div className="refined-notice">
                    <span>AI 提炼观点</span>
                    以下是根据公开内容提炼的表达，不是答主原话
                  </div>
                )}
                <p className="body">{post.text}</p>
                {post.sourceExcerpt && sourceExpanded && (
                  <div className="source-evidence">
                    <div className="source-evidence-title">
                      <span>原文依据</span>
                      {post.sourceTitle && <strong>《{post.sourceTitle}》</strong>}
                    </div>
                    {post.sourceExcerpt ? (
                      <blockquote>“{post.sourceExcerpt}”</blockquote>
                    ) : (
                      <p>当前演示数据没有保留可定位的原文摘录。</p>
                    )}
                    {sourceUrl && (
                      <a href={sourceUrl} target="_blank" rel="noreferrer">
                        {post.sourceExcerpt ? '在知乎原文中定位' : '打开知乎原文'}
                      </a>
                    )}
                  </div>
                )}
                <div className="post-actions">
                  <button
                    type="button"
                    className={agreedPosts.has(post.id) ? 'active' : ''}
                    aria-pressed={agreedPosts.has(post.id)}
                    onClick={() => toggleAgree(post.id)}
                  >
                    {agreedPosts.has(post.id) ? '已认同' : '认同'} {post.agree + (agreedPosts.has(post.id) ? 1 : 0)}
                  </button>
                  <button type="button" onClick={() => focusComposer(post.stance)}>
                    追问
                  </button>
                  <button type="button" onClick={() => focusComposer('all')}>
                    回应
                  </button>
                  {refined && (
                    <button
                      type="button"
                      className="source-toggle"
                      aria-expanded={sourceExpanded}
                      onClick={() => toggleSource(post.id)}
                    >
                      {sourceExpanded ? '收起原文依据' : '定位原文依据'}
                    </button>
                  )}
                  {!refined && post.url && (
                    <a href={post.url} target="_blank" rel="noreferrer">查看原文</a>
                  )}
                </div>
              </article>
            })}
          </div>

          <form className="composer" onSubmit={submitPost}>
            <div className="avatar sm">我</div>
            <input
              ref={composerRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                if (composerMessage) setComposerMessage('')
              }}
              placeholder="写下你的看法"
              aria-label="写下你的看法"
            />
            <button type="submit" className="btn btn-primary">
              发送
            </button>
          </form>
          {composerMessage && <div className="composer-message">{composerMessage}</div>}
        </main>

        <aside className="space-col">
          <div className="card space-card persona-card">
            <div className="persona-card-title">
              <div>
                <h3>AI 分身</h3>
                <p>基于答主过往公开观点进行对话推演</p>
              </div>
              <span>Beta</span>
            </div>
            <div className="persona-tabs" aria-label="选择 AI 分身">
              {space.worthChat.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={activePersona?.id === person.id ? 'active' : ''}
                  disabled={chatSending}
                  onClick={() => openPersona(person)}
                >
                  <span className="avatar sm">{person.name.slice(0, 1)}</span>
                  <span>{person.name}</span>
                </button>
              ))}
            </div>
            {activePersona ? (
              <div className="persona-chatbox">
                <div className="persona-context">
                  <div>
                    <strong>{activePersona.name}</strong>
                    <span>{activePersona.stance}</span>
                  </div>
                  <p>{activePersona.description}</p>
                  {activePersona.evidence.length > 0 && (
                    <details>
                      <summary>查看参考的过往表达</summary>
                      {activePersona.evidence.map((quote, index) => (
                        <blockquote key={`${activePersona.id}-evidence-${index}`}>“{quote}”</blockquote>
                      ))}
                    </details>
                  )}
                </div>
                <div className="persona-chat" aria-live="polite">
                  {chatMessages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`chat-row ${message.role}`}>
                      <span className="chat-speaker">
                        {message.role === 'user' ? '我' : `${activePersona.name} · AI 分身`}
                      </span>
                      <div className={`chat-bubble ${message.role}`}>{message.text}</div>
                    </div>
                  ))}
                  {chatSending && <div className="chat-typing">{activePersona.name} 正在回复…</div>}
                  <div ref={chatEndRef} />
                </div>
                <form className="persona-composer" onSubmit={sendPersonaMessage}>
                  <input
                    ref={chatInputRef}
                    value={chatDraft}
                    onChange={(event) => setChatDraft(event.target.value)}
                    placeholder="回复你的看法…"
                    aria-label={`回复 ${activePersona.name} 的 AI 分身`}
                  />
                  <button className="btn btn-primary" type="submit" disabled={!chatDraft.trim() || chatSending}>
                    发送
                  </button>
                </form>
                <p className="persona-disclaimer">仅供观点推演，不代表本人实时发言</p>
              </div>
            ) : (
              <div className="persona-empty">暂时没有可对话的观点分身。</div>
            )}
          </div>

          <div className="card space-card">
            <h3>这场讨论来自</h3>
            <div className="source-list">
              {space.sources.map((src) => (
                <div key={src.id} className="source-item">
                  <div className="avatar sm">文</div>
                  <div>
                    {src.url ? (
                      <a className="title" href={src.url} target="_blank" rel="noreferrer">
                        {src.title}
                      </a>
                    ) : (
                      <div className="title">{src.title}</div>
                    )}
                    <div className="meta">
                      {src.author} · {src.voteup} 赞同 · {src.comments} 评论
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
