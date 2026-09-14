import { useState } from 'react'
import { Link } from 'react-router-dom'
import Topbar from '../components/Topbar'
import { sampleArticleId } from '../data/mock'
import { useAuth } from '../context/AuthContext'
import './Landing.css'

const previewContent = {
  moment: {
    label: '一句话',
    title: '我终于有时间陪父母了。',
    text: '离开大城市，不一定是退后一步，也可能是换了一把衡量生活的尺子。',
    detail: '值得继续读下去',
  },
  views: {
    label: '大家的看法',
    title: '同一个选择，为什么会有不同答案？',
    text: '有人更看重职业成长，也有人把生活质量和家人陪伴放在第一位。',
    detail: '看看相同与分歧',
  },
  space: {
    label: '讨论空间',
    title: '你的选择，会和谁相遇？',
    text: '选一个更接近你的看法，再看看相同与不同的人怎么说。',
    detail: '把你的选择说出来',
  },
}

export default function Landing() {
  const { user, login } = useAuth()
  const [previewMode, setPreviewMode] = useState('moment')
  const activePreview = previewContent[previewMode]
  const previewIndex = Object.keys(previewContent).indexOf(previewMode)

  return (
    <div className="app-shell">
      <Topbar compact />
      <main className="page landing">
        <section className="landing-copy">
          <h1>
            把在意的一句话，继续读成<em>一场讨论</em>
          </h1>
          <p className="landing-lead">从一个真实瞬间出发，看见不同答案，也找到自己的位置。</p>

          <div className="landing-path" aria-label="使用路径">
            {Object.entries(previewContent).map(([id, item], index) => (
              <button
                key={id}
                type="button"
                className={`path-item${previewMode === id ? ' active' : ''}`}
                onClick={() => setPreviewMode(id)}
              >
                <span className="path-index">0{index + 1}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </button>
            ))}
          </div>

          <div className="cta-stack landing-actions">
            {user ? (
              <Link className="btn btn-primary" to="/picker">
                从我的收藏开始
              </Link>
            ) : (
              <button type="button" className="btn btn-primary" onClick={login}>
                连接知乎账号
              </button>
            )}
            <Link className="btn btn-secondary" to={`/read/${sampleArticleId}`}>
              先看一个示例
            </Link>
          </div>
        </section>

        <aside className="demo-panel card" aria-label="产品预览">
          <div className="demo-topline">
            <span className="demo-eyebrow">正在阅读</span>
            <span className="demo-hint">点击左侧试试</span>
          </div>
          <div className="demo-heading">
            <h2>30岁离开大城市，是一种失败吗？</h2>
            <span className="demo-dot" aria-hidden="true" />
          </div>
          <div className="demo-tabs" role="tablist" aria-label="预览切换">
            {Object.entries(previewContent).map(([id, item]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={previewMode === id}
                className={previewMode === id ? 'active' : ''}
                onClick={() => setPreviewMode(id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className={`demo-content demo-content-${previewMode}`}>
            <p className="demo-quote">
              ……工资少了一半，但 <span className="hl">{activePreview.title}</span>
            </p>
            <p className="demo-copy">{activePreview.text}</p>
            {previewMode === 'moment' && (
              <div className="demo-highlight">
                <span>值得继续读下去</span>
                <strong>换一把尺子，也是一种答案</strong>
              </div>
            )}
            {previewMode === 'views' && (
              <div className="demo-options">
                <div><strong>生活质量</strong><span>2.3k 人</span></div>
                <div><strong>职业成长</strong><span>1.2k 人</span></div>
                <div><strong>家庭陪伴</strong><span>763 人</span></div>
              </div>
            )}
            {previewMode === 'space' && (
              <div className="demo-people">
                <span className="people-stack" aria-hidden="true"><i>林</i><i>周</i><i>陈</i></span>
                <span>已有 1,846 人留下看法</span>
                <Link to={`/read/${sampleArticleId}`}>加入这场讨论 →</Link>
              </div>
            )}
          </div>
          <div className="demo-footer">
            <span>{activePreview.label}</span>
            <span className="demo-progress"><i style={{ width: `${(previewIndex + 1) * 33.33}%` }} /></span>
            <span>0{previewIndex + 1} / 03</span>
          </div>
        </aside>
      </main>
    </div>
  )
}
