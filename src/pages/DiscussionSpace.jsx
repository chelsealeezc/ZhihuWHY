import { useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getSpace } from '../data/mock'
import { getSavedDiscussionSpace } from '../services/discussionSpaces'
import './DiscussionSpace.css'

const PERSONA_PRESETS = {
  阿北: {
    stance: '意志力派',
    description: '相信反馈很重要，但真正的分水岭是没有反馈时仍能守住承诺。',
    traits: ['重视长期承诺', '警惕单因归因', '表达直接'],
    opening: '我会先提醒一句：正反馈能让人更容易开始，但总有一段窗口期没有反馈。你想从哪一次“还没看到结果，却继续做下去”的经历聊起？',
  },
  周然: {
    stance: '环境设计派',
    description: '更关注如何把行动阻力放到系统外，而不是每天消耗意志力。',
    traits: ['喜欢拆解步骤', '关注环境杠杆', '偏行动建议'],
    opening: '如果一个方法需要你每天都很有毅力，它可能还不够好。你现在最想改变的是哪一个环境触发点？',
  },
  清禾: {
    stance: '评价焦虑视角',
    description: '关注外界目光如何改变人的开始、交付和自我判断。',
    traits: ['敏感于评价', '重视心理安全', '善于换位思考'],
    opening: '很多“拖延”其实是在躲避被评价。你最近有没有一件明明会做，却因为怕别人怎么看而迟迟没开始的事？',
  },
}

