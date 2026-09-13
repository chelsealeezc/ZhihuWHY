import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { mockFavorites, mockLikes, sampleArticleId } from '../data/mock'
import './ContentPicker.css'

const MAX_SELECT = 5

export default function ContentPicker() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('favorites')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())

  const list = tab === 'favorites' ? mockFavorites : mockLikes

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return list
    return list.filter(
      (item) =>
        item.title.includes(q) ||
        item.author.includes(q) ||
        (item.question && item.question.includes(q)) ||
        item.excerpt.includes(q),
    )
  }, [list, query])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECT) next.add(id)
      return next
    })
  }

  function importSelected() {
    const first = [...selected][0] || sampleArticleId
    // Framework: multi-select UI is ready; reading page currently opens one article.
    navigate(`/read/${first}`)
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page picker-page">
        <div className="picker-header">
          <div>
            <h1>从我的知乎内容开始</h1>
            <p className="muted" style={{ margin: 0 }}>
              MOCK 账号 · 选择收藏或点赞中的内容导入演示
            </p>
          </div>
          <Link className="btn btn-ghost" to={`/read/${sampleArticleId}`}>
            改用示例文章
          </Link>
        </div>

        <div className="picker-tabs">
          <button
            type="button"
            className={tab === 'favorites' ? 'active' : ''}
            onClick={() => setTab('favorites')}
          >
            我的收藏 · {mockFavorites.length}
          </button>
          <button
            type="button"
            className={tab === 'likes' ? 'active' : ''}
            onClick={() => setTab('likes')}
          >
            我的点赞 · {mockLikes.length}
          </button>
        </div>

        <div className="picker-toolbar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索收藏 / 赞过的内容"
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              if (selected.size === filtered.length) setSelected(new Set())
              else setSelected(new Set(filtered.slice(0, MAX_SELECT).map((i) => i.id)))
            }}
          >
            全选
          </button>
        </div>

        <div className="picker-list">
          {filtered.map((item) => {
            const active = selected.has(item.id)
            return (
              <button
                key={item.id}
                type="button"
                className={`picker-item${active ? ' selected' : ''}`}
                onClick={() => toggle(item.id)}
              >
                <span className="picker-check">{active ? '✓' : ''}</span>
                <div>
                  <h3>{item.question || item.title}</h3>
                  <div className="meta">
                    {item.type === 'answer' ? '回答' : '文章'} · {item.author} · 收藏于{' '}
                    {item.favoritedAt}
                  </div>
                  <p className="excerpt">{item.excerpt}</p>
                </div>
                <div className="stats">
                  {item.voteup} 赞同
                  <br />
                  {item.comments} 评论
                </div>
              </button>
            )
          })}
        </div>
      </main>

      <footer className="picker-footer">
        <span className="muted">
          已选中 {selected.size}/{MAX_SELECT} 篇
        </span>
        <div className="actions">
          <Link className="btn btn-secondary" to="/">
            取消
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selected.size === 0}
            onClick={importSelected}
          >
            导入并开始
          </button>
        </div>
      </footer>
    </div>
  )
}
