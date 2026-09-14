import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { demoArticleCards, mockFavorites, sampleArticleId } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import { saveImportedArticles } from '../services/importedArticles'
import { searchRelatedContent } from '../services/discussions'
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

function mapSearchItem(item) {
  return {
    id: item.id || item.url || item.title,
    url: item.url || '',
    type: item.type || 'answer',
    question: null,
    title: item.title || '(无标题)',
    author: item.author || '知乎用户',
    excerpt: item.quote || '',
    voteup: Number(item.voteup) || 0,
    comments: Number(item.comments) || 0,
    favoritedAt: '',
  }
}

export default function ContentPicker() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [mode, setMode] = useState('demo')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)

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

  const sourceItems = mode === 'demo' ? demoArticleCards : mode === 'search' ? searchResults : items
  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q || mode === 'search') return sourceItems
    return sourceItems.filter(
      (item) =>
        item.title.includes(q) ||
        item.author.includes(q) ||
        (item.question && item.question.includes(q)) ||
        item.excerpt.includes(q),
    )
  }, [mode, query, sourceItems])

  const visibleIds = useMemo(() => filtered.map((item) => item.id), [filtered])
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id))

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < MAX_SELECT) next.add(id)
      return next
    })
  }

  function importSelected() {
    const selectedItems = sourceItems.filter((item) => selected.has(item.id))
    const [firstSelected] = selectedItems
    if (firstSelected?.builtin) {
      navigate(`/read/${firstSelected.id}`)
      return
    }
    const [first] = saveImportedArticles(selectedItems)
    navigate(`/read/${first?.id || sampleArticleId}`)
  }

  async function searchPublicContent(event) {
    event.preventDefault()
    const keyword = query.trim()
    if (!keyword) {
      setSearchError('请输入搜索关键词')
      return
    }
    setSearchLoading(true)
    setSearchError(null)
    setSelected(new Set())
    try {
      const results = await searchRelatedContent(keyword, 10)
      setSearchResults(results.map(mapSearchItem))
    } catch (error) {
      setSearchResults([])
      setSearchError(error.message || '知乎搜索失败，请稍后重试')
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <Topbar />
      <main className="page picker-page">
        <div className="picker-header">
          <div>
            <h1>{mode === 'demo' ? '内置示例长文' : mode === 'search' ? '探索知乎真实内容' : '从我的知乎收藏开始'}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {mode === 'demo'
                ? '无需登录即可体验的两篇完整知乎长文'
                : mode === 'search'
                ? searchLoading
                  ? '正在搜索知乎公开内容…'
                  : `已找到 ${searchResults.length} 条真实内容`
                : user
                ? loading
                  ? '正在读取你的知乎收藏…'
                  : `已加载 ${items.length} 条真实收藏`
                : '登录知乎账号后可读取真实收藏；当前展示收藏夹示例数据'}
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
              阅读内置长文
            </Link>
          </div>
        </div>

        <div className="picker-tabs">
          <button
            type="button"
            className={mode === 'demo' ? 'active' : ''}
            onClick={() => {
              setMode('demo')
              setSelected(new Set())
              setSearchError(null)
            }}
          >
            示例长文 · {demoArticleCards.length}
          </button>
          <button
            type="button"
            className={mode === 'collections' ? 'active' : ''}
            onClick={() => {
              setMode('collections')
              setSelected(new Set())
              setSearchError(null)
            }}
          >
            我的收藏 · {user ? items.length : '登录后读取'}
          </button>
          <button
            type="button"
            className={mode === 'search' ? 'active' : ''}
            onClick={() => {
              setMode('search')
              setSelected(new Set())
              setSearchError(null)
            }}
          >
            探索知乎 · {searchResults.length || '实时'}
          </button>
        </div>

        <form className="picker-toolbar" onSubmit={mode === 'search' ? searchPublicContent : (event) => event.preventDefault()}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={mode === 'search' ? '搜索知乎公开内容，例如：执行力' : mode === 'demo' ? '搜索示例文章' : '搜索收藏的内容'}
          />
          {mode === 'search' && (
            <button type="submit" className="btn btn-primary" disabled={searchLoading}>
              {searchLoading ? '搜索中…' : '搜索知乎'}
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSelected((current) => {
                const next = new Set(current)
                if (allVisibleSelected) {
                  visibleIds.forEach((id) => next.delete(id))
                  return next
                }
                const available = Math.max(0, MAX_SELECT - next.size)
                filtered
                  .filter((item) => !next.has(item.id))
                  .slice(0, available)
                  .forEach((item) => next.add(item.id))
                return next
              })
            }}
          >
            {allVisibleSelected ? '取消全选' : '全选'}
          </button>
        </form>

        {mode === 'search' && searchError && (
          <div className="picker-error" role="alert">真实内容暂未加载：{searchError}</div>
        )}

        <div className="picker-list">
          {(mode === 'collections' && loading) || (mode === 'search' && searchLoading) ? (
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
          {mode === 'search' && !searchLoading && searchResults.length === 0 && !searchError && (
            <div className="muted" style={{ padding: 24, textAlign: 'center' }}>
              输入关键词，搜索知乎公开内容
            </div>
          )}
          {mode === 'collections' && !loading && filtered.length === 0 && (
            <div className="muted" style={{ padding: 24, textAlign: 'center' }}>
              没有找到匹配的收藏内容
            </div>
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
