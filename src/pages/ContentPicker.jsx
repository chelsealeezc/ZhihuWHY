import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { mockFavorites, sampleArticleId } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import { saveImportedArticles } from '../services/importedArticles'
import './ContentPicker.css'

const MAX_SELECT = 5

function formatFavTime(ts) {
  if (!ts) return ''
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mapCollectionItem(item) {
  return {
    id: item.Url || item.Title,
    url: item.Url || '',
    type: item.ContentType || 'answer',
    question: null,
    title: item.Title || '(无标题)',
    author: item.Author?.Name || '匿名用户',
    excerpt: item.Summary || '',
    voteup: Number(item.LikeCount) || 0,
    comments: Number(item.CommentCount) || 0,
    favoritedAt: formatFavTime(item.FavTime),
  }
}

export default function ContentPicker() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    if (!user) {
      setItems(mockFavorites)
      return
    }
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    fetch('/api/user/collections?limit=50', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && Array.isArray(data.items)) {
          setItems(data.items.map(mapCollectionItem))
        } else {
          setFetchError(data?.error?.message || '获取收藏失败')
          setItems(mockFavorites)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError('网络错误，已回退到示例数据')
          setItems(mockFavorites)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return items
    return items.filter(
      (item) =>
        item.title.includes(q) ||
        item.author.includes(q) ||
        (item.question && item.question.includes(q)) ||
        item.excerpt.includes(q),
    )
  }, [query, items])

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECT) next.add(id)
      return next
    })
  }

  function importSelected() {
    const selectedItems = items.filter((item) => selected.has(item.id))
    const [first] = saveImportedArticles(selectedItems)
    navigate(`/read/${first?.id || sampleArticleId}`)
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page picker-page">
        <div className="picker-header">
          <div>
            <h1>从我的知乎收藏开始</h1>
            <p className="muted" style={{ margin: 0 }}>
              {user
                ? loading
                  ? '正在读取你的知乎收藏…'
                  : `已加载 ${items.length} 条真实收藏`
                : '登录知乎账号后可读取真实收藏；当前为示例数据'}
              {fetchError ? `（${fetchError}）` : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!user && (
              <button type="button" className="btn btn-primary" onClick={login}>
                登录知乎
              </button>
            )}
            <Link className="btn btn-ghost" to={`/read/${sampleArticleId}`}>
              改用示例文章
            </Link>
          </div>
        </div>

        <div className="picker-tabs">
          <button type="button" className="active">
            我的收藏 · {items.length}
          </button>
        </div>

        <div className="picker-toolbar">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索收藏的内容"
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
          ) : (
            filtered.map((item) => {
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
                      {item.type === 'answer' ? '回答' : item.type === 'article' ? '文章' : item.type} · {item.author}
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
            })
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
