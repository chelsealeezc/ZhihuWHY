import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { mockFavorites, mockLikes, sampleArticleId } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import { saveImportedArticles } from '../services/importedArticles'
import './ContentPicker.css'

const MAX_SELECT = 5

export default function ContentPicker() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [tab, setTab] = useState('favorites')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [items, setItems] = useState(() => mockFavorites)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    if (!user) {
      setItems(tab === 'favorites' ? mockFavorites : mockLikes)
      return
    }
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    const endpoint = tab === 'favorites' ? '/api/user/collections?limit=50' : '/api/user/contents?limit=50'
    fetch(endpoint, { credentials: 'include' })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        if (!data.ok || !Array.isArray(data.items)) {
          throw new Error(data?.error?.message || '获取内容失败')
        }
        setItems(
          data.items.map((item) => ({
            id: item.Url || item.Title,
            url: item.Url || '',
            type: item.ContentType || 'answer',
            question: null,
            title: item.Title || '(无标题)',
            author: item.Author?.Name || item.AuthorName || '匿名用户',
            excerpt: item.Summary || item.ContentText || '',
            voteup: Number(item.LikeCount || item.VoteUpCount) || 0,
            comments: Number(item.CommentCount) || 0,
            favoritedAt: item.FavTime ? new Date(item.FavTime * 1000).toISOString().slice(0, 10) : '',
          })),
        )
      })
      .catch((error) => {
        if (!cancelled) {
          setFetchError(error.message)
          setItems(tab === 'favorites' ? mockFavorites : mockLikes)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [tab, user])

  const list = items

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
    const selectedItems = list.filter((item) => selected.has(item.id))
    const [first] = saveImportedArticles(selectedItems)
    navigate(`/read/${first?.id || sampleArticleId}`)
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page picker-page">
        <div className="picker-header">
          <div>
            <h1>从我的知乎内容开始</h1>
            <p className="muted" style={{ margin: 0 }}>
              {user
                ? `${loading ? '正在读取' : '已加载'} ${list.length} 条真实${tab === 'favorites' ? '收藏' : '内容'}`
                : '登录知乎后可读取真实收藏；当前为示例数据'}
              {fetchError ? `（${fetchError}）` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!user && <button type="button" className="btn btn-primary" onClick={login}>登录知乎</button>}
            <Link className="btn btn-ghost" to={`/read/${sampleArticleId}`}>改用示例文章</Link>
          </div>
        </div>

        <div className="picker-tabs">
          <button
            type="button"
            className={tab === 'favorites' ? 'active' : ''}
            onClick={() => setTab('favorites')}
          >
            我的收藏 · {user ? (tab === 'favorites' ? list.length : '…') : mockFavorites.length}
          </button>
          <button
            type="button"
            className={tab === 'likes' ? 'active' : ''}
            onClick={() => setTab('likes')}
          >
            我的内容 · {user ? (tab === 'likes' ? list.length : '…') : mockLikes.length}
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
          {loading ? (
            <div className="muted" style={{ padding: 24, textAlign: 'center' }}>加载中…</div>
          ) : filtered.map((item) => {
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
                    {item.type === 'answer' ? '回答' : '文章'} · {item.author}
                    {item.favoritedAt ? ` · 收藏于 ${item.favoritedAt}` : ''}
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
          {!loading && filtered.length === 0 && (
            <div className="muted" style={{ padding: 24, textAlign: 'center' }}>没有找到匹配的内容</div>
          )}
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
