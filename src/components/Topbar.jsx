import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ compact = false, classic = false }) {
  const { user, login, logout, loginError } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    return window.localStorage.getItem('echo-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('echo-theme', theme)
  }, [theme])

  function submitSearch(event) {
    event.preventDefault()
    navigate(`/picker${query.trim() ? `?query=${encodeURIComponent(query.trim())}` : ''}`)
  }

  return (
    <header className={`topbar${classic ? ' topbar-classic' : ''}`}>
      <Link to="/" className="topbar-brand">
        <span className="logo-mark">知</span>
        <span className="brand-name">
          <span>知乎回响</span>
          {!classic && <small>Echo in Zhihu</small>}
        </span>
        <span className="beta">Beta</span>
      </Link>
      {!compact && (
        <nav className="topbar-nav" aria-label="主导航">
          <Link to="/picker">探索</Link>
          <Link to="/read/a1">阅读</Link>
          <Link to="/space/m1">讨论</Link>
        </nav>
      )}
      <form className="topbar-search" onSubmit={submitSearch} role="search">
        <span className="search-icon" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索问题或讨论"
          aria-label="搜索问题或讨论"
        />
      </form>
      <div className="topbar-actions">
        <button
          type="button"
          className="theme-toggle"
          aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          title={theme === 'dark' ? '浅色主题' : '深色主题'}
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          <span className="theme-toggle-icon" aria-hidden="true" />
        </button>
        {loginError && <span className="auth-error" role="alert">{loginError}</span>}
        {user ? (
          <div className="user-chip">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="user-avatar" />
            ) : (
              <span className="user-avatar-fallback">{(user.name || '?').slice(0, 1)}</span>
            )}
            <span className="user-name">{user.name}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
              退出
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-primary" onClick={login}>
            登录知乎
          </button>
        )}
      </div>
    </header>
  )
}
