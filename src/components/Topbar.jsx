import { Link } from 'react-router-dom'

export default function Topbar({ compact = false }) {
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
        <button type="button" className="btn btn-primary">
          写回答
        </button>
      </div>
    </header>
  )
}
