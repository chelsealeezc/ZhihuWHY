import { useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getSpace } from '../data/mock'
import { getSavedDiscussionSpace } from '../services/discussionSpaces'
import './DiscussionSpace.css'

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
  const composerRef = useRef(null)

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
                    onClick={() => focusComposer(person.snippet.includes('分歧') ? 'diff' : 'same')}
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
    </div>
  )
}
