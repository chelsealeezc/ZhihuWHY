import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

function mapContentItem(item) {
  return {
    id: item.Url || item.Title,
    url: item.Url || '',
    type: item.ContentType || 'answer',
    question: null,
    title: item.Title || '(无标题)',
    author: '我',
    excerpt: item.Summary || '',
    voteup: Number(item.LikeCount) || 0,
    comments: Number(item.CommentCount) || 0,
    favoritedAt: '',
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
  const [searchParams] = useSearchParams()
  const { user, login } = useAuth()
  const [mode, setMode] = useState('demo')
  const [query, setQuery] = useState(() => searchParams.get('query') || '')
  const [selected, setSelected] = useState(() => new Set())
  const [selectionNotice, setSelectionNotice] = useState('')
  const [items, setItems] = useState([])
  const [contentItems, setContentItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState(null)

  useEffect(() => {
    if (!user) {
      setItems(mockFavorites)
      setContentItems([])
      return
    }
    let cancelled = false
    setLoading(true)
    setFetchError(null)
    Promise.allSettled([
      fetch('/api/user/collections?limit=50', { credentials: 'include' }).then((r) => r.json()),
      fetch('/api/user/contents?type=all&limit=50', { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([collectionsResult, contentsResult]) => {
        if (cancelled) return
        const errors = []
        const collections = collectionsResult.status === 'fulfilled' ? collectionsResult.value : null
        const contents = contentsResult.status === 'fulfilled' ? contentsResult.value : null
        if (collections?.ok && Array.isArray(collections.items)) {
          setItems(collections.items.map(mapCollectionItem))
        } else {
          errors.push(collections?.error?.message || '获取收藏失败')
          setItems(mockFavorites)
        }
        if (contents?.ok && Array.isArray(contents.items)) {
          setContentItems(contents.items.map(mapContentItem))
        } else {
          errors.push(contents?.error?.message || '获取创作内容失败')
          setContentItems([])
        }
        setFetchError(errors.length > 0 ? errors.join('；') : null)
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

  const sourceItems = mode === 'demo'
    ? demoArticleCards
    : mode === 'search'
      ? searchResults
      : mode === 'contents'
        ? contentItems
        : items
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
    if (!selected.has(id) && selected.size >= MAX_SELECT) {
      setSelectionNotice(`最多选择 ${MAX_SELECT} 篇`)
      return
    }
    setSelectionNotice('')
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
          <div className="picker-heading">
            <h1>{mode === 'demo' ? '内置示例长文' : mode === 'search' ? '找到一篇，开始读' : mode === 'contents' ? '从我的创作开始' : '从你的收藏开始'}</h1>
            <p>{mode === 'demo' ? '无需登录即可体验的两篇完整知乎长文。' : mode === 'search' ? '搜索一个问题，挑一篇进入阅读。' : '选择 1–5 篇内容，进入阅读与讨论。'}</p>
            <span className="picker-status">
              {mode === 'demo'
                ? `${demoArticleCards.length} 篇内置长文`
                : mode === 'search'
                ? searchLoading
                  ? '正在搜索…'
                  : searchResults.length
                    ? `${searchResults.length} 条结果`
                    : '等待搜索'
                : user
                  ? loading
                    ? '正在读取收藏…'
                    : `${items.length} 篇收藏`
                  : '当前展示示例收藏'}
              {fetchError ? ` · ${fetchError}` : ''}
            </span>
          </div>
          <div className="picker-header-actions">
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

        <section className="picker-workspace card">
          <div className="picker-tabs" role="tablist" aria-label="内容来源">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'demo'}
              className={mode === 'demo' ? 'active' : ''}
              onClick={() => {
                setMode('demo')
                setSelected(new Set())
                setSelectionNotice('')
                setSearchError(null)
              }}
            >
              示例长文 <span>{demoArticleCards.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'collections'}
              className={mode === 'collections' ? 'active' : ''}
              onClick={() => {
                setMode('collections')
                setSelected(new Set())
                setSelectionNotice('')
                setSearchError(null)
              }}
            >
              我的收藏 <span>{items.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'contents'}
              className={mode === 'contents' ? 'active' : ''}
              onClick={() => {
                setMode('contents')
                setSelected(new Set())
                setSelectionNotice('')
                setSearchError(null)
              }}
            >
              我的创作 <span>{user ? contentItems.length : '登录后读取'}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'search'}
              className={mode === 'search' ? 'active' : ''}
              onClick={() => {
                setMode('search')
                setSelected(new Set())
                setSelectionNotice('')
                setSearchError(null)
              }}
            >
              探索知乎 <span>{searchResults.length || '实时'}</span>
            </button>
          </div>

          <form className="picker-toolbar" onSubmit={mode === 'search' ? searchPublicContent : (event) => event.preventDefault()}>
            <label className="picker-search-field">
              <span className="search-icon" aria-hidden="true" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={mode === 'search' ? '搜索问题，例如：执行力' : mode === 'demo' ? '搜索示例文章' : mode === 'contents' ? '在创作中筛选' : '在收藏中筛选'}
                aria-label={mode === 'search' ? '搜索知乎公开内容' : '筛选收藏内容'}
              />
            </label>
            {mode === 'search' && (
              <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                {searchLoading ? '搜索中…' : '搜索'}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSelectionNotice('')
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
              {allVisibleSelected ? '取消选择' : '选择当前'}
            </button>
          </form>

          {selectionNotice && <div className="picker-limit" role="status">{selectionNotice}</div>}
          {mode === 'search' && searchError && (
            <div className="picker-error" role="alert">无法加载结果：{searchError}</div>
          )}

          <div className="picker-list">
            {((mode === 'collections' || mode === 'contents') && loading) || (mode === 'search' && searchLoading) ? (
              <div className="picker-empty">正在加载内容…</div>
            ) : (
              filtered.map((item) => {
                const active = selected.has(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    className={`picker-item${active ? ' selected' : ''}`}
                    onClick={() => toggle(item.id)}
                  >
                    <span className="picker-check" aria-hidden="true">{active ? '✓' : ''}</span>
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
              <div className="picker-empty">输入关键词，搜索知乎公开内容</div>
            )}
            {mode === 'collections' && !loading && filtered.length === 0 && (
              <div className="picker-empty">没有找到匹配的收藏内容</div>
            )}
            {mode === 'contents' && !loading && filtered.length === 0 && (
              <div className="picker-empty">没有找到匹配的创作内容</div>
            )}
            {mode === 'demo' && filtered.length === 0 && (
              <div className="picker-empty">没有找到匹配的示例长文</div>
            )}
          </div>
        </section>
      </main>

      <footer className="picker-footer">
        <span className="muted">
          <strong>{selected.size}</strong> / {MAX_SELECT} 篇已选择
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
