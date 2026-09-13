import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ compact = false }) {
  const { user, login, logout, loginError } = useAuth()

  return (
    <header className="topbar">
      <Link to="/" className="topbar-brand">
        <span className="logo-mark">知</span>
        <span>知乎·讨论图谱</span>
        <span className="beta">Beta</span>
      </Link>
      {!compact && (
        <nav className="topbar-nav" aria-label="主导航（占位）">
          <span>关注</span>
          <span>推荐</span>
          <span>热榜</span>
          <span>专栏</span>
        </nav>
      )}
      <div className="topbar-search">搜索问题、讨论瞬间…</div>
      <div className="topbar-actions">
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
