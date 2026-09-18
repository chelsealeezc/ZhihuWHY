import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import UserAvatar from '../components/UserAvatar'
import { getSpace } from '../data/mock'
import {
  DISCUSSION_SPACES_STORAGE_KEY,
  getSavedDiscussionSpace,
} from '../services/discussionSpaces'
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
  const [spaceRevision, setSpaceRevision] = useState(0)
  const space = useMemo(
    () => getSavedDiscussionSpace(momentId) || getSpace(momentId),
    [momentId, spaceRevision],
  )
  const choices = (searchParams.get('choices') || space.selectedChoices?.join(',') || 'v1')
    .split(',')
    .filter(Boolean)
  const myChoice = choices[0]

  const [feedFilter, setFeedFilter] = useState('all')
  const [draft, setDraft] = useState('')
  const [localPosts, setLocalPosts] = useState([])
  const [localReplies, setLocalReplies] = useState({})
  const [replyTarget, setReplyTarget] = useState(null)
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
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [descriptionOverflowing, setDescriptionOverflowing] = useState(false)
  const composerRef = useRef(null)
  const chatInputRef = useRef(null)
  const chatEndRef = useRef(null)
  const personaTabsRef = useRef(null)
  const descriptionRef = useRef(null)

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
  const feedFilters = useMemo(() => [
    { id: 'all', label: '全部', count: allPosts.length },
    { id: 'same', label: '与我相近', count: allPosts.filter((post) => post.stance === 'same').length },
    { id: 'diff', label: '与我不同', count: allPosts.filter((post) => post.stance === 'diff').length },
    { id: 'neutral', label: '立场不明', count: allPosts.filter((post) => post.stance === 'neutral').length },
  ], [allPosts])
  const classificationPending = space.classificationStatus === 'pending'
  const classificationFailed = space.classificationStatus === 'failed'
  const classificationReady = !classificationPending && !classificationFailed

  useEffect(() => {
    setFeedFilter('all')
  }, [momentId])

  useEffect(() => {
    function syncDiscussionSpace(event) {
      if (event.key === DISCUSSION_SPACES_STORAGE_KEY) {
        setSpaceRevision((revision) => revision + 1)
      }
    }
    window.addEventListener('storage', syncDiscussionSpace)
    return () => window.removeEventListener('storage', syncDiscussionSpace)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages, chatSending])

  useEffect(() => {
    const el = descriptionRef.current
    if (!el) return
    setDescriptionOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [activePersona, descriptionExpanded])

  function focusComposer(post = null, intent = 'reply') {
    if (post) {
      setReplyTarget({
        postId: post.id,
        user: post.user,
        excerpt: compactSentence(post.text, 46),
        intent,
      })
    } else {
      setReplyTarget(null)
    }
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
    const entry = {
        id: `local-${Date.now()}`,
        user: '我',
        from: '来自你的观点',
        time: '刚刚',
        stance: 'same',
        stanceOptionId: myChoice,
        text,
        agree: 0,
    }
    if (replyTarget) {
      setLocalReplies((current) => ({
        ...current,
        [replyTarget.postId]: [
          ...(current[replyTarget.postId] || []),
          {
            ...entry,
            replyTo: replyTarget.user,
            replyToExcerpt: replyTarget.excerpt,
            intent: replyTarget.intent,
          },
        ],
      }))
    } else {
      setLocalPosts((current) => [entry, ...current])
    }
    setDraft('')
    setComposerMessage(replyTarget
      ? `已回复 @${replyTarget.user}（仅保存在当前页面）。`
      : '已加入本场讨论（仅保存在当前页面）。')
    setReplyTarget(null)
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
    setDescriptionExpanded(false)
    window.setTimeout(() => chatInputRef.current?.focus(), 80)
  }

  function openPersonaByName(name) {
    if (!name || name === '我') return
    const matched = space.worthChat?.find((person) => person.name === name)
    if (matched) {
      openPersona(matched)
    } else {
      const persona = createPersona({ id: `chat-by-name-${name}`, name }, allPosts)
      setActivePersona(persona)
      setChatMessages([{ role: 'assistant', text: persona.opening }])
      setChatDraft('')
      setDescriptionExpanded(false)
      window.setTimeout(() => chatInputRef.current?.focus(), 80)
    }
    window.requestAnimationFrame(() => {
      const activeTab = personaTabsRef.current?.querySelector('button.active')
      if (activeTab) activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      else personaTabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
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
            <h3>大家的投票结果</h3>
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

          <div className="feed-filter" role="tablist" aria-label="筛选讨论观点">
            {feedFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={feedFilter === filter.id}
                className={feedFilter === filter.id ? 'active' : ''}
                disabled={filter.id !== 'all' && !classificationReady}
                onClick={() => setFeedFilter(filter.id)}
              >
                <span>{filter.label}</span>
                {(filter.id === 'all' || classificationReady) && (
                  <span className="feed-filter-count">{filter.count}</span>
                )}
              </button>
            ))}
          </div>
          {!classificationReady && (
            <div className={`classification-note${classificationFailed ? ' failed' : ''}`} aria-live="polite">
              {classificationPending
                ? '正在判断观点关系，完成后即可按立场筛选'
                : '本次观点分类暂未完成，当前先展示全部内容'}
            </div>
          )}

          <div className="feed">
            {posts.length === 0 && (
              <div className="card empty-feed">这个筛选下暂时没有观点，换个筛选看看。</div>
            )}
            {posts.map((post) => {
              const refined = Boolean(post.refined)
              const sourceExpanded = expandedSources.has(post.id)
              const sourceUrl = sourceUrlWithTextFragment(post.url, post.sourceExcerpt)
              const postClassificationPending = classificationPending && post.real
              const postClassificationFailed = classificationFailed && post.real
              return <article key={post.id} className="card post-card">
                <div className="post-head">
                  <button
                    type="button"
                    className="persona-trigger"
                    onClick={() => openPersonaByName(post.user)}
                    title={`与 ${post.user} 的 AI 分身对话`}
                  >
                    <UserAvatar name={post.user} src={post.avatar} size="sm" />
                  </button>
                  <div>
                    <div className="who">{post.user}</div>
                    <div className="from">
                      {post.from} · {post.time}
                    </div>
                  </div>
                  <span className={`stance-tag ${postClassificationPending || postClassificationFailed ? 'pending' : post.stance}`}>
                    {postClassificationPending
                      ? '正在判断'
                      : postClassificationFailed
                        ? '暂未分类'
                        : post.stance === 'same'
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
                  <button
                    type="button"
                    onClick={() => focusComposer(post, 'question')}
                  >
                    追问
                  </button>
                  <button type="button" onClick={() => focusComposer(post, 'reply')}>
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
                {(localReplies[post.id] || []).length > 0 && (
                  <div className="post-replies" aria-label={`${post.user} 的回复`}>
                    {(localReplies[post.id] || []).map((reply) => (
                      <div key={reply.id} className="post-reply">
                        <div className="post-reply-head">
                          <UserAvatar name={reply.user} size="sm" />
                          <strong>{reply.user}</strong>
                          <span>{reply.intent === 'question' ? '追问' : '回复'} @{reply.replyTo} · {reply.time}</span>
                        </div>
                        <div className="post-reply-reference">“{reply.replyToExcerpt}”</div>
                        <p>{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            })}
          </div>

          <form className="composer" onSubmit={submitPost}>
            <div className="avatar sm">我</div>
            <div className="composer-main">
              {replyTarget && (
                <div className="composer-reply-target">
                  <span>{replyTarget.intent === 'question' ? '追问' : '回复'} @{replyTarget.user}：{replyTarget.excerpt}</span>
                  <button type="button" onClick={() => setReplyTarget(null)} aria-label="取消回复">×</button>
                </div>
              )}
              <input
                ref={composerRef}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value)
                  if (composerMessage) setComposerMessage('')
                }}
                placeholder={replyTarget ? `回复 @${replyTarget.user}` : '写下你的看法'}
                aria-label={replyTarget ? `回复 ${replyTarget.user}` : '写下你的看法'}
              />
            </div>
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
            <div className="persona-tabs" ref={personaTabsRef} aria-label="选择 AI 分身">
              {space.worthChat.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  className={activePersona?.id === person.id ? 'active' : ''}
                  disabled={chatSending}
                  onClick={() => openPersona(person)}
                >
                  <UserAvatar name={person.name} src={person.avatar} size="sm" />
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
                  <p
                    ref={descriptionRef}
                    className={`persona-desc${descriptionExpanded ? '' : ' clamped'}`}
                    onClick={() => {
                      if (!descriptionExpanded && descriptionOverflowing) setDescriptionExpanded(true)
                    }}
                  >
                    {activePersona.description}
                  </p>
                  {descriptionOverflowing && (
                    <button
                      type="button"
                      className="desc-toggle"
                      onClick={() => setDescriptionExpanded((expanded) => !expanded)}
                    >
                      {descriptionExpanded ? '收起 ▴' : '展开全部 ▾'}
                    </button>
                  )}
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
                  <UserAvatar name={src.author} src={src.authorAvatar} size="sm" />
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
