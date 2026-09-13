import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { getSpace } from '../data/mock'
import './DiscussionSpace.css'

export default function DiscussionSpace() {
  const { momentId } = useParams()
  const [searchParams] = useSearchParams()
  const space = getSpace(momentId)
  const choices = (searchParams.get('choices') || 'v1').split(',').filter(Boolean)
  const myChoice = choices[0]

  const [feedFilter, setFeedFilter] = useState('all')

  const posts = useMemo(() => {
    if (feedFilter === 'same') return space.posts.filter((p) => p.stance === 'same')
    if (feedFilter === 'diff') return space.posts.filter((p) => p.stance === 'diff')
    return space.posts
  }, [feedFilter, space.posts])

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
              「AI 主持」本期先不做，仅保留布局位。
            </p>
          </div>
        </aside>

        <main className="space-col">
          <div className="space-main-header">
            <div>
              <h1>讨论空间</h1>
              <p>不同回答与文章里的观点，在这里相遇</p>
            </div>
            <Link className="btn btn-secondary" to={`/read/a1`}>
              返回阅读页
            </Link>
          </div>

          <div className="feed">
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
                  <span>追问</span>
                  <span>回应</span>
                </div>
              </article>
            ))}
          </div>

          <div className="composer">
            <div className="avatar sm">我</div>
            <input placeholder="写下你的看法（演示占位，暂不提交）" />
            <button type="button" className="btn btn-primary">
              发送
            </button>
          </div>
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
                  <button type="button" className="btn btn-secondary">
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
                    <div className="title">{src.title}</div>
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