function createPersona(person, posts) {
  const preset = PERSONA_PRESETS[person.name] || {}
  const evidence = posts.filter((post) => post.user === person.name)
  const publicEvidence = Array.isArray(person.evidence) && person.evidence.length > 0
    ? person.evidence
    : evidence.map((post) => post.text)
  return {
    ...person,
    stance: preset.stance || person.snippet?.split('·')[0] || '讨论参与者',
    description: preset.description || '根据其公开回答与讨论表达，提炼出一组可继续追问的观点线索。',
    traits: preset.traits || ['有明确立场', '愿意解释依据', '欢迎具体追问'],
    opening: preset.opening || `我会沿着“${person.snippet || '这个分歧'}”继续聊。你最想挑战我的哪一个前提？`,
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
    return initialFilter === 'same' || initialFilter === 'diff' ? initialFilter : 'all'
  })
  const [draft, setDraft] = useState('')
  const [localPosts, setLocalPosts] = useState([])
  const [composerMessage, setComposerMessage] = useState('')
  const [activePersona, setActivePersona] = useState(null)
  const [chatDraft, setChatDraft] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatSending, setChatSending] = useState(false)
  const composerRef = useRef(null)
  const chatInputRef = useRef(null)

  const allPosts = useMemo(() => [...localPosts, ...(space.posts || [])], [localPosts, space.posts])

  const posts = useMemo(() => {
    if (feedFilter === 'same') return allPosts.filter((p) => p.stance === 'same')
    if (feedFilter === 'diff') return allPosts.filter((p) => p.stance === 'diff')
    return allPosts
  }, [allPosts, feedFilter])

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

  function openPersona(person) {
    const persona = createPersona(person, allPosts)
    setActivePersona(persona)
    setChatMessages([{ role: 'assistant', text: persona.opening }])
    setChatDraft('')
    window.setTimeout(() => chatInputRef.current?.focus(), 80)
  }

  function closePersona() {
    setActivePersona(null)
    setChatSending(false)
  }

  function localPersonaReply(persona, question) {
    const q = question.toLowerCase()
    if (q.includes('为什么') || q.includes('原因')) {
      return `${persona.name}：我的判断不是“只靠${persona.stance}”，而是先看阻力在哪里。${persona.description}如果你愿意，可以把你的具体场景说出来，我们一起拆解。`
    }
    return `${persona.name}：这个问题很具体。我会先保留我的立场，但不把它当成结论：${persona.description}你可以告诉我一个反例，我会根据那个场景重新说明。`
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
            <div className="topic">{space.topic}</div>
            <div className="meta">
              来自 {space.sourceCount} 篇回答 / 文章 · {space.participants} 人参与
            </div>
            {space.real && <div className="real-badge">已聚合知乎真实表达</div>}
          </div>

          <div className="card space-card">
            <h3>大家的观点分布</h3>
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
            <p className="muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
              观点分布与关系标签为演示数据；原文片段和来源来自知乎搜索结果。
            </p>
          </div>
        </aside>

        <main className="space-col">
          <div className="space-main-header">
            <div>
              <h1>讨论空间</h1>
              <p>不同回答与文章里的观点，在这里相遇</p>
            </div>
            <Link className="btn btn-secondary" to={`/read/${space.articleId || 'a1'}`}>
              返回阅读页
            </Link>
          </div>

          <div className="feed">
            {posts.length === 0 && (
              <div className="card empty-feed">这个筛选下暂时没有观点，换个筛选看看。</div>
            )}
            {posts.map((post) => (
              <article key={post.id} className="card post-card">
                <div className="post-head">
                  <div className="avatar sm">{post.user.slice(0, 1)}</div>
                  <div>
                    <div className="who">{post.user}</div>
                    <div className="from">
                      {post.from} · {post.time}
                    </div>
                  </div>
                  <span className={`stance-tag ${post.stance}`}>
                    {post.stance === 'same' ? '同观点' : '不同观点'}
                  </span>
                </div>
                <p className="body">{post.text}</p>
                <div className="post-actions">
                  <span>认同 {post.agree}</span>
                  <button type="button" onClick={() => focusComposer(post.stance)}>
                    追问
                  </button>
                  <button type="button" onClick={() => focusComposer('all')}>
                    回应
                  </button>
                  {post.url && (
                    <a href={post.url} target="_blank" rel="noreferrer">
                      查看原文
                    </a>
                  )}
                </div>
              </article>
            ))}
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
          <div className="card space-card">
            <h3>值得聊聊的人</h3>
            <div className="chat-list">
              {space.worthChat.map((person) => (
                <div key={person.id} className="chat-item">
                  <div className="avatar sm">{person.name.slice(0, 1)}</div>
                  <div>
                    <div className="name">{person.name}</div>
                    <div className="snippet">{person.snippet}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => openPersona(person)}
                  >
                    聊聊这个分歧
                  </button>
                </div>
              ))}
            </div>
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
      {activePersona && (
        <div className="persona-overlay" role="presentation" onMouseDown={closePersona}>
          <section
            className="persona-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="persona-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="persona-head">
              <div className="persona-heading">
                <div className="avatar lg">{activePersona.name.slice(0, 1)}</div>
                <div>
                  <div className="eyebrow">基于公开表达生成的 AI 分身</div>
                  <h2 id="persona-title">和 {activePersona.name} 聊聊</h2>
                  <div className="persona-stance">{activePersona.stance}</div>
                </div>
              </div>
              <button type="button" className="persona-close" onClick={closePersona} aria-label="关闭对话">
                ×
              </button>
            </div>
            <div className="persona-profile">
              <p>{activePersona.description}</p>
              <div className="persona-traits">
                {activePersona.traits.map((trait) => <span key={trait}>{trait}</span>)}
              </div>
              <div className="persona-evidence">
                <span>已参考 {activePersona.evidenceCount} 条公开表达</span>
                <span>仅用于观点模拟，不代表本人实时发言</span>
              </div>
              {activePersona.evidence.length > 0 && (
                <div className="persona-quotes">
                  {activePersona.evidence.map((quote) => <blockquote key={quote}>“{quote}”</blockquote>)}
                </div>
              )}
            </div>
            <div className="persona-chat" aria-live="polite">
              {chatMessages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`chat-bubble ${message.role}`}>
                  {message.text}
                </div>
              ))}
              {chatSending && <div className="chat-typing">AI 分身正在组织观点…</div>}
            </div>
            <form className="persona-composer" onSubmit={sendPersonaMessage}>
              <input
                ref={chatInputRef}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder={`追问 ${activePersona.name} 的理由…`}
                aria-label={`追问 ${activePersona.name} 的理由`}
              />
              <button className="btn btn-primary" type="submit" disabled={!chatDraft.trim() || chatSending}>发送</button>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
